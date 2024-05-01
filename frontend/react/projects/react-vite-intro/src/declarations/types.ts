import React from 'react';
export type anyObject = { [k: string]: any };
export type anyClass<T> = { new (): T };
export type anyFunction = (...args: any[]) => any;

export interface EventDOM extends Event {
    target: HTMLElement;
}

export type ReactChangeEventFunc = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => any;

export type ReactChangeEvent = React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;

/**
 * Get more info about standard types from: https://github.com/microsoft/TypeScript/blob/v3.8.3/lib/lib.es5.d.ts#L1496
 */
