const _AUTH_HASH = "SGVzb3lhbTE2MDcr";

function login() {
    const inputEl = document.getElementById('adminPass');
    const errorEl = document.getElementById('loginError');
    if (!inputEl) return;

    const input = inputEl.value;
    if (btoa(input) === _AUTH_HASH) {
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
    initChecklist();
}