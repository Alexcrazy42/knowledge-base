using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OpenIdDict.AuthServer.Entities;
using System.Net.Http.Headers;
using System.Text.Json;

namespace OpenIdDict.AuthServer.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class GitHubController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<GitHubController> _logger;

    public GitHubController(
        UserManager<ApplicationUser> userManager, 
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<GitHubController> logger)
    {
        _userManager = userManager;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
    }

    [HttpGet("get-repos")]
    public async Task<IActionResult> GetRepositories(CancellationToken ct)
    {
        // 1. Получаем ID текущего пользователя из токена
        var userId = User.FindFirst("sub")?.Value 
                     ?? User.FindFirst(OpenIddict.Abstractions.OpenIddictConstants.Claims.Subject)?.Value;

        if (string.IsNullOrEmpty(userId))
            return Unauthorized(new { error = "User ID not found in token" });

        // 2. Находим пользователя в БД
        var user = await _userManager.Users.FirstOrDefaultAsync(x => x.Id == userId, ct);
        
        if (user == null)
            return NotFound(new { error = "User not found" });

        if (string.IsNullOrEmpty(user.GitHubAccessToken))
            return BadRequest(new { error = "GitHub account not linked" });

        // 3. Проверяем, не истек ли токен (опционально, если вы сохраняете время истечения)
        // Если токен истек или скоро истечет - обновляем его
        string accessToken = user.GitHubAccessToken;
        
        if (IsTokenExpiredOrSoonToExpire(user))
        {
            var refreshResult = await RefreshGitHubTokenAsync(user, ct);
            
            if (!refreshResult.Success)
            {
                _logger.LogWarning("Failed to refresh GitHub token for user {UserId}: {Error}", 
                    userId, refreshResult.Error);
                return StatusCode(502, new { 
                    error = "github_token_refresh_failed", 
                    details = refreshResult.Error 
                });
            }
            
            accessToken = refreshResult.NewAccessToken;
        }

        // 4. Получаем репозитории с GitHub
        try
        {
            var repositories = await FetchGitHubRepositoriesAsync(accessToken, ct);
            return Ok(repositories);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Error fetching GitHub repositories for user {UserId}", userId);
            
            if (ex.StatusCode == System.Net.HttpStatusCode.Unauthorized)
            {
                // Токен мог быть отозван на стороне GitHub
                return StatusCode(401, new { 
                    error = "github_token_invalid", 
                    message = "GitHub token is invalid or revoked. Please re-authenticate." 
                });
            }
            
            return StatusCode(502, new { 
                error = "github_api_error", 
                message = "Failed to fetch repositories from GitHub" 
            });
        }
    }

    private bool IsTokenExpiredOrSoonToExpire(ApplicationUser user)
    {
        // Если вы не сохраняете время истечения токена, можно пропустить эту проверку
        // или всегда пытаться обновить токен перед использованием
        
        // Пример: если есть поле TokenExpiresAt
        // if (user.GitHubTokenExpiresAt.HasValue)
        // {
        //     // Обновляем за 5 минут до истечения
        //     return user.GitHubTokenExpiresAt.Value <= DateTime.UtcNow.AddMinutes(5);
        // }
        
        // Пока просто возвращаем false, если нет информации об истечении
        return false;
    }

    private async Task<(bool Success, string? NewAccessToken, string? Error)> RefreshGitHubTokenAsync(
        ApplicationUser user, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(user.GitHubRefreshToken))
        {
            return (false, null, "No refresh token available");
        }

        try
        {
            var client = _httpClientFactory.CreateClient();
            
            var parameters = new List<KeyValuePair<string, string>>
            {
                new("client_id", _configuration["github_clientid"]!),
                new("client_secret", _configuration["github_clientsecret"]!),
                new("grant_type", "refresh_token"),
                new("refresh_token", user.GitHubRefreshToken)
            };

            var content = new FormUrlEncodedContent(parameters);
            
            var response = await client.PostAsync(
                "https://github.com/login/oauth/access_token", 
                content, 
                ct);

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync(ct);
                return (false, null, $"GitHub refresh failed: {error}");
            }

            var rawResponse = await response.Content.ReadAsStringAsync(ct);
            var parsedResponse = ParseFormUrlEncoded(rawResponse);

            var newAccessToken = parsedResponse.GetValueOrDefault("access_token");
            var newRefreshToken = parsedResponse.GetValueOrDefault("refresh_token");
            
            if (string.IsNullOrEmpty(newAccessToken))
            {
                return (false, null, "No access token in response");
            }

            // Обновляем токены в БД
            user.GitHubAccessToken = newAccessToken;
            if (!string.IsNullOrEmpty(newRefreshToken))
            {
                user.GitHubRefreshToken = newRefreshToken;
            }

            var result = await _userManager.UpdateAsync(user);
            if (!result.Succeeded)
            {
                _logger.LogError("Failed to update user tokens: {Errors}", 
                    string.Join(", ", result.Errors.Select(e => e.Description)));
                return (false, null, "Failed to save new tokens");
            }

            return (true, newAccessToken, null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error refreshing GitHub token");
            return (false, null, ex.Message);
        }
    }

    private async Task<List<GitHubRepository>> FetchGitHubRepositoriesAsync(
        string accessToken, CancellationToken ct)
    {
        var client = _httpClientFactory.CreateClient();
        
        // GitHub требует User-Agent
        client.DefaultRequestHeaders.UserAgent.ParseAdd("MyAuthServer/1.0");
        
        // Используем схему "token" для OAuth-токенов GitHub
        client.DefaultRequestHeaders.Authorization = 
            new AuthenticationHeaderValue("token", accessToken);

        var response = await client.GetAsync(
            "https://api.github.com/user/repos?sort=updated&per_page=30", 
            ct);

        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync(ct);
            throw new HttpRequestException(
                $"GitHub API error: {response.StatusCode}, {error}", 
                null, 
                response.StatusCode);
        }

        var json = await response.Content.ReadAsStringAsync(ct);
        
        var options = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        };
        
        var repositories = JsonSerializer.Deserialize<List<GitHubRepository>>(json, options) 
                           ?? new List<GitHubRepository>();
        
        return repositories;
    }

    private Dictionary<string, string> ParseFormUrlEncoded(string rawResponse)
    {
        var result = new Dictionary<string, string>();
        var pairs = rawResponse.Split('&', StringSplitOptions.RemoveEmptyEntries);

        foreach (var pair in pairs)
        {
            var parts = pair.Split('=', 2);
            if (parts.Length == 2)
            {
                var key = Uri.UnescapeDataString(parts[0]);
                var value = Uri.UnescapeDataString(parts[1]);
                result[key] = value;
            }
        }

        return result;
    }
}

// Модели для ответа GitHub
public class GitHubRepository
{
    public long Id { get; set; }
    public string Name { get; set; } = "";
    public string FullName { get; set; } = "";
    public string Description { get; set; } = "";
    public string HtmlUrl { get; set; } = "";
    public string Language { get; set; } = "";
    public int StargazersCount { get; set; }
    public int ForksCount { get; set; }
    public bool Private { get; set; }
}