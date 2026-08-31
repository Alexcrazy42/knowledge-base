import { useState } from 'react';
import Designer from './designer';
import { DialogHost } from './dialog';
import { ToastHost } from './toast';
import { useScreen } from './use-screen';
import { ScreenView } from './screen-view';

// Слой экрана: клиент лишь рисует то, что прислал бэкенд.
// Никаких знаний о товарах, категориях и формах - только схема + runtime действий.
// Второй режим — «Дизайнер»: отдельная инструментальная страница, которая пишет
// раскладку на сервер; сама витрина рисуется тем же ScreenView.
export default function App() {
  const [mode, setMode] = useState<'app' | 'designer'>('app');
  const { screen, loading, error, navigate, goBack, refresh } = useScreen();
  const ctx = { navigate, goBack, refresh };

  return (
    <div className={'sd-app' + (mode === 'designer' ? ' designer-mode' : '')}>
      {mode === 'designer' ? (
        <Designer
          onExit={() => {
            setMode('app');
            refresh();
          }}
        />
      ) : error ? (
        <div className="banner error">{error}</div>
      ) : loading || !screen ? (
        <div className="loading">Загрузка схемы экрана…</div>
      ) : (
        <>
          <button type="button" className="btn small app-float" onClick={() => setMode('designer')}>
            🛠 Редактор
          </button>
          <ScreenView screen={screen} ctx={ctx} />
        </>
      )}

      <DialogHost />
      <ToastHost />
    </div>
  );
}