function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    const page = document.getElementById(pageId);
    if (page) page.classList.add('active');

    if (pageId === 'feed') fetchPosts();
    if (pageId === 'requests') fetchRequests();
}

// фикс для onclick
window.showPage = showPage;
