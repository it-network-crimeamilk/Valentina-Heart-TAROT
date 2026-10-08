(function () {
    'use strict';

    const API_URL = 'orders/api.php';
    const PER_PAGE = 5;

    const STATUS_LABELS = {
        new: '🆕 Новый',
        in_progress: '⏳ В работе',
        done: '✅ Выполнен',
        rejected: '❌ Отклонён'
    };

    let currentPage = 1;
    let currentFilter = 'all';
    let allOrders = [];
    let adminPass = null;

    /* ---------- Авторизация ---------- */
    function getAdminPass() {
        if (adminPass) return adminPass;
        try {
            const s = sessionStorage.getItem('adminPassHash');
            if (s) { adminPass = s; return adminPass; }
        } catch (e) { /* private mode */ }
        if (typeof window._AUTH_HASH === 'string' && window._AUTH_HASH) {
            adminPass = window._AUTH_HASH;
        }
        return adminPass;
    }

    /* ---------- API ---------- */
    async function apiGetOrders() {
        const p = getAdminPass();
        if (!p) throw new Error('Нет авторизации');
        const res = await fetch(API_URL + '?action=list&t=' + Date.now(), {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'X-Admin-Pass': p
            }
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success || !Array.isArray(data.orders)) {
            throw new Error(data.error || ('HTTP ' + res.status));
        }
        return data.orders;
    }

    async function apiSend(action, payload = {}) {
        const p = getAdminPass();
        if (!p) throw new Error('Нет авторизации. Войдите заново.');

        const fd = new FormData();
        fd.append('action', action);
        Object.keys(payload).forEach(k => {
            if (payload[k] !== undefined && payload[k] !== null) fd.append(k, payload[k]);
        });
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
        try {
            const d = new Date(s.replace(' ', 'T'));
            if (isNaN(d.getTime())) return s;
            return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
                + ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        } catch (e) { return s; }
    }

    function isImage(path) {
        return /\.(jpe?g|png|webp|gif)$/i.test(path || '');
    }
    function isPdf(path) {
        return /\.pdf$/i.test(path || '');
    }

    /* ---------- Рендер вложения ---------- */
    function renderAttachment(o) {
        if (o.attachment_deleted) {
            return `<div class="order-attachment-missing" title="Файл удалён ${escapeHtml(o.attachment_deleted_at || '')}">🗑️<br>Файл удалён</div>`;
        }
        if (!o.attachment) {
            return `<div class="order-attachment-missing">Нет файла</div>`;
        }
        if (isImage(o.attachment)) {
            return `<img class="order-attachment-thumb" src="${escapeHtml(o.attachment)}" alt="Вложение"
                   onerror="this.onerror=null;this.outerHTML='&lt;div class=\\'order-attachment-missing\\'&gt;🗑️&lt;br&gt;Нет файла&lt;/div&gt;';">`;
        }
        if (isPdf(o.attachment)) {
            return `<a href="${escapeHtml(o.attachment)}" target="_blank" rel="noopener"
                 class="order-attachment-thumb order-attachment-pdf" title="Открыть PDF">📄</a>`;
        }
        return `<a href="${escapeHtml(o.attachment)}" target="_blank" rel="noopener"
               class="order-attachment-thumb order-attachment-pdf" title="Открыть файл">📎</a>`;
    }

    /* ---------- Рендер списка ---------- */
    function renderList() {
        const container = document.getElementById('ordersList');
        const paginationEl = document.getElementById('ordersPagination');
        if (!container) return;

        let filtered = allOrders.slice();
        if (currentFilter !== 'all') {
            filtered = filtered.filter(o => (o.status || 'new') === currentFilter);
        }
        filtered.sort((a, b) => (b.id || 0) - (a.id || 0));

        if (filtered.length === 0) {
            container.innerHTML = '<div class="review-empty">Заявок нет.</div>';
            if (paginationEl) paginationEl.innerHTML = '';
            return;
        }

        const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
        if (currentPage < 1) currentPage = 1;
        if (currentPage > totalPages) currentPage = totalPages;

        const start = (currentPage - 1) * PER_PAGE;
        const slice = filtered.slice(start, start + PER_PAGE);

        container.innerHTML = slice.map(o => {
            const id = o.id || 0;
            const status = o.status || 'new';
            const statusLabel = STATUS_LABELS[status] || status;
            const name = escapeHtml(o.name || 'Без имени');
            const contact = escapeHtml(o.contact || '');
            const message = escapeHtml(o.message || '');
            const note = o.note ? escapeHtml(o.note) : '';
            const date = formatDate(o.date);

            const openBtn = o.attachment_deleted || !o.attachment
                ? ''
                : `<button type="button" data-action="open" title="Открыть файл">👁️ Открыть файл</button>`;

            return `
        <div class="review-admin-item order-admin-item" data-order-id="${id}">
          ${renderAttachment(o)}
          <div class="review-admin-content">
            <div class="review-admin-name">
              ${name}
              <span class="order-status ${status}">${statusLabel}</span>
            </div>
            ${contact ? `<div class="order-contact">📞 ${contact}</div>` : ''}
            <div class="review-admin-text">${message}</div>
            <div class="review-admin-date">${date}</div>
            ${note ? `<div class="order-note">📝 ${note}</div>` : ''}
          </div>
          <div class="review-admin-actions">
            ${openBtn}
            <button type="button" data-action="edit" title="Изменить">✏️ Изменить</button>
            <button type="button" class="danger" data-action="delete" title="Удалить">🗑️ Удалить</button>
          </div>
        </div>
      `;
        }).join('');

        container.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', handleAction);
        });

        if (paginationEl) renderPagination(paginationEl, currentPage, totalPages);
    }

    function renderPagination(el, page, totalPages) {
        if (totalPages <= 1) { el.innerHTML = ''; return; }
        let html = '';
        html += `<button type="button" class="page-btn" data-page="${page - 1}" ${page === 1 ? 'disabled' : ''} aria-label="Назад">‹</button>`;
        for (let i = 1; i <= totalPages; i++) {
            html += `<button type="button" class="page-btn ${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
        }
        html += `<button type="button" class="page-btn" data-page="${page + 1}" ${page === totalPages ? 'disabled' : ''} aria-label="Вперёд">›</button>`;
        el.innerHTML = html;

        el.querySelectorAll('.page-btn[data-page]').forEach(btn => {
            btn.addEventListener('click', () => {
                const p = parseInt(btn.dataset.page, 10);
                if (!isNaN(p) && p !== currentPage) {
                    currentPage = p;
                    renderList();
                }
            });
        });
    }

    /* ---------- Действия ---------- */
    async function handleAction(e) {
        const btn = e.currentTarget;
        const item = btn.closest('.order-admin-item');
        if (!item) return;
        const id = parseInt(item.dataset.orderId, 10);
        const action = btn.dataset.action;
        if (!id) return;

        if (btn.disabled) return;

        if (action === 'open') {
            const o = allOrders.find(x => (x.id || 0) === id);
            if (o && o.attachment && !o.attachment_deleted) {
                window.open(o.attachment, '_blank', 'noopener');
            }
            return;
        }

        if (action === 'edit') {
            openEditForm(item, id);
            return;
        }

        if (action === 'delete') {
            const nameEl = item.querySelector('.review-admin-name');
            const name = nameEl ? nameEl.textContent.trim().split('\n')[0] : 'эту заявку';
            if (!confirm(`Удалить заявку от "${name}"?`)) return;
            btn.disabled = true;
            try {
                await apiSend('delete', { id });
                await loadAndRender();
            } catch (err) {
                console.error(err);
                alert('Ошибка: ' + err.message);
                btn.disabled = false;
            }
        }
    }

    function openEditForm(item, id) {
        const existing = item.querySelector('.order-edit-form');
        if (existing) { existing.remove(); return; }

        const o = allOrders.find(x => (x.id || 0) === id);
        if (!o) return;

        const form = document.createElement('div');
        form.className = 'review-edit-form order-edit-form';
        form.innerHTML = `
      <label>
        Статус
        <select data-field="status">
          <option value="new">🆕 Новый</option>
          <option value="in_progress">⏳ В работе</option>
          <option value="done">✅ Выполнен</option>
          <option value="rejected">❌ Отклонён</option>
        </select>
      </label>
      <label>
        Заметка админа
        <textarea data-field="note" placeholder="Внутренняя заметка...">${escapeHtml(o.note || '')}</textarea>
      </label>
      <label>
        Имя
        <input type="text" data-field="name" value="${escapeHtml(o.name || '')}" maxlength="120">
      </label>
      <label>
        Контакт
        <input type="text" data-field="contact" value="${escapeHtml(o.contact || '')}" maxlength="200">
      </label>
      <label>
        Текст обращения
        <textarea data-field="message" maxlength="2000">${escapeHtml(o.message || '')}</textarea>
      </label>
      <div class="edit-actions">
        <button type="button" data-save="1">💾 Сохранить</button>
        <button type="button" data-cancel="1">Отмена</button>
      </div>
    `;
        item.appendChild(form);

        const statusSel = form.querySelector('[data-field="status"]');
        if (statusSel) statusSel.value = o.status || 'new';

        form.querySelector('[data-cancel]').addEventListener('click', () => form.remove());
        form.querySelector('[data-save]').addEventListener('click', async () => {
            const newStatus = form.querySelector('[data-field="status"]').value;
            const newNote = form.querySelector('[data-field="note"]').value.trim();
            const newName = form.querySelector('[data-field="name"]').value.trim();
            const newContact = form.querySelector('[data-field="contact"]').value.trim();
            const newMessage = form.querySelector('[data-field="message"]').value.trim();

            if (!newName || !newContact || !newMessage) {
                alert('Имя, контакт и текст обращения обязательны.');
                return;
            }

            const saveBtn = form.querySelector('[data-save]');
            saveBtn.disabled = true;
            saveBtn.textContent = '…';

            try {
                await apiSend('update', {
                    id,
                    status: newStatus,
                    note: newNote,
                    name: newName,
                    contact: newContact,
                    message: newMessage
                });
                form.remove();
                await loadAndRender();
            } catch (err) {
                console.error(err);
                alert('Ошибка сохранения: ' + err.message);
                saveBtn.disabled = false;
                saveBtn.textContent = '💾 Сохранить';
            }
        });
    }

    /* ---------- Очистка папки с вложениями ---------- */
    async function cleanupUploads() {
        const btn = document.getElementById('cleanupUploadsBtn');
        if (!confirm('Удалить все файлы вложений из папки orders/uploads/? Записи заявок сохранятся, но файлы станут недоступны.')) return;
        if (btn) btn.disabled = true;
        try {
            const res = await apiSend('cleanup_uploads');
            alert('✅ Удалено файлов: ' + (res.deleted || 0));
            await loadAndRender();
        } catch (err) {
            console.error(err);
            alert('Ошибка очистки: ' + err.message);
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    /* ---------- Фильтр ---------- */
    function setupFilter() {
        const wrap = document.querySelector('.orders-filter');
        if (!wrap) return;
        wrap.addEventListener('click', e => {
            const btn = e.target.closest('.admin-tab[data-status]');
            if (!btn) return;
            e.preventDefault();
            currentFilter = btn.dataset.status || 'all';
            currentPage = 1;
            wrap.querySelectorAll('.admin-tab').forEach(b => {
                b.classList.toggle('active', b === btn);
            });
            renderList();
        });
    }

    /* ---------- Загрузка + рендер ---------- */
    async function loadAndRender() {
        const container = document.getElementById('ordersList');
        if (container) container.innerHTML = '<div class="review-empty">Загрузка...</div>';
        try {
            allOrders = await apiGetOrders();
        } catch (e) {
            console.error(e);
            if (container) container.innerHTML = '<div class="review-empty">Не удалось загрузить заявки: ' + escapeHtml(e.message) + '</div>';
            return;
        }
        renderList();
    }

    /* ---------- Инициализация ---------- */
    document.addEventListener('DOMContentLoaded', () => {
        const cleanupBtn = document.getElementById('cleanupUploadsBtn');
        if (cleanupBtn) cleanupBtn.addEventListener('click', cleanupUploads);

        setupFilter();

        const checkPanel = setInterval(() => {
            const panel = document.getElementById('adminPanel');
            if (panel && panel.style.display !== 'none') {
                loadAndRender();
                clearInterval(checkPanel);
            }
        }, 300);
    });
})();
