/* Авторизация админки.
   ВНИМАНИЕ: это защита от «случайных» посетителей, а не реальная безопасность.
   Base64 легко декодируется. Не используйте этот метод для чувствительных данных. */

/* Пароль закодирован в base64. Исходный: "Hesoyam1607+" */
const _AUTH_HASH = "SGVzb3lhbTE2MDcr";

async function login() {
    const inputEl = document.getElementById('adminPass');
    const errorEl = document.getElementById('loginError');
    if (!inputEl) return;

    const input = inputEl.value;
    const hash = btoa(input);

    if (hash === _AUTH_HASH) {
        sessionStorage.setItem('isAdmin', 'true');
        showAdminPanel();
    } else {
        if (errorEl) errorEl.style.display = 'block';
        inputEl.value = '';
    }
}

function logout() {
    sessionStorage.removeItem('isAdmin');
    location.reload();
}

function showAdminPanel() {
    const loginForm = document.getElementById('loginForm');
    const panel = document.getElementById('adminPanel');
    if (loginForm) loginForm.style.display = 'none';
    if (!panel) return;

    panel.style.display = 'block';
    panel.classList.add('fade-in');

    if (typeof initChecklist === 'function') initChecklist();
}