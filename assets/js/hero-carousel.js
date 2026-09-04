document.addEventListener('DOMContentLoaded', function () {
  var photos = document.querySelectorAll('.hero-photo img');
  if (photos.length < 2) return;

  var current = 0;
  setInterval(function () {
    photos[current].classList.remove('active');
    current = (current + 1) % photos.length;
    photos[current].classList.add('active');
  }, 4000);
});