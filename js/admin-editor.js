const editorState = {
    image: null,
    blobUrl: null,
    title: '',
    x: 0,
    y: 0,
    fontSize: 60,
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    textColor: '#F5D76E',
    strokeColor: '#1A0A00',
    strokeWidth: 3,
    isDragging: false,
    dragOffsetX: 0,
    dragOffsetY: 0,
    scale: 1,
    canvas: null,
    dragBound: false,
    loadToken: 0 // FIX: защита от гонки при быстром закрытии/открытии
};

function openCoverEditor() {
    const modal = document.getElementById('coverEditorModal');
    if (!modal) return;

    const titleInput = document.getElementById('postTitle');
    const editorTitle = document.getElementById('editorTitleInput');
    if (titleInput && editorTitle) {
        editorTitle.value = editorState.title = titleInput.value.trim();
    }

    // Освобождаем прошлый blob
    if (editorState.blobUrl) {
        URL.revokeObjectURL(editorState.blobUrl);
        editorState.blobUrl = null;
    }
    editorState.image = null;

    const token = ++editorState.loadToken;

    fetch('./images/imag_post.jpg?t=' + Date.now())
        .then(r => {
            if (!r.ok) throw new Error('Файл не найден');
            return r.blob();
        })
        .then(blob => {
            // FIX: если за время загрузки открыли заново/закрыли — игнорируем
            if (token !== editorState.loadToken) {
                URL.revokeObjectURL(URL.createObjectURL(blob)); // освобождаем
                return;
            }
            const url = URL.createObjectURL(blob);
            const img = new Image();
            img.onload = () => {
                if (token !== editorState.loadToken) {
                    URL.revokeObjectURL(url);
                    return;
                }
                editorState.image = img;
                editorState.blobUrl = url;
                initEditorCanvas();
                modal.classList.add('active');
            };
            img.onerror = () => {
                alert('Не удалось загрузить обложку.');
                URL.revokeObjectURL(url);
            };
            img.src = url;
        })
        .catch(err => {
            console.error(err);
            alert('Не удалось загрузить обложку. Проверьте, что imag_post.jpg существует.');
        });
}

function closeCoverEditor() {
    const modal = document.getElementById('coverEditorModal');
    if (modal) modal.classList.remove('active');
    if (editorState.blobUrl) {
        URL.revokeObjectURL(editorState.blobUrl);
        editorState.blobUrl = null;
    }
    editorState.image = null;
    editorState.loadToken++; // FIX: инвалидируем незавершённую загрузку
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

    if (!editorState.dragBound) {
        setupEditorDrag(canvas);
        editorState.dragBound = true;
    }
    redrawEditor();
}

function redrawEditor() {
    const canvas = editorState.canvas;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (editorState.image) {
        ctx.drawImage(editorState.image, 0, 0, canvas.width, canvas.height);
    }
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
        return {
            x: (cx - rect.left) / editorState.scale,
            y: (cy - rect.top) / editorState.scale
        };
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

    canvas.addEventListener('mousedown', onStart);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseup', onEnd);
    canvas.addEventListener('mouseleave', onEnd);
    canvas.addEventListener('touchstart', onStart, { passive: false });
    canvas.addEventListener('touchmove', onMove, { passive: false });
    canvas.addEventListener('touchend', onEnd);
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

    // FIX: подложка — тёмная (соответствует комментарию), чтобы избежать артефактов JPEG
    const tmp = document.createElement('canvas');
    tmp.width = canvas.width;
    tmp.height = canvas.height;
    const tctx = tmp.getContext('2d');
    tctx.fillStyle = '#0f0810';
    tctx.fillRect(0, 0, tmp.width, tmp.height);
    tctx.drawImage(canvas, 0, 0);

    tmp.toBlob(blob => {
        if (!blob) return alert('Не удалось создать изображение.');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cover_with_title.jpg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 'image/jpeg', 0.95);
}

/* FIX: навешиваем все обработчики контролов и кнопок один раз */
function initEditorControls() {
    const bind = (id, prop, isInt = false) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', () => {
            editorState[prop] = isInt ? parseInt(el.value, 10) : el.value;
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
    if (titleInput) {
        titleInput.addEventListener('input', () => {
            editorState.title = titleInput.value;
            redrawEditor();
        });
    }

    const openBtn = document.getElementById('openEditorBtn');
    if (openBtn) openBtn.addEventListener('click', openCoverEditor);

    const resetPosBtn = document.getElementById('resetEditorPosBtn');
    if (resetPosBtn) resetPosBtn.addEventListener('click', resetEditorPosition);

    const downloadBtn = document.getElementById('downloadCoverBtn');
    if (downloadBtn) downloadBtn.addEventListener('click', downloadEditedCover);
}

document.addEventListener('DOMContentLoaded', initEditorControls);
