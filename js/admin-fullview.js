/* Полноэкранный просмотр обложки.
   Обработчик Escape вынесен в script.js (index) и admin.js (admin).
   Здесь — только открытие/закрытие. */

function openCoverFullview() {
    const fv = document.getElementById('coverFullview');
    if (fv) fv.classList.add('active');
}

function closeCoverFullview() {
    const fv = document.getElementById('coverFullview');
    if (fv) fv.classList.remove('active');
}