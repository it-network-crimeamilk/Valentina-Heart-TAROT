/* ============================================
   ОЧИСТКА КЕША
   - localStorage / sessionStorage
   - cookies (доступные из JS)
   - Cache Storage API (если доступно)
   - Service Worker registrations (если доступно)
   ============================================ */
(function () {
    'use strict';

    var BUTTON_ID = 'clearCacheBtn';

    function clearLocalStorage() {
        try { localStorage.clear(); } catch (e) { /* private mode */ }
    }

    function clearSessionStorage() {
        try { sessionStorage.clear(); } catch (e) { /* private mode */ }
    }

    function clearCookies() {
        try {
            var cookies = document.cookie ? document.cookie.split(';') : [];
            var paths = ['/', '/admin', '/orders', '/reviews', window.location.pathname];
            for (var i = 0; i < cookies.length; i++) {
                var c = cookies[i];
                var eq = c.indexOf('=');
                var name = (eq > -1 ? c.substr(0, eq) : c).trim();
                if (!name) continue;
                for (var j = 0; j < paths.length; j++) {
                    document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=' + paths[j];
                    document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=' + paths[j] +
                        '; domain=' + window.location.hostname;
                }
            }
        } catch (e) { /* ignore */ }
    }

    function clearCacheStorage() {
        if (typeof caches === 'undefined' || !caches || typeof caches.keys !== 'function') {
            return Promise.resolve();
        }
        return caches.keys().then(function (keys) {
            return Promise.all(keys.map(function (k) {
                return caches.delete(k);
            }));
        }).catch(function () { /* ignore */ });
    }

    function clearServiceWorkers() {
        if (!('serviceWorker' in navigator) || !navigator.serviceWorker ||
            typeof navigator.serviceWorker.getRegistrations !== 'function') {
            return Promise.resolve();
        }
        return navigator.serviceWorker.getRegistrations().then(function (regs) {
            return Promise.all(regs.map(function (r) {
                return r.unregister();
            }));
        }).catch(function () { /* ignore */ });
    }

    function reloadPage() {
        try {
            // Пытаемся обойти кеш браузера
            window.location.reload(true);
        } catch (e) {
            window.location.reload();
        }
    }

    /**
     * Тихая очистка без alert и без reload.
     * По завершении вызывает callback (если передан).
     */
    function clearAllSilent(callback) {
        clearLocalStorage();
        clearSessionStorage();
        clearCookies();

        Promise.all([clearCacheStorage(), clearServiceWorkers()])
            .then(function () {
                if (typeof callback === 'function') callback();
            })
            .catch(function () {
                if (typeof callback === 'function') callback();
            });
    }

    /**
     * Полная очистка с уведомлением и перезагрузкой страницы.
     */
    function clearAll() {
        clearAllSilent(function () {
            alert('✅ Кеш очищен. Страница будет перезагружена.');
            reloadPage();
        });
    }

    function bindButton() {
        var btn = document.getElementById(BUTTON_ID);
        if (!btn || btn.dataset.bound === '1') return;
        btn.dataset.bound = '1';
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            if (!confirm('Очистить локальный кеш, cookies и хранилище? Вы выйдете из админки.')) return;
            clearAll();
        });
    }

    function isAdminSession() {
        try {
            return sessionStorage.getItem('isAdmin') === 'true';
        } catch (e) {
            return false;
        }
    }

    function showHeaderButtonIfAdmin() {
        var btn = document.getElementById(BUTTON_ID);
        if (!btn) return;
        // На страницах admin.html и layout.html кнопка всегда внутри админ-панели —
        // показываем её там без проверки.
        // На index.html кнопка скрыта по умолчанию и показывается только для админа.
        if (btn.dataset.adminOnly === '1') {
            btn.style.display = isAdminSession() ? '' : 'none';
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        bindButton();
        showHeaderButtonIfAdmin();
    });

    // Публичное API
    window.clearAllCache = clearAll;
    window.clearAllCacheSilent = clearAllSilent;
})();
