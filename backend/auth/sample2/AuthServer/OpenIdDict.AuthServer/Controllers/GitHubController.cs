using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OpenIdDict.AuthServer.Entities;
using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;

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
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly IDistributedCache _cache;
    
    
    public GitHubController(
        UserManager<ApplicationUser> userManager, 
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<GitHubController> logger, 
        SignInManager<ApplicationUser> signInManager, IDistributedCache distributedCache)
    {
        _userManager = userManager;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
        _signInManager = signInManager;
        _cache = distributedCache;
    }

    [HttpGet("start")]
    [AllowAnonymous]
    public async Task<IActionResult> StartAsync(CancellationToken ct)
    {
        var state = Guid.NewGuid().ToString("N");
        
        await _cache.SetStringAsync($"gh_oauth:{state}", "1",
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10) }, token: ct);
        
        Response.Cookies.Append("gh_oauth_state", state, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Lax, // чтобы cookie пережила редирект с GitHub
            MaxAge = TimeSpan.FromMinutes(10)
        });
        
        var url = "https://github.com/login/oauth/authorize" +
                  $"?client_id={_configuration["github_clientid"]}" +
                  $"&redirect_uri={Uri.EscapeDataString("http://localhost:5173/github/sign-in")}" +
                  $"&scope={Uri.EscapeDataString("user:email read:user repo")}" +
                  $"&state={state}";

        return Ok(new { redirect_url = url });
    }

    [HttpPost("callback")]
    [AllowAnonymous]
    public async Task<IActionResult> Callback(
        [FromBody] GitHubCallbackRequest req)
    {
        var cookieState = Request.Cookies["gh_oauth_state"];
        if (string.IsNullOrEmpty(cookieState) || cookieState != req.State)
            return BadRequest(new { error = "invalid_state" });

        var exists = await _cache.GetStringAsync($"gh_oauth:{req.State}");
        if (exists is null)
            return BadRequest(new { error = "state_expired" });

        await _cache.RemoveAsync($"gh_oauth:{req.State}");
        Response.Cookies.Delete("gh_oauth_state");
        
        var gitHubToken = await ExchangeCodeForToken(req.Code);
        
        var githubUser = await GetGitHubUser(gitHubToken.AccessToken);
        var emails  = await GetUserEmails(gitHubToken.AccessToken);
        var email   = emails.FirstOrDefault(e => e.Primary)?.Email ?? githubUser.Email;
        
        var user = await FindOrCreateUser(githubUser, gitHubToken, email);

        // 5. Устанавливаем is_session cookie на домене IS
        await _signInManager.SignInAsync(user, isPersistent: true);

        return Ok(new { ok = true });
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

    private async Task<GitHubTokenResponse> ExchangeCodeForToken(string code)
    {
        var client = _httpClientFactory.CreateClient();

        var parameters = new List<KeyValuePair<string, string>>
        {
            new("code", code),
            new("client_id", _configuration["github_clientid"]!),
            new("client_secret", _configuration["github_clientsecret"]!),
            new("grant_type", "authorization_code")
        };

        var content = new FormUrlEncodedContent(parameters);

        var response = await client.PostAsync("https://github.com/login/oauth/access_token", content);
        
        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync();
            _logger.LogError("GitHub token exchange failed: {Error}", error);
            throw new Exception($"GitHub token exchange failed: {error}");
        }

        var rawResponse = await response.Content.ReadAsStringAsync();
        
        var parsedResponse = ParseFormUrlEncoded(rawResponse);
    
        return new GitHubTokenResponse
        {
            AccessToken = parsedResponse.GetValueOrDefault("access_token") ?? "",
            TokenType = parsedResponse.GetValueOrDefault("token_type") ?? "",
            Scope = parsedResponse.GetValueOrDefault("scope") ?? "",
            RefreshToken = parsedResponse.GetValueOrDefault("refresh_token") ?? "",
            RefreshTokenExpiresIn = Int32.Parse(parsedResponse.GetValueOrDefault("refresh_token_expires_in") ?? throw new Exception("refresh_token_expires_in must be not null"))
        };
    }
    
    private async Task<GitHubUserInfo> GetGitHubUser(string accessToken)
    {
        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.UserAgent.ParseAdd("AuthServer/1.0");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var response = await client.GetAsync("https://api.github.com/user");
        
        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync();
            _logger.LogError("GitHub user info request failed: {Error}", error);
            throw new Exception($"GitHub user info request failed: {error}");
        }

        var json = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<GitHubUserInfo>(json, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        }) ?? throw new Exception("Failed to parse GitHub user info");
    }
    
    private async Task<List<GitHubEmail>> GetUserEmails(string accessToken)
    {
        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.UserAgent.ParseAdd("AuthServer/1.0");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var response = await client.GetAsync("https://api.github.com/user/emails");
        
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("Failed to get user emails: {Status}", response.StatusCode);
            return new List<GitHubEmail>();
        }

        var json = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<List<GitHubEmail>>(json, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        }) ?? new List<GitHubEmail>();
    }
    
    private async Task<ApplicationUser> FindOrCreateUser(GitHubUserInfo githubUser, GitHubTokenResponse tokenResponse, string email)
    {
        // Ищем пользователя по githubid
        var user = await _userManager.Users.FirstOrDefaultAsync(x => x.GitHubId == githubUser.Id.ToString());
        
        if (user != null)
        {
            // Пользователь существует, возвращаем его
            return user;
        }

        // Создаем нового пользователя
        user = new ApplicationUser
        {
            UserName = email,
            Email = email,
            FirstName = string.IsNullOrEmpty(githubUser.Name) ? githubUser.Login : githubUser.Name,
            LastName = "",
            GitHubId = githubUser.Id.ToString(),
            GitHubAccessToken = tokenResponse.AccessToken,
            GitHubRefreshToken = tokenResponse.RefreshToken,
        };

        // Создаем с временным паролем (можно сгенерировать случайный)
        //var password = Convert.ToBase64String(Guid.NewGuid().ToByteArray()).Substring(0, 16);
        var result = await _userManager.CreateAsync(user);
        
        if (!result.Succeeded)
        {
            throw new Exception($"Failed to create user: {string.Join(", ", result.Errors.Select(e => e.Description))}");
        }
        
        var loginInfo = new UserLoginInfo("GitHub", githubUser.Id.ToString(), "GitHub");
        await _userManager.AddLoginAsync(user, loginInfo);

        return user;
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

public record GitHubCallbackRequest(string Code, string State);

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

public class GitHubTokenResponse
{
    public string AccessToken { get; set; } = "";
    public string RefreshToken { get; set; } = "";
    public string TokenType { get; set; } = "";
    public string Scope { get; set; } = "";
    public int RefreshTokenExpiresIn { get; set; }
    
}

public class GitHubUserInfo
{
    public long Id { get; set; }
    public string Login { get; set; } = "";
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public string AvatarUrl { get; set; } = "";
    public string Bio { get; set; } = "";
}

public class GitHubEmail
{
    public string Email { get; set; } = "";
    public bool Primary { get; set; }
    public bool Verified { get; set; }
}