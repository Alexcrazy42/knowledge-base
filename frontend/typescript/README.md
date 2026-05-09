1. Главу 6 с продвинутыми типами возможно потом следует перечитать, когда станет больше понимания в JS/TS

2. keyof, typeof, instanceof, in, as, is, extends, infer

3. в этом разобраться:
```
function logMethod(target: any, key: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = function (...args: any[]) {
        console.log(`Calling ${key} with args:`, args);
        return originalMethod.apply(this, args);
    };
    return descriptor;
}

class Calculator {
    @logMethod
    add(a: number, b: number) {
        return a + b;
    }
}
```


4. Номинальная и структурная типизации

5. 228 - 244 глава про асинхронность.

6. SharedArrayBuffer, Atomics; Mutex из async-mutex или workerpoll, хотя под капотом Atomics (ES2017) при использовании Web Workers или Worker Threads

7. Модели, пространства имен