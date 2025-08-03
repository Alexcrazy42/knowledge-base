# Обработка ошибок


## Возврат исключений

TypeScript не Java и он не подерживает спецификатор throws. Но мы можем смоделировать их возможности с помощью типов объединений:

```
// ...
function parse(
 birthday: string
): Date | InvalidDateFormatError | DateIsInTheFutureError {
 let date = new Date(birthday)
 if (!isValid(date)) {
 return new InvalidDateFormatError('Enter a date in the form
 YYYY/MM/DD')
 }
 if (date.getTime() > Date.now()) {
 return new DateIsInTheFutureError('Are you a timelord?')
 }
 return date
}
```

Теперь потребитель вынужен обработать все три случая: InvalidFormatError, DateIsInTheFutureError и удачное счиытвание. В противном случае при компиляции появится TypeError:

```
// ...
let result = parse(ask()) // Либо дата, либо ошибка.
if (result instanceof InvalidDateFormatError) {
 console.error(result.message)
} else if (result instanceof DateIsInTheFutureError) {
 console.info(result.message)
} else {
 console.info('Date is', result.toISOString())
}
```

## Тип Option

