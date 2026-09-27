const profileToggle = document.getElementById('profileToggle');
const dropdownMenu = document.getElementById('dropdownMenu');

const searchInput = document.getElementById('mainSearchInput');
const dropdown = document.getElementById('mainSerchDropdown');
const resultsList = document.getElementById('searchResultsList');
let timeoutId = null;

const services = document.getElementById('services');
const crossButton = document.getElementById('cross');

const histories = document.getElementById('histories');
const leftBtn = document.querySelector('.left-btn');
const rightBtn = document.querySelector('.right-btn');

const newsFeed = document.getElementById('news-feed');
const newsFeedViewport = (document.querySelectorAll('#news-feed .app-viewport'))[0];
const sensor = document.getElementById('scroll-sensor');


newsFeedViewport.addEventListener('scrollend', (event) => {
    const newsTemplate = `
        <div class="news">
            <div class="header">
                <div class="logo">
                    <img src="https://sun9-41.vkuserphoto.ru/s/v1/ig2/4VhzmOX-FV9oXB-dSRVOAvJ7LC5Hr9Uyf3gHEwK3kXcrG9QHslixRG4Slpd8G4aLgs5A5QPiN3gv_dZQdpmn7DLx.jpg?as=50x50%2C32x32%2C48x48&crop=0%2C0%2C1080%2C1080&quality=95&size=50x50">
                    <h4>Новая Группа</h4>
                </div>
                <div class="follow"><button>Подписаться</button></div>
            </div>
            <div class="content">
                <img src="https://sun1-25.vkuserphoto.ru/s/v1/ig2/Q8yCSAaOV-9y2XtBqcEe-Kyc5SFpXOLClz0874gQLkqKJC51KqEnUQwC2d8LCOkCi3k2cAnw247_a1SM80IR5GXO.jpg?quality=95&crop=0,213,853,853&as=32x32,48x48,72x72,108x108,160x160,240x240,360x360,480x480,540x540,640x640,720x720&ava=1&u=YUmGdyaszevqHtCqUhay-S2I2ak0BbTISpUaSIZ4NsU&cs=200x200">
            </div>
            <div class="text">Это новый пост, загруженный через Intersection Observer!</div>
        </div>
    `;

    console.log('scroll end')

    setTimeout(() => {
        const fragment = document.createDocumentFragment();
        
        for (let i = 0; i < 5; i++) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = newsTemplate;
            fragment.appendChild(tempDiv.firstElementChild);
        }
        
        newsFeedViewport.insertBefore(fragment, sensor);
        
        isLoading = false;
    }, 1000);
})

function checkScrollPosition() {
    // Получаем значения
    const scrollLeft = histories.scrollLeft;
    const clientWidth = histories.clientWidth;
    const scrollWidth = histories.scrollWidth;
    
    // Погрешность в 2 пикселя (чтобы не зависеть от дробных чисел и скроллбаров)
    const tolerance = 2; 

    // 1. Логика для ЛЕВОЙ кнопки
    if (scrollLeft <= tolerance) {
        leftBtn.classList.add('hidden');
    } else {
        leftBtn.classList.remove('hidden');
    }

    // 2. Логика для ПРАВОЙ кнопки
    // Если (текущая позиция + видимая ширина) >= (общая ширина - погрешность)
    if (scrollLeft + clientWidth >= scrollWidth - tolerance) {
        rightBtn.classList.add('hidden');
    } else {
        rightBtn.classList.remove('hidden');
    }
}

const scrollAmount = 120;

leftBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    histories.scrollBy({
        left: -scrollAmount,
        behavior: 'smooth'
    });
})

rightBtn.addEventListener('click', () => {
    histories.scrollBy({
        left: scrollAmount,
        behavior: 'smooth'
    });
});

histories.addEventListener('wheel', (event) => {
    if (histories.scrollWidth > histories.clientWidth) {
        event.preventDefault();
        

        histories.scrollBy({
            left: event.deltaY, 
            behavior: 'auto'
        });
    }
}, { passive: false });

histories.addEventListener('scroll', checkScrollPosition);

window.addEventListener('load', checkScrollPosition);
window.addEventListener('resize', checkScrollPosition);

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

document.querySelectorAll('.node-settings').forEach(btn => {
    btn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
    });
});