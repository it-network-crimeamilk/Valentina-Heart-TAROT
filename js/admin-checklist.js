const CHECKLIST_KEY = 'valentina_admin_checklist';

/* Инициализация чек-листа. Вызывается из showAdminPanel при входе в админку. */
function initChecklist() {
    const container = document.getElementById('publishChecklist');
    if (!container) return;

    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(CHECKLIST_KEY)) || {}; } catch (e) { /* ignore */ }

    // Проставляем состояние из localStorage.
    // Используем уникальный ключ: data-key + индекс, чтобы избежать коллизий.
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach((cb, idx) => {
        const key = cb.dataset.key + '_' + idx;
        cb.dataset.uniqueKey = key;
        cb.checked = !!saved[key];
        const item = cb.closest('.checklist-item');
        if (item) item.classList.toggle('checked', cb.checked);
    });

    // Один обработчик на контейнер (change всплывает от чекбоксов)
    if (container.dataset.bound === '1') return;
    container.dataset.bound = '1';
    container.addEventListener('change', handleChecklistChange);
}

function handleChecklistChange(e) {
    const cb = e.target.closest('input[type="checkbox"]');
    if (!cb) return;

    const item = cb.closest('.checklist-item');
    if (item) item.classList.toggle('checked', cb.checked);

    const state = {};
    document.querySelectorAll('#publishChecklist input[type="checkbox"]').forEach(x => {
        const key = x.dataset.uniqueKey || (x.dataset.key + '_' + Array.from(x.parentNode.parentNode.children).indexOf(x.parentNode));
        state[key] = x.checked;
    });
    try { localStorage.setItem(CHECKLIST_KEY, JSON.stringify(state)); } catch (err) { console.error(err); }
}

function resetChecklist() {
    if (!confirm('Сбросить все отметки чек-листа?')) return;
    const container = document.getElementById('publishChecklist');
    if (!container) return;

    document.querySelectorAll('#publishChecklist input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
        const item = cb.closest('.checklist-item');
        if (item) item.classList.remove('checked');
    });
    try { localStorage.removeItem(CHECKLIST_KEY); } catch (e) { /* ignore */ }
}

/* Обработчик кнопки сброса */
document.addEventListener('DOMContentLoaded', () => {
    const resetBtn = document.getElementById('resetChecklistBtn');
    if (resetBtn) resetBtn.addEventListener('click', resetChecklist);
});
