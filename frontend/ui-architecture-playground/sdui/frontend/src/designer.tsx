import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import type { LayoutItem, PropSpecDto, ScreenLayoutDto, ScreenMetaDto, ScreenDoc, WidgetSpecDto } from './contract';
import type { Route } from './use-screen';
import { fetchLayout, fetchLayoutMeta, restoreLayout, saveLayout } from './layout';
import { fetchScreen } from './api';
import { ScreenView } from './screen-view';
import { pushToast } from './toast';
import { confirmDialog } from './dialog';
import type { RuntimeCtx } from './run-action';

// Режим дизайнера (Grafana-like). Сама страница — обычный React-инструмент;
// она НЕ формирует экран клиентом: пишет раскладку на сервер, а витрина
// рендерит экран из схемы, которую сервер собрал по этой раскладке.
// Палитра виджетов и их настройки приходят с сервера (meta) - код отсюда
// не знает имён конкретных панелей.

export default function Designer({ onExit }: { onExit: () => void }) {
  const [meta, setMeta] = useState<ScreenMetaDto[]>([]);
  const [metaErr, setMetaErr] = useState<string | null>(null);
  const [screen, setScreen] = useState('catalog');
  const [layout, setLayout] = useState<ScreenLayoutDto | null>(null);
  const [saving, setSaving] = useState(false);
  const preview = usePreview();

  const metaFor = meta.find((m) => m.screen === screen);

  useEffect(() => {
    fetchLayoutMeta()
      .then(setMeta)
      .catch((e) => setMetaErr(e instanceof Error ? e.message : String(e)));
  }, []);

  useEffect(() => {
    void fetchLayout(screen)
      .then((l) => setLayout(l))
      .catch((e) => pushToast(e instanceof Error ? e.message : String(e)));
    void preview.load(screen, screen === 'product' ? 'id=1' : undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  const makeItem = (spec: WidgetSpecDto): LayoutItem => {
    const props: LayoutItem['props'] = {};
    for (const p of spec.props) props[p.key] = p.default ?? defaultPropValue(p.type);
    return { id: `${spec.kind}-${Date.now()}`, kind: spec.kind, width: 12, props };
  };

  const addSection = (spec: WidgetSpecDto, at?: number) => {
    setLayout((l) => {
      if (!l) return l;
      const item = makeItem(spec);
      const atIdx = at ?? l.sections.length;
      const sections = [...l.sections.slice(0, atIdx), item, ...l.sections.slice(atIdx)];
      return { ...l, sections };
    });
  };

  const removeSection = (i: number) =>
    setLayout((l) => (l ? { ...l, sections: l.sections.filter((_, idx) => idx !== i) } : l));

  const moveSection = (from: number, to: number) =>
    setLayout((l) => {
      if (!l || to < 0 || to >= l.sections.length) return l;
      const sections = [...l.sections];
      const [item] = sections.splice(from, 1);
      sections.splice(to, 0, item);
      return { ...l, sections };
    });

  // кнопки шапки: у всех действий есть «место» в списке (вкл./выкл. + текст)
  const actionCfg = (type: string) =>
    layout?.actions.find((a) => a.type === type) ?? { type, label: null, enabled: true };

  const patchAction = (type: string, patch: Partial<{ label: string | null; enabled: boolean }>) =>
    setLayout((l) => {
      if (!l) return l;
      const actions = l.actions.some((a) => a.type === type)
        ? l.actions.map((a) => (a.type === type ? { ...a, ...patch } : a))
        : [...l.actions, { type, label: null, enabled: true, ...patch }];
      return { ...l, actions };
    });

  const moveAction = (type: string, dir: -1 | 1) =>
    setLayout((l) => {
      if (!l) return l;
      const actions = [...l.actions];
      const i = actions.findIndex((a) => a.type === type);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= actions.length) return l;
      [actions[i], actions[j]] = [actions[j], actions[i]];
      return { ...l, actions };
    });

  const apply = async () => {
    if (!layout) return;
    setSaving(true);
    try {
      const saved = await saveLayout(screen, layout);
      setLayout(saved);
      pushToast('Раскладка сохранена на сервер');
      await preview.load(screen, screen === 'product' ? 'id=1' : undefined);
    } catch (e) {
      pushToast(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const restore = async () => {
    const ok = await confirmDialog({
      title: 'Вернуть стандартную раскладку?',
      message: 'Ваши панели будут удалены, экран станет как при первом запуске.',
      okLabel: 'Восстановить',
    });
    if (!ok) return;
    try {
      setLayout(await restoreLayout(screen));
      pushToast('Стандартная раскладка восстановлена');
      await preview.load(screen, screen === 'product' ? 'id=1' : undefined);
    } catch (e) {
      pushToast(e instanceof Error ? e.message : String(e));
    }
  };

  if (metaErr)
    return (
      <div className="banner error">
        {metaErr} <button type="button" className="btn" onClick={onExit}>← Витрина</button>
      </div>
    );

  return (
    <div className="designer">
      <header className="designer-top">
        <div className="designer-brand">
          <button type="button" className="btn ghost" onClick={onExit}>← Витрина</button>
          <span className="brand">ДИЗАЙНЕР</span>
        </div>
        <label className="designer-screen">
          Страница
          <select value={screen} onChange={(e) => setScreen(e.target.value)}>
            <option value="catalog">Каталог</option>
            <option value="product">Карточка товара</option>
          </select>
        </label>
        <div className="designer-actions">
          <button type="button" className="btn ghost" onClick={() => void restore()}>Восстановить стандарт</button>
          <button type="button" className="btn primary" onClick={() => void apply()} disabled={saving}>
            {saving ? 'Сохраняю…' : '💾 Сохранить раскладку'}
          </button>
        </div>
      </header>

      {metaFor && layout ? (
        <div className="designer-body">
          <aside className="palette">
            <h3>Панели страницы</h3>
            {metaFor.widgets.map((w) => (
              <div
                key={w.kind}
                className="palette-item"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', w.kind);
                  e.dataTransfer.effectAllowed = 'copy';
                }}
              >
                <div className="palette-title">{w.title}</div>
                <div className="palette-desc">{w.description}</div>
                <button type="button" className="btn small" onClick={() => addSection(w)}>+ Добавить</button>
              </div>
            ))}

            <h3>Кнопки шапки</h3>
            <div className="action-list">
              {metaFor.actions.map((a, i) => {
                const cfg = actionCfg(a.type);
                return (
                  <div key={a.type} className={'action-row' + (cfg.enabled ? '' : ' off')}>
                    <div className="action-row-top">
                      <input
                        type="checkbox"
                        checked={cfg.enabled}
                        onChange={(e) => patchAction(a.type, { enabled: e.target.checked })}
                        title="Показывать кнопку"
                      />
                      <input
                        className="action-label"
                        name={a.type}
                        value={cfg.label ?? ''}
                        placeholder={a.label}
                        disabled={!cfg.enabled}
                        onChange={(e) => patchAction(a.type, { label: e.target.value || null })}
                      />
                      <span className="action-order">{i + 1}</span>
                      <button type="button" className="btn small ghost" onClick={() => moveAction(a.type, -1)} disabled={i === 0}>↑</button>
                      <button type="button" className="btn small ghost" onClick={() => moveAction(a.type, 1)} disabled={i === metaFor.actions.length - 1}>↓</button>
                    </div>
                    {!cfg.enabled && <div className="action-note">выключена на экране</div>}
                  </div>
                );
              })}
            </div>

            <h3>Заголовок</h3>
            <div className="title-editor">
              <input
                value={layout.title}
                placeholder="Заголовок страницы"
                onChange={(e) => setLayout((l) => (l ? { ...l, title: e.target.value } : l))}
              />
              <input
                value={layout.hint}
                placeholder="Подзаголовок ({count} подставится из каталога)"
                onChange={(e) => setLayout((l) => (l ? { ...l, hint: e.target.value } : l))}
              />
            </div>
          </aside>

          <main className="designer-canvas">
            <h3>Холст — порядок панелей (перетаскивайте)</h3>
            {layout.sections.length === 0 && (
              <div className="banner warn">Панелей нет: экран покажет только шапку. Добавьте из палитры.</div>
            )}
            {layout.sections.map((s, i) => {
              const spec = metaFor.widgets.find((w) => w.kind === s.kind);
              return (
                <PanelCard
                  key={s.id}
                  item={s}
                  spec={spec}
                  index={i}
                  total={layout.sections.length}
                  onDrop={(at) => dropOnCanvas(at)}
                  onMove={moveSection}
                  onRemove={() => removeSection(i)}
                  onChange={(patch) =>
                    setLayout((l) => (l ? { ...l, sections: l.sections.map((x, idx) => (idx === i ? { ...x, ...patch } : x)) } : l))
                  }
                />
              );
            })}
            <div
              className="drop-zone"
              onDragOver={(e) => {
                e.preventDefault();
              }}
              onDrop={(e) => dropOnCanvas(e)}
            >
              ⟳ перетащите панель сюда (или в конец списка)
            </div>
          </main>

          <section className="designer-preview">
            <h3>Предпросмотр экрана</h3>
            <div className="preview-wrap">
              {preview.doc ? (
                <ScreenView screen={preview.doc} ctx={preview.ctx} brand="ПРЕВЬЮ" />
              ) : preview.err ? (
                <div className="banner error">{preview.err}</div>
              ) : (
                <div className="loading">Загружаю схему…</div>
              )}
            </div>
          </section>
        </div>
      ) : (
        <div className="loading">Загружаю раскладку…</div>
      )}
    </div>
  );

  function dropOnCanvas(e: DragEvent<HTMLDivElement>, at?: number) {
    const raw = e.dataTransfer.getData('text/plain');
    e.dataTransfer.clearData();
    if (raw.startsWith('reorder:')) {
      const from = Number(raw.slice('reorder:'.length));
      const to = at ?? (layout ? layout.sections.length - 1 : 0);
      if (Number.isFinite(from) && from >= 0 && from !== to) moveSection(from, to);
      return;
    }
    if (raw && metaFor) {
      const spec = metaFor.widgets.find((w) => w.kind === raw);
      if (spec) addSection(spec, at);
    }
  }
}

function defaultPropValue(type: string): string | number | boolean {
  return type === 'bool' ? false : type === 'number' ? 0 : '';
}

function PanelCard({
  item,
  spec,
  index,
  total,
  onDrop,
  onMove,
  onRemove,
  onChange,
}: {
  item: LayoutItem;
  spec: WidgetSpecDto | undefined;
  index: number;
  total: number;
  onDrop: (e: DragEvent<HTMLDivElement>, at: number) => void;
  onMove: (from: number, to: number) => void;
  onRemove: () => void;
  onChange: (patch: Partial<LayoutItem>) => void;
}) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>, i: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (overIdx !== i) setOverIdx(i);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, i: number) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('text/plain');
    e.dataTransfer.clearData();
    if (raw.startsWith('reorder:')) {
      const from = Number(raw.slice('reorder:'.length));
      if (Number.isFinite(from) && from !== i) onMove(from, i);
    } else if (raw) {
      onDrop(e, i);
    }
    setDragIdx(null);
    setOverIdx(null);
  };

  return (
    <div
      className={'designer-panel' + (dragIdx === index ? ' dragging' : '') + (overIdx === index ? ' drop-over' : '')}
      draggable
      onDragStart={(e) => {
        setDragIdx(index);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', `reorder:${index}`);
      }}
      onDragOver={(e) => handleDragOver(e, index)}
      onDrop={(e) => handleDrop(e, index)}
      onDragEnd={() => {
        setDragIdx(null);
        setOverIdx(null);
      }}
    >
      <div className="panel-head">
        <span className="drag-handle" title="Перетащить">≡</span>
        <span className="panel-kind">{spec?.title ?? item.kind}</span>
        <span className="panel-desc">{spec?.description}</span>
        <span className={'panel-width' + (item.width !== 12 ? ' narrow' : '')}>
          {item.width === 12 ? '1/1' : item.width === 6 ? '1/2' : item.width === 4 ? '1/3' : `${item.width}/12`}
        </span>
        <div className="panel-tools">
          <span className="width-picker" title="Ширина панели — узкие (1/2, 1/3) лягут рядом">
            {([12, 6, 4] as const).map((w) => (
              <button
                key={w}
                type="button"
                className={'btn small ghost' + (item.width === w ? ' active' : '')}
                onClick={() => onChange({ width: w })}
              >
                {w === 12 ? '1/1' : w === 6 ? '1/2' : '1/3'}
              </button>
            ))}
          </span>
          <button type="button" className="btn small ghost" onClick={() => onMove(index, index - 1)} disabled={index === 0}>↑</button>
          <button type="button" className="btn small ghost" onClick={() => onMove(index, index + 1)} disabled={index === total - 1}>↓</button>
          <button type="button" className="btn small danger" onClick={onRemove} title="Убрать панель">✕</button>
        </div>
      </div>
      {spec && spec.props.length > 0 && (
        <div className="panel-props">
          {spec.props.map((p) => (
            <PropEditor
              key={p.key}
              spec={p}
              value={item.props[p.key] ?? p.default ?? defaultPropValue(p.type)}
              onChange={(v) => onChange({ props: { ...item.props, [p.key]: v } })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PropEditor({ spec, value, onChange }: { spec: PropSpecDto; value: string | number | boolean; onChange: (v: string | number | boolean) => void }) {
  if (spec.type === 'bool') {
    return (
      <label className="prop">
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
        {spec.label}
      </label>
    );
  }
  if (spec.type === 'text') {
    return (
      <label className="prop prop-field">
        <span className="prop-label">{spec.label}</span>
        <input type="text" value={(value as string) ?? ''} placeholder="—" onChange={(e) => onChange(e.target.value)} />
      </label>
    );
  }
  return (
    <label className="prop prop-field">
      <span className="prop-label">{spec.label}</span>
      <input type="number" value={value as number} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

// Живой предпросмотр: тот же рендерер витрины, но с мини-навигацией,
// которая перезапрашивает схему у сервера (по текущей сохранённой раскладке).
function usePreview() {
  const [doc, setDoc] = useState<ScreenDoc | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const route = useRef<Route>({ screen: 'catalog' });
  const hist = useRef<Route[]>([]);

  const load = useCallback(async (screen: string, query?: string) => {
    route.current = { screen, query };
    try {
      setDoc(await fetchScreen(screen, query));
      setErr(null);
    } catch (e) {
      setDoc(null);
      setErr(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const ctx = useMemo<RuntimeCtx>(
    () => ({
      navigate: (r) => {
        hist.current.push(route.current);
        void load(r.screen, r.query);
      },
      goBack: () => {
        const prev = hist.current.pop();
        if (prev) void load(prev.screen, prev.query);
      },
      refresh: () => void load(route.current.screen, route.current.query),
    }),
    [load],
  );

  return { doc, err, ctx, load };
}