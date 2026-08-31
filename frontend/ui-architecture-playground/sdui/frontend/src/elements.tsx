import type { ActionButtonDto, ActionDto, ElementDto } from './contract';
import { defaultActionLabel } from './api';
import type { RuntimeCtx } from './run-action';
import { runAction } from './run-action';
import { FormSection } from './form';

// Единственный switch, который знает, КАК РИСОВАТЬ элементы схемы.
// Добавить новый элемент экрана на клиенте = добавить case здесь;
// добавить новый экран на бэкенде вообще не требует изменений фронтенда.

export function ScreenElement({ el, ctx }: { el: ElementDto; ctx: RuntimeCtx }) {
  switch (el.kind) {
    case 'banner':
      return <BannerSection el={el} />;
    case 'chips':
      return <ChipsSection el={el} ctx={ctx} />;
    case 'list':
      return <ListSection el={el} ctx={ctx} />;
    case 'card':
      return <CardSection el={el} ctx={ctx} />;
    case 'actions':
      return <ActionsSection el={el} ctx={ctx} />;
    case 'grid':
      return <GridSection el={el} ctx={ctx} />;
    case 'form':
      return <FormSection el={el} ctx={ctx} />;
    default:
      // Жёсткая деградация: клиент старше бэкенда. Покажем, что элемент
      // пришёл, но не сломимся.
      return <FallbackSection el={el as unknown as ElementDto} />;
  }
}

function BannerSection({ el }: { el: Extract<ElementDto, { kind: 'banner' }> }) {
  return <div className={'banner ' + (el.tone ?? 'info')}>{el.text}</div>;
}

function ChipsSection({ el, ctx }: { el: Extract<ElementDto, { kind: 'chips' }>; ctx: RuntimeCtx }) {
  return (
    <div className="chips">
      {el.label && <span className="chips-label">{el.label}</span>}
      {el.chips.map((c) => (
        <button
          key={c.id}
          type="button"
          className={'chip ' + (c.selected ? 'selected' : '')}
          onClick={() => void runAction(c.action ?? el.onSelect, ctx)}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}

function ListSection({ el, ctx }: { el: Extract<ElementDto, { kind: 'list' }>; ctx: RuntimeCtx }) {
  if (el.rows.length === 0)
    return <div className="banner warn">{el.emptyText ?? 'Ничего не найдено'}</div>;
  return (
    <div className="list">
      {el.rows.map((r) => (
        <button key={r.id} type="button" className="row" onClick={() => void runAction(r.action ?? el.onOpen, ctx)}>
          <span className="row-title">{r.title}</span>
          {r.subtitle && <span className="row-sub">{r.subtitle}</span>}
          <span className="row-tags">
            {r.tags?.map((t, i) => (
              <span key={i} className={'tag ' + (t.tone ?? '')}>
                {t.text}
              </span>
            ))}
          </span>
          {r.trailing && <span className="row-trailing">{r.trailing}</span>}
        </button>
      ))}
    </div>
  );
}

function CardSection({ el, ctx }: { el: Extract<ElementDto, { kind: 'card' }>; ctx: RuntimeCtx }) {
  return (
    <div className="card">
      {el.fields.map((f, i) => (
        <div key={i} className="kv">
          <dt>{f.label}</dt>
          <dd className={f.tone ?? ''}>{f.value}</dd>
        </div>
      ))}
      {el.buttons && el.buttons.length > 0 && (
        <div className="card-buttons">
          {el.buttons.map((b, i) =>
            b.action ? <ActionButton key={i} action={b.action} label={b.label} tone={b.tone} ctx={ctx} small /> : null,
          )}
        </div>
      )}
    </div>
  );
}

function ActionsSection({ el, ctx }: { el: Extract<ElementDto, { kind: 'actions' }>; ctx: RuntimeCtx }) {
  return (
    <div className="buttons-row">
      {el.buttons.map((b: ActionButtonDto, i: number) =>
        b.action ? <ActionButton key={i} action={b.action} label={b.label} tone={b.tone} ctx={ctx} /> : null,
      )}
    </div>
  );
}

function GridSection({ el, ctx }: { el: Extract<ElementDto, { kind: 'grid' }>; ctx: RuntimeCtx }) {
  return (
    <div className="grid">
      {el.items.map((it, i) => (
        <div key={i} className="grid-col" style={{ gridColumn: `span ${Math.max(1, Math.min(12, it.span))}` }}>
          <ScreenElement el={it.el} ctx={ctx} />
        </div>
      ))}
    </div>
  );
}

export function ActionButton({
  action,
  label,
  tone,
  ctx,
  small,
}: {
  action: ActionDto;
  label?: string;
  tone?: string | null;
  ctx: RuntimeCtx;
  small?: boolean;
}) {
  const text = label ?? action.label ?? defaultActionLabel(action);
  const cls = 'btn ' + (small ? 'small ' : '') + (tone === 'danger' ? 'danger' : tone === 'ghost' ? 'ghost' : tone === 'primary' ? '' : '');
  return (
    <button type="button" className={cls} onClick={() => void runAction(action, ctx)}>
      {text}
    </button>
  );
}

function FallbackSection({ el }: { el: ElementDto }) {
  return (
    <div className="banner warn">
      Неизвестный элемент схемы <code>{el.kind}</code> — клиент не знает, как его рисовать
    </div>
  );
}