/* ============================================
   ПЕЧЕНЬЕ С ПРЕДСКАЗАНИЕМ
   Одно предсказание на весь день.
   ============================================ */
(function () {
    'use strict';

    const FORTUNE_JSON_URL = './images/fortune-cookies.json';
    const STORAGE_DATE_KEY = 'fortune_date';
    const STORAGE_ID_KEY = 'fortune_id';

    let fortunesCache = null;
    let isLoading = false;

    function getTodayKey() {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    function safeGet(key) {
        try { return localStorage.getItem(key); } catch (e) { return null; }
    }
    function safeSet(key, value) {
        try { localStorage.setItem(key, value); } catch (e) { /* ignore */ }
    }

    async function loadFortunes() {
        if (fortunesCache) return fortunesCache;
        const res = await fetch(FORTUNE_JSON_URL + '?t=' + Date.now());
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        if (!data || !Array.isArray(data.fortunes) || data.fortunes.length === 0) {
            throw new Error('Некорректный формат JSON');
        }
        fortunesCache = data.fortunes;
        return fortunesCache;
    }

    function renderFortune(fortune) {
        const titleEl = document.getElementById('fortuneTitle');
        const textEl = document.getElementById('fortuneText');
        const adviceEl = document.getElementById('fortuneAdvice');

        if (titleEl) titleEl.textContent = fortune.title || 'Предсказание';
        if (textEl) textEl.textContent = fortune.prediction || '';
        if (adviceEl) adviceEl.textContent = fortune.advice || '';
    }

    async function openFortune() {
        const modal = document.getElementById('fortuneModal');
        if (!modal) return;

        const titleEl = document.getElementById('fortuneTitle');
        const textEl = document.getElementById('fortuneText');
        const adviceEl = document.getElementById('fortuneAdvice');
        if (titleEl) titleEl.textContent = '🌙 Луна готовит предсказание...';
        if (textEl) textEl.textContent = '';
        if (adviceEl) adviceEl.textContent = '';

        if (typeof openModal === 'function') {
            openModal('fortuneModal');
        } else {
            modal.classList.add('active');
            modal.setAttribute('aria-hidden', 'false');
        }

        if (isLoading) return;
        isLoading = true;

        try {
            const fortunes = await loadFortunes();
            const today = getTodayKey();
            const savedDate = safeGet(STORAGE_DATE_KEY);
            let savedId = safeGet(STORAGE_ID_KEY);

            if (savedDate !== today || !savedId) {
                const random = fortunes[Math.floor(Math.random() * fortunes.length)];
                savedId = String(random.id);
                safeSet(STORAGE_ID_KEY, savedId);
                safeSet(STORAGE_DATE_KEY, today);
            }

            let fortune = fortunes.find(f => String(f.id) === String(savedId));
            if (!fortune) {
                fortune = fortunes[Math.floor(Math.random() * fortunes.length)];
                safeSet(STORAGE_ID_KEY, String(fortune.id));
                safeSet(STORAGE_DATE_KEY, today);
            }

            renderFortune(fortune);
        } catch (err) {
            console.error('Ошибка загрузки предсказания:', err);
            if (titleEl) titleEl.textContent = '🌙 Луна молчит...';
            if (textEl) textEl.textContent = 'Не удалось загрузить предсказание. Попробуйте позже.';
            if (adviceEl) adviceEl.textContent = '';
        } finally {
            isLoading = false;
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        const btn = document.getElementById('fortuneBtn');
        if (btn) btn.addEventListener('click', openFortune);
    });

    window.openFortune = openFortune;
})();
