addEventListener("message", (message) => {
    if (message.data.command === "generate") {
      generatePrimes(message.data.quota);
    }
});
  

function generatePrimes(quota) {
    function isPrime(n) {
        for (let c = 2; c <= Math.sqrt(n); ++c) {
            if (n % c === 0) {
                return false;
            }
        }
        return true;
    }

    const primes = [];
    const maximum = 1000000;

    // while (primes.length < quota) {
    //     const candidate = Math.floor(Math.random() * (maximum + 1));
    //     if (isPrime(candidate)) {
    //         primes.push(candidate);
    //     }
    // }

    for(i = 0; i < quota; i++) {
        if(isPrime(i)) {
            primes.push(i);
        }
    }

    

    postMessage(primes.length);
}
  