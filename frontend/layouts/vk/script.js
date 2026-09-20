const profileToggle = document.getElementById('profileToggle');
const dropdownMenu = document.getElementById('dropdownMenu');

const searchInput = document.getElementById('mainSearchInput');
const dropdown = document.getElementById('mainSerchDropdown');
const resultsList = document.getElementById('searchResultsList');
let timeoutId = null;

const services = document.getElementById('services');
const crossButton = document.getElementById('cross');



profileToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    profileToggle.classList.add('active');
});

crossButton.addEventListener('click', (e) => {
    services.classList.add('disable')
});

document.addEventListener('click', (e) => {
    if (!profileToggle.contains(e.target)) {
        profileToggle.classList.remove('active');
    }
});

function showLoader() {
    resultsList.innerHTML = `
        <li class="loader-item">
            <div class="spinner"></div>
            <span>Ищем...</span>
        </li>
    `;
    dropdown.classList.add('active');
}

function showResults(query) {
    const fakeData = [
        `Результат для "${query}" #1`,
        `Статья про ${query}`,
        `Пользователь ${query}_admin`,
        `Группа "${query} Official"`
    ];

    let html = '';
    fakeData.forEach(text => {
        html += `<li><a href="#">${text}</a></li>`;
    });

    resultsList.innerHTML = html;
}

searchInput.addEventListener('input', (e) => {
    const value = e.target.value.trim();

    if (!value) {
        dropdown.classList.remove('active');
        resultsList.innerHTML = '';
        clearTimeout(timeoutId);
        return;
    }


    showLoader();

    clearTimeout(timeoutId);

    timeoutId = setTimeout(() => {
        showResults(value);
    }, 800);
});

searchInput.addEventListener('focus', (e) => {
    const value = e.target.value.trim();

    if (!value) {
        dropdown.classList.remove('active');
        resultsList.innerHTML = '';
        clearTimeout(timeoutId);
        return;
    }

    showLoader();

    clearTimeout(timeoutId);

    timeoutId = setTimeout(() => {
        showResults(value);
    }, 800);
});

document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
        searchInput.value = '';
        dropdown.classList.remove('active');
    }
});