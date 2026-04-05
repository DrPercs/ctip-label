window.onload = () => {
    try {
        checkUser();

        const activePage = document.querySelector('.page.active')?.id;

        if (activePage === 'feed') fetchPosts();
        if (activePage === 'requests') fetchRequests();
    } catch (e) {
        console.error(e);
    }
};
