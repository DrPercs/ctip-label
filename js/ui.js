function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    const page = document.getElementById(pageId);
    if (page) page.classList.add('active');

    // безопасные вызовы (чтобы не падало)
    if (pageId === 'feed' && window.fetchPosts) fetchPosts();
    if (pageId === 'requests' && window.fetchRequests) fetchRequests();
}

function openModal(id) {
    const el = document.getElementById(id);
    if (!el) {
        console.log('modal not found:', id);
        return;
    }
    el.style.display = 'block';
}

function closeModal(id = 'authModal') {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = 'none';
}

// экспорт
window.showPage = showPage;
window.openModal = openModal;
window.closeModal = closeModal;
