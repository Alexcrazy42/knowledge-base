class SmartFormValidator {
    constructor(formSelector) {
        this.form = document.querySelector(formSelector);
        if (!this.form) return;
        
        this.init();
    }

    init() {
        this.form.setAttribute('novalidate', '');
        
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.validateAll();
        });

        // Убираем ошибку при вводе (мгновенная обратная связь)
        this.form.addEventListener('input', (e) => {
            if (e.target.tagName === 'INPUT') {
                this.clearError(e.target);
            }
        });

        // Валидация при потере фокуса (для полей, которые уже трогали)
        this.form.addEventListener('blur', (e) => {
            if (e.target.tagName === 'INPUT' && e.target.value) {
                this.validateField(e.target);
            }
        }, true);
    }

    validateAll() {
        const inputs = this.form.querySelectorAll('input');
        let isValid = true;
        let firstError = null;

        inputs.forEach(input => {
            const error = this.getValidationError(input);
            if (error) {
                this.showError(input, error);
                isValid = false;
                if (!firstError) firstError = input;
            } else {
                this.showSuccess(input);
            }
        });

        if (firstError) {
            firstError.focus();
            firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        return isValid;
    }

    validateField(input) {
        const error = this.getValidationError(input);
        if (error) {
            this.showError(input, error);
            return false;
        } else {
            this.showSuccess(input);
            return true;
        }
    }

    getValidationError(input) {
        if (!input.value && !input.hasAttribute('required')) {
            return null;
        }

        if (input.checkValidity()) {
            return null;
        }

        const validity = input.validity;
        const label = this.getFieldLabel(input);

        if (validity.valueMissing) {
            return `${label} - обязательное поле`;
        }
        
        if (validity.typeMismatch) {
            if (input.type === 'email') return `${label} должен быть в формате email`;
            if (input.type === 'tel') return `${label} должен быть в формате телефона`;
            if (input.type === 'url') return `${label} должен быть ссылкой`;
        }

        if (validity.tooShort) {
            const min = input.getAttribute('minlength');
            return `${label} должен содержать минимум ${min} символов`;
        }

        if (validity.tooLong) {
            const max = input.getAttribute('maxlength');
            return `${label} не должен превышать ${max} символов`;
        }

        if (validity.rangeUnderflow) {
            const min = input.getAttribute('min');
            return `${label} должен быть не меньше ${min}`;
        }

        if (validity.rangeOverflow) {
            const max = input.getAttribute('max');
            return `${label} должен быть не больше ${max}`;
        }

        if (validity.patternMismatch) {
            const customTitle = input.getAttribute('title');
            return customTitle || `${label} не соответствует формату`;
        }

        return `${label} заполнен некорректно`;
    }

    getFieldLabel(input) {
        const label = document.querySelector(`label[for="${input.id}"]`);
        return label ? label.textContent : '';
    }

    showError(input, message) {
        const field = input.closest('.field');
        field.classList.remove('success');
        field.classList.add('error');

        let errorEl = field.querySelector('.error-message');
        if (!errorEl) {
            errorEl = document.createElement('div');
            errorEl.className = 'error-message';
            input.after(errorEl);
        }
        errorEl.textContent = message;
    }

    showSuccess(input) {
        const field = input.closest('.field');
        field.classList.remove('error');
        if (input.value) {
            field.classList.add('success');
        }
    }

    clearError(input) {
        const field = input.closest('.field');
        field.classList.remove('error');
    }
}

new SmartFormValidator('#form > .registration-form');

new SmartFormValidator('.multi-col-form');


const popup = document.getElementById('my-popup');
const openBtn = document.getElementById('open-btn');
const closeBtn = document.getElementById('close-btn');

const cards = document.querySelectorAll('.container .card');

cards.forEach((item) => {
    item.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (btn) {
            popup.showModal();
        }
    });
})

closeBtn.addEventListener('click', () => {
  popup.close();
});

popup.addEventListener('click', (event) => {
  const rect = popup.getBoundingClientRect();
  if (
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  ) {
    popup.close();
  }
});


const toggleBtn = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const themeText = document.getElementById('themeText');
const body = document.body;

function updateButton(isDark) {
    if (isDark) {
        themeIcon.textContent = '☀️';
        themeText.textContent = 'Светлая тема';
    } else {
        themeIcon.textContent = '🌙';
        themeText.textContent = 'Темная тема';
    }
}

const savedTheme = localStorage.getItem('theme');

if (savedTheme === 'dark') {
    body.classList.add('dark-theme');
    updateButton(true);
} else if (savedTheme === 'light') {
    updateButton(false);
} else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    updateButton(prefersDark);
}

toggleBtn.addEventListener('click', () => {
    const isDark = body.classList.toggle('dark-theme');

    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    
    updateButton(isDark);
});

const cardButton = (document.getElementsByClassName('card__button'))[0];

cardButton.addEventListener('click', (e) => {
    e.preventDefault();
    cardButton.classList.toggle('card__button--ready');
})


const list = document.getElementById('task-list-event-delegation');
const addBtn = document.getElementById('add-task');

list.addEventListener('click', function(event) {
    // 2. Проверяем, по чему именно кликнули.
    // Используем closest(), чтобы найти кнопку, даже если кликнули по тексту внутри неё
    const deleteButton = event.target.closest('.delete-btn');

    // 3. Если кликнули не по кнопке удаления, игнорируем
    if (!deleteButton) return;

    // 4. Находим родительский <li> и удаляем его
    const taskItem = deleteButton.closest('li');
    taskItem.remove();
    
    console.log('Задача удалена!');
});

// 5. Добавляем новые задачи динамически
let counter = 3;
addBtn.addEventListener('click', () => {
    const newLi = document.createElement('li');
    newLi.innerHTML = `Задача ${counter} <button class="delete-btn">Удалить</button>`;
    list.appendChild(newLi);
    counter++;
    
    // ВНИМАНИЕ: Нам НЕ НУЖНО вешать обработчик на новую кнопку!
    // Делегирование уже всё обрабатывает.
});


const cart = document.getElementById('cart');
const cartCount = document.getElementById('cart-count');

const observerCallback = (mutationsList, observer) => {
    for (const mutation of mutationsList) {
        if (mutation.type === 'childList') {
            console.log('Состав корзины изменился!');
            
            const currentCount = cart.children.length;
            cartCount.textContent = currentCount;
            
            if (currentCount > 0) {
                cart.style.border = '2px solid green';
            } else {
                cart.style.border = 'none';
            }
        }
    }
};

const observer = new MutationObserver(observerCallback);

// 3. Настраиваем, ЧТО именно мы хотим отслеживать
const config = {
    childList: true, // Следить за добавлением/удалением дочерних элементов
    attributes: false, // Не следить за изменением атрибутов
    subtree: true, // Следить также за всеми вложенными элементами (внутри cart)
};

observer.observe(cart, config);


let itemId = 1;
document.getElementById('add-item').addEventListener('click', () => {
    const item = document.createElement('div');
    item.className = 'cart-item';
    item.textContent = `Товар №${itemId}`;
    cart.appendChild(item);
    itemId++;
});

// Если нужно остановить наблюдение (например, при уничтожении компонента):
// observer.disconnect();



const chatBox = document.getElementById('chat-box');
const newMsgBtn = document.getElementById('new-msg-btn');
const sendBtn = document.getElementById('send-btn');


function isScrolledToBottom() {
    const threshold = 50; 
    return chatBox.scrollHeight - chatBox.scrollTop - chatBox.clientHeight < threshold;
}

// срабатывает в любой моменте когда мы перестали скроллить
chatBox.addEventListener('scrollend', (e) => {
    console.log('юху долистали до конца')
    //newMsgBtn.classList.add('hidden');
})

chatBox.addEventListener('scroll', () => {
    // Если пользователь докрутил до самого низа
    if (isScrolledToBottom()) {
        // Скрываем кнопку
        newMsgBtn.classList.add('hidden');
    }
});

const chatObserver = new MutationObserver((mutations) => {
    let hasNewMessages = false;
    
    for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            hasNewMessages = true;
            break;
        }
    }

    if (!hasNewMessages) return;

    if (isScrolledToBottom()) {
        // Пользователь и так смотрит в низ чата -> просто скроллим вниз
        // указание scrollTop автоматически сдвинет вниз
        chatBox.scrollTop = chatBox.scrollHeight;
        
        newMsgBtn.classList.add('hidden');
    } else {
        newMsgBtn.classList.remove('hidden');
    }
});

chatObserver.observe(chatBox, { 
    childList: true,
    subtree: false
});

newMsgBtn.addEventListener('click', () => {
    chatBox.scrollTo({
        top: chatBox.scrollHeight,
        behavior: 'smooth'
    });
    newMsgBtn.classList.add('hidden');
});


let msgCounter = 1;
sendBtn.addEventListener('click', () => {
    const newMsg = document.createElement('div');
    newMsg.className = 'message incoming';
    newMsg.textContent = `Входящее сообщение #${msgCounter}`;
    
    chatBox.appendChild(newMsg);
    msgCounter++;
});

setInterval(() => {
    sendBtn.click();
}, 5000);