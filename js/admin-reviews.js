(function () {
  'use strict';

  const API_URL = 'reviews/api.php';
  const DEFAULT_AVATAR = 'reviews/avatars/avatar_comments.jpg';
  const DEFAULT_AVATAR_BASE64 = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMzAiIGZpbGw9IiNjMDgwODEiLz48dGV4dCB4PSI1MCUiIHk9IjU1JSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI2ZmZiIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjQiPvCfkpM8L3RleHQ+PC9zdmc+';
  const PER_PAGE = 5;

  let currentPage = 1;
  let adminPass = null;

  /* ---------- Авторизация ---------- */
  function getAdminPass() {
    if (adminPass) return adminPass;
    try {
      const s = sessionStorage.getItem('adminPassHash');
      if (s) { adminPass = s; return adminPass; }
    } catch (e) { /* private mode */ }
    // Fallback: используем хеш из admin-auth.js (для случая, когда sessionStorage недоступен)
    if (typeof window._AUTH_HASH === 'string' && window._AUTH_HASH) {
      adminPass = window._AUTH_HASH;
    }
    return adminPass;
  }

  /* ---------- API ---------- */
  async function apiGetReviews() {
    const res = await fetch(API_URL + '?t=' + Date.now(), {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (!data.success || !Array.isArray(data.reviews)) throw new Error('Некорректный ответ');
    return data.reviews;
  }

  async function apiSend(action, payload = {}, file = null) {
    const p = getAdminPass();
    if (!p) throw new Error('Нет авторизации. Войдите заново.');

    const fd = new FormData();
    fd.append('action', action);
    Object.keys(payload).forEach(k => {
      if (payload[k] !== undefined && payload[k] !== null) fd.append(k, payload[k]);
    });
    if (file) fd.append('avatar', file);
    fd.append('_admin_pass', p);

    const res = await fetch(API_URL, { method: 'POST', body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(data.error || ('HTTP ' + res.status));
    }
    return data;
  }

  /* ---------- Utils ---------- */
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function formatDate(s) {
    if (!s) return '';
    try { return new Date(s).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
    catch (e) { return s; }
  }

  /* =====================================================
     РЕНДЕР СПИСКА
     ===================================================== */
  async function renderAdminReviews(page) {
    const container = document.getElementById('adminReviewsList');
    const paginationEl = document.getElementById('adminReviewsPagination');
    if (!container) return;

    container.innerHTML = '<div class="review-empty">Загрузка...</div>';

    let reviews;
    try {
      reviews = await apiGetReviews();
    } catch (e) {
      console.error(e);
      container.innerHTML = '<div class="review-empty">Не удалось загрузить отзывы.</div>';
      if (paginationEl) paginationEl.innerHTML = '';
      return;
    }

    if (reviews.length === 0) {
      container.innerHTML = '<div class="review-empty">Отзывов пока нет. Добавьте первый!</div>';
      if (paginationEl) paginationEl.innerHTML = '';
      return;
    }

    const sorted = reviews.slice().sort((a, b) => (b.id || 0) - (a.id || 0));
    const totalPages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
    if (!page || page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    currentPage = page;

    const start = (page - 1) * PER_PAGE;
    const slice = sorted.slice(start, start + PER_PAGE);

    container.innerHTML = slice.map(r => {
      const avatar = r.avatar || DEFAULT_AVATAR;
      const name = escapeHtml(r.name || 'Аноним');
      const text = escapeHtml(r.text || '');
      const date = formatDate(r.date);
      const isVisible = r.visible !== false;
      return `
        <div class="review-admin-item" data-review-id="${r.id}">
          <img class="review-admin-avatar" src="${avatar}" alt="${name}"
               onerror="this.onerror=null;this.src='${DEFAULT_AVATAR_BASE64}'">
          <div class="review-admin-content">
            <div class="review-admin-name">${name}</div>
            <div class="review-admin-text">${text}</div>
            <div class="review-admin-date">${date}</div>
          </div>
          <div class="review-admin-actions">
            <button type="button" class="${isVisible ? 'active' : ''}" data-action="toggle"
                    title="${isVisible ? 'Скрыть' : 'Показать'}">
              ${isVisible ? '👁️ Видим' : '🙈 Скрыт'}
            </button>
            <button type="button" data-action="edit" title="Редактировать">✏️ Изменить</button>
            <button type="button" class="danger" data-action="delete" title="Удалить">🗑️ Удалить</button>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', handleAction);
    });

    if (paginationEl) renderAdminPagination(paginationEl, currentPage, totalPages);
  }

  function renderAdminPagination(el, page, totalPages) {
    if (totalPages <= 1) { el.innerHTML = ''; return; }
    let html = '';
    html += `<button type="button" class="page-btn" data-page="${page - 1}" ${page === 1 ? 'disabled' : ''} aria-label="Предыдущая страница">‹</button>`;
    for (let i = 1; i <= totalPages; i++) {
      html += `<button type="button" class="page-btn ${i === page ? 'active' : ''}" data-page="${i}" aria-label="Страница ${i}" ${i === page ? 'aria-current="page"' : ''}>${i}</button>`;
    }
    html += `<button type="button" class="page-btn" data-page="${page + 1}" ${page === totalPages ? 'disabled' : ''} aria-label="Следующая страница">›</button>`;
    el.innerHTML = html;

    el.querySelectorAll('.page-btn[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = parseInt(btn.dataset.page, 10);
        if (!isNaN(p) && p !== currentPage) renderAdminReviews(p);
      });
    });
  }

  /* =====================================================
     ДЕЙСТВИЯ
     ===================================================== */
  async function handleAction(e) {
    const btn = e.currentTarget;
    const item = btn.closest('.review-admin-item');
    const id = parseInt(item.dataset.reviewId, 10);
    const action = btn.dataset.action;
    if (!id) return;

    if (btn.disabled) return;
    btn.disabled = true;

    try {
      if (action === 'toggle') {
        const isVisible = btn.classList.contains('active');
        await apiSend('update', { id, visible: isVisible ? 'false' : 'true' });
        await renderAdminReviews(currentPage);

      } else if (action === 'delete') {
        const nameEl = item.querySelector('.review-admin-name');
        const name = nameEl ? nameEl.textContent : 'этот отзыв';
        if (!confirm(`Удалить отзыв от "${name}"?`)) { btn.disabled = false; return; }
        await apiSend('delete', { id });
        await renderAdminReviews(currentPage);

      } else if (action === 'edit') {
        btn.disabled = false;
        openEditForm(item, id);
      }
    } catch (err) {
      console.error(err);
      alert('Ошибка: ' + err.message);
      btn.disabled = false;
    }
  }

  function openEditForm(item, id) {
    const existing = item.querySelector('.review-edit-form');
    if (existing) { existing.remove(); return; }

    const nameText = item.querySelector('.review-admin-name')?.textContent || '';
    const textText = item.querySelector('.review-admin-text')?.textContent || '';

    const dateText = item.querySelector('.review-admin-date')?.textContent || '';
    let isoDate = '';
    const dm = dateText.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (dm) isoDate = `${dm[3]}-${dm[2]}-${dm[1]}`;

    const form = document.createElement('div');
    form.className = 'review-edit-form';
    form.innerHTML = `
      <input type="text" data-field="name" value="${escapeHtml(nameText)}" placeholder="Имя" maxlength="60">
      <textarea data-field="text" placeholder="Текст отзыва" maxlength="1000">${escapeHtml(textText)}</textarea>
      <input type="date" data-field="date" value="${isoDate}">
      <label style="display:flex; align-items:center; gap:8px; flex-direction:row; font-size:13px;">
        <input type="file" data-field="avatar" accept="image/*">
        <span style="color:var(--text-muted)">Заменить аватар (необязательно)</span>
      </label>
      <div class="edit-actions">
        <button type="button" data-save="1">💾 Сохранить</button>
        <button type="button" data-cancel="1">Отмена</button>
      </div>
    `;
    item.appendChild(form);

    form.querySelector('[data-cancel]').addEventListener('click', () => form.remove());
    form.querySelector('[data-save]').addEventListener('click', async () => {
      const newName = form.querySelector('[data-field="name"]').value.trim();
      const newText = form.querySelector('[data-field="text"]').value.trim();
      const newDate = form.querySelector('[data-field="date"]').value;
      const fileInput = form.querySelector('[data-field="avatar"]');
      const file = fileInput?.files?.[0];

      if (!newName || !newText) { alert('Имя и текст обязательны.'); return; }
      if (file && file.size > 2 * 1024 * 1024) { alert('Файл больше 2 МБ.'); return; }

      const saveBtn = form.querySelector('[data-save]');
      saveBtn.disabled = true;
      saveBtn.textContent = '…';

      try {
        await apiSend('update', {
          id,
          name: newName,
          text: newText,
          date: newDate || ''
        }, file);
        form.remove();
        await renderAdminReviews(currentPage);
      } catch (err) {
        console.error(err);
        alert('Ошибка сохранения: ' + err.message);
        saveBtn.disabled = false;
        saveBtn.textContent = '💾 Сохранить';
      }
    });
  }

  /* =====================================================
     ФОРМА ДОБАВЛЕНИЯ
     ===================================================== */
  function setupAdminAddForm() {
    const form = document.getElementById('adminAddReviewForm');
    if (!form) return;

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const statusEl = document.getElementById('adminReviewStatus');
      const submitBtn = form.querySelector('button[type="submit"]');
      const setStatus = (text, color) => {
        if (statusEl) { statusEl.textContent = text; statusEl.style.color = color; }
      };

      const name = (form.elements.adminReviewName?.value || '').trim();
      const text = (form.elements.adminReviewText?.value || '').trim();
      const date = (form.elements.adminReviewDate?.value || new Date().toISOString().split('T')[0]);
      const visible = form.elements.adminReviewVisible?.checked !== false;
      const fileInput = form.elements.adminReviewAvatar;
      const file = fileInput?.files?.[0];

      if (!name || !text) { setStatus('⚠️ Имя и текст обязательны.', '#ef5350'); return; }
      if (file && file.size > 2 * 1024 * 1024) { setStatus('⚠️ Файл больше 2 МБ.', '#ef5350'); return; }

      if (submitBtn) submitBtn.disabled = true;
      setStatus('✨ Сохранение...', '#c08081');

      try {
        await apiSend('create', {
          name, text, date,
          visible: visible ? 'true' : 'false'
        }, file);

        setStatus('✅ Отзыв добавлен!', '#66bb6a');
        form.reset();
        if (form.elements.adminReviewVisible) form.elements.adminReviewVisible.checked = true;

        currentPage = 1;
        await renderAdminReviews(currentPage);

        setTimeout(() => {
          setStatus('', '');
          if (submitBtn) submitBtn.disabled = false;
        }, 2500);
      } catch (err) {
        console.error(err);
        setStatus('❌ ' + (err.message || 'Ошибка при сохранении.'), '#ef5350');
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  /* =====================================================
     ИНИЦИАЛИЗАЦИЯ
     ===================================================== */
  document.addEventListener('DOMContentLoaded', () => {
    const checkPanel = setInterval(() => {
      const panel = document.getElementById('adminPanel');
      if (panel && panel.style.display !== 'none') {
        renderAdminReviews(1);
        setupAdminAddForm();
        clearInterval(checkPanel);
      }
    }, 300);
  });
})();
