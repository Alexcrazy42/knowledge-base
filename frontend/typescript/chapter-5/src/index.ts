import { get } from "http";

type Color = 'Black' | 'White'
type Letter = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H'
type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8


class Game {
  private pieces = Game.makePieces();

  private static makePieces() {
    return [
      // Короли
      new King('White', 'E', 1),
      new King('Black', 'E', 8),
      // Ферзи
      new Queen('White', 'D', 1),
      new Queen('Black', 'D', 8),
      // Слоны
      new Bishop('White', 'C', 1),
      new Bishop('White', 'F', 1),
      new Bishop('Black', 'C', 8),
      new Bishop('Black', 'F', 8),
    ]
  }
}

class Position {
  constructor(
    private letter: Letter,
    private rank: Rank
  ) {}

  distanceFrom(position: Position) {
    return {
      rank: Math.abs(position.rank - this.rank),
      letter: Math.abs(position.letter.charCodeAt(0) - this.letter.charCodeAt(0))
    }
  }
}


abstract class Piece {
  protected position : Position
  constructor(
    private readonly color: Color,
    letter: Letter,
    rank: Rank
  ) {
    this.position = new Position(letter, rank);
  }

  moveTo(position: Position) {
    if(this.canMoveTo(position)) {
      this.position = position;
    } else {
      throw new Error("Can't go to this position");
    }
    
  }

  abstract canMoveTo(position: Position): boolean
}
class King extends Piece {
  canMoveTo(position: Position): boolean {
      let distance = this.position.distanceFrom(position);
      return distance.rank < 2 && distance.letter < 2
  }
}
class Queen extends Piece {
  canMoveTo(position: Position): boolean {
      throw new Error("not implemented")
  }
}
class Bishop extends Piece {
  canMoveTo(position: Position): boolean {
      throw new Error("not implemented")
  }
}
class Knight extends Piece {
  canMoveTo(position: Position): boolean {
      throw new Error("not implemented")
  }
}
class Rook extends Piece {
  canMoveTo(position: Position): boolean {
      throw new Error("not implemented")
  }
}
class Pawn extends Piece {
  canMoveTo(position: Position): boolean {
      throw new Error("not implemented")
  }
}

type Food = {
 calories: number
 tasty: boolean
}
type Sushi = Food & {
 salty: boolean
}
type Cake = Food & {
 sweet: boolean
}


interface Food1 {
 calories: number
 tasty: boolean
}
interface Sushi1 extends Food {
 salty: boolean
}
interface Cake1 extends Food {
 sweet: boolean
}


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

const calc = new Calculator();
calc.add(2, 3); // В консоли: "Calling add with args: [2, 3]"



function sealed<T extends { new(...args: any[]): {} }>(constructor: T) {
    return class extends constructor {
        constructor(...args: any[]) {
            super(...args);
            throw new Error("Cannot extend a final class");
        }
    };
}

@sealed
class ImmutableClass {
    value: string;
    constructor(value: string) {
        this.value = value;
    }
}

class Child extends ImmutableClass {} 

type Person = {
  name: string;
  age: number;
}

type Getters<T extends object> = {
  [K in keyof T as K extends string ? `get${Capitalize<K>}` : never]: () => T[K]
};

function createGetters<T extends object>(obj: T): Getters<T> {
  const result = {} as Getters<T>;
  
  (Object.keys(obj) as Array<keyof T>).forEach(key => {
    if (typeof key === 'string') {
      const getterKey = `get${key.charAt(0).toUpperCase() + key.slice(1)}` as keyof Getters<T>;
      result[getterKey] = (() => obj[key]) as any;
    }
  });
  
  return result;
}

// Использование
const person: Person = { name: "Alice", age: 30 };
const getters = createGetters(person);

console.log(getters.getName()); // "Alice"
console.log(getters.getAge());  // 30
console.log(getters instanceof Person);