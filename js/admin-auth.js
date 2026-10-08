const _AUTH_HASH = "SGVzb3lhbTE2MDcr"; // идите в жопу!

window._AUTH_HASH = _AUTH_HASH;

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  bytes.forEach(b => { binary += String.fromCharCode(b); });
  return btoa(binary);
}

function safeSessionSet(key, value) {
  try { sessionStorage.setItem(key, value); } catch (e) { /* private mode */ }
}
function safeSessionGet(key) {
  try { return sessionStorage.getItem(key); } catch (e) { return null; }
}
function safeSessionRemove(key) {
  try { sessionStorage.removeItem(key); } catch (e) { /* ignore */ }
}

function login() {
  const inputEl = document.getElementById('adminPass');
  const errorEl = document.getElementById('loginError');
  if (!inputEl) return;

  const input = inputEl.value;
  if (!input) {
    if (errorEl) errorEl.style.display = 'block';
    return;
  }

  let hash;
  try {
    hash = utf8ToBase64(input);
  } catch (e) {
    hash = '';
  }

  if (hash === _AUTH_HASH) {
    safeSessionSet('isAdmin', 'true');
    safeSessionSet('adminPassHash', hash);
    if (errorEl) errorEl.style.display = 'none';
    showAdminPanel();
  } else {
    if (errorEl) errorEl.style.display = 'block';
    inputEl.value = '';
  }
}

function logout() {
  safeSessionRemove('isAdmin');
  safeSessionRemove('adminPassHash');
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
