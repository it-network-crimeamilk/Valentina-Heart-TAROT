(function () {
    'use strict';

    const LEGAL_IDS = ['legalTermsModal', 'legalRulesModal', 'legalPrivacyModal'];

    function openLegal(id) {
        if (!LEGAL_IDS.includes(id)) return;
        if (typeof window.openModal === 'function') {
            window.openModal(id);
        } else {
            const m = document.getElementById(id);
            if (m) {
                m.classList.add('active');
                m.setAttribute('aria-hidden', 'false');
            }
        }
    }

    function handleLegalClick(e) {
        const link = e.target.closest('[data-legal]');
        if (!link) return;
        e.preventDefault();
        const id = link.getAttribute('data-legal');
        openLegal(id);
    }

    function handleLegalKeydown(e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const link = e.target.closest('[data-legal]');
        if (!link) return;
        e.preventDefault();
        const id = link.getAttribute('data-legal');
        openLegal(id);
    }

    document.addEventListener('DOMContentLoaded', () => {
        document.addEventListener('click', handleLegalClick);
        document.addEventListener('keydown', handleLegalKeydown);
    });
})();
