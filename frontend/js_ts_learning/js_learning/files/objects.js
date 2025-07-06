"use strict"

var book = {
    topic: "JavaScript",
    fat: true,
    author: {
        firstName: 'David',
        lastName: 'Flanagan'
    }
}

book.sheets = 123;
//console.log(book);


var then = new Date(2010, 0, 1);
//console.log(then);
var date = new Date();
var localDate = date.toLocaleString();
//console.log(localDate);

const jsonString = `
{
  "name": "Alice",
  "age": 30,
  "isAdmin": false,
  "address": {
    "city": "Москва",
    "zip": "12345"
  },
  "registeredAt": "2023-01-01T12:00:00Z"
}
`;


const obj = JSON.parse(jsonString);

for(var key in obj)
{
    //console.log(key, obj[key]);
}


{
    //const f = eval("console.log(1);");
    //console.log(typeof f);
    //f();
}

// try {
//   JSON.parse("{"); // некорректный JSON
// } catch (error) {
//   if (error instanceof TypeError) {
//       console.log("Неправильный тип:", error.message);
//   } else if (error instanceof ReferenceError) {
//       console.log("Неизвестная переменная:", error.message);
//   } else if (error instanceof Error){
//       console.log("Неизвестная ошибка:", error.message);
//   }
// }

var o = {
  data_prop: null,

  get accessor_prop() {
    return this.data_prop;
  },

  set accessor_prop(value) {
    this.data_prop = value;
  }
}

Object.defineProperty(o, "x", 
  {
    value: 1,
    writable: true,
    enumerable: false,
    configurable: true
  }
);

o.accessor_prop = "Hello";

// 165