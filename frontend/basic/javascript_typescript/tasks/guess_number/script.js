var randomNumber = Math.floor(Math.random() * 100) + 1;

var guesses = document.querySelector('.guesses');
var lastResult = document.querySelector('.lastResult');
var lowOrHi = document.querySelector('.lowOrHi');

var guessSubmit = document.querySelector('.guessSubmit');
var guessField = document.querySelector('.guessField');

var guessCount = 1;
var resetButton;

guessSubmit.addEventListener("click", checkGuess);

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