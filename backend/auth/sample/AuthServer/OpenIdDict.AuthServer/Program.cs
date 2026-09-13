using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using OpenIddict.Abstractions;
using OpenIdDict.AuthServer.Data;
using OpenIdDict.AuthServer.Entities;
using static OpenIddict.Abstractions.OpenIddictConstants;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer(); 
builder.Services.AddSwaggerGen();
builder.Services.AddControllers();

builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    options.UseNpgsql(builder.Configuration.GetConnectionString("Postgres"));
    options.UseOpenIddict();
});

builder.Services.AddHttpClient();

builder.Services.AddIdentity<ApplicationUser, IdentityRole>()
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddDefaultTokenProviders()
    .AddDefaultUI();

builder.Services.AddOpenIddict()
    .AddCore(options =>
    {
        options.UseEntityFrameworkCore()
            .UseDbContext<ApplicationDbContext>();
    })
    .AddServer(options =>
    {
        options.SetAuthorizationEndpointUris("/connect/authorize")
            .SetEndSessionEndpointUris("/connect/logout")
            .SetTokenEndpointUris("/connect/token")
            .SetUserInfoEndpointUris("/connect/userinfo");
        
        options.RegisterScopes(
            Scopes.OpenId,
            Scopes.Profile,
            Scopes.Email,
            Scopes.OfflineAccess,
            Scopes.Roles
        );

        
        options.AllowAuthorizationCodeFlow()
            .AllowRefreshTokenFlow()
            .AllowPasswordFlow()
            .AcceptAnonymousClients();
        
        options.AllowCustomFlow("github_code");
        
        options.AddDevelopmentEncryptionCertificate()
            .AddDevelopmentSigningCertificate();

        options.DisableAccessTokenEncryption();
        
        options.UseAspNetCore()
            .EnableAuthorizationEndpointPassthrough()
            .EnableEndSessionEndpointPassthrough()
            .EnableStatusCodePagesIntegration()
            .EnableTokenEndpointPassthrough();
    })
    .AddValidation(options =>
    {
        options.UseLocalServer();
        options.UseAspNetCore();
        options.EnableAuthorizationEntryValidation();
        options.EnableTokenEntryValidation();
    });

builder.Services.AddAuthentication();

builder.Services.AddAuthorization();



var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    await dbContext.Database.MigrateAsync();
}

using (var scope = app.Services.CreateScope())
{
    var applicationManager = scope.ServiceProvider
        .GetRequiredService<IOpenIddictApplicationManager>();
    
    if (await applicationManager.FindByClientIdAsync("spa-app") is null)
    {
        await applicationManager.CreateAsync(new OpenIddictApplicationDescriptor
        {
            ClientId = "spa-app",
            DisplayName = "My SPA App",
            ClientType = ClientTypes.Public,
            
            Permissions = 
            {
                OpenIddictConstants.Permissions.Endpoints.Authorization,
                OpenIddictConstants.Permissions.Endpoints.Token,
                OpenIddictConstants.Permissions.GrantTypes.AuthorizationCode,
                OpenIddictConstants.Permissions.GrantTypes.RefreshToken,
                Permissions.Prefixes.GrantType + "github_code",
                OpenIddictConstants.Permissions.ResponseTypes.Code,
                "openid",
                OpenIddictConstants.Permissions.Scopes.Email,
                OpenIddictConstants.Permissions.Scopes.Profile,
                "offline_access"
            }
        });
        
        Console.WriteLine("Клиент 'spa-app' успешно зарегистрирован");
    }
    else
    {
        Console.WriteLine("️Клиент 'spa-app' уже существует");
    }
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        // Optional: Customizes the UI route prefix. 
        // Setting it to string.Empty serves Swagger directly at the app root (/)
        // options.RoutePrefix = string.Empty; 
    });
}

app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();