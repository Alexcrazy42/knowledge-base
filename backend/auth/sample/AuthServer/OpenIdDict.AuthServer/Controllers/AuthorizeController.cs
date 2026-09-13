using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using OpenIddict.Abstractions;
using OpenIdDict.AuthServer.Entities;
using OpenIddict.Server.AspNetCore;

namespace OpenIdDict.AuthServer.Controllers;


[ApiController]
[Route("connect")]
public class AuthorizationController: ControllerBase
{
    private readonly IOpenIddictApplicationManager _applicationManager;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthorizationController> _logger;

    public AuthorizationController(IOpenIddictApplicationManager applicationManager, 
        UserManager<ApplicationUser> userManager, 
        IHttpClientFactory httpClientFactory, 
        IConfiguration configuration, 
        ILogger<AuthorizationController> logger)
    {
        _applicationManager = applicationManager;
        _userManager = userManager;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
    }

    [HttpPost]
    [Route("token")]
    public async Task<IActionResult> Token()
    {
        var request = HttpContext.GetOpenIddictServerRequest();
        
        if (request == null)
            return BadRequest(new { error = "invalid_request", error_description = "Missing OpenIddict request" });
        
        if (request.IsPasswordGrantType())
        {
            var user = await _userManager.FindByNameAsync(request.Username);
        
            if (user == null || !await _userManager.CheckPasswordAsync(user, request.Password))
            {
                return Forbid(
                    authenticationSchemes: OpenIddictServerAspNetCoreDefaults.AuthenticationScheme,
                    properties: new AuthenticationProperties(new Dictionary<string, string>
                    {
                        [OpenIddictConstants.Parameters.Error] = OpenIddictConstants.Errors.InvalidGrant,
                        [OpenIddictConstants.Parameters.ErrorDescription] = "Invalid username or password."
                    }!));
            }
            
            var identity = new ClaimsIdentity(
                TokenValidationParameters.DefaultAuthenticationType,
                OpenIddictConstants.Claims.Name,
                OpenIddictConstants.Claims.Role);

            // Субъект — ID пользователя, а не client_id
            identity.AddClaim(OpenIddictConstants.Claims.Subject, user.Id);
            identity.AddClaim(OpenIddictConstants.Claims.Name, user.UserName ?? user.Email);
            identity.AddClaim(OpenIddictConstants.Claims.Email, user.Email);

            // Добавляем роли пользователя (опционально)
            var roles = await _userManager.GetRolesAsync(user);
            foreach (var role in roles)
                identity.AddClaim(OpenIddictConstants.Claims.Role, role);

            // 4. Настраиваем destinations (куда попадут claims)
            identity.SetDestinations(static claim => claim.Type switch
            {
                // name и email попадают в id_token ТОЛЬКО если запрошен scope profile/email
                OpenIddictConstants.Claims.Name when claim.Subject.HasScope(OpenIddictConstants.Permissions.Scopes.Profile)
                    => [OpenIddictConstants.Destinations.AccessToken, OpenIddictConstants.Destinations.IdentityToken],
                    
                OpenIddictConstants.Claims.Email when claim.Subject.HasScope(OpenIddictConstants.Permissions.Scopes.Email)
                    => [OpenIddictConstants.Destinations.AccessToken, OpenIddictConstants.Destinations.IdentityToken],

                // Роли и subject всегда идут в access_token
                _ => [OpenIddictConstants.Destinations.AccessToken]
            });

            // 5. Генерируем токены через OpenIddict
            return SignIn(new ClaimsPrincipal(identity), OpenIddictServerAspNetCoreDefaults.AuthenticationScheme);
        }
        if (request.IsClientCredentialsGrantType())
        {
            var application = await _applicationManager.FindByClientIdAsync(request.ClientId) ??
                              throw new InvalidOperationException("The application cannot be found.");

            // Create a new ClaimsIdentity containing the claims that
            // will be used to create an id_token, a token or a code.
            var identity = new ClaimsIdentity(TokenValidationParameters.DefaultAuthenticationType, OpenIddictConstants.Claims.Name, OpenIddictConstants.Claims.Role);

            // Use the client_id as the subject identifier.
            identity.SetClaim(OpenIddictConstants.Claims.Subject, await _applicationManager.GetClientIdAsync(application));
            identity.SetClaim(OpenIddictConstants.Claims.Name, await _applicationManager.GetDisplayNameAsync(application));

            identity.SetDestinations(static claim => claim.Type switch
            {
                // Allow the "name" claim to be stored in both the access and identity tokens
                // when the "profile" scope was granted (by calling principal.SetScopes(...)).
                OpenIddictConstants.Claims.Name when claim.Subject.HasScope(OpenIddictConstants.Permissions.Scopes.Profile)
                    => [OpenIddictConstants.Destinations.AccessToken, OpenIddictConstants.Destinations.IdentityToken],

                // Otherwise, only store the claim in the access tokens.
                _ => [OpenIddictConstants.Destinations.AccessToken]
            });

            return SignIn(new ClaimsPrincipal(identity), OpenIddictServerAspNetCoreDefaults.AuthenticationScheme);
        }

        if (request.GrantType == "github_code")
        {
            var githubCode = request.GetParameter("code")?.ToString();
            if (string.IsNullOrWhiteSpace(githubCode))
                return BadRequest(new { error = "invalid_request", error_description = "code is required" });
            
            var tokenResponse = await ExchangeCodeForToken(githubCode);
            
            var userInfo = await GetGitHubUser(tokenResponse.AccessToken);
            var emails = await GetUserEmails(tokenResponse.AccessToken);
            var primaryEmail = emails.FirstOrDefault(e => e.Primary)?.Email ?? userInfo.Email;
            
            var user = await FindOrCreateUser(userInfo, tokenResponse, primaryEmail);

            return await IssueTokensAsync(user, request);
        }
        
        throw new NotImplementedException("The specified grant is not implemented.");
    }
    
    private async Task<IActionResult> IssueTokensAsync(ApplicationUser user, OpenIddictRequest request)
    {
        var identity = new ClaimsIdentity(
            TokenValidationParameters.DefaultAuthenticationType,
            OpenIddictConstants.Claims.Name, OpenIddictConstants.Claims.Role);

        identity.SetClaim(OpenIddictConstants.Claims.Subject, await _userManager.GetUserIdAsync(user));
        identity.SetClaim(OpenIddictConstants.Claims.Name, await _userManager.GetUserNameAsync(user) ?? "");
        identity.SetClaim(OpenIddictConstants.Claims.Email, await _userManager.GetEmailAsync(user) ?? "");

        // Скоупы — что запросил клиент
        identity.SetScopes(request.GetScopes());
        

        // Важно: SignIn с OpenIddictServerAuthenticationScheme — OpenIddict сам
        // выпустит access_token, id_token, refresh_token и вернёт их JSON-ом
        return SignIn(new ClaimsPrincipal(identity),
            OpenIddictServerAspNetCoreDefaults.AuthenticationScheme);
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
    
    private Dictionary<string, string> ParseFormUrlEncoded(string rawResponse)
    {
        var result = new Dictionary<string, string>();
    
        // Разбиваем строку по & на пары ключ=значение
        var pairs = rawResponse.Split('&', StringSplitOptions.RemoveEmptyEntries);
    
        foreach (var pair in pairs)
        {
            var parts = pair.Split('=', 2); // Разбиваем только на 2 части
            if (parts.Length == 2)
            {
                var key = Uri.UnescapeDataString(parts[0]);
                var value = Uri.UnescapeDataString(parts[1]);
                result[key] = value;
            }
        }
    
        return result;
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
            GitHubRefreshToken = tokenResponse.RefreshToken
        };

        // Создаем с временным паролем (можно сгенерировать случайный)
        var password = Convert.ToBase64String(Guid.NewGuid().ToByteArray()).Substring(0, 16);
        var result = await _userManager.CreateAsync(user, password);
        
        if (!result.Succeeded)
        {
            throw new Exception($"Failed to create user: {string.Join(", ", result.Errors.Select(e => e.Description))}");
        }
        
        var loginInfo = new UserLoginInfo("GitHub", githubUser.Id.ToString(), "GitHub");
        await _userManager.AddLoginAsync(user, loginInfo);

        return user;
    }
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