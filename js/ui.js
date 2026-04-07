let currentMode = 'login';
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    const page = document.getElementById(pageId);
    if (page) page.classList.add('active');

    // безопасные вызовы (чтобы не падало)
    if (pageId === 'feed' && window.fetchPosts) fetchPosts();
    if (pageId === 'requests' && window.fetchRequests) fetchRequests();
}

function openModal(mode) {
    const modal = document.getElementById('authModal');
    if (!modal) return;

    currentMode = mode;

    const username = document.getElementById('auth-username');
    const title = document.getElementById('modalTitle');

    if (mode === 'reg') {
        if (username) username.style.display = 'block';
        if (title) title.innerText = 'Регистрация';
    } else {
        if (username) username.style.display = 'none';
        if (title) title.innerText = 'Вход';
    }

    modal.style.display = 'block';
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
