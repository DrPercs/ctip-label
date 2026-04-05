function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    const page = document.getElementById(pageId);
    if (page) page.classList.add('active');

    if (pageId === 'feed') fetchPosts();
    if (pageId === 'requests') fetchRequests();
}

function openModal(id) {
    const el = document.getElementById(id);
    if (!el) {
        console.log('modal not found:', id);
        return;
    }
    el.style.display = 'block';
}

function closeModal(id) {
    document.getElementById(id).style.display = "none";
}

window.openModal = openModal;
window.closeModal = closeModal;

// фикс для onclick
window.showPage = showPage;
