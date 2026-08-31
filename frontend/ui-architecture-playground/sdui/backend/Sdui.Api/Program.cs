using Sdui.Api.Sdui;

namespace Sdui.Api;

public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);
        builder.WebHost.UseUrls("http://localhost:7120");

        var app = builder.Build();
        var store = new Store();
        var layouts = new LayoutStore();

        app.MapGet("/api/health", () => Results.Ok(new { status = "ok", service = "sdui-api" }));

        // Единственный источник "каким будет экран" - бэкенд.
        // Клиент не знает ни layout каталога, ни полей формы, ни текстов кнопок.
        // Каталог и карточка товара собираются из РАСКЛАДКИ (дизайнер),
        // остальные экраны - как есть.
        app.MapGet("/api/screens/{screen}", (string screen, HttpRequest req) =>
        {
            var q = req.Query;
            return screen.ToLowerInvariant() switch
            {
                "catalog" => Results.Ok(SduiScreens.Catalog(store, layouts, q)),
                "product" => Results.Ok(SduiScreens.Product(store, layouts, q["id"].ToString())),
                "form-product" => Results.Ok(SduiScreens.FormProduct(store, q["edit"].ToString())),
                "dashboard" => Results.Ok(SduiScreens.Dashboard(store)),
                "categories" => Results.Ok(SduiScreens.Categories(store)),
                "form-category" => Results.Ok(SduiScreens.FormCategory()),
                "search" => Results.Ok(SduiScreens.Search()),
                "stats" => Results.Ok(SduiScreens.Stats(store)),
                "settings" => Results.Ok(SduiScreens.Settings(store)),
                _ => Results.NotFound(new { ok = false, message = $"unknown screen '{screen}'" }),
            };
        });

        // ===== Раскладки экранов (режим дизайнера, Grafana-like) =====
        // Дизайнер - тоже SDUI: список виджетов, их настройки и кнопки клиент
        // получает с сервера (meta) и рендерит палитру по данным, не по коду.

        app.MapGet("/api/layout/meta", () =>
            Results.Ok(LayoutDefaults.MetaAll()));

        app.MapGet("/api/layout/{screen}", (string screen) =>
        {
            if (screen is not ("catalog" or "product"))
                return Results.NotFound(new { ok = false, message = $"unknown layout screen '{screen}'" });
            return Results.Ok(layouts.Get(screen));
        });

        app.MapPut("/api/layout/{screen}", (string screen, ScreenLayout body) =>
        {
            if (screen is not ("catalog" or "product"))
                return Results.NotFound(new { ok = false, message = $"unknown layout screen '{screen}'" });
            return Results.Ok(layouts.Apply(screen, body with { Screen = screen }));
        });

        app.MapPost("/api/layout/{screen}/restore", (string screen) =>
        {
            if (screen is not ("catalog" or "product"))
                return Results.NotFound(new { ok = false, message = $"unknown layout screen '{screen}'" });
            return Results.Ok(layouts.Restore(screen));
        });

        // Runtime-мутации: клиент просто передаёт данные и получает
        // { ok, toast, next } - следующий шаг снова определяет сервер.
        app.MapPost("/api/runtime/submit", (SubmitRequest body) =>
            Results.Ok(SduiScreens.Submit(store, body)));

        app.MapPost("/api/runtime/delete", (DeleteRequest body) =>
            Results.Ok(SduiScreens.Delete(store, body)));

        // Инлайн-мутации из карточки (например, остаток ± без формы).
        app.MapPost("/api/runtime/apply", (ApplyRequest body) =>
            Results.Ok(SduiScreens.Apply(store, body)));

        // Админ-действие для e2e/демо: сбросить in-memory сторадж к сиду.
        app.MapPost("/api/runtime/reset", () =>
        {
            store.Reset();
            layouts.Reset();
            return Results.Ok(new MutationReply(Ok: true, Toast: "Склад и раскладки сброшены к сиду",
                Next: new ActionDto("navigate", Screen: "dashboard")));
        });

        app.Run();
    }
}