1. Главу 6 с продвинутыми типами возможно потом следует перечитать, когда станет больше понимания в JS/TS

2. keyof, typeof, instanceof, in, as, is, extends, infer, 

2. в этом разобраться:
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


Номинальная и структурная типизации

