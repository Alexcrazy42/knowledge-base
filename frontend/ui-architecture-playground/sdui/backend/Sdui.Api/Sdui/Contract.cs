using System.Text.Json;

// Server-Driven UI. Контракт JSON-схем экранов.
// Зеркало типов: sd-ui/frontend/src/contract.ts.
// Сериализуется минимальным API в camelCase (JsonSerializer.Web по умолчанию).
namespace Sdui.Api.Sdui;

/// <summary>Схема экрана целиком: заголовок, действия в шапке, секции.</summary>
public sealed record ScreenDoc(
    string View,
    string Title,
    string? Hint,
    IReadOnlyList<ActionDto> Actions,
    IReadOnlyList<Element> Sections);

/// <summary>
/// Действие как данные. Клиент не знает логики - только исполняет по типу.
/// navigate: переход -> GET /api/screens/{screen}?{query}
/// back:     история назад (клиент ведёт стек сам)
/// refresh:  перезапросить текущий экран
/// delete:   подтверждение (Modal от клиента) -> POST /api/runtime/delete
/// </summary>
public sealed record ActionDto(
    string Type,
    string? Label = null,
    string? Screen = null,
    string? Query = null,
    string? Entity = null,
    int? EntityId = null,
    string? Confirm = null,
    string? Op = null,
    int? Delta = null,
    int? Set = null);

/// <summary>
/// Один элемент экрана. Нужные поля заполнены, остальные null -
/// дискриминатор Kind говорит клиенту, какой компонент рендерить.
/// </summary>
public sealed record Element(
    string Kind,
    string? Label = null,
    string? Text = null,
    string? Tone = null,
    IReadOnlyList<Chip>? Chips = null,
    IReadOnlyList<Row>? Rows = null,
    ActionDto? OnOpen = null,
    string? EmptyText = null,
    IReadOnlyList<CardField>? Fields = null,
    IReadOnlyList<ActionButton>? Buttons = null,
    // колоночная раскладка: Kind="grid", Items — панели со своей шириной (span 1..12)
    IReadOnlyList<GridItem>? Items = null,
    // форма
    string? FormId = null,
    int? Id = null,
    string? FormTitle = null,
    string? SubmitLabel = null,
    IReadOnlyList<FormField>? Form = null);

/// <summary>Панель внутри grid: сервер сам рассчитал span из ширины виджета
/// в раскладке (12 = вся строка, 6 = половина и т.д.).</summary>
public sealed record GridItem(int Span, Element El);

/// <summary>Чип-фильтр. У каждого чипа СВОЁ действие (сервер сам говорит,
/// куда ведёт клик) - клиент не выдумывает query по id чипа.</summary>
public sealed record Chip(string Id, string Label, bool Selected = false, ActionDto? Action = null);

/// <summary>Строка списка. У каждой СВОЁ действие на открытие (клик без
/// доменных знаний: сервер сам вложил id в query).</summary>
public sealed record Row(
    string Id,
    string Title,
    string? Subtitle = null,
    string? Trailing = null,
    IReadOnlyList<Tag>? Tags = null,
    ActionDto? Action = null);

public sealed record Tag(string Text, string? Tone = null);

public sealed record CardField(string Label, string Value, string? Tone = null);

public sealed record ActionButton(string Label, string? Tone = null, ActionDto? Action = null);

/// <summary>Поле формы. kind: text | textarea | number | select | switch | date.</summary>
public sealed record FormField(
    string Name,
    string Kind,
    string Label,
    string? Placeholder = null,
    string? Hint = null,
    object? Value = null,
    IReadOnlyList<FormOption>? Options = null,
    Rules? Rules = null);

public sealed record FormOption(string Value, string Label);

/// <summary>Правила валидации поля приходят с сервера (и сервер пер-валидирует на submit).</summary>
public sealed record Rules(
    bool? Required = null,
    int? Min = null,
    int? Max = null,
    int? MinLen = null,
    int? MaxLen = null);

/// <summary>Ответ runtime-мутаций (submit/delete): ok + toast + следующий экран ИЛИ ошибки полей.</summary>
public sealed record MutationReply(
    bool Ok,
    string? Toast = null,
    ActionDto? Next = null,
    IReadOnlyDictionary<string, string>? Errors = null);

public sealed record SubmitRequest(string Form, int? Id, IReadOnlyDictionary<string, JsonElement>? Values = null);

public sealed record DeleteRequest(string Entity, int? Id);

/// <summary>Инлайн-мутация из карточки: op + данные. Клиент не знает, что значит
/// «stock» - он просто шлёт оп и показывает toast/next от сервера.</summary>
public sealed record ApplyRequest(string Op, string Entity, int? Id = null, int? Delta = null, int? Set = null);