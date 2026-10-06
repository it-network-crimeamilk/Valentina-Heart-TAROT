const CHECKLIST_KEY = 'valentina_admin_checklist';

/* Инициализация чек-листа. Вызывается из showAdminPanel при входе в админку. */
function initChecklist() {
    const container = document.getElementById('publishChecklist');
    if (!container) return;

    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(CHECKLIST_KEY)) || {}; } catch (e) { /* ignore */ }

    // Проставляем состояние из localStorage
    container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        const key = cb.dataset.key;
        cb.checked = !!saved[key];
        cb.closest('.checklist-item').classList.toggle('checked', cb.checked);
    });

    // Один обработчик на контейнер (change всплывает от чекбоксов)
    if (container.dataset.bound === '1') return;
    container.dataset.bound = '1';
    container.addEventListener('change', handleChecklistChange);
}

function handleChecklistChange(e) {
    const cb = e.target.closest('input[type="checkbox"]');
    if (!cb) return;

    cb.closest('.checklist-item').classList.toggle('checked', cb.checked);

    const state = {};
    document.querySelectorAll('#publishChecklist input[type="checkbox"]').forEach(x => {
        state[x.dataset.key] = x.checked;
    });
    try { localStorage.setItem(CHECKLIST_KEY, JSON.stringify(state)); } catch (err) { console.error(err); }
}

function resetChecklist() {
    if (!confirm('Сбросить все отметки чек-листа?')) return;
    document.querySelectorAll('#publishChecklist input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
        cb.closest('.checklist-item').classList.remove('checked');
    });
    localStorage.removeItem(CHECKLIST_KEY);
}

/* Обработчик кнопки сброса */
document.addEventListener('DOMContentLoaded', () => {
    const resetBtn = document.getElementById('resetChecklistBtn');
    if (resetBtn) resetBtn.addEventListener('click', resetChecklist);
});
