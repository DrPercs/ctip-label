function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');

    if (pageId === 'feed') fetchPosts();
    if (pageId === 'requests') fetchRequests();
}
