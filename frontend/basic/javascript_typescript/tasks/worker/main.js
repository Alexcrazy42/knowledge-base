// const worker = new Worker("generate.js");


// document.querySelector("#generate").addEventListener("click", () => {
//   const quota = document.querySelector("#quota").value;
//   worker.postMessage({
//     command: "generate",
//     quota,
//   });
// });

// worker.addEventListener("message", (message) => {
//   document.querySelector("#output").textContent =
//     `Finished generating ${message.data} primes!`;
// });

// document.querySelector("#reload").addEventListener("click", () => {
//   document.querySelector("#user-input").value =
//     'Try typing in here immediately after pressing "Generate primes"';
//   document.location.reload();
// });


if ('Notification' in window) {
    Notification.requestPermission().then(function(permission) {
        if (permission === 'granted') {
            const notification = new Notification('Hello!', {
                body: 'This is a notification.',
            });
        }
    });
}