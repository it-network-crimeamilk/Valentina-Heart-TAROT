document.addEventListener('DOMContentLoaded', () => {
    let isAdmin = false;
    try { isAdmin = sessionStorage.getItem('isAdmin') === 'true'; } catch (e) { /* private mode */ }
    if (isAdmin && typeof showAdminPanel === 'function') {
        showAdminPanel();
    }
});

/* Единый Escape-обработчик для админки (закрывает все модалки) */
document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('.modal.active').forEach(m => {
        m.classList.remove('active');
        m.setAttribute('aria-hidden', 'true');
        // cleanup для редактора обложки
        if (m.id === 'coverEditorModal' && typeof closeCoverEditor === 'function') {
            closeCoverEditor();
        }
    });
});
