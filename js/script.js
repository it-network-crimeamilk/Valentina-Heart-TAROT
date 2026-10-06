function openModal(id) {
    const m = document.getElementById(id);
    if (!m) return;
    m.classList.add('active');
    m.setAttribute('aria-hidden', 'false');
}

function closeModal(id) {
    const m = document.getElementById(id);
    if (!m) return;
    m.classList.remove('active');
    m.setAttribute('aria-hidden', 'true');
}

/* Единственный глобальный клик по оверлею — закрывает модалку */
window.addEventListener('click', e => {
    if (e.target.classList && e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
        e.target.setAttribute('aria-hidden', 'true');
    }
});

/* Единственный глобальный Escape — закрывает все активные модалки */
document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('.modal.active').forEach(m => {
        m.classList.remove('active');
        m.setAttribute('aria-hidden', 'true');
    });
});

/* ========== 2. КЛАВИАТУРНАЯ ДОСТУПНОСТЬ ========== */
document.addEventListener('DOMContentLoaded', () => {
    const keyboardActivables = document.querySelectorAll('.req-card.clickable, .order-qr-item');
    keyboardActivables.forEach(el => {
        el.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                el.click();
            }
        });
    });
});

/* ========== 3. ОТПРАВКА ФОРМЫ ЗАКАЗА ========== */
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('orderForm');
    if (!form) return;

    form.addEventListener('submit', async e => {
        e.preventDefault();
        const statusMsg = document.getElementById('formStatus');
        const submitBtn = form.querySelector('button[type="submit"]');
        const setStatus = (text, color) => {
            if (statusMsg) {
                statusMsg.textContent = text;
                statusMsg.style.color = color;
            }
        };

        const name     = (form.elements.name?.value || '').trim();
        const contact  = (form.elements.contact?.value || '').trim();
        const message  = (form.elements.message?.value || '').trim();
        const fileInput = form.elements.attachment;
        const file = fileInput?.files?.[0];

        if (!name || !contact || !message || !file) {
            setStatus('⚠️ Пожалуйста, заполните все поля и прикрепите файл.', '#ef5350');
            return;
        }

        setStatus('✨ Отправка заявки...', '#c08081');
        if (submitBtn) submitBtn.disabled = true;

        try {
            const response = await fetch('https://formsubmit.co/ajax/bin.b@bk.ru', {
                method: 'POST',
                headers: { 'Accept': 'application/json' },
                body: new FormData(form)
            });

            const ct = response.headers.get('content-type') || '';
            const result = ct.includes('application/json')
                ? await response.json()
                : { success: true };

            if (result.success) {
                setStatus('✅ Заявка успешно отправлена! Я свяжусь с вами в ближайшее время.', '#66bb6a');
                form.reset();
                setTimeout(() => {
                    closeModal('orderModal');
                    setStatus('', '');
                    if (submitBtn) submitBtn.disabled = false;
                }, 3000);
            } else {
                throw new Error('Ошибка сервера');
            }
        } catch (err) {
            console.error(err);
            setStatus('❌ Ошибка отправки. Напишите мне напрямую в Telegram @GeekLS (https://t.me/GeekLS)', '#ef5350');
            if (submitBtn) submitBtn.disabled = false;
        }
    });
});

/* ========== 4. ФАЗА ЛУНЫ ========== */
const LUNAR = {
    KNOWN_NEW_MOON: new Date('2000-01-06T18:14:00Z').getTime(),
    SYNODIC_MONTH_MS: 29.530588853 * 24 * 60 * 60 * 1000
};

function getMoonPhase(date = new Date()) {
    const cycles = (date.getTime() - LUNAR.KNOWN_NEW_MOON) / LUNAR.SYNODIC_MONTH_MS;
    const phase = cycles - Math.floor(cycles);
    return phase < 0 ? phase + 1 : phase;
}

const PHASES = [
    { key: 'new',              name: 'Новолуние 🌑',        icon: '🌑', range: [0, 0.0625],        css: 'phase-new',              tarot: 'Время новых начинаний, посева намерений. Карты Таро открывают путь — доверьтесь интуиции и загадывайте самое сокровенное.' },
    { key: 'waxing-crescent',  name: 'Растущая Луна 🌒',    icon: '🌒', range: [0.0625, 0.1875],   css: 'phase-waxing-crescent',  tarot: 'Энергия набирает силу. Идеальное время для вопросов о развитии, отношениях и воплощении желаний. Таро укажет направление.' },
    { key: 'first-quarter',    name: 'Первая четверть 🌓',  icon: '🌓', range: [0.1875, 0.3125],   css: 'phase-first-quarter',    tarot: 'Время решений и действий. Таро помогает преодолеть сомнения, увидеть препятствия и найти внутренний стержень.' },
    { key: 'waxing-gibbous',   name: 'Прибывающая Луна 🌔', icon: '🌔', range: [0.3125, 0.4375],   css: 'phase-waxing-gibbous',   tarot: 'Период уточнений и подготовки. Расклады Таро раскрывают детали, помогают скорректировать путь перед кульминацией.' },
    { key: 'full',             name: 'Полнолуние 🌕',       icon: '🌕', range: [0.4375, 0.5625],   css: 'phase-full',             tarot: 'Время подведения итогов, пик энергии, раскрытие тайн. Таро говорит правду — самое мощное время для глубоких вопросов судьбы.' },
    { key: 'waning-gibbous',   name: 'Убывающая Луна 🌖',   icon: '🌖', range: [0.5625, 0.6875],   css: 'phase-waning-gibbous',   tarot: 'Время мудрости и благодарности. Таро делится опытом, помогает извлечь уроки и поделиться знаниями с близкими.' },
    { key: 'last-quarter',     name: 'Последняя четверть 🌗', icon: '🌗', range: [0.6875, 0.8125], css: 'phase-last-quarter',     tarot: 'Время отпускания старого. Таро показывает, от чего стоит избавиться — привычек, страхов, отношений, изживших себя.' },
    { key: 'waning-crescent',  name: 'Старая Луна 🌘',      icon: '🌘', range: [0.8125, 0.9375],   css: 'phase-waning-crescent',  tarot: 'Период отдыха и созерцания. Таро шепчет ответы из подсознания — прислушайтесь к снам и знакам перед новым циклом.' }
];

function getMoonPhaseInfo(date = new Date()) {
    const phase = getMoonPhase(date);
    if (phase >= 0.9375) return PHASES[0]; // [0.9375, 1) — та же "new"
    return PHASES.find(p => phase >= p.range[0] && phase < p.range[1]) || PHASES[0];
}

function applyMoonPhase() {
    const info = getMoonPhaseInfo();
    const moonBg = document.getElementById('moonBg');
    if (moonBg) moonBg.className = 'moon-bg ' + info.css;

    const icon = document.getElementById('moonWidgetIcon');
    const name = document.getElementById('moonPhaseName');
    const desc = document.getElementById('moonPhaseDesc');
    if (icon) icon.textContent = info.icon;
    if (name) name.textContent = info.name;
    if (desc) desc.textContent = info.tarot;
}

/* ========== 5. КНОПКА ПРОКРУТКИ ========== */
function initScrollButton() {
    const btn = document.getElementById('scrollBtn');
    const icon = document.getElementById('scrollBtnIcon');
    if (!btn || !icon) return;

    const update = () => {
        const top    = window.pageYOffset || document.documentElement.scrollTop;
        const docH   = document.documentElement.scrollHeight;
        const winH   = window.innerHeight;
        const atBottom = top + winH >= docH - 50;

        if (docH <= winH + 100) {
            btn.classList.remove('visible');
            return;
        }
        btn.classList.add('visible');
        icon.textContent = atBottom ? '↑' : '↓';
    };

    btn.addEventListener('click', () => {
        const top  = window.pageYOffset || document.documentElement.scrollTop;
        const docH = document.documentElement.scrollHeight;
        const winH = window.innerHeight;
        const atBottom = top + winH >= docH - 50;
        window.scrollTo({ top: atBottom ? 0 : docH, behavior: 'smooth' });
    });

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
}

/* ========== 6. ИНИЦИАЛИЗАЦИЯ ========== */
document.addEventListener('DOMContentLoaded', () => {
    applyMoonPhase();
    initScrollButton();
    // REFACTOR: раз в час избыточно — фаза меняется ~раз в 7 дней. Ставим раз в 6 часов.
    setInterval(applyMoonPhase, 6 * 60 * 60 * 1000);
});