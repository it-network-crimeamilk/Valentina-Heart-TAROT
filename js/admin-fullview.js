function openCoverFullview() {
    const fv = document.getElementById('coverFullview');
    if (!fv) return;
    if (typeof openModal === 'function') {
        openModal('coverFullview');
    } else {
        fv.classList.add('active');
        fv.setAttribute('aria-hidden', 'false');
    }
}

function closeCoverFullview() {
    const fv = document.getElementById('coverFullview');
    if (!fv) return;
    if (typeof closeModal === 'function') {
        closeModal('coverFullview');
    } else {
        fv.classList.remove('active');
        fv.setAttribute('aria-hidden', 'true');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('openFullviewBtn');
    if (btn) btn.addEventListener('click', openCoverFullview);
});
