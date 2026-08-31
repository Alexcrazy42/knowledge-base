using BoardApp.Core;

// ============================================================================
// PAGE CONTROLLER (Razor Pages) - точка входа приложения.
//
// Сравните с MVP-проектом: там AddControllersWithViews + MapControllerRoute
// с явным шаблоном "{controller=Home}/{action=Index}/{id?}".
//
// Здесь НЕТ роутинг-шаблонов: URL каждого endpoint'а выводится из пути
// к .cshtml-файлу в папке Pages:
//   Pages/Index.cshtml   -> "/"
//   Pages/Users.cshtml   -> "/Users"
// Логика страницы живёт в парном .cshtml.cs (PageModel) рядом с разметкой.
// ============================================================================

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddRazorPages();

// Домен - общий с MVP-проектом (библиотека BoardApp.Core).
// Singleton: один экземпляр на всё приложение, состояние живёт в его полях.
// Это серверный аналог "локал-фёрста" из gherkin: пока процесс жив, данные живы.
builder.Services.AddSingleton<IBoardStore, InMemoryBoardStore>();

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseRouting();
app.UseAuthorization();

app.MapStaticAssets();
app.MapRazorPages()
    .WithStaticAssets();

app.Run();
