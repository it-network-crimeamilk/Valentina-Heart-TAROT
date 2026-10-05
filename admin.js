const _AUTH_HASH = "SGVzb3lhbTE2MDcr";

// Проверка авторизации при загрузке
if (sessionStorage.getItem('isAdmin') === 'true') {
    showAdminPanel();
}

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

function logout() {
    sessionStorage.removeItem('isAdmin');
    location.reload();
}

function showAdminPanel() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    document.getElementById('adminPanel').classList.add('fade-in');
    // Инициализируем чек-лист после показа панели
    initChecklist();
}

/* =========================================================
2. ГЕНЕРАТОР ПОСТОВ (без изменений)
========================================================= */
function generatePosts() {
    const title = document.getElementById('postTitle').value.trim() || 'Новое видео';
    const yt = document.getElementById('ytUrl').value.trim() || 'Ссылка на YouTube';
    const vk = document.getElementById('vkUrl').value.trim() || 'Ссылка на VkVideo';
    const contactBlock = `❤️ ПОБЛАГОДАРИТЬ

💳 Карта Т-Банк
2200 3961 1672 3228

💸 ВТБ через СБП
+7 978 455 06 16

🎁 DonationAlerts
https://www.donationalerts.com/r/valentina_heart

Связь со мной:

Сайт Valentina Heart TAROT
🌏 http://valentina-tarot.ru

✈️ Telegram (предпочтительно)
https://t.me/Valintina_moon_89

📺 YouTube
https://www.youtube.com/@ВалентинаСердцеТАРО

📣 Telegram-канал
https://t.me/ValentinaSerdceTarot

📱 Mobile
+7 978 455 06 16

💬 Max
+7 978 455 06 16

🟦 ВКонтакте
https://vk.ru/id851128139

🎬 VK Video
https://vkvideo.ru/@club240360498
`;
    const tgText = `🔮На канале новое видео! \n\nТема:\n"${title}🌹"\n \n📺 YouTube:\n${yt}\n \n🎬 VkVideo:\n${vk} \n\n🌏 Сайт Valentina Heart TAROT:\nhttp://valentina-tarot.ru`;
    const vkText = `${title}🌹\n\n${contactBlock}`;
    document.getElementById('tgPost').textContent = tgText;
    document.getElementById('vkPost').textContent = vkText;
    document.getElementById('resultsArea').style.display = 'block';
}

function copyToClipboard(elementId) {
    const text = document.getElementById(elementId).textContent;
    navigator.clipboard.writeText(text).then(() => {
        alert('✅ Текст скопирован в буфер обмена!');
    }).catch(err => {
        console.error('Ошибка копирования: ', err);
        alert('❌ Не удалось скопировать текст');
    });
}

/* =========================================================
3. ИНТЕРАКТИВНЫЙ ЧЕК-ЛИСТ
Сохраняет состояние чекбоксов в localStorage.
========================================================= */
const CHECKLIST_STORAGE_KEY = 'valentina_admin_checklist';

function initChecklist() {
    // Восстанавливаем сохранённое состояние
    let saved = {};
    try {
        saved = JSON.parse(localStorage.getItem(CHECKLIST_STORAGE_KEY)) || {};
    } catch (e) {
        saved = {};
    }
    const checkboxes = document.querySelectorAll('#publishChecklist input[type="checkbox"]');
    checkboxes.forEach(cb => {
        const key = cb.dataset.key;
        // Восстанавливаем состояние
        if (saved[key]) {
            cb.checked = true;
            cb.closest('.checklist-item').classList.add('checked');
        }
        // Слушаем изменения
        cb.addEventListener('change', function () {
            handleChecklistChange();
        });
    });
}

function handleChecklistChange() {
    const checkboxes = document.querySelectorAll('#publishChecklist input[type="checkbox"]');
    const state = {};
    checkboxes.forEach(cb => {
        const key = cb.dataset.key;
        state[key] = cb.checked;
        const item = cb.closest('.checklist-item');
        if (cb.checked) {
            item.classList.add('checked');
        } else {
            item.classList.remove('checked');
        }
    });
    // Сохраняем в localStorage
    try {
        localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        console.error('Не удалось сохранить чек-лист: ', e);
    }
}

function resetChecklist() {
    if (!confirm('Сбросить все отметки чек-листа?')) return;
    const checkboxes = document.querySelectorAll('#publishChecklist input[type="checkbox"]');
    checkboxes.forEach(cb => {
        cb.checked = false;
        cb.closest('.checklist-item').classList.remove('checked');
    });
    localStorage.removeItem(CHECKLIST_STORAGE_KEY);
}

/* =========================================================
4. ИНТЕРАКТИВНЫЙ РЕДАКТОР ОБЛОЖКИ
========================================================= */
let editorState = {
    image: null,
    title: '',
    x: 0,
    y: 0,
    fontSize: 60,
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    textColor: '#f0e6e7',
    strokeColor: '#000000',
    strokeWidth: 3,
    isDragging: false,
    dragOffsetX: 0,
    dragOffsetY: 0,
    scale: 1,
    canvasElement: null
};

function openCoverEditor() {
    const modal = document.getElementById('coverEditorModal');
    if (!modal) return;
    const titleInput = document.getElementById('postTitle');
    const editorTitle = document.getElementById('editorTitleInput');
    if (titleInput && editorTitle) {
        editorTitle.value = titleInput.value.trim() || '';
        editorState.title = titleInput.value.trim() || '';
    }
    fetch('imag_post.jpg?t=' + Date.now())
        .then(response => {
            if (!response.ok) throw new Error('Файл не найден');
            return response.blob();
        })
        .then(blob => {
            const blobUrl = URL.createObjectURL(blob);
            const img = new Image();
            img.onload = function () {
                editorState.image = img;
                editorState.blobUrl = blobUrl;
                initEditorCanvas();
                modal.classList.add('active');
            };
            img.onerror = function () {
                alert('Не удалось загрузить изображение обложки.');
                URL.revokeObjectURL(blobUrl);
            };
            img.src = blobUrl;
        })
        .catch(err => {
            console.error('Ошибка загрузки обложки:', err);
            alert('Не удалось загрузить обложку. Проверьте, что файл imag_post.jpg существует.');
        });
}

function closeCoverEditor() {
    const modal = document.getElementById('coverEditorModal');
    if (modal) modal.classList.remove('active');
    if (editorState.blobUrl) {
        URL.revokeObjectURL(editorState.blobUrl);
        editorState.blobUrl = null;
    }
}

function initEditorCanvas() {
    const canvas = document.getElementById('coverEditorCanvas');
    if (!canvas || !editorState.image) return;
    const img = editorState.image;
    const maxDisplayWidth = 800;
    const scale = img.width > maxDisplayWidth ? maxDisplayWidth / img.width : 1;
    editorState.scale = scale;
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.style.width = Math.round(img.width * scale) + 'px';
    canvas.style.height = Math.round(img.height * scale) + 'px';
    editorState.x = img.width / 2;
    editorState.y = img.height / 2;
    editorState.canvasElement = canvas;
    setupEditorDrag(canvas);
    redrawEditor();
}

function redrawEditor() {
    const canvas = editorState.canvasElement || document.getElementById('coverEditorCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (editorState.image) {
        ctx.drawImage(editorState.image, 0, 0, canvas.width, canvas.height);
    }
    const title = editorState.title;
    if (!title) return;
    ctx.font = `${editorState.fontSize}px ${editorState.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const maxWidth = canvas.width * 0.85;
    const lines = wrapTextEditor(ctx, title, maxWidth);
    const lineHeight = editorState.fontSize * 1.2;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    const startY = editorState.y - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, index) => {
        const y = startY + index * lineHeight;
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

function wrapTextEditor(ctx, text, maxWidth) {
    const paragraphs = text.split('\n');
    const allLines = [];
    paragraphs.forEach(paragraph => {
        if (paragraph === '') {
            allLines.push('');
            return;
        }
        const words = paragraph.split(' ');
        let currentLine = words[0] || '';
        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const testLine = currentLine + ' ' + word;
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && currentLine !== '') {
                allLines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) allLines.push(currentLine);
    });
    return allLines.length ? allLines : [''];
}

function setupEditorDrag(canvas) {
    function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: (clientX - rect.left) / editorState.scale,
            y: (clientY - rect.top) / editorState.scale
        };
    }

    function onStart(e) {
        e.preventDefault();
        const pos = getPos(e);
        editorState.isDragging = true;
        editorState.dragOffsetX = pos.x - editorState.x;
        editorState.dragOffsetY = pos.y - editorState.y;
    }

    function onMove(e) {
        if (!editorState.isDragging) return;
        e.preventDefault();
        const pos = getPos(e);
        editorState.x = pos.x - editorState.dragOffsetX;
        editorState.y = pos.y - editorState.dragOffsetY;
        redrawEditor();
    }

    function onEnd() {
        editorState.isDragging = false;
    }
    canvas.onmousedown = onStart;
    canvas.onmousemove = onMove;
    canvas.onmouseup = onEnd;
    canvas.onmouseleave = onEnd;
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
    const canvas = editorState.canvasElement || document.getElementById('coverEditorCanvas');
    if (!canvas) return;
    redrawEditor();
    canvas.toBlob(function (blob) {
        if (!blob) {
            alert('Не удалось создать изображение.');
            return;
        }
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cover_with_title.jpg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 'image/jpeg', 0.95);
}
function initEditorControls() {
    const fontSizeSlider = document.getElementById('fontSizeSlider');
    const fontSizeValue = document.getElementById('fontSizeValue');
    const textColorPicker = document.getElementById('textColorPicker');
    const strokeColorPicker = document.getElementById('strokeColorPicker');
    const strokeWidthSlider = document.getElementById('strokeWidthSlider');
    const strokeWidthValue = document.getElementById('strokeWidthValue');
    const fontFamilySelect = document.getElementById('fontFamilySelect');
    const editorTitleInput = document.getElementById('editorTitleInput');
    if (fontSizeSlider) {
        fontSizeSlider.addEventListener('input', function () {
            editorState.fontSize = parseInt(this.value);
            if (fontSizeValue) fontSizeValue.textContent = this.value;
            redrawEditor();
        });
    }
    if (textColorPicker) {
        textColorPicker.addEventListener('input', function () {
            editorState.textColor = this.value;
            redrawEditor();
        });
    }
    if (strokeColorPicker) {
        strokeColorPicker.addEventListener('input', function () {
            editorState.strokeColor = this.value;
            redrawEditor();
        });
    }
    if (strokeWidthSlider) {
        strokeWidthSlider.addEventListener('input', function () {
            editorState.strokeWidth = parseInt(this.value);
            if (strokeWidthValue) strokeWidthValue.textContent = this.value;
            redrawEditor();
        });
    }
    if (fontFamilySelect) {
        fontFamilySelect.addEventListener('change', function () {
            editorState.fontFamily = this.value;
            redrawEditor();
        });
    }
    if (editorTitleInput) {
        editorTitleInput.addEventListener('input', function () {
            editorState.title = this.value;
            redrawEditor();
        });
    }
}

document.addEventListener('DOMContentLoaded', initEditorControls);

/* =========================================================
5. ПОЛНОЭКРАННЫЙ ПРОСМОТР ОБЛОЖКИ
========================================================= */
function openCoverFullview() {
    const fv = document.getElementById('coverFullview');
    if (fv) fv.classList.add('active');
}

function closeCoverFullview() {
    const fv = document.getElementById('coverFullview');
    if (fv) fv.classList.remove('active');
}

document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        closeCoverFullview();
        closeCoverEditor();
    }
});
