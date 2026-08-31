using BoardApp.Core;

// ============================================================================
// MVC-ПРОЕКТ (ASP.NET Core MVC) - точка входа.
//
// Сравните с PageController: здесь КЛАССИЧЕСКИЙ конвенциональный роутинг:
//   {controller=Board}/{action=Index}/{id?}
// URL больше НЕ выводится из файловой структуры, а вычисляется из
// имени контроллера и экшена. Контроллеры группируют действия ПО СУЩНОСТЯМ:
//   /Board/Index   - главная страница
//   /Tasks/Move    - перемещение задачи
//   /Users/Delete  - удаление пользователя
// ...в отличие от Razor Pages, где всё про страницу "/" живёт в одном PageModel.
// ============================================================================

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllersWithViews();

// Тот же общий домен, что и в PageController - singleton со состоянием в памяти.
builder.Services.AddSingleton<IBoardStore, InMemoryBoardStore>();

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseRouting();

app.UseAuthorization();

app.MapStaticAssets();

// Конвенция: GET "/" -> BoardController.Index()
app.MapControllerRoute(
        name: "default",
        pattern: "{controller=Board}/{action=Index}/{id?}")
    .WithStaticAssets();

app.Run();
