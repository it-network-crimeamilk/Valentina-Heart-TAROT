/* admin.js — логика админ-панели */

const _AUTH_HASH = "SGVzb3lhbTE2MDcr";

/* ========== 1. АВТОРИЗАЦИЯ ========== */
if (sessionStorage.getItem('isAdmin') === 'true') showAdminPanel();

function login() {
    const input = document.getElementById('adminPass').value;
    if (btoa(input) === _AUTH_HASH) {
        sessionStorage.setItem('isAdmin', 'true');
        showAdminPanel();
    } else {
        document.getElementById('loginError').style.display = 'block';
        document.getElementById('adminPass').value = '';
    }
}
function logout() { sessionStorage.removeItem('isAdmin'); location.reload(); }

function showAdminPanel() {
    document.getElementById('loginForm').style.display = 'none';
    const panel = document.getElementById('adminPanel');
    panel.style.display = 'block';
    panel.classList.add('fade-in');
    initChecklist();
}

/* ========== 2. ГЕНЕРАТОР ПОСТОВ ========== */
const CONTACT_BLOCK = `❤️ ПОБЛАГОДАРИТЬ
💳 Карта Т-Банк: 2200 3961 1672 3228
💸 ВТБ через СБП: +7 978 455 06 16
🎁 DonationAlerts: https://www.donationalerts.com/r/valentina_heart

Связь со мной:
🌏 Сайт Valentina Heart TAROT: http://valentina-tarot.ru
✈️ Telegram: https://t.me/Valintina_moon_89
📺 YouTube: https://www.youtube.com/@ВалентинаСердцеТАРО
📣 Telegram-канал: https://t.me/ValentinaSerdceTarot
📱 Mobile/Max: +7 978 455 06 16
🟦 ВКонтакте: https://vk.ru/id851128139
🎬 VK Video: https://vkvideo.ru/@club240360498`;

function generatePosts() {
    const title = document.getElementById('postTitle').value.trim() || 'Новое видео';
    const yt = document.getElementById('ytUrl').value.trim() || 'Ссылка на YouTube';
    const vk = document.getElementById('vkUrl').value.trim() || 'Ссылка на VkVideo';

    const tgText = `🔮 На канале новое видео!\n\nТема:\n"${title} 🌹"\n\n📺 YouTube:\n${yt}\n\n🎬 VkVideo:\n${vk}\n\n🌏 Сайт Valentina Heart TAROT:\nhttp://valentina-tarot.ru`;
    const vkText = `${title} 🌹\n\n${CONTACT_BLOCK}`;

    document.getElementById('tgPost').textContent = tgText;
    document.getElementById('vkPost').textContent = vkText;
    document.getElementById('resultsArea').style.display = 'block';
}

function copyToClipboard(id) {
    navigator.clipboard.writeText(document.getElementById(id).textContent)
        .then(() => alert('✅ Текст скопирован!'))
        .catch(err => { console.error(err); alert('❌ Не удалось скопировать'); });
}

/* ========== 3. ЧЕК-ЛИСТ ========== */
const CHECKLIST_KEY = 'valentina_admin_checklist';

function initChecklist() {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(CHECKLIST_KEY)) || {}; } catch (e) { }

    document.querySelectorAll('#publishChecklist input[type="checkbox"]').forEach(cb => {
        const key = cb.dataset.key;
        if (saved[key]) { cb.checked = true; cb.closest('.checklist-item').classList.add('checked'); }
        cb.addEventListener('change', handleChecklistChange);
    });
}

function handleChecklistChange() {
    const state = {};
    document.querySelectorAll('#publishChecklist input[type="checkbox"]').forEach(cb => {
        state[cb.dataset.key] = cb.checked;
        cb.closest('.checklist-item').classList.toggle('checked', cb.checked);
    });
    try { localStorage.setItem(CHECKLIST_KEY, JSON.stringify(state)); } catch (e) { console.error(e); }
}

function resetChecklist() {
    if (!confirm('Сбросить все отметки чек-листа?')) return;
    document.querySelectorAll('#publishChecklist input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
        cb.closest('.checklist-item').classList.remove('checked');
    });
    localStorage.removeItem(CHECKLIST_KEY);
}

/* ========== 4. РЕДАКТОР ОБЛОЖКИ ========== */
const editorState = {
    image: null, blobUrl: null, title: '',
    x: 0, y: 0, fontSize: 60,
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    textColor: '#F5D76E', strokeColor: '#1A0A00', strokeWidth: 3,
    isDragging: false, dragOffsetX: 0, dragOffsetY: 0,
    scale: 1, canvas: null
};

function openCoverEditor() {
    const modal = document.getElementById('coverEditorModal');
    if (!modal) return;
    const titleInput = document.getElementById('postTitle');
    const editorTitle = document.getElementById('editorTitleInput');
    if (titleInput && editorTitle) editorTitle.value = editorState.title = titleInput.value.trim();

    fetch('imag_post.jpg?t=' + Date.now())
        .then(r => { if (!r.ok) throw new Error('Файл не найден'); return r.blob(); })
        .then(blob => {
            const url = URL.createObjectURL(blob);
            const img = new Image();
            img.onload = () => {
                editorState.image = img;
                editorState.blobUrl = url;
                initEditorCanvas();
                modal.classList.add('active');
            };
            img.onerror = () => { alert('Не удалось загрузить обложку.'); URL.revokeObjectURL(url); };
            img.src = url;
        })
        .catch(err => { console.error(err); alert('Не удалось загрузить обложку. Проверьте, что imag_post.jpg существует.'); });
}

function closeCoverEditor() {
    const modal = document.getElementById('coverEditorModal');
    if (modal) modal.classList.remove('active');
    if (editorState.blobUrl) { URL.revokeObjectURL(editorState.blobUrl); editorState.blobUrl = null; }
}

function initEditorCanvas() {
    const canvas = document.getElementById('coverEditorCanvas');
    if (!canvas || !editorState.image) return;
    const img = editorState.image;
    const maxW = 800;
    editorState.scale = img.width > maxW ? maxW / img.width : 1;
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.style.width = Math.round(img.width * editorState.scale) + 'px';
    canvas.style.height = Math.round(img.height * editorState.scale) + 'px';
    editorState.x = img.width / 2;
    editorState.y = img.height / 2;
    editorState.canvas = canvas;
    setupEditorDrag(canvas);
    redrawEditor();
}

function redrawEditor() {
    const canvas = editorState.canvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (editorState.image) ctx.drawImage(editorState.image, 0, 0, canvas.width, canvas.height);
    if (!editorState.title) return;

    ctx.font = `${editorState.fontSize}px ${editorState.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const lines = wrapText(ctx, editorState.title, canvas.width * 0.85);
    const lineH = editorState.fontSize * 1.2;
    const startY = editorState.y - ((lines.length - 1) * lineH) / 2;

    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 12;

    lines.forEach((line, i) => {
        const y = startY + i * lineH;
        if (editorState.strokeWidth > 0) {
            ctx.strokeStyle = editorState.strokeColor;
            ctx.lineWidth = editorState.strokeWidth;
            ctx.lineJoin = 'round';
            ctx.strokeText(line, editorState.x, y);
        }
        ctx.fillStyle = editorState.textColor;
        ctx.fillText(line, editorState.x, y);
    });
    ctx.shadowBlur = 0;
}

function wrapText(ctx, text, maxWidth) {
    const allLines = [];
    text.split('\n').forEach(paragraph => {
        if (!paragraph) { allLines.push(''); return; }
        const words = paragraph.split(' ');
        let current = words[0] || '';
        for (let i = 1; i < words.length; i++) {
            const test = current + ' ' + words[i];
            if (ctx.measureText(test).width > maxWidth && current) {
                allLines.push(current);
                current = words[i];
            } else {
                current = test;
            }
        }
        if (current) allLines.push(current);
    });
    return allLines.length ? allLines : [''];
}

function setupEditorDrag(canvas) {
    const getPos = e => {
        const rect = canvas.getBoundingClientRect();
        const cx = e.touches ? e.touches[0].clientX : e.clientX;
        const cy = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: (cx - rect.left) / editorState.scale, y: (cy - rect.top) / editorState.scale };
    };
    const onStart = e => {
        e.preventDefault();
        const pos = getPos(e);
        editorState.isDragging = true;
        editorState.dragOffsetX = pos.x - editorState.x;
        editorState.dragOffsetY = pos.y - editorState.y;
    };
    const onMove = e => {
        if (!editorState.isDragging) return;
        e.preventDefault();
        const pos = getPos(e);
        editorState.x = pos.x - editorState.dragOffsetX;
        editorState.y = pos.y - editorState.dragOffsetY;
        redrawEditor();
    };
    const onEnd = () => { editorState.isDragging = false; };

    canvas.onmousedown = onStart;
    canvas.onmousemove = onMove;
    canvas.onmouseup = canvas.onmouseleave = onEnd;
    canvas.ontouchstart = onStart;
    canvas.ontouchmove = onMove;
    canvas.ontouchend = onEnd;
}

function resetEditorPosition() {
    if (!editorState.image) return;
    editorState.x = editorState.image.width / 2;
    editorState.y = editorState.image.height / 2;
    redrawEditor();
}

function downloadEditedCover() {
    const canvas = editorState.canvas;
    if (!canvas) return;
    redrawEditor();
    canvas.toBlob(blob => {
        if (!blob) return alert('Не удалось создать изображение.');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'cover_with_title.jpg';
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
    }, 'image/jpeg', 0.95);
}

function initEditorControls() {
    const bind = (id, prop, isInt = false) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', () => {
            editorState[prop] = isInt ? parseInt(el.value) : el.value;
            const valEl = document.getElementById(id.replace('Slider', 'Value'));
            if (valEl) valEl.textContent = el.value;
            redrawEditor();
        });
    };
    bind('fontSizeSlider', 'fontSize', true);
    bind('textColorPicker', 'textColor');
    bind('strokeColorPicker', 'strokeColor');
    bind('strokeWidthSlider', 'strokeWidth', true);
    bind('fontFamilySelect', 'fontFamily');

    const titleInput = document.getElementById('editorTitleInput');
    if (titleInput) titleInput.addEventListener('input', () => { editorState.title = titleInput.value; redrawEditor(); });
}

document.addEventListener('DOMContentLoaded', initEditorControls);

/* ========== 5. ПОЛНОЭКРАННЫЙ ПРОСМОТР ========== */
function openCoverFullview() {
    const fv = document.getElementById('coverFullview');
    if (fv) fv.classList.add('active');
}
function closeCoverFullview() {
    const fv = document.getElementById('coverFullview');
    if (fv) fv.classList.remove('active');
}
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeCoverFullview(); closeCoverEditor(); }
});
