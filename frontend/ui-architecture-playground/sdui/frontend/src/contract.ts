// Контракт Server-Driven UI. Зеркало типов: ../backend/Sdui.Api/Sdui/Contract.cs.
// Бэкенд шлёт JSON-схемы экранов; эти типы описывают их без знания домена.

export type ActionDto =
  | { type: 'navigate'; label?: string; screen: string; query?: string }
  | { type: 'back'; label?: string }
  | { type: 'refresh'; label?: string }
  | { type: 'delete'; label?: string; entity: string; entityId: number; confirm?: string }
  | { type: 'reset'; label?: string }
  | {
      type: 'apply';
      label?: string;
      op: string;
      entity: string;
      entityId?: number;
      delta?: number;
      set?: number;
    };

export interface ScreenDoc {
  view: string;
  title: string;
  hint: string | null;
  actions: ActionDto[];
  sections: ElementDto[];
}

export interface ChipDto {
  id: string;
  label: string;
  selected?: boolean;
  action?: ActionDto | null;
}

export interface TagDto {
  text: string;
  tone?: string | null;
}

export interface RowDto {
  id: string;
  title: string;
  subtitle?: string | null;
  trailing?: string | null;
  tags?: TagDto[] | null;
  action?: ActionDto | null;
}

export interface CardFieldDto {
  label: string;
  value: string;
  tone?: string | null;
}

export interface ActionButtonDto {
  label: string;
  tone?: string | null;
  action?: ActionDto | null;
}

export type ElementDto =
  | { kind: 'banner'; text: string; tone?: string | null }
  | { kind: 'chips'; label?: string | null; chips: ChipDto[]; onSelect: ActionDto }
  | { kind: 'list'; rows: RowDto[]; onOpen: ActionDto; emptyText?: string | null }
  | { kind: 'card'; fields: CardFieldDto[]; buttons?: ActionButtonDto[] | null }
  | { kind: 'actions'; buttons: ActionButtonDto[] }
  | { kind: 'grid'; items: GridItemDto[] }
  | { kind: 'form'; formId: string; id?: number | null; submitLabel: string; form: FormFieldDto[] };

export interface GridItemDto {
  span: number;
  el: ElementDto;
}

export interface RulesDto {
  required?: boolean | null;
  min?: number | null;
  max?: number | null;
  minLen?: number | null;
  maxLen?: number | null;
}

export type FormFieldDto =
  | { name: string; kind: 'text' | 'date'; label: string; placeholder?: string | null; hint?: string | null; value?: string | null; rules?: RulesDto }
  | { name: string; kind: 'textarea'; label: string; placeholder?: string | null; hint?: string | null; value?: string | null; rules?: RulesDto }
  | { name: string; kind: 'number'; label: string; unit?: string | null; hint?: string | null; value?: number | null; rules?: RulesDto }
  | { name: string; kind: 'select'; label: string; value?: string | null; options: { value: string; label: string }[]; hint?: string | null; rules?: RulesDto }
  | { name: string; kind: 'switch'; label: string; value?: boolean | null; hint?: string | null };

export interface MutationReply {
  ok: boolean;
  toast?: string | null;
  next?: ActionDto | null;
  errors?: Record<string, string>;
}

// ---- Раскладки экранов (режим дизайнера, Grafana-like) ----
// Клиент получает и сами раскладки, и ОПИСАНИЕ виджетов с сервера: палитра
// строится по данным, а код дизайнера не знает имён панелей.

export interface LayoutItem {
  id: string;
  kind: string;
  width: number;
  props: Record<string, string | number | boolean>;
}

export interface LayoutAction {
  type: string;
  label?: string | null;
  enabled: boolean;
}

export interface ScreenLayoutDto {
  screen: string;
  title: string;
  hint: string;
  sections: LayoutItem[];
  actions: LayoutAction[];
}

export interface PropSpecDto {
  key: string;
  label: string;
  type: 'bool' | 'number' | 'text';
  default?: string | number | boolean | null;
}

export interface WidgetSpecDto {
  kind: string;
  title: string;
  description: string;
  props: PropSpecDto[];
}

export interface ActionSpecDto {
  type: string;
  label: string;
  defaultLabel?: string | null;
}

export interface ScreenMetaDto {
  screen: string;
  widgets: WidgetSpecDto[];
  actions: ActionSpecDto[];
}