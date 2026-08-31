import type { ScreenDoc } from './contract';
import type { RuntimeCtx } from './run-action';
import { ActionButton, ScreenElement } from './elements';
import { JsonInspector } from './json-inspector';

// Общий рендер экрана по схеме: шапка + экшены + секции + инспектор JSON.
// Используется и как экран приложения, и как живое превью в режиме дизайнера.
export function ScreenView({ screen, ctx, brand = 'SDUI' }: { screen: ScreenDoc; ctx: RuntimeCtx; brand?: string }) {
  return (
    <>
      <header className="topbar">
        <span className="brand">{brand}</span>
        <h1>
          {screen.title}
          {screen.hint && <span className="hint">{screen.hint}</span>}
        </h1>
      </header>

      <nav className="actions">
        {screen.actions.map((a, i) => (
          <ActionButton key={i} action={a} ctx={ctx} />
        ))}
      </nav>

      <main className="sections">
        {screen.sections.map((el, i) => (
          <div key={i} className="section">
            <ScreenElement el={el} ctx={ctx} />
          </div>
        ))}
      </main>

      <JsonInspector screen={screen} />
    </>
  );
}