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

