(function () {
    'use strict';

    const TAB_BTN_SELECTOR = '.admin-tab';
    const TAB_PANEL_SELECTOR = '.admin-tab-panel';
    const ACTIVE_CLASS = 'active';
    const STORAGE_KEY = 'valentina_admin_active_tab';

    function switchAdminTab(tabId) {
        const buttons = document.querySelectorAll(TAB_BTN_SELECTOR);
        const panels = document.querySelectorAll(TAB_PANEL_SELECTOR);
        if (!buttons.length || !panels.length) return;

        let found = false;
        panels.forEach(panel => {
            const isTarget = panel.id === tabId;
            if (isTarget) found = true;
            panel.hidden = !isTarget;
            panel.classList.toggle(ACTIVE_CLASS, isTarget);
        });

        if (!found) return;

        buttons.forEach(btn => {
            const isTarget = btn.dataset.tab === tabId;
            btn.classList.toggle(ACTIVE_CLASS, isTarget);
            btn.setAttribute('aria-selected', isTarget ? 'true' : 'false');
        });

        try { localStorage.setItem(STORAGE_KEY, tabId); } catch (e) { /* ignore */ }
    }

    function initTabs() {
        const buttons = document.querySelectorAll(TAB_BTN_SELECTOR);
        if (!buttons.length) return;

        const nav = document.getElementById('adminTabs') || document;
        nav.addEventListener('click', e => {
            const btn = e.target.closest(TAB_BTN_SELECTOR);
            if (!btn) return;
            e.preventDefault();
            const tabId = btn.dataset.tab;
            if (tabId) switchAdminTab(tabId);
        });

        nav.addEventListener('keydown', e => {
            if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
            const btn = e.target.closest(TAB_BTN_SELECTOR);
            if (!btn) return;
            e.preventDefault();

            const list = Array.from(buttons);
            const idx = list.indexOf(btn);
            const next = e.key === 'ArrowRight'
                ? list[(idx + 1) % list.length]
                : list[(idx - 1 + list.length) % list.length];
            next.focus();
            if (next.dataset.tab) switchAdminTab(next.dataset.tab);
        });

        let initial = null;
        try { initial = localStorage.getItem(STORAGE_KEY); } catch (e) { /* ignore */ }

        const validIds = Array.from(document.querySelectorAll(TAB_PANEL_SELECTOR)).map(p => p.id);
        if (!initial || !validIds.includes(initial)) {
            const firstBtn = buttons[0];
            initial = firstBtn ? firstBtn.dataset.tab : null;
        }
        if (initial) switchAdminTab(initial);
    }

    window.switchAdminTab = switchAdminTab;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTabs);
    } else {
        initTabs();
    }
})();
