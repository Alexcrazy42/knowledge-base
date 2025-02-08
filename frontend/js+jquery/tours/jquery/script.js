// Массив с примерами туров
const tours = [
    { id: 1, destination: "Мальдивы", date: "2023-12-01", duration: 7, price: 5000 },
    { id: 2, destination: "Тайланд", date: "2023-11-15", duration: 10, price: 3500 },
    { id: 3, destination: "Италия", date: "2023-10-20", duration: 5, price: 4000 },
  ];
  
  // Функция для отображения страницы
  function showPage(pageId) {
    $('.page').removeClass('active').fadeOut(500, function () {
      $('#' + pageId).fadeIn(500).addClass('active');
    });
  }
  
  // Валидация формы поиска
  function validateSearchForm() {
    let isValid = true;
  
    const destination = $('#destination').val().trim();
    if (!destination) {
      showError('#destination-error', 'Пожалуйста, укажите направление.');
      $('#destination').addClass('invalid');
      isValid = false;
    } else {
      hideError('#destination-error');
      $('#destination').removeClass('invalid');
    }
  
    const date = $('#date').val();
    if (!date) {
      showError('#date-error', 'Пожалуйста, выберите дату.');
      $('#date').addClass('invalid');
      isValid = false;
    } else {
      hideError('#date-error');
      $('#date').removeClass('invalid');
    }
  
    const duration = parseInt($('#duration').val());
    if (!duration || duration < 1) {
      showError('#duration-error', 'Продолжительность должна быть больше 0.');
      $('#duration').addClass('invalid');
      isValid = false;
    } else {
      hideError('#duration-error');
      $('#duration').removeClass('invalid');
    }
  
    return isValid;
  }
  
  // Показать сообщение об ошибке
  function showError(selector, message) {
    $(selector).text(message).show();
  }
  
  // Скрыть сообщение об ошибке
  function hideError(selector) {
    $(selector).text('').hide();
  }
  
  // Обработка формы поиска
  $('#tour-search-form').on('submit', function (e) {
    e.preventDefault();
  
    if (!validateSearchForm()) return;
  
    const destination = $('#destination').val().toLowerCase();
    const date = $('#date').val();
    const duration = parseInt($('#duration').val());
  
    // Фильтрация туров
    const filteredTours = tours.filter(tour =>
      tour.destination.toLowerCase().includes(destination) &&
      tour.date === date &&
      tour.duration === duration
    );
  
    // Отображение результатов
    const $tourList = $('#tour-list');
    $tourList.empty();
  
    if (filteredTours.length === 0) {
      $tourList.append('<li>Ничего не найдено</li>');
    } else {
      filteredTours.forEach(tour => {
        const $li = $('<li></li>')
          .append(`<h2>${tour.destination}</h2>`)
          .append(`<p>Дата: ${tour.date}</p>`)
          .append(`<p>Продолжительность: ${tour.duration} дней</p>`)
          .append(`<p>Цена: $${tour.price}</p>`)
          .append(
            $('<button></button>')
              .addClass('book-tour')
              .attr('data-id', tour.id)
              .text('Забронировать')
          );
        $tourList.append($li);
      });
    }
  
    showPage('results-page');
  });
  
  // Возврат к форме поиска
  $('#back-to-search').on('click', function () {
    showPage('search-page');
  });
  
  // Бронирование тура
  $(document).on('click', '.book-tour', function () {
    const tourId = $(this).data('id');
    const selectedTour = tours.find(tour => tour.id == tourId);
  
    if (selectedTour) {
      localStorage.setItem('selectedTour', JSON.stringify(selectedTour));
      showPage('booking-page');
    }
  });
  
  // Валидация формы бронирования
  function validateBookingForm() {
    let isValid = true;
  
    const name = $('#name').val().trim();
    if (!name) {
      showError('#name-error', 'Пожалуйста, укажите имя.');
      $('#name').addClass('invalid');
      isValid = false;
    } else {
      hideError('#name-error');
      $('#name').removeClass('invalid');
    }
  
    const email = $('#email').val().trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showError('#email-error', 'Пожалуйста, введите корректный email.');
      $('#email').addClass('invalid');
      isValid = false;
    } else {
      hideError('#email-error');
      $('#email').removeClass('invalid');
    }
  
    const phone = $('#phone').val().trim();
    if (!phone || phone.length < 10) {
      showError('#phone-error', 'Пожалуйста, введите корректный телефон.');
      $('#phone').addClass('invalid');
      isValid = false;
    } else {
      hideError('#phone-error');
      $('#phone').removeClass('invalid');
    }
  
    return isValid;
  }
  
  // Обработка формы бронирования
  $('#booking-form').on('submit', function (e) {
    e.preventDefault();
  
    if (!validateBookingForm()) return;
  
    const selectedTour = JSON.parse(localStorage.getItem('selectedTour'));
  
    if (selectedTour) {
      $('#booking-message').text(`Бронирование успешно! Вы забронировали тур в ${selectedTour.destination}.`);
      $(this)[0].reset();
    }
  });
  
  // Возврат к результатам
  $('#back-to-results').on('click', function () {
    showPage('results-page');
  });