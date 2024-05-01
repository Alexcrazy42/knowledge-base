import { EVENT_EMITTERS_CALLBACKS_PARAMS } from '@constants/eventEmitterEmits';

interface IKeyFuncVal {
    [k: string]: (...args) => any;
}

export class EventEmitter<Events extends IKeyFuncVal, Key extends keyof Events = keyof Events> {
    logEmits: boolean = false;
    private listeners: Map<Key, Set<Events[Key]>> = new Map();

    async emit<K extends Key>(eventName: K, ...restParams: Parameters<Events[K]>) {
        const events = this.listeners.get(eventName);

        if (this.logEmits) {
            let subscribersCount = 0;
            if (events) subscribersCount = events.size;

            console.log(`EventEmitter emits: "${String(eventName)}", subscribers: ${subscribersCount}`);
        }

        if (events) {
            const eventsArray = Array.from(events);
            for (const fn of eventsArray) {
                await fn.call(null, ...restParams);
            }
        }
    }

    on<K extends Key>(eventName: K, fn: Events[K]): () => void {
        if (!this.listeners.get(eventName)) {
            this.listeners.set(eventName, new Set());
        }

        const events = this.listeners.get(eventName);

        events.add(fn);

        // or use unsubscribe function
        return this.off.bind(this, eventName, fn);
    }

    once<K extends Key>(eventName: K, fn: Events[K]): () => void {
        // @ts-ignore
        const unsubscribe = this.on(eventName, (...args: any[]) => {
            fn(...args);
            unsubscribe();
        });

        return unsubscribe;
    }

    off<K extends Key>(eventName: K, fn: Events[K]) {
        const events = this.listeners.get(eventName);

        if (events) events.delete(fn);
    }
}

export const globalEventEmitter = new EventEmitter<EVENT_EMITTERS_CALLBACKS_PARAMS>();
