const _AUTH_HASH = "SGVzb3lhbTE2MDcr"; // идите в жопу!

window._AUTH_HASH = _AUTH_HASH;

function utf8ToBase64(str) {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    bytes.forEach(b => { binary += String.fromCharCode(b); });
    return btoa(binary);
}

function login() {
    const inputEl = document.getElementById('adminPass');
    const errorEl = document.getElementById('loginError');
    if (!inputEl) return;

    const input = inputEl.value;
    let hash;
    try {
        hash = utf8ToBase64(input);
    } catch (e) {
        hash = '';
    }

    if (hash === _AUTH_HASH) {
        sessionStorage.setItem('isAdmin', 'true');
        sessionStorage.setItem('adminPassHash', hash); // для API отзывов
        showAdminPanel();
    } else {
        if (errorEl) errorEl.style.display = 'block';
        inputEl.value = '';
    }
}

function logout() {
    sessionStorage.removeItem('isAdmin');
    sessionStorage.removeItem('adminPassHash');
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

/* Навешиваем обработчики кнопок и Enter на поле пароля */
document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const passInput = document.getElementById('adminPass');

    if (loginBtn) loginBtn.addEventListener('click', login);
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
    if (passInput) {
        passInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') login();
        });
    }
});
