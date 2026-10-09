/* ============================================
   КНОПКА «ВХОД» НА ГЛАВНОЙ
   Перед переходом в админку тихо очищает кеш
   (localStorage, sessionStorage, cookies, Cache Storage, SW).
   Не ломает обычное поведение ссылки,
   если JS недоступен или что-то пошло не так.
   ============================================ */
(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', function () {
        var link = document.getElementById('loginLink');
        if (!link) return;

        link.addEventListener('click', function (e) {
            // Если уже идёт переход — не мешаем.
            if (link.dataset.redirecting === '1') return;

            // Если функция тихой очистки недоступна — просто идём по ссылке.
            if (typeof window.clearAllCacheSilent !== 'function') return;

            e.preventDefault();
            link.dataset.redirecting = '1';

            var href = link.getAttribute('href') || 'admin.html';
            var done = false;

            var go = function () {
                if (done) return;
                done = true;
                window.location.href = href;
            };

            // Страховка: если очистка почему-то «зависнет» — переходим через 800 мс.
            setTimeout(go, 800);

            // Тихая очистка, после неё — переход.
            try {
                window.clearAllCacheSilent(go);
            } catch (err) {
                go();
            }
        });
    });
})();