window.onload = () => {
    checkUser();

    const activePage = document.querySelector('.page.active')?.id;

    if (activePage === 'feed') fetchPosts();
    if (activePage === 'requests') fetchRequests();
};
