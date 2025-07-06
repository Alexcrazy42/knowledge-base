var a = [];
a.push(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 1, 1, 1, 1, 1,1 ,11, 1, 1, 1, 1);

var point = new Point(1, 1);


var ar = [1, 2, 3, 4, 5, 6, "test"]
ar[1000] = 1;
delete ar[0];
delete ar[1];

var sum = 0;

a.forEach((value) => sum += Math.pow(value, 2));
console.log(a.map((value) => Math.pow(value, 2)));
console.log(a.filter((x) => x > 3))
console.log(a.every((x) => x > 2));
console.log(a.some((x) => x > 2));


console.log(typeof a);
console.log(Object.prototype.toString(a));
console.log(Object.prototype.toString.call(a));

f(5, [1, 2], 1);

function f(x, y) {
    //console.log(x, y);
    //console.log(arguments);
}

function createCounter() {
    let count = 0;
    console.log('initial:', count);

    return function () {
        count++;
        console.log(count);
        return count;
    };
}

const counter = createCounter();

counter()
counter();

function Point(x, y) {
    this.x = x;
    this.y = y;
}
