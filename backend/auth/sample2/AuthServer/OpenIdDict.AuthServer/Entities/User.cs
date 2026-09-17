using Microsoft.AspNetCore.Identity;


namespace OpenIdDict.AuthServer.Entities;

public class ApplicationUser : IdentityUser
{
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Для GitHub интеграции
    public string? GitHubId { get; set; }
    public string? GitHubAccessToken { get; set; }
    public string? GitHubRefreshToken { get; set; }
    public DateTime? GitHubTokenExpiry { get; set; }
}