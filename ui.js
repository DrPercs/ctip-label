function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');

    if (pageId === 'feed') fetchPosts();
    if (pageId === 'requests') fetchRequests();
}

window.createRequest = createRequest;
window.fetchRequests = fetchRequests;
window.submitBeat = submitBeat;
window.showPage = showPage;
window.toggleLike = toggleLike;
window.fetchPosts = fetchPosts;
window.handleAuth = handleAuth;
window.logout = logout;
