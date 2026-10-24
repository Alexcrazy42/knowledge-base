import { Tooltip } from './Tooltip';

export function BasicTooltip() {
  return (
    <div style={{ padding: '100px', display: 'flex', gap: '20px' }}>
      <Tooltip content="Это подсказка сверху">
        <button>Наведи на меня (top)</button>
      </Tooltip>

      <Tooltip content="Подсказка снизу" position="bottom">
        <button>Наведи на меня (bottom)</button>
      </Tooltip>

      <Tooltip content="Подсказка слева" position="left">
        <button>Наведи на меня (left)</button>
      </Tooltip>

      <Tooltip content="Подсказка справа" position="right">
        <button>Наведи на меня (right)</button>
      </Tooltip>
    </div>
  );
}