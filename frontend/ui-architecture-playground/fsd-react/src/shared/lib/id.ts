/** Глобальный уникальный id (аналог Guid.NewGuid() из BoardApp.Core). */
export const uid = (): string => crypto.randomUUID();
