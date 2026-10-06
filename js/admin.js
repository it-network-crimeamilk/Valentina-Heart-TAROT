/* Инициализация админ-панели:
   - авто-вход, если сессия уже активна
   - единый обработчик Escape (модалки редактора и просмотра) */

document.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('isAdmin') === 'true') {
        showAdminPanel();
    }
});

document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (typeof closeCoverFullview === 'function') closeCoverFullview();
    if (typeof closeCoverEditor    === 'function') closeCoverEditor();
});