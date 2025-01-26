document.addEventListener('DOMContentLoaded', function() {
    const anchorButton = document.querySelector('.anchor-button');
    const anchoredElement = document.querySelector('.anchored-element');

    anchorButton.addEventListener('mouseenter', function() {
        anchoredElement.style.display = 'block';
    });

    anchorButton.addEventListener('mouseleave', function() {
        anchoredElement.style.display = 'none';
    });

    anchoredElement.addEventListener('mouseenter', function() {
        anchoredElement.style.display = 'block';
    });

    anchoredElement.addEventListener('mouseleave', function() {
        anchoredElement.style.display = 'none';
    });
});