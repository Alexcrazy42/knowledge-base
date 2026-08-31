// ============================================================================
// Безопасная обёртка над localStorage (gherkin: Persistence).
// Приватный режим браузера бросает исключение - глушим, приложение живёт
// в памяти до перезагрузки.
// ============================================================================

export function loadJson<T>(key: string): T | null {
    try {
        const raw = localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : null;
    } catch {
        return null;
    }
}

export function saveJson(key: string, value: unknown): void {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        /* приватный режим / переполнение квоты */
    }
}

export function removeKey(key: string): void {
    try {
        localStorage.removeItem(key);
    } catch {
        /* ignore */
    }
}
