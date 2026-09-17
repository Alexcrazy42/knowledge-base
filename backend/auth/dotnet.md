# Dotnet Auth Ecosystem

## Содержание

1. [Общая картина](#общая-картина)
2. [Claims-based identity](#claims-based-identity)
3. [Microsoft.AspNetCore.Identity](#microsoftaspnetcoreidentity)
4. [OpenIddict](#openiddict)
5. [Как всё связано](#как-всё-связано)
6. [Потоки в нашем проекте](#потоки-в-нашем-проекте)
7. [Шпаргалка по терминам](#шпаргалка-по-терминам)

---

## Общая картина

В .NET-мире аутентификация/авторизация строится **снизу вверх**:

```
┌─────────────────────────────────────────────┐
│  OpenIddict                                 │  ← OAuth 2.0 / OIDC протокол
│  (выдаёт токены, валидирует, JWKS)          │
├─────────────────────────────────────────────┤
│  ASP.NET Core Authentication                │  ← схемы, middleware, Challenge/Forbid
│  (Cookie, JwtBearer, OpenIddictValidation)  │
├─────────────────────────────────────────────┤
│  Microsoft.AspNetCore.Identity              │  ← UserManager, SignInManager, роли, пароли
│  (хранит юзеров, хеширует пароли)           │
├─────────────────────────────────────────────┤
│  ClaimsPrincipal / ClaimsIdentity / Claim   │  ← базовая модель «кто ты»
└─────────────────────────────────────────────┘
```

**Слой токенов (OpenIddict)** не знает, где хранятся юзеры.
**Слой Identity** не знает про токены и OAuth.
**Слой Claims** — общий язык, на котором они общаются.
**Authentication middleware** — клей, который связывает схему с HTTP-запросом.

---

## Claims-based identity

Это фундамент. Всё остальное строится на нём.

### `Claim`

Одно утверждение о субъекте: **тип** + **значение** + **issuer**.

```csharp
new Claim(ClaimTypes.Email, "user@example.com")
new Claim(ClaimTypes.Role, "Admin")
new Claim("github_id", "12345678")
new Claim("sub", "42")  // subject — ID пользователя
```

Тип — просто строка. Можно использовать стандартные константы (`ClaimTypes.*`, `OpenIddictConstants.Claims.*`) или свои.

### `ClaimsIdentity`

Набор claims **одного источника** + схема аутентификации, которой он был получен.

```csharp
var identity = new ClaimsIdentity(
    authenticationType: "Bearer",  // какая схема выдала эту identity
    nameType: ClaimTypes.Name,
    roleType: ClaimTypes.Role);

identity.AddClaim(new Claim(ClaimTypes.Name, "alice"));
identity.AddClaim(new Claim(ClaimTypes.Email, "alice@example.com"));
```

- `AuthenticationType != null` → identity **аутентифицирована**
- `IsAuthenticated` — геттер, читает `AuthenticationType != null`
- У одного юзера может быть **несколько** identities (например, cookie + внешний логин)

### `ClaimsPrincipal`

Контейнер для одной или нескольких `ClaimsIdentity`. Это то, что летит в `HttpContext.User`.

```csharp
var principal = new ClaimsPrincipal(identity);

principal.Identity;              // первая identity
principal.Identities;            // все
principal.FindFirst("email");    // поиск по всем identities
principal.IsInRole("Admin");     // проверка роли
principal.HasClaim("scope", "openid");
```

### Почему это удобно

- **Единый формат** для cookie, JWT, OAuth, Windows Auth, сертификатов — всё сводится к `ClaimsPrincipal`.
- **Авторизация** работает с claims, а не с конкретным способом аутентификации: `[Authorize(Roles = "Admin")]`, `User.HasClaim(...)`.
- **Расширяемость**: хочешь добавить своё поле — просто добавь claim, не меняя модель.

### Как claims попадают в токен

`ClaimsPrincipal` → OpenIddict сериализует каждый claim в JWT. **Но не все** — только те, у которых указан *destination*:

```csharp
identity.SetDestinations(claim => claim.Type switch
{
    "name"  => [Destinations.AccessToken, Destinations.IdentityToken],
    "email" => [Destinations.AccessToken, Destinations.IdentityToken],
    "sub"   => [Destinations.AccessToken, Destinations.IdentityToken],
    _       => [Destinations.AccessToken],  // всё остальное только в access
});
```

Destination — это **куда** claim попадёт:
- `AccessToken` — в JWT access_token
- `IdentityToken` — в JWT id_token
- (refresh_token не имеет своих claims — он непрозрачный)

См. `GetDestinations()` в `AuthorizationController`.

---

## Microsoft.AspNetCore.Identity

Фреймворк для **управления пользователями**: регистрация, логин, пароли, роли, 2FA, внешние логины.

### Ключевые интерфейсы

| Интерфейс | Что делает |
|---|---|
| `UserManager<TUser>` | CRUD юзеров, пароли, роли, claims |
| `SignInManager<TUser>` | Логин/логаут, установка cookie, 2FA |
| `RoleManager<TRole>` | CRUD ролей |
| `IUserStore<TUser>` | Абстракция хранилища (обычно EF Core) |
| `IPasswordHasher<TUser>` | Хеширование паролей (PBKDF2 по умолчанию) |

### Регистрация

```csharp
builder.Services.AddIdentity<ApplicationUser, IdentityRole>()
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddDefaultTokenProviders()
    .AddDefaultUI();

// Эквивалент:
builder.Services.AddAuthentication(IdentityConstants.ApplicationScheme);
builder.Services.AddAuthorization();
```

`AddIdentity` регистрирует **cookie-схему** `IdentityConstants.ApplicationScheme` (`.AspNetCore.Identity.Application`). Именно она ставится при `SignInManager.SignInAsync` и читается в `/connect/authorize`.

### Основные операции

```csharp
// Создание без пароля (OAuth-юзеры)
await _userManager.CreateAsync(user);

// Создание с паролем
await _userManager.CreateAsync(user, "Pa$$w0rd");

// Проверка пароля
await _userManager.CheckPasswordAsync(user, "Pa$$w0rd");

// Установить пароль позже
await _userManager.AddPasswordAsync(user, "newPass");
await _userManager.ResetPasswordAsync(user, token, "newPass");

// Внешние логины
await _userManager.AddLoginAsync(user, new UserLoginInfo("GitHub", "12345", "GitHub"));
var user = await _userManager.FindByLoginAsync("GitHub", "12345");

// Логин в cookie-схему (ставит `.AspNetCore.Identity.Application`)
await _signInManager.SignInAsync(user, isPersistent: true);
await _signInManager.SignOutAsync();
```

### `ApplicationUser`

Обычно расширяется:

```csharp
public class ApplicationUser : IdentityUser
{
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? GitHubId { get; set; }
    public string? GitHubAccessToken { get; set; }
    public string? GitHubRefreshToken { get; set; }
}
```

`IdentityUser` уже содержит: `Id`, `UserName`, `Email`, `PasswordHash`, `SecurityStamp`, `ConcurrencyStamp`, `PhoneNumber`, `TwoFactorEnabled`, `LockoutEnd`, ...

### `SecurityStamp` — важная деталь

Это «версия» юзера. Меняется при смене пароля, ролей, логинов. Если в токене/куке лежит старый stamp — Identity понимает, что сессия устарела, и разлогинивает.

**Никогда не выпускай `SecurityStamp` в JWT** — это внутренний маркер (см. `GetDestinations`).

### Что Identity **не** делает

- Не выдаёт OAuth/OIDC токены (это OpenIddict)
- Не знает про `/connect/authorize`, `/connect/token`
- Не умеет external OAuth-провайдеров (это `AddAuthentication().AddOAuth(...)` или OpenIddict Client)

---

## OpenIddict

Реализация **OAuth 2.0 + OIDC** для ASP.NET Core. Работает поверх `Authentication` и опционально поверх `Identity`.

### Четыре независимых модуля

| Модуль | Роль | Когда нужен |
|---|---|---|
| `AddCore()` | Хранение клиентов/токенов/авторизаций | Всегда (если есть server) |
| `AddServer()` | Выдача токенов (AS) | Твой IS — Authorization Server |
| `AddValidation()` | Проверка входящих токенов (RS) | Защищённые API |
| `AddClient()` | Хождение к внешним провайдерам (RP) | Логин через GitHub/Google |

Можно комбинировать. У нас IS = **Server + Validation** (+ опционально Client для GitHub).

### Хранилища (Core)

По умолчанию — in-memory, для продакшена — EF Core:

```csharp
.AddCore(options =>
{
    options.UseEntityFrameworkCore().UseDbContext<ApplicationDbContext>();
})
```

Создаёт таблицы:
- `OpenIddictApplications` — клиенты (client_id, secret, redirect_uris, permissions)
- `OpenIddictAuthorizations` — выданные авторизации (по юзеру + клиенту)
- `OpenIddictTokens` — access/refresh/id токены (или их хеши)
- `OpenIddictScopes` — если используешь scope-менеджер

### Регистрация клиента

```csharp
await applicationManager.CreateAsync(new OpenIddictApplicationDescriptor
{
    ClientId = "spa-app",
    ClientType = ClientTypes.Public,  // нет client_secret, только PKCE
    RedirectUris = { new Uri("http://localhost:5173/oidc/callback") },
    Permissions =
    {
        Permissions.Endpoints.Authorization,
        Permissions.Endpoints.Token,
        Permissions.GrantTypes.AuthorizationCode,
        Permissions.GrantTypes.RefreshToken,
        Permissions.ResponseTypes.Code,
        Permissions.Scopes.Email,
        Permissions.Scopes.Profile,
        Scopes.OpenId,
        Scopes.OfflineAccess,
    }
});
```

`Permissions` — это **whitelist** того, что клиенту разрешено. Если чего-то нет → `ID2043`/`ID2044`/подобные ошибки.

### Passthrough: как OpenIddict отдаёт управление тебе

OpenIddict **не рендерит UI** и не создаёт `ClaimsPrincipal` сам. Вместо этого он:

1. Валидирует запрос (`ValidateAuthorizationRequestContext`, `ValidateTokenRequestContext`)
2. Если включён passthrough — передаёт управление твоему контроллеру
3. Ты сам собираешь principal и вызываешь `SignIn(..., OpenIddictServerAspNetCoreDefaults.AuthenticationScheme)`
4. OpenIddict сериализует principal в JWT/code/refresh

```csharp
options.UseAspNetCore()
    .EnableAuthorizationEndpointPassthrough()
    .EnableTokenEndpointPassthrough()
    .EnableUserinfoEndpointPassthrough()
    .EnableEndSessionEndpointPassthrough();
```

### Схемы аутентификации

OpenIddict регистрирует **две** схемы:

| Схема | Для чего |
|---|---|
| `OpenIddictServerAspNetCoreDefaults.AuthenticationScheme` | Внутри `/connect/*` — принять/выдать токены |
| `OpenIddictValidationAspNetCoreDefaults.AuthenticationScheme` | На защищённых API — проверить `Authorization: Bearer` |

Не путай их. В `/connect/authorize` ты читаешь **cookie** (`IdentityConstants.ApplicationScheme`), а `SignIn` делаешь в **OpenIddict Server**. В защищённых контроллерах — `[Authorize]` дёргает **OpenIddict Validation**.

### `DisableAccessTokenEncryption()`

По умолчанию OpenIddict **шифрует** access_token (JWE), а не просто подписывает (JWS). Это безопаснее (токен непрозрачен для клиента), но неудобно для дебага.

```csharp
options.DisableAccessTokenEncryption(); // JWT в открытом виде
```

В проде лучше **оставить шифрование** и использовать `/connect/userinfo` для получения данных о юзере.

### Development-сертификаты

```csharp
options.AddDevelopmentEncryptionCertificate()
       .AddDevelopmentSigningCertificate();
```

Для dev — генерируются на лету. Для прода — реальные сертификаты из хранилища:

```csharp
options.AddEncryptionCertificate(cert)
       .AddSigningCertificate(cert);
```

При смене signing-сертификата старые токены станут невалидными. Нужен **key rotation** через JWKS.

---

## Как всё связано

### Сценарий: SPA логинится через пароль

```
1. SPA: POST /connect/token
        grant_type=password&username=...&password=...

2. OpenIddict Server:
   - ValidateTokenRequest → проверяет client_id, grant_type, scopes
   - Passthrough → вызывает AuthorizationController.Exchange()

3. Controller:
   - UserManager.FindByNameAsync(username)
   - UserManager.CheckPasswordAsync(user, password)
   - Собирает ClaimsIdentity с claims (sub, name, email, roles)
   - identity.SetScopes(...); identity.SetDestinations(...)
   - SignIn(principal, OpenIddictServerAuthenticationScheme)

4. OpenIddict:
   - По destinations раскладывает claims в access_token / id_token
   - Генерирует refresh_token
   - Возвращает JSON { access_token, id_token, refresh_token, ... }
```

### Сценарий: SPA логинится через GitHub (наш кастомный flow)

```
1. SPA: POST /api/auth/github/start
2. Backend: генерит state, возвращает GitHub-URL
3. SPA: window.location = GitHub-URL
4. GitHub → callback на SPA с ?code=GH_CODE&state=...
5. SPA: POST /api/auth/github/callback { code, state }
6. Backend:
   - Проверяет state
   - Обменивает code → GitHub access_token
   - GET /user → GitHub-профиль
   - UserManager.FindByLoginAsync("GitHub", ghId) или CreateAsync(user) + AddLoginAsync
   - SignInManager.SignInAsync(user) → ставит cookie .AspNetCore.Identity.Application
   - Возвращает { ok: true }
7. SPA: window.location = /connect/authorize?...PKCE...
8. Backend (/connect/authorize):
   - AuthenticateAsync(IdentityConstants.ApplicationScheme) → cookie есть
   - GetUserAsync → ApplicationUser
   - Собирает ClaimsIdentity
   - SignIn(principal, OpenIddictServerScheme) → 302 на SPA с ?code=MY_CODE
9. SPA: POST /connect/token { code, verifier }
10. Backend (/connect/token):
    - OpenIddict валидирует code + PKCE
    - AuthenticateAsync(OpenIddictServerScheme) → principal
    - FindByIdAsync(sub) → ApplicationUser
    - Пересобирает identity, SignIn(..., OpenIddictServerScheme)
    - Возвращает { access_token, id_token, refresh_token }
```

**Две схемы в одном флоу:**
- **Cookie** (`.AspNetCore.Identity.Application`) — «юзер залогинен в IS». Ставится на шаге 6, читается на шаге 8.
- **OpenIddict Server** — «IS выдаёт токены для SPA». Используется на шагах 8 и 10.

### Сценарий: защищённый API

```
SPA: GET /api/profile с Authorization: Bearer <access_token>
Backend:
  - OpenIddict Validation схема читает токен
  - Проверяет подпись (или расшифровывает JWE), iss, aud, exp
  - Строит ClaimsPrincipal из claims токена
  - HttpContext.User = этот principal
  - [Authorize] пропускает
  - Твой контроллер читает User.FindFirst("sub")
```

---

## Потоки в нашем проекте

| Endpoint | Кто вызывает | Схема чтения | Схема записи |
|---|---|---|---|
| `POST /api/auth/github/start` | SPA | — | — |
| `POST /api/auth/github/callback` | SPA | cookie `gh_oauth_state` | cookie `.AspNetCore.Identity.Application` |
| `GET /connect/authorize` | Браузер (redirect) | `IdentityConstants.ApplicationScheme` | `OpenIddictServer` |
| `POST /connect/token` | SPA | `OpenIddictServer` | `OpenIddictServer` |
| `GET /connect/userinfo` | SPA | `OpenIddictServer` | — |
| `GET /api/*` | SPA | `OpenIddictValidation` | — |

---

## Шпаргалка по терминам

| Термин | Значение |
|---|---|
| **Claim** | Утверждение о юзере: тип + значение |
| **ClaimsIdentity** | Набор claims + схема аутентификации |
| **ClaimsPrincipal** | Один или несколько `ClaimsIdentity` — «кто угодно», `HttpContext.User` |
| **Authentication scheme** | Имя стратегии аутентификации: `Cookies`, `Bearer`, `Identity.Application` |
| **Challenge** | «Залогинь меня» — редирект на логин, 401 |
| **Forbid** | «Тебе нельзя» — 403 |
| **SignIn (метод)** | Выдать аутентификацию (cookie, токен) |
| **Destination** | Куда claim попадёт: access / id token |
| **Scope** | Разрешение, что клиент может запросить |
| **Grant type** | Способ получения токена: `authorization_code`, `password`, `refresh_token` |
| **PKCE** | Защита публичных клиентов от перехвата code |
| **id_token** | JWT с данными о юзере (OIDC) |
| **access_token** | Ключ к API (OAuth) |
| **refresh_token** | Долгоживущий токен для обновления access |
| **JWKS** | Публичные ключи AS для проверки подписи токенов |
| **OIDC Discovery** | `/.well-known/openid-configuration` — все эндпоинты AS |
| **Passthrough** | Режим, когда OpenIddict отдаёт управление твоему контроллеру |
| **SecurityStamp** | Версия юзера, инвалидирует старые сессии при изменениях |

---

## Что почитать

- [ASP.NET Core Security](https://learn.microsoft.com/en-us/aspnet/core/security/) — общая документация
- [Introduction to Identity](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/identity) — Identity
- [Claims-based authorization](https://learn.microsoft.com/en-us/aspnet/core/security/authorization/claims) — claims
- [OpenIddict documentation](https://documentation.openiddict.com/) — OpenIddict
- [RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749) — OAuth 2.0
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html) — OIDC
- [RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636) — PKCE
- [OAuth 2.0 Security Best Current Practice](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics) — что уже нельзя делать