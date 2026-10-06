/* Инициализация админ-панели:
   - авто-вход, если сессия уже активна
   - единый обработчик Escape (модалки редактора и просмотра) */

document.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('isAdmin') === 'true') {
        showAdminPanel();
    }
});

/* FIX: единый Escape-обработчик для админки (закрывает все модалки) */
document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('.modal.active').forEach(m => {
        m.classList.remove('active');
        m.setAttribute('aria-hidden', 'true');
    });
});