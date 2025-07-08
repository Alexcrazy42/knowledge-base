document.querySelectorAll('.faq-question').forEach(question => {
    question.addEventListener('click', () => {
      const faqItem = question.parentElement;
      faqItem.classList.toggle('active');
      
      document.querySelectorAll('.faq-item').forEach(item => {
        if (item !== faqItem && item.classList.contains('active')) {
          item.classList.remove('active');
        }
      });
    });
});


document.addEventListener('DOMContentLoaded', function() {
    const map = L.map('map').setView([59.934280, 30.335099], 14);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    // Добавляем метку адреса
    L.marker([59.934280, 30.335099])
        .addTo(map)
        .bindPopup("<b>г. Санкт-Петербург, Комсомольская, 43 к1</b>");

    // Добавляем случайные метки
    addRandomMarkers();

    function addRandomMarkers() {
        const baseCoords = [59.934280, 30.335099];
        const radius = 0.01;
        
        for (let i = 0; i < 1; i++) {
            const randomLat = baseCoords[0] + (Math.random() * radius * 2 - radius);
            const randomLng = baseCoords[1] + (Math.random() * radius * 2 - radius);
            
            L.marker([randomLat, randomLng])
                .addTo(map)
                .bindPopup(`Точка ${i+1}<br>Координаты: ${randomLat.toFixed(6)}, ${randomLng.toFixed(6)}`);
        }
    }
});