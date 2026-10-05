/* script.js */
/* =========================================================
УПРАВЛЕНИЕ МОДАЛЬНЫМИ ОКНАМИ
========================================================= */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

// Закрытие по клику вне окна
window.addEventListener('click', function (event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
    }
});

// Закрытие по Escape
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
    }
});

/* =========================================================
2. QR-КОДЫ: открытие модалок по клику на реквизиты
========================================================= */
function openQrModal(modalId) {
    openModal(modalId);
}

// Поддержка клавиатуры (Enter/Space) для карточек реквизитов
document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.req-card.clickable').forEach(card => {
        card.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                card.click();
            }
        });
    });

    // CHANGED: Поддержка клавиатуры для QR-карточек в модалке заказа
    document.querySelectorAll('.order-qr-item').forEach(item => {
        item.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                item.click();
            }
        });
    });
});

/* =========================================================
3. ОТПРАВКА ФОРМЫ ЗАКАЗА (FormSubmit)
ВАЖНО: AJAX-эндпоинт /ajax/ НЕ поддерживает файлы.
Используем обычный POST на FormSubmit с заголовком
Accept: application/json — сервис вернёт JSON-ответ
и примет вложение (multipart/form-data).
========================================================= */
document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('orderForm');
    if (!form) return;

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const statusMsg = document.getElementById('formStatus');
        const submitBtn = this.querySelector('button[type="submit"]');

        // CHANGED: Клиентская валидация
        const name = this.querySelector('[name="name"]').value.trim();
        const contact = this.querySelector('[name="contact"]').value.trim();
        const message = this.querySelector('[name="message"]').value.trim();
        const fileInput = this.querySelector('[name="attachment"]');
        const file = fileInput.files[0];

        if (!name || !contact || !message || !file) {
            statusMsg.textContent = '⚠️ Пожалуйста, заполните все поля и прикрепите файл.';
            statusMsg.style.color = '#ef5350';
            return;
        }

        statusMsg.textContent = '✨ Отправка заявки...';
        statusMsg.style.color = '#c08081';
        submitBtn.disabled = true;

        // FormData автоматически включает файл из input[type=file]
        const formData = new FormData(this);

        try {
            // Обычный URL FormSubmit (БЕЗ /ajax/) + Accept: application/json
            // Это единственный способ отправить файл через FormSubmit с JSON-ответом
            const response = await fetch("https://formsubmit.co/bin.b@bk.ru", {
                method: "POST",
                headers: {
                    "Accept": "application/json"
                },
                body: formData
                // Content-Type НЕ устанавливаем вручную — браузер сам
                // добавит правильный boundary для multipart/form-data
            });

            let result;
            const contentType = response.headers.get('content-type') || '';

            if (contentType.includes('application/json')) {
                result = await response.json();
            } else {
                // Фолбэк: если пришёл HTML — считаем успешной отправкой
                // (FormSubmit так отвечает при первом подтверждении email)
                result = { success: true };
            }

            if (result.success) {
                statusMsg.textContent = '✅ Заявка успешно отправлена! Я свяжусь с вами в ближайшее время.';
                statusMsg.style.color = '#66bb6a';
                this.reset();
                setTimeout(() => {
                    closeModal('orderModal');
                    statusMsg.textContent = '';
                    submitBtn.disabled = false;
                }, 3000);
            } else {
                throw new Error('Ошибка сервера');
            }
        } catch (error) {
            console.error(error);
            statusMsg.textContent = '❌ Ошибка отправки. Пожалуйста, напишите мне напрямую в Telegram @GeekLS (https://t.me/GeekLS)';
            statusMsg.style.color = '#ef5350';
            submitBtn.disabled = false;
        }
    });
});

/* =========================================================
4. АЛГОРИТМ ФАЗЫ ЛУНЫ
========================================================= */
const LUNAR_CONSTANTS = {
    KNOWN_NEW_MOON: new Date('2000-01-06T18:14:00Z').getTime(),
    SYNODIC_MONTH_MS: 29.530588853 * 24 * 60 * 60 * 1000
};

function getMoonPhase(date = new Date()) {
    const diff = date.getTime() - LUNAR_CONSTANTS.KNOWN_NEW_MOON;
    const cycles = diff / LUNAR_CONSTANTS.SYNODIC_MONTH_MS;
    let phase = cycles - Math.floor(cycles);
    if (phase < 0) phase += 1;
    return phase;
}

function getMoonPhaseInfo(date = new Date()) {
    const phase = getMoonPhase(date);

    // CHANGED: Исправлены все разорванные строки и опечатки
    const PHASES = [
        { key: 'new', name: 'Новолуние 🌑', icon: '🌑', range: [0, 0.0625], cssClass: 'phase-new', tarot: 'Время новых начинаний, посева намерений. Карты Таро открывают путь — доверьтесь интуиции и загадывайте самое сокровенное.' },
        { key: 'waxing-crescent', name: 'Растущая Луна 🌒', icon: '🌒', range: [0.0625, 0.1875], cssClass: 'phase-waxing-crescent', tarot: 'Энергия набирает силу. Идеальное время для вопросов о развитии, отношениях и воплощении желаний. Таро укажет направление.' },
        { key: 'first-quarter', name: 'Первая четверть 🌓', icon: '🌓', range: [0.1875, 0.3125], cssClass: 'phase-first-quarter', tarot: 'Время решений и действий. Таро помогает преодолеть сомнения, увидеть препятствия и найти внутренний стержень.' },
        { key: 'waxing-gibbous', name: 'Прибывающая Луна 🌔', icon: '🌔', range: [0.3125, 0.4375], cssClass: 'phase-waxing-gibbous', tarot: 'Период уточнений и подготовки. Расклады Таро раскрывают детали, помогают скорректировать путь перед кульминацией.' },
        { key: 'full', name: 'Полнолуние 🌕', icon: '🌕', range: [0.4375, 0.5625], cssClass: 'phase-full', tarot: 'Время подведения итогов, пик энергии, раскрытие тайн. Таро говорит правду — самое мощное время для глубоких вопросов судьбы.' },
        { key: 'waning-gibbous', name: 'Убывающая Луна 🌖', icon: '🌖', range: [0.5625, 0.6875], cssClass: 'phase-waning-gibbous', tarot: 'Время мудрости и благодарности. Таро делится опытом, помогает извлечь уроки и поделиться знаниями с близкими.' },
        { key: 'last-quarter', name: 'Последняя четверть 🌗', icon: '🌗', range: [0.6875, 0.8125], cssClass: 'phase-last-quarter', tarot: 'Время отпускания старого. Таро показывает, от чего стоит избавиться — привычек, страхов, отношений, изживших себя.' },
        { key: 'waning-crescent', name: 'Старая Луна 🌘', icon: '🌘', range: [0.8125, 0.9375], cssClass: 'phase-waning-crescent', tarot: 'Период отдыха и созерцания. Таро шепчет ответы из подсознания — прислушайтесь к снам и знакам перед новым циклом.' }
    ];

    if (phase >= 0.9375) return PHASES[0];

    for (const p of PHASES) {
        if (phase >= p.range[0] && phase < p.range[1]) return p;
    }

    return PHASES[0];
}

function applyMoonPhase() {
    const info = getMoonPhaseInfo();
    const moonBg = document.getElementById('moonBg');
    if (moonBg) moonBg.className = 'moon-bg ' + info.cssClass;

    const iconName = document.getElementById('moonWidgetIcon');
    const phaseName = document.getElementById('moonPhaseName');
    const phaseDesc = document.getElementById('moonPhaseDesc');

    if (iconName) iconName.textContent = info.icon;
    if (phaseName) phaseName.textContent = info.name;
    if (phaseDesc) phaseDesc.textContent = info.tarot;
}

/* =========================================================
5. КНОПКА ПРОКРУТКИ
========================================================= */
function initScrollButton() {
    const btn = document.getElementById('scrollBtn');
    const icon = document.getElementById('scrollBtnIcon');
    if (!btn || !icon) return;

    function updateButton() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const docHeight = document.documentElement.scrollHeight;
        const winHeight = window.innerHeight;
        const atBottom = scrollTop + winHeight >= docHeight - 50;
        const atTop = scrollTop < 50;

        if (atTop && !atBottom) {
            btn.classList.add('visible');
            icon.textContent = '↓';
            icon.style.transform = 'rotate(0deg)';
        } else if (atBottom) {
            btn.classList.add('visible');
            icon.textContent = '↑';
            icon.style.transform = 'rotate(0deg)';
        } else {
            btn.classList.add('visible');
            icon.textContent = '↑';
        }

        if (docHeight <= winHeight + 100) btn.classList.remove('visible');
    }

    btn.addEventListener('click', function () {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const docHeight = document.documentElement.scrollHeight;
        const winHeight = window.innerHeight;
        const atBottom = scrollTop + winHeight >= docHeight - 50;

        if (atBottom) window.scrollTo({ top: 0, behavior: 'smooth' });
        else window.scrollTo({ top: docHeight, behavior: 'smooth' });
    });

    window.addEventListener('scroll', updateButton, { passive: true });
    window.addEventListener('resize', updateButton);
    updateButton();
}

/* =========================================================
6. ИНИЦИАЛИЗАЦИЯ
========================================================= */
document.addEventListener('DOMContentLoaded', function () {
    applyMoonPhase();
    initScrollButton();
    setInterval(applyMoonPhase, 60 * 60 * 1000);
});
