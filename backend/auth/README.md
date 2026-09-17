# Авторизация

Workshop: авторизация, OAuth, OIDC

## Содержание

1. [Общая картина](#общая-картина)
2. [Sample1](#Sample1)
3. [Sample2](#Sample2)

---

### Общая картинка

Resource Owner - я, как пользователь, через SPA
Client - identity server (OpenIdDict), микросервис (.net)
Authorization Server - github identity
Resource Server - github api

![](./images/oauth_oidc.png)

OAuth, OIDC дока - [OAuth-OIDC схема](oauth-oidc.md)

.NET экосистема - [.NET Auth экосистема](dotnet.md)

## Sample1

Редирект с SPA на github, callback на SPA, апи вызов с code в бэк, бэк m2m с гитхабом (обмен кода на id-token, accessToken, refreshToken, создание пользователя)



## Sample2

```
SPA                          IS (back)                     GitHub
 │                              │                             │
 │ 1. POST /api/auth/github/start                             │
 │─────────────────────────────►│                             │
 │                              │ сгенерить state, сохранить  │
 │                              │ Set-Cookie: gh_oauth_state  │
 │◄── { redirect_url: "github.com/..." } ─────────────────────│
 │                              │                             │
 │ 2. window.location = redirect_url                          │
 │────────────────────────────────────────────────────────────►
 │◄──────────────── 302 SPA /github/sign-in?code=GH&state=...─│
 │                              │                             │
 │ 3. POST /api/auth/github/callback { code, state }          │
 │─────────────────────────────►│                             │
 │                              │ проверить state + cookie    │
 │                              │ exchange code ↔ token ─────►│
 │                              │◄─ GH access_token ──────────│
 │                              │ GET /user, /user/emails ───►│
 │                              │◄─ профиль ──────────────────│
 │                              │ маппинг → local_user        │
 │                              │ SignInAsync → is_session    │
 │◄── { ok: true } ─────────────│                             │
 │                              │                             │
 │ 4. window.location = /auth-api/connect/authorize?...PKCE... │
 │─────────────────────────────►│                             │
 │                              │ is_session есть → code      │
 │◄── 302 /oidc/callback?code=MY&state=... ───────────────────│
 │                              │                             │
 │ 5. POST /connect/token (grant_type=authorization_code)     │
 │─────────────────────────────►│                             │
 │◄── access_token, id_token, refresh_token ──────────────────│
```