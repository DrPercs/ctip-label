async function fetchPosts() {
    const container = document.getElementById('posts-container');

    const { data: { user } } = await _supabase.auth.getUser();

    const { data: posts } = await _supabase
        .from('posts')
        .select(`
            *,
            profiles:user_id (username),
            likes:liked_bits(count)
        `)
        .order('created_at', { ascending: false });

    container.innerHTML = posts.map(post => `
        <div class="track-card">
            <strong>${post.title}</strong>
            <p>${post.genre}</p>
            <audio controls src="${post.track_url}"></audio>

            <button onclick="toggleLike('${post.id}')">
                🔥 ${post.likes[0]?.count || 0}
            </button>
        </div>
    `).join('');
}

async function createPost() {
    const file = document.getElementById('post-audio').files[0];
    const title = document.getElementById('post-title').value;

    const fileName = `${Date.now()}_${file.name}`;
    await _supabase.storage.from('tracks').upload(fileName, file);

    const { data } = _supabase.storage.from('tracks').getPublicUrl(fileName);

    const { data: { user } } = await _supabase.auth.getUser();

    await _supabase.from('posts').insert([{
        title,
        user_id: user.id,
        track_url: data.publicUrl
    }]);

    location.reload();
}

window.createRequest = createRequest;
window.fetchRequests = fetchRequests;
window.submitBeat = submitBeat;
window.showPage = showPage;
window.toggleLike = toggleLike;
window.fetchPosts = fetchPosts;
window.handleAuth = handleAuth;
window.logout = logout;
