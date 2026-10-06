/* admin.js — главный файл инициализации админ-панели */
/* Подключает модули: admin-posts.js, admin-checklist.js, admin-editor.js, admin-fullview.js, admin-auth.js */

document.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('isAdmin') === 'true') {
        showAdminPanel();
    }
});