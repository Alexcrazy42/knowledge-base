import { useRef, useState } from 'react';
import type { ElementDto, FormFieldDto, RulesDto } from './contract';
import { submitForm } from './api';
import { pushToast } from './toast';
import type { RuntimeCtx } from './run-action';
import { runAction } from './run-action';

type FormElement = Extract<ElementDto, { kind: 'form' }>;
type Control = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

// Форма тоже приходит "как данные": поля, правила, submitLabel - с бэкенда.
// Локальная копия правил даёт мгновенную подсказку, но НЕ блокирует отправку:
// финальный арбитр - сервер, чьи Errors перезаписывают локальные,
// а "next" снова говорит, куда идти.
export function FormSection({ el, ctx }: { el: FormElement; ctx: RuntimeCtx }) {
  const controls = useRef<Record<string, Control | null>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const localErrors = (): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const f of el.form) {
      const msg = validateField(f, readValue(controls.current[f.name], f));
      if (msg) out[f.name] = msg;
    }
    return out;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const live = localErrors();
    if (Object.keys(live).length > 0) setErrors(live);

    setBusy(true);
    try {
      const values: Record<string, string | number | boolean> = {};
      for (const f of el.form) values[f.name] = readValue(controls.current[f.name], f);
      const reply = await submitForm({ form: el.formId, id: el.id ?? undefined, values });
      if (!reply.ok) {
        setErrors({ ...live, ...(reply.errors ?? {}) });
        if (reply.toast) pushToast(reply.toast);
      } else {
        if (reply.toast) pushToast(reply.toast);
        if (reply.next) await runAction(reply.next, ctx);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="form" onSubmit={(e) => void onSubmit(e)} noValidate>
      {el.form.map((f) => (
        <div key={f.name} className="field">
          <label htmlFor={f.name}>{f.label}</label>
          {renderField(f, (node) => (controls.current[f.name] = node))}
          {f.hint && f.kind !== 'number' && <span className="hint">{f.hint}</span>}
          {errors[f.name] && <span className="field-error">{errors[f.name]}</span>}
        </div>
      ))}
      <div className="form-actions">
        <button type="submit" className="btn primary" disabled={busy}>
          {busy ? 'Отправка…' : el.submitLabel}
        </button>
      </div>
    </form>
  );
}

function renderField(f: FormFieldDto, ref: (node: Control | null) => void) {
  switch (f.kind) {
    case 'text':
      return (
        <input
          id={f.name}
          name={f.name}
          ref={ref}
          type="text"
          defaultValue={f.value ?? ''}
          placeholder={f.placeholder ?? ''}
          autoComplete="off"
        />
      );
    case 'date':
      return <input id={f.name} name={f.name} ref={ref} type="date" defaultValue={f.value ?? ''} />
    case 'textarea':
      return <textarea id={f.name} name={f.name} ref={ref} defaultValue={f.value ?? ''} placeholder={f.placeholder ?? ''} rows={3} />;
    case 'number':
      return (
        <span className="number-wrap">
          <input id={f.name} name={f.name} ref={ref} type="number" step="any" defaultValue={f.value ?? ''} inputMode="decimal" />
          {f.hint && <span className="unit">{f.hint}</span>}
        </span>
      );
    case 'select':
      return (
        <select id={f.name} name={f.name} ref={ref} defaultValue={f.value ?? ''}>
          {f.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    case 'switch':
      return <input id={f.name} name={f.name} ref={ref} type="checkbox" defaultChecked={f.value ?? false} />;
  }
}

function readValue(node: Control | null | undefined, f: FormFieldDto): string | boolean {
  if (!node) return f.kind === 'switch' ? false : '';
  if (node instanceof HTMLInputElement) return node.type === 'checkbox' ? node.checked : node.value;
  return node.value;
}

function validateField(f: FormFieldDto, raw: string | boolean): string | null {
  if (f.kind === 'switch') return null;
  const rules: RulesDto = f.rules ?? {};

  if (f.kind === 'number') {
    const n = typeof raw === 'number' ? raw : parseFloat(String(raw));
    const empty = raw === '' || Number.isNaN(n);
    if (rules.required && empty) return 'Обязательное поле';
    if (!empty) {
      if (rules.min != null && n < rules.min) return `Минимум ${rules.min}`;
      if (rules.max != null && n > rules.max) return `Максимум ${rules.max}`;
    }
    return null;
  }

  const s = String(raw);
  if (rules.required && s.trim() === '') return 'Обязательное поле';
  if (rules.minLen != null && s.trim().length < rules.minLen) return `Минимум ${rules.minLen} символов`;
  if (rules.maxLen != null && s.length > rules.maxLen) return `Максимум ${rules.maxLen} символов`;
  return null;
}