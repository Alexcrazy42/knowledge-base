const output = document.querySelector("#output");
const button = document.querySelector("#set-alarm");
const input = document.querySelector("#input");

alarm(2000, input.value)
    .then((message) => (output.textContent = message))
    .catch((error) => (output.textContent = `Couldn't set alarm: ${error}`));



button.addEventListener("click", async () => {
    try {
      const message = await alarm(2000, input.value);
      output.textContent = message;
    } catch (error) {
      output.textContent = `Couldn't set alarm: ${error}`;
    }
});

function alarm(delay, name) {
    return new Promise((resolve, reject) => {
        if (delay < 0) {
          throw new Error("Alarm delay must not be negative");
        }
        setTimeout(() => {
          resolve(`Wake up, ${name}`);
        }, delay);
      });
}