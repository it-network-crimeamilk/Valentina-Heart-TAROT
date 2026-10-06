const CHECKLIST_KEY = 'valentina_admin_checklist';

function initChecklist() {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(CHECKLIST_KEY)) || {}; } catch (e) { }

    document.querySelectorAll('#publishChecklist input[type="checkbox"]').forEach(cb => {
        const key = cb.dataset.key;
        if (saved[key]) {
            cb.checked = true;
            cb.closest('.checklist-item').classList.add('checked');
        }
        // Защита от повторного навешивания обработчика
        if (cb.dataset.bound === '1') return;
        cb.dataset.bound = '1';
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