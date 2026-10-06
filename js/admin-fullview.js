function openCoverFullview() {
    const fv = document.getElementById('coverFullview');
    if (fv) fv.classList.add('active');
}

function closeCoverFullview() {
    const fv = document.getElementById('coverFullview');
    if (fv) fv.classList.remove('active');
}

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        closeCoverFullview();
        if (typeof closeCoverEditor === 'function') closeCoverEditor();
    }
});