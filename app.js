window.onload = () => {
    checkUser();

    const activePage = document.querySelector('.page.active')?.id;

    if (activePage === 'feed') fetchPosts();
    if (activePage === 'requests') fetchRequests();

    window.createRequest = createRequest;
window.fetchRequests = fetchRequests;
window.submitBeat = submitBeat;
window.showPage = showPage;
window.toggleLike = toggleLike;
window.fetchPosts = fetchPosts;
window.handleAuth = handleAuth;
window.logout = logout;
};
