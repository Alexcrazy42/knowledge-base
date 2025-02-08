// Массив с примерами туров
const tours = [
    { id: 1, destination: "Мальдивы", date: "2023-12-01", duration: 7, price: 5000 },
    { id: 2, destination: "Тайланд", date: "2023-11-15", duration: 10, price: 3500 },
    { id: 3, destination: "Италия", date: "2023-10-20", duration: 5, price: 4000 },
  ];
  
  // Функция для отображения страницы
  function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active', 'fade-in', 'fade-out'));
    const currentPage = document.getElementById(pageId);
    currentPage.classList.add('fade-out');
    setTimeout(() => {
      currentPage.classList.remove('fade-out');
      currentPage.classList.add('active', 'fade-in');
    }, 500);
  }
  
  // Валидация формы поиска
  function validateSearchForm() {
    const destination = document.getElementById('destination').value.trim();
    const date = document.getElementById('date').value;
    const duration = parseInt(document.getElementById('duration').value);
  
    let isValid = true;
  
    if (!destination) {
      showError('destination-error', 'Пожалуйста, укажите направление.');
      document.getElementById('destination').classList.add('invalid');
      isValid = false;
    } else {
      hideError('destination-error');
      document.getElementById('destination').classList.remove('invalid');
    }
  
    if (!date) {
      showError('date-error', 'Пожалуйста, выберите дату.');
      document.getElementById('date').classList.add('invalid');
      isValid = false;
    } else {
      hideError('date-error');
      document.getElementById('date').classList.remove('invalid');
    }
  
    if (!duration || duration < 1) {
      showError('duration-error', 'Продолжительность должна быть больше 0.');
      document.getElementById('duration').classList.add('invalid');
      isValid = false;
    } else {
      hideError('duration-error');
      document.getElementById('duration').classList.remove('invalid');
    }
  
    return isValid;
  }
  
  // Показать сообщение об ошибке
  function showError(id, message) {
    const errorElement = document.getElementById(id);
    errorElement.textContent = message;
    errorElement.style.display = 'block';
  }
  
  // Скрыть сообщение об ошибке
  function hideError(id) {
    const errorElement = document.getElementById(id);
    errorElement.textContent = '';
    errorElement.style.display = 'none';
  }
  
  // Обработка формы поиска
  document.getElementById('tour-search-form').addEventListener('submit', function (e) {
    e.preventDefault();
  
    if (!validateSearchForm()) return;
  
    const destination = document.getElementById('destination').value.toLowerCase();
    const date = document.getElementById('date').value;
    const duration = parseInt(document.getElementById('duration').value);
  
    // Фильтрация туров
    const filteredTours = tours.filter(tour =>
      tour.destination.toLowerCase().includes(destination) &&
      tour.date === date &&
      tour.duration === duration
    );
  
    // Отображение результатов
    const tourList = document.getElementById('tour-list');
    tourList.innerHTML = '';
  
    if (filteredTours.length === 0) {
      tourList.innerHTML = '<li>Ничего не найдено</li>';
    } else {
      filteredTours.forEach(tour => {
        const li = document.createElement('li');
        li.innerHTML = `
          <h2>${tour.destination}</h2>
          <p>Дата: ${tour.date}</p>
          <p>Продолжительность: ${tour.duration} дней</p>
          <p>Цена: $${tour.price}</p>
          <button class="book-tour" data-id="${tour.id}">Забронировать</button>
        `;
        tourList.appendChild(li);
      });
    }
  
    showPage('results-page');
  });
  
  // Возврат к форме поиска
  document.getElementById('back-to-search').addEventListener('click', function () {
    showPage('search-page');
  });
  
  // Бронирование тура
  document.addEventListener('click', function (e) {
    if (e.target.classList.contains('book-tour')) {
      const tourId = e.target.dataset.id;
      const selectedTour = tours.find(tour => tour.id == tourId);
  
      if (selectedTour) {
        localStorage.setItem('selectedTour', JSON.stringify(selectedTour));
        showPage('booking-page');
      }
    }
  });
  
  // Валидация формы бронирования
  function validateBookingForm() {
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
  
    let isValid = true;
  
    if (!name) {
      showError('name-error', 'Пожалуйста, укажите имя.');
      document.getElementById('name').classList.add('invalid');
      isValid = false;
    } else {
      hideError('name-error');
      document.getElementById('name').classList.remove('invalid');
    }
  
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showError('email-error', 'Пожалуйста, введите корректный email.');
      document.getElementById('email').classList.add('invalid');
      isValid = false;
    } else {
      hideError('email-error');
      document.getElementById('email').classList.remove('invalid');
    }
  
    if (!phone || phone.length < 10) {
      showError('phone-error', 'Пожалуйста, введите корректный телефон.');
      document.getElementById('phone').classList.add('invalid');
      isValid = false;
    } else {
      hideError('phone-error');
      document.getElementById('phone').classList.remove('invalid');
    }
  
    return isValid;
  }
  
  // Обработка формы бронирования
  document.getElementById('booking-form').addEventListener('submit', function (e) {
    e.preventDefault();
  
    if (!validateBookingForm()) return;
  
    const selectedTour = JSON.parse(localStorage.getItem('selectedTour'));
  
    if (selectedTour) {
      document.getElementById('booking-message').textContent = `Бронирование успешно! Вы забронировали тур в ${selectedTour.destination}.`;
      this.reset();
    }
  });
  
  // Возврат к результатам
  document.getElementById('back-to-results').addEventListener('click', function () {
    showPage('results-page');
  });