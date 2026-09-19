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
public class AuthorizationController: ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;

    public AuthorizationController(UserManager<ApplicationUser> userManager)
    {
        _userManager = userManager;
    }


    [HttpGet("~/connect/authorize")]
    [HttpPost("~/connect/authorize")]
    public async Task<IActionResult> Authorize()
    {
        var request = HttpContext.GetOpenIddictServerRequest()!;

        // Если is_session нет — отправляем в SPA логиниться
        var auth = await HttpContext.AuthenticateAsync(IdentityConstants.ApplicationScheme);
        if (!auth.Succeeded)
            return Redirect("http://localhost:5173/login?return_to=" + Uri.EscapeDataString(Request.Path + Request.QueryString));

        var user = await _userManager.GetUserAsync(auth.Principal!);
        if (user is null) return Forbid();

        var identity = new ClaimsIdentity(
            TokenValidationParameters.DefaultAuthenticationType,
            OpenIddictConstants.Claims.Name,
            OpenIddictConstants.Claims.Role);

        identity.SetClaim(OpenIddictConstants.Claims.Subject, user.Id);
        identity.SetClaim(OpenIddictConstants.Claims.Name, user.UserName ?? "");
        identity.SetClaim(OpenIddictConstants.Claims.Email, user.Email ?? "");
        identity.SetScopes(request.GetScopes());
        identity.SetDestinations(GetDestinations);

        return SignIn(new ClaimsPrincipal(identity),
            OpenIddictServerAspNetCoreDefaults.AuthenticationScheme);
    }
    
    // ==================== /connect/token ====================
    [HttpPost("~/connect/token")]
    [IgnoreAntiforgeryToken]
    [Produces("application/json")]
    public async Task<IActionResult> Exchange()
    {
        var request = HttpContext.GetOpenIddictServerRequest()!;

        // ---------- authorization_code / refresh_token ----------
        if (request.IsAuthorizationCodeGrantType() || request.IsRefreshTokenGrantType())
        {
            // OpenIddict уже провалидировал code + PKCE и положил principal
            var result = await HttpContext.AuthenticateAsync(
                OpenIddictServerAspNetCoreDefaults.AuthenticationScheme);

            var userId = result.Principal!.GetClaim(OpenIddictConstants.Claims.Subject);
            if (string.IsNullOrEmpty(userId))
                return ForbidWith(OpenIddictConstants.Errors.InvalidGrant, "The token is no longer valid.");

            var user = await _userManager.FindByIdAsync(userId);
            if (user is null)
                return ForbidWith(OpenIddictConstants.Errors.InvalidGrant, "The user is no longer allowed to sign in.");

            var identity = await BuildIdentityAsync(user, request.GetScopes());

            return SignIn(new ClaimsPrincipal(identity),
                OpenIddictServerAspNetCoreDefaults.AuthenticationScheme);
        }

        // ---------- password (опционально) ----------
        if (request.IsPasswordGrantType())
        {
            var user = await _userManager.FindByNameAsync(request.Username!);
            if (user is null || !await _userManager.CheckPasswordAsync(user, request.Password!))
                return ForbidWith(OpenIddictConstants.Errors.InvalidGrant, "Invalid username or password.");

            var identity = await BuildIdentityAsync(user, request.GetScopes());

            return SignIn(new ClaimsPrincipal(identity),
                OpenIddictServerAspNetCoreDefaults.AuthenticationScheme);
        }

        // ---------- client_credentials (если нужно) ----------
        if (request.IsClientCredentialsGrantType())
        {
            var identity = new ClaimsIdentity(
                TokenValidationParameters.DefaultAuthenticationType,
                OpenIddictConstants.Claims.Name,
                OpenIddictConstants.Claims.Role);

            identity.SetClaim(OpenIddictConstants.Claims.Subject, request.ClientId!);
            identity.SetClaim(OpenIddictConstants.Claims.Name, request.ClientId!);
            identity.SetScopes(request.GetScopes());
            identity.SetDestinations(GetDestinations);

            return SignIn(new ClaimsPrincipal(identity),
                OpenIddictServerAspNetCoreDefaults.AuthenticationScheme);
        }

        throw new InvalidOperationException("The specified grant type is not supported.");
    }

    // ==================== /connect/userinfo ====================
    [HttpGet("~/connect/userinfo")]
    [HttpPost("~/connect/userinfo")]
    public async Task<IActionResult> Userinfo()
    {
        var result = await HttpContext.AuthenticateAsync(
            OpenIddictServerAspNetCoreDefaults.AuthenticationScheme);

        var userId = result.Principal?.GetClaim(OpenIddictConstants.Claims.Subject);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var user = await _userManager.FindByIdAsync(userId);
        if (user is null)
            return Unauthorized();

        var claims = new Dictionary<string, object>
        {
            [OpenIddictConstants.Claims.Subject] = userId,
            [OpenIddictConstants.Claims.Name] = user.UserName ?? "",
            [OpenIddictConstants.Claims.Email] = user.Email ?? "",
        };

        return Ok(claims);
    }

    // ==================== helpers ====================
    private async Task<ClaimsIdentity> BuildIdentityAsync(ApplicationUser user, IEnumerable<string> scopes)
    {
        var identity = new ClaimsIdentity(
            TokenValidationParameters.DefaultAuthenticationType,
            OpenIddictConstants.Claims.Name,
            OpenIddictConstants.Claims.Role);

        identity.SetClaim(OpenIddictConstants.Claims.Subject, await _userManager.GetUserIdAsync(user));
        identity.SetClaim(OpenIddictConstants.Claims.Name, await _userManager.GetUserNameAsync(user) ?? "");
        identity.SetClaim(OpenIddictConstants.Claims.Email, await _userManager.GetEmailAsync(user) ?? "");

        var roles = await _userManager.GetRolesAsync(user);
        foreach (var role in roles)
            identity.AddClaim(OpenIddictConstants.Claims.Role, role);

        identity.SetScopes(scopes);
        identity.SetDestinations(GetDestinations);

        return identity;
    }

    private ForbidResult ForbidWith(string error, string description) =>
        Forbid(
            authenticationSchemes: OpenIddictServerAspNetCoreDefaults.AuthenticationScheme,
            properties: new AuthenticationProperties(new Dictionary<string, string?>
            {
                [OpenIddictConstants.Parameters.Error] = error,
                [OpenIddictConstants.Parameters.ErrorDescription] = description
            }));

    private static IEnumerable<string> GetDestinations(Claim claim)
    {
        switch (claim.Type)
        {
            // === Claims, которые идут и в access_token, и в id_token ===
            // В id_token попадают ТОЛЬКО если запрошен соответствующий scope.

            case OpenIddictConstants.Claims.Name:
                yield return OpenIddictConstants.Destinations.AccessToken;
                if (claim.Subject!.HasScope(OpenIddictConstants.Permissions.Scopes.Profile))
                    yield return OpenIddictConstants.Destinations.IdentityToken;
                break;

            case OpenIddictConstants.Claims.Email:
                yield return OpenIddictConstants.Destinations.AccessToken;
                if (claim.Subject!.HasScope(OpenIddictConstants.Permissions.Scopes.Email))
                    yield return OpenIddictConstants.Destinations.IdentityToken;
                break;

            // === Claims, которые идут ТОЛЬКО в access_token ===

            case OpenIddictConstants.Claims.Subject:
                yield return OpenIddictConstants.Destinations.AccessToken;
                yield return OpenIddictConstants.Destinations.IdentityToken; // sub обязателен в id_token по OIDC
                break;

            case OpenIddictConstants.Claims.Role:
                yield return OpenIddictConstants.Destinations.AccessToken;
                break;

            case "AspNet.Identity.SecurityStamp":
                // Никогда не отдаём наружу
                break;

            // === Всё остальное — только в access_token (безопасный дефолт) ===
            default:
                yield return OpenIddictConstants.Destinations.AccessToken;
                break;
        }
    }
}