function add(a : number, b : number) {
  return a + b;
}


const specificGreeting = 'Hello'; // Type inferred as "Hello"
let generalGreeting: string = 'Hello'; // Widened to 'string'


type IncomingMessage = 'Hello' | 'See you';
type OurReply = 'Hi!' | 'Bye!' | 6 | false;
 
function reply(text: IncomingMessage): OurReply {
  if (text === 'Hello') {
    return 'Hi!';
  } else {
    return 6;
  }

  return false;
}


function reply1(text: 'Hello' | 'Bye') : string {
  if (text === 'Hello') {
    // The type of "text" is now "Hello"
    return text;
  } else {
    // The type of "text" is now "Bye"
    return 'See you!' as string;
  }
}

var a = 5;
console.log(a)

const user = {
  name: 'Benny',
  age: 35,
} as const;
 
//user.name = 'Sofia'; // Throws error

console.log(user)


type StreamStatus = 'ONLINE' | 'OFFLINE';
 
function handleResponse(status: StreamStatus): void {
  switch (status) {
    case 'ONLINE':
      console.log('Stream is online.');
      break;
    case 'OFFLINE':
      console.log('Stream is offline.');
      break;
    default:
      const neverStatus: never = status;
      throw new Error(`Unhandled status: ${neverStatus}`);
  }
}


type User = {
  age: number;
  name: string;
};

type UpdateUser = Required<Omit<User, keyof User>>;

function getName(user: Readonly<Pick<User, 'name'>>) {
  return user.name;
}


const userAssertion = { name: 'Benny', age: 1 };
getName(userAssertion);

type Payments = Array<string | number>;


interface Props<T> {
  items: T[];
  renderItem: (item: T) => void;
}

function List<T>({ items, renderItem }: Props<T>) : void {
  items.forEach((value) => {
    renderItem(value);
  })
}

List<number>({items: [5, 6], renderItem : (item) => console.log(item)})


interface User1 {
  name: string;
}

interface User1 {  // Merging!
  age: number;
}