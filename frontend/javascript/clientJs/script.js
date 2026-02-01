// Инициализация карты
const map = L.map('map').setView([55.7558, 37.6173], 13); // Москва по умолчанию

// Добавление слоя карты (например, OpenStreetMap)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Флаг для отслеживания активности
let isTracking = false;

// Функция для обновления маркера местоположения
function updateLocation(position) {
  const { latitude, longitude } = position.coords;
  const accuracy = position.coords.accuracy;

  // Удаляем старый маркер, если он есть
  if (marker && map.hasLayer(marker)) {
    map.removeLayer(marker);
  }

  // Создаём новый маркер
  marker = L.marker([latitude, longitude]).addTo(map);

  // Центрируем карту на новое местоположение
  map.setView([latitude, longitude], 15);

  // Добавляем информацию о точности
  marker.bindPopup(`Широта: ${latitude}<br>Долгота: ${longitude}<br>Точность: ±${accuracy} м`).openPopup();
}

// Функция для начала отслеживания
function startWatchingLocation() {
  if (!navigator.geolocation) {
    alert("Ваш браузер не поддерживает геолокацию.");
    return;
  }

  if (isTracking) {
    alert("Отслеживание уже активно.");
    return;
  }

  isTracking = true;

  // Начинаем отслеживать местоположение
  watchId = navigator.geolocation.watchPosition(
    updateLocation,
    function(error) {
      alert("Ошибка отслеживания геолокации: " + error.message);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );

  document.getElementById('startTracking').disabled = true;
  document.getElementById('stopTracking').disabled = false;
}

// Функция для остановки отслеживания
function stopWatchingLocation() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
    isTracking = false;

    // Удаляем маркер, если он есть
    if (marker && map.hasLayer(marker)) {
        map.removeLayer(marker);
    }

    document.getElementById('startTracking').disabled = false;
    document.getElementById('stopTracking').disabled = true;
  } else {
    alert("Нет активного отслеживания.");
  }
}

// Обработчики кнопок
document.getElementById('startTracking').addEventListener('click', startWatchingLocation);
document.getElementById('stopTracking').addEventListener('click', stopWatchingLocation);

// Переменная для хранения ID watchPosition
let watchId = null;

// Переменная для хранения маркера
let marker = null;