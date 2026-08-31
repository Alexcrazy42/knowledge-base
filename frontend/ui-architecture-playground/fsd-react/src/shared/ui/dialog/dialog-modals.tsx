// ============================================================================
// Готовые модалки поверх ask(): prompt (ввод строки, режим "слово СБРОС")
// и confirm (да/нет). Разметка 1:1 с Vue-версией, чтобы UI-тесты
// других проектов были переносимы.
// ============================================================================

import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { ModalShell } from '../modal-shell';
import { ask } from './dialog-service';

interface PromptModalProps {
    title: string;
    label?: string;
    initial?: string;
    confirmWord?: string | null;
    onAnswer: (value: string | null) => void;
}

export function PromptModal({ title, label = '', initial = '', confirmWord = null, onAnswer }: PromptModalProps) {
    const [value, setValue] = useState(initial);

    const ok = () => {
        // Режим confirmWord: кнопка OK не сработает, пока не введено точное слово.
        if (confirmWord && value.trim() !== confirmWord) return;
        onAnswer(value);
    };

    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') ok();
    };

    return (
        <ModalShell onCancel={() => onAnswer(null)}>
            <h3>{title}</h3>
            <label className="field-label">{label}</label>
            {/* autoFocus + Enter подтверждает - как в Vue-версии */}
            <input
                className="input"
                value={value}
                autoFocus
                onChange={e => setValue(e.target.value)}
                onKeyDown={onKeyDown}
            />
            {confirmWord && <p className="hint danger">Для подтверждения введите слово {confirmWord}</p>}
            <div className="modal-actions">
                <button className="btn primary" onClick={ok}>OK</button>
                <button className="btn" onClick={() => onAnswer(null)}>Отмена</button>
            </div>
        </ModalShell>
    );
}

interface ConfirmModalProps {
    message: string;
    onAnswer: (value: boolean) => void;
}

export function ConfirmModal({ message, onAnswer }: ConfirmModalProps) {
    return (
        <ModalShell onCancel={() => onAnswer(false)}>
            <h3>Подтверждение</h3>
            <p>{message}</p>
            <div className="modal-actions">
                <button className="btn primary" onClick={() => onAnswer(true)}>Да</button>
                <button className="btn" onClick={() => onAnswer(false)}>Отмена</button>
            </div>
        </ModalShell>
    );
}

/** await prompt({ title: 'Новая доска', label: 'Название доски:' }) -> string | null */
export function prompt(options: Omit<PromptModalProps, 'onAnswer'>): Promise<string | null> {
    return ask<string | null>(answer => <PromptModal {...options} onAnswer={answer} />);
}

/** await confirm('Удалить доску?') -> boolean */
export function confirm(message: string): Promise<boolean> {
    return ask<boolean>(answer => <ConfirmModal message={message} onAnswer={answer} />);
}
