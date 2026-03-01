const SUPABASE_URL = 'https://mgalvfcnytusbklahkjy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_GRAiUwNcIIDaBwl8Ux1TuA_1JhaIv6h'; 
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentMode = 'login';

// 1. ПРОВЕРКА СТАТУСА И РОЛИ
async function checkUser() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await _supabase
        .from('profiles')
        .select('username, role')
        .eq('id', user.id)
        .single();

    if (profile) {
        const authContainer = document.getElementById('auth-buttons');
        authContainer.innerHTML = `
            <div class="user-info" style="display: flex; align-items: center; gap: 10px;">
                <span class="badge" style="background: var(--accent); color: #fff; padding: 2px 6px; font-size: 10px; font-weight: bold;">${profile.role.toUpperCase()}</span>
                <span class="user-email">${profile.username || user.email}</span>
                <button class="btn btn-outline" onclick="logout()">Выход</button>
            </div>
        `;

        const adminPanel = document.getElementById('admin-editor');
        if (adminPanel && (profile.role === 'artist' || profile.role === 'admin')) {
            adminPanel.style.display = 'block';
        }
    }
}

async function logout() {
    await _supabase.auth.signOut();
    location.reload();
}

// 2. ПОЛУЧЕНИЕ ПОСТОВ
async function fetchPosts() {
    const container = document.getElementById('posts-container');
    const { data: { user } } = await _supabase.auth.getUser();

    // Запрашиваем посты и ники через связь
    const { data, error } = await _supabase
        .from('posts')
        .select(`*, profiles:user_id (username)`)
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error("Fetch error:", error);
        container.innerHTML = `<p style="color:var(--accent)">Ошибка загрузки: ${error.message}</p>`;
        return;
    }

    container.innerHTML = data.map(post => {
        const isOwner = user && user.id === post.user_id;
        const authorName = post.profiles?.username || 'ARTIST';
        
        return `
            <div class="track-card" id="post-${post.id}">
                <div class="track-img">
                    <span class="system-label">${authorName}</span>
                    <small class="ref-id">REF_${post.id.substring(0,8)}</small>
                </div>
                <strong>${post.title}</strong>
                <p class="genre-tag">${post.genre || 'Experimental'}</p>
                ${post.track_url ? `<audio controls src="${post.track_url}"></audio>` : ''}
                <p class="post-content">${post.content || ''}</p>
                ${isOwner ? `
                    <button class="delete-btn" onclick="deletePost('${post.id}')">
                        [ DELETE RELEASE ]
                    </button>
                ` : ''}
            </div>
        `;
    }).join('');
}

// 3. УДАЛЕНИЕ ПОСТА
async function deletePost(postId) {
    if (!confirm('Удалить этот релиз навсегда?')) return;
    const { error } = await _supabase.from('posts').delete().eq('id', postId);
    if (error) alert('Ошибка при удалении: ' + error.message);
    else document.getElementById(`post-${postId}`)?.remove();
}

// 4. СОЗДАНИЕ ПОСТА
async function createPost() {
    const btn = document.getElementById('upload-btn');
    const file = document.getElementById('post-audio').files[0];
    const title = document.getElementById('post-title').value;

    if (!file || !title) return alert("Заполни название и выбери файл!");

    btn.disabled = true;
    btn.innerText = "UPLOADING...";

    const fileName = `${Date.now()}_${file.name}`;
    const { data: sData, error: sErr } = await _supabase.storage.from('tracks').upload(fileName, file);
    
    if (sErr) {
        alert("Ошибка загрузки: " + sErr.message);
        btn.disabled = false;
        return;
    }

    const { data: { publicUrl } } = _supabase.storage.from('tracks').getPublicUrl(fileName);
    const { data: { user } } = await _supabase.auth.getUser();
    
    const { error: dbErr } = await _supabase.from('posts').insert([{ 
        title, 
        genre: document.getElementById('post-genre').value, 
        content: document.getElementById('post-desc').value, 
        user_id: user.id, 
        track_url: publicUrl 
    }]);

    if (dbErr) {
        alert("Ошибка БД: " + dbErr.message);
        btn.disabled = false;
    } else {
        location.reload();
    }
}

// 5. АВТОРИЗАЦИЯ
async function handleAuth() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const username = document.getElementById('auth-username').value;

    if (currentMode === 'reg') {
        const { error } = await _supabase.auth.signUp({
            email,
            password,
            options: { data: { username: username } } 
        });
        if (error) alert(error.message);
        else alert('Проверь почту для подтверждения!');
    } else {
        const { error } = await _supabase.auth.signInWithPassword({ email, password });
        if (error) alert(error.message);
        else { closeModal(); location.reload(); }
    }
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-center a').forEach(a => a.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    document.getElementById('link-' + pageId)?.classList.add('active');
    if (pageId === 'feed') fetchPosts();
}

function openModal(type) {
    currentMode = type;
    document.getElementById('authModal').style.display = 'flex';
    document.getElementById('modalTitle').innerText = (type === 'login') ? 'ВХОД' : 'РЕГИСТРАЦИЯ';
    document.getElementById('auth-username').style.display = (type === 'reg') ? 'block' : 'none';
    document.getElementById('auth-submit-btn').onclick = handleAuth;
}

function closeModal() { document.getElementById('authModal').style.display = 'none'; }

window.onload = () => {
    checkUser();
    fetchPosts();
};
