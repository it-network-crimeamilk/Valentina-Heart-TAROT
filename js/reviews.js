(function () {
  'use strict';

  const API_URL = 'reviews/api.php';
  const DEFAULT_AVATAR = 'reviews/avatars/avatar_comments.jpg';
  const MAX_TEXT_LENGTH = 140;
  const PER_PAGE = 5;

  let allVisibleReviews = [];
  let currentPage = 1;

  /* ---------- Fisher-Yates shuffle ---------- */
  function shuffleArray(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* ---------- Загрузка отзывов с сервера ---------- */
  async function loadReviews() {
    try {
      const res = await fetch(API_URL + '?t=' + Date.now(), {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (!data || data.success !== true || !Array.isArray(data.reviews)) {
        throw new Error('Некорректный ответ сервера');
      }
      return data.reviews;
    } catch (e) {
      console.error('Не удалось загрузить отзывы:', e);
      return [];
    }
  }

  /* ---------- Утилиты ---------- */
  function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
    } catch (e) { return dateStr; }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* =====================================================
     РЕНДЕР КАРТОЧКИ
     ===================================================== */
  function renderCard(r) {
    const avatar = r.avatar || DEFAULT_AVATAR;
    const name = escapeHtml(r.name || 'Аноним');
    const rawText = r.text || '';
    const safeFull = escapeHtml(rawText);
    const isLong = rawText.length > MAX_TEXT_LENGTH;
    const shortText = isLong
      ? escapeHtml(rawText.substring(0, MAX_TEXT_LENGTH)) + '...'
      : safeFull;

    return `
      <div class="review-card" data-review-id="${r.id}">
        <div class="review-header">
          <img class="review-avatar" src="${avatar}" alt="${name}"
               onerror="this.onerror=null;this.src='${DEFAULT_AVATAR}'">
          <div class="review-meta">
            <span class="review-name">${name}</span>
            <span class="review-date">${formatDate(r.date)}</span>
          </div>
        </div>
        <div class="review-text ${isLong ? 'collapsed' : ''}"
             data-short="${shortText}"
             data-full="${safeFull}"
             data-expanded="false">${isLong ? shortText : safeFull}</div>
        ${isLong ? '<button class="review-toggle" type="button" aria-expanded="false">Показать полностью</button>' : ''}
      </div>
    `;
  }

  /* =====================================================
     ПАГИНАЦИЯ
     ===================================================== */
  function renderPage(page) {
    const container = document.getElementById('reviewsCarousel');
    const paginationEl = document.getElementById('reviewsPagination');
    if (!container) return;

    const total = allVisibleReviews.length;
    const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    currentPage = page;

    if (total === 0) {
      container.innerHTML = '<div class="review-empty">Пока нет отзывов. Будьте первым!</div>';
      if (paginationEl) paginationEl.innerHTML = '';
      return;
    }

    const start = (page - 1) * PER_PAGE;
    const slice = allVisibleReviews.slice(start, start + PER_PAGE);

    container.innerHTML = slice.map(renderCard).join('');
    bindToggleHandlers(container);

    if (paginationEl) renderPagination(paginationEl, currentPage, totalPages);
  }

  function renderPagination(el, page, totalPages) {
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
        if (!isNaN(p) && p !== currentPage) {
          renderPage(p);
          const section = document.getElementById('reviews');
          if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  function bindToggleHandlers(container) {
    container.querySelectorAll('.review-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const card = btn.closest('.review-card');
        if (!card) return;
        const textEl = card.querySelector('.review-text');
        if (!textEl) return;
        const expanded = textEl.dataset.expanded === 'true';
        if (expanded) {
          textEl.textContent = textEl.dataset.short;
          textEl.classList.add('collapsed');
          textEl.dataset.expanded = 'false';
          btn.textContent = 'Показать полностью';
          btn.setAttribute('aria-expanded', 'false');
        } else {
          textEl.textContent = textEl.dataset.full;
          textEl.classList.remove('collapsed');
          textEl.dataset.expanded = 'true';
          btn.textContent = 'Свернуть';
          btn.setAttribute('aria-expanded', 'true');
        }
      });
    });
  }

  async function renderReviews() {
    const container = document.getElementById('reviewsCarousel');
    if (!container) return;
    const reviews = await loadReviews();
    const visible = reviews.filter(r => r.visible !== false);
    allVisibleReviews = shuffleArray(visible);
    renderPage(1);
  }

  /* =====================================================
     ФОРМА "ОСТАВИТЬ ОТЗЫВ"
     ===================================================== */
  function setupReviewForm() {
    const form = document.getElementById('reviewForm');
    if (!form) return;

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const statusEl = document.getElementById('reviewFormStatus');
      const submitBtn = form.querySelector('button[type="submit"]');
      const setStatus = (text, color) => {
        if (statusEl) { statusEl.textContent = text; statusEl.style.color = color; }
      };

      const name = (form.elements.reviewName?.value || '').trim();
      const text = (form.elements.reviewText?.value || '').trim();
      const fileInput = form.elements.reviewAvatar;
      const file = fileInput?.files?.[0];

      if (!name || !text) {
        setStatus('⚠️ Пожалуйста, заполните имя и текст отзыва.', '#ef5350');
        return;
      }
      if (file && file.size > 2 * 1024 * 1024) {
        setStatus('⚠️ Файл слишком большой (макс. 2 МБ).', '#ef5350');
        return;
      }

      setStatus('✨ Отправка отзыва...', '#c08081');
      if (submitBtn) submitBtn.disabled = true;

      try {
        const fd = new FormData();
        fd.append('action', 'create');
        fd.append('name', name);
        fd.append('text', text);
        fd.append('visible', 'false');
        if (file) fd.append('avatar', file);

        const res = await fetch(API_URL, { method: 'POST', body: fd });
        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data.success) {
          throw new Error(data.error || ('HTTP ' + res.status));
        }

        setStatus('✅ Спасибо! Ваш отзыв отправлен на модерацию.', '#66bb6a');
        form.reset();
        setTimeout(() => {
          setStatus('', '');
          if (submitBtn) submitBtn.disabled = false;
          if (typeof closeModal === 'function') closeModal('reviewModal');
          renderReviews();
        }, 2500);
      } catch (err) {
        console.error(err);
        setStatus('❌ ' + (err.message || 'Ошибка отправки. Попробуйте позже.'), '#ef5350');
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderReviews();
    setupReviewForm();
  });
})();
