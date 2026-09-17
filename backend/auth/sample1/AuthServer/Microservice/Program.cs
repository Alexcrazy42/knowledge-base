using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddAuthentication()
    .AddJwtBearer(options =>
    {
        options.Authority = "https://localhost:7205/";
        options.Audience = "microservice";

        
        // это бы понадобилось если не `dotnet dev-certs https --trust` для Identity сервера
        // if (builder.Environment.IsDevelopment())
        // {
        //     options.BackchannelHttpHandler = new HttpClientHandler
        //     {
        //         ServerCertificateCustomValidationCallback = 
        //             HttpClientHandler.DangerousAcceptAnyServerCertificateValidator
        //     };
        // }
        
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = "https://localhost:7205/",
            ValidateAudience = false
        };
    });
builder.Services.AddAuthorization();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    // 1. Определение схемы безопасности
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Введите 'Bearer' [пробел] и ваш JWT токен.\nПример: Bearer eyJhbGciOiJIUzI1NiIsInR5..."
    });

    // 2. Применение схемы (исправленная сигнатура с Func)
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/openapi/v1.json", "v1 API");
});

app.Run();