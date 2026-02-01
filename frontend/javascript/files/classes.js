class Person {
    #name;

    constructor(name) {
        this.#name = name;
    }

    greet() {
        console.log(`Привет, я ${this.#name}`);
    }
}

var person = new Person("Alica");
person.greet();

var range = range(1, 5);
console.log(range);

function* range(min, max) {
    for(let i = Math.ceil(min); i <= max; i++) {
        yield i;
    } 
}

var a = 0;
while(a < 10_000_000)
{
    a += 1;
    if(a % 1_000_000 == 0)
    {
        console.log(a);
        let currentValue = a / 1_000_000;
        setTimeout(() => console.log(currentValue), getRandomInt(1000));
    }
}

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

// 445