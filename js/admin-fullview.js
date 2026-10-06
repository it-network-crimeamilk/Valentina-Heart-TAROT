/* Полноэкранный просмотр обложки.
   Escape обрабатывается в admin.js.
   REFACTOR: используем общий openModal/closeModal, если доступны, иначе — прямой класс. */

function openCoverFullview() {
    const fv = document.getElementById('coverFullview');
    if (!fv) return;
    if (typeof openModal === 'function') openModal('coverFullview');
    else fv.classList.add('active');
}

function closeCoverFullview() {
    const fv = document.getElementById('coverFullview');
    if (!fv) return;
    if (typeof closeModal === 'function') closeModal('coverFullview');
    else fv.classList.remove('active');
}

/* FIX: кнопка открытия fullview */
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('openFullviewBtn');
    if (btn) btn.addEventListener('click', openCoverFullview);
});