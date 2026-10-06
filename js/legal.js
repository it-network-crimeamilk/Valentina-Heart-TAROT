/* ============================================
   ЮРИДИЧЕСКИЕ МОДАЛКИ
   Использует существующие openModal/closeModal из js/script.js
   ============================================ */

(function () {
    'use strict';

    const LEGAL_IDS = ['legalTermsModal', 'legalRulesModal', 'legalPrivacyModal'];

    /**
     * Открыть юридическую модалку по id.
     * @param {string} id
     */
    function openLegal(id) {
        if (!LEGAL_IDS.includes(id)) return;
        if (typeof window.openModal === 'function') {
            window.openModal(id);
        } else {
            // Fallback, если script.js ещё не подгрузился
            const m = document.getElementById(id);
            if (m) {
                m.classList.add('active');
                m.setAttribute('aria-hidden', 'false');
            }
        }
    }

    /**
     * Делегированный обработчик кликов по ссылкам с data-legal.
     */
    function handleLegalClick(e) {
        const link = e.target.closest('[data-legal]');
        if (!link) return;
        e.preventDefault();
        const id = link.getAttribute('data-legal');
        openLegal(id);
    }

    /**
     * Клавиатурная доступность: Enter/Space на ссылках с data-legal.
     */
    function handleLegalKeydown(e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const link = e.target.closest('[data-legal]');
        if (!link) return;
        e.preventDefault();
        const id = link.getAttribute('data-legal');
        openLegal(id);
    }

    document.addEventListener('DOMContentLoaded', () => {
        // Клики
        document.addEventListener('click', handleLegalClick);
        // Клавиатура
        document.addEventListener('keydown', handleLegalKeydown);
    });
})();