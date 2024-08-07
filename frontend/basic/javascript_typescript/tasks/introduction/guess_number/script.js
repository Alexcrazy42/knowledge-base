var randomNumber = Math.floor(Math.random() * 100) + 1;

var guesses = document.querySelector('.guesses');
var lastResult = document.querySelector('.lastResult');
var lowOrHi = document.querySelector('.lowOrHi');

var guessSubmit = document.querySelector('.guessSubmit');
var guessField = document.getElementById("guessField");
guessSubmit.disabled = true;

var storyNameField = document.querySelector('.story-name');
var storyText = document.getElementById('story');
var prevStoryText = storyText.textContent;

var guessCount = 1;
var resetButton;

guessSubmit.addEventListener("click", checkGuess);
guessField.addEventListener("input", changeGuessField);

storyNameField.addEventListener("input", updateName)


function Person(first, last, age, gender, interests) {
    this.name = {
      first,
      last,
    };
    this.age = age;
    this.gender = gender;
    this.interests = interests;
}

Person.prototype.greeting = function () {
    alert("Hi! I'm " + this.name.first + ".");
};

function Teacher(first, last, age, gender, interests, subject) {
    Person.call(this, first, last, age, gender, interests);
  
    this.subject = subject;
}

Teacher.prototype = Object.create(Person.prototype);

Teacher.prototype.greeting = function () {
    var prefix;
  
    if (
      this.gender === "male" ||
      this.gender === "Male" ||
      this.gender === "m" ||
      this.gender === "M"
    ) {
      prefix = "Mr.";
    } else if (
      this.gender === "female" ||
      this.gender === "Female" ||
      this.gender === "f" ||
      this.gender === "F"
    ) {
      prefix = "Mrs.";
    } else {
      prefix = "Mx.";
    }
  
    alert(
      "Hello. My name is " +
        prefix +
        " " +
        this.name.last +
        ", and I teach " +
        this.subject +
        ".",
    );
};

var teacher1 = new Teacher(
    "Dave",
    "Griffiths",
    31,
    "male",
    ["football", "cookery"],
    "mathematics",
);


var header = document.querySelector("header");
var section = document.querySelector("section");

var requestURL =
  "https://mdn.github.io/learning-area/javascript/oojs/json/superheroes.json";

var request = new XMLHttpRequest();

request.open("GET", requestURL);

request.responseType = "json";
request.send();

request.onload = function () {
    var superHeroes = request.response;
    populateHeader(superHeroes);
    showHeroes(superHeroes);
};

console.log("Starting");



async function fetchImage() {
    var image;
    const response = await fetch("https://i.sstatic.net/YtBbE.png");

    if(!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    } else {
        const myBlob = await response.blob();
        const objectURL = URL.createObjectURL(myBlob);
        const image = document.createElement("img");
        image.src = objectURL;
        document.body.appendChild(image);
        return image;
    }
}

function timeoutPromise(interval) {
    return new Promise((resolve, reject) => {
      setTimeout(function () {
        resolve("done");
      }, interval);
    });
}

async function slowTimeTest() {
    await timeoutPromise(3000);
    await timeoutPromise(3000);
    await timeoutPromise(3000);
}

async function fastTimeTest() {
    const timeoutPromise1 = timeoutPromise(3000);
    const timeoutPromise2 = timeoutPromise(3000);
    const timeoutPromise3 = timeoutPromise(3000);
  
    await Promise.all([timeoutPromise1, timeoutPromise2, timeoutPromise3])
}



let startTime = Date.now();
slowTimeTest().then(() => {
  const finishTime = Date.now();
  const timeTaken = finishTime - startTime;
  console.log("Time taken in milliseconds to slow: " + timeTaken);
});

startTime = Date.now();
fastTimeTest().then(() => {
    const finishTime = Date.now();
    const timeTaken = finishTime - startTime;
    console.log("Time taken in milliseconds to fast: " + timeTaken);
})



async function func() {
    const a = fetchImage()
    .then((image) => {
        console.log(image);
    })
    .catch((e) => {
        console.log(
        "There has been a problem with your fetch operation: " + e.message,
        );
    });

    const b = loop();

    const c = fetchImage()
    .then((image) => {
        console.log(image);
    })
    .catch((e) => {
        console.log(
        "There has been a problem with your fetch operation: " + e.message,
        );
    });
    await Promise.all([a, b, c])
}

func();

async function loop(){
    for(var i = 0; i < 10; i++) {
        await sleep(10);
        console.log(`All ${i}!`);
    }
}


async function sleep(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function populateHeader(jsonObj) {
    var header = document.querySelector("header");
    var myH1 = document.createElement("h1");
    myH1.textContent = jsonObj["squadName"];
    header.appendChild(myH1);
  
    var myPara = document.createElement("p");
    myPara.textContent =
      "Hometown: " + jsonObj["homeTown"] + " // Formed: " + jsonObj["formed"];
    header.appendChild(myPara);
}
  

function showHeroes(jsonObj) {
    var section = document.querySelector("section");
    var heroes = jsonObj["members"];
  
    for (var i = 0; i < heroes.length; i++) {
      var myArticle = document.createElement("article");
      var myH2 = document.createElement("h2");
      var myPara1 = document.createElement("p");
      var myPara2 = document.createElement("p");
      var myPara3 = document.createElement("p");
      var myList = document.createElement("ul");
  
      myH2.textContent = heroes[i].name;
      myPara1.textContent = "Secret identity: " + heroes[i].secretIdentity;
      myPara2.textContent = "Age: " + heroes[i].age;
      myPara3.textContent = "Superpowers:";
  
      var superPowers = heroes[i].powers;
      for (var j = 0; j < superPowers.length; j++) {
        var listItem = document.createElement("li");
        listItem.textContent = superPowers[j];
        myList.appendChild(listItem);
      }
  
      myArticle.appendChild(myH2);
      myArticle.appendChild(myPara1);
      myArticle.appendChild(myPara2);
      myArticle.appendChild(myPara3);
      myArticle.appendChild(myList);
  
      section.appendChild(myArticle);
    }
}
  

function updateName() {
    var storyNameFieldText = storyNameField.value;
    storyText.textContent = prevStoryText + `, ${storyNameFieldText}`;
}

function changeGuessField() {
    if(guessField.value == "") {
        guessSubmit.disabled = true;
    } else {
        guessSubmit.disabled = false;
    }
}


function checkGuess() {
    var userGuess = guessField.value;
    if (userGuess === '') {
        return;
    }
    if (guessCount === 1) {
        guesses.textContent = "Previous guesses: ";
    }
    guesses.textContent += userGuess + " ";

    if (userGuess === randomNumber) {
        lastResult.textContent = "Congratulations! You got it right!";
        lastResult.style.backgroundColor = "green";
        lowOrHi.textContent = "";
        setGameOver();
    } else if (guessCount === 10) {
        lastResult.textContent = "!!!GAME OVER!!!";
        setGameOver();
    } else {
        lastResult.textContent = "Wrong!";
        lastResult.style.backgroundColor = "red";
        if (userGuess < randomNumber) {
            lowOrHi.textContent = "Last guess was too low!";
        } else if (userGuess > randomNumber) {
            lowOrHi.textContent = "Last guess was too high!";
        }
    }

    guessCount++;
    guessField.value = "";
    guessSubmit.disabled = true;
    guessField.focus();
}

function setGameOver() {
    guessField.disabled = true;
    guessSubmit.disabled = true;
    resetButton = document.createElement("button");
    resetButton.textContent = "Start new game";
    document.body.appendChild(resetButton);
    resetButton.addEventListener("click", resetGame);
}

function resetGame() {
    var guessSubmit = document.querySelector('.guessSubmit');
    var nextP = guessSubmit.nextElementSibling;

    while (nextP && nextP.tagName.toLowerCase() === 'p') {
        nextP.textContent = "";
        var nextNextP = nextP.nextElementSibling;
        nextP = nextNextP;
    }
    
    resetButton.parentNode.removeChild(resetButton);

    guessField.disabled = false;
    guessSubmit.disabled = false;
    guessField.value = "";
    guessCount = 1;

    guessField.focus();

    lastResult.style.backgroundColor = "white";

    randomNumber = Math.floor(Math.random() * 100) + 1;
}