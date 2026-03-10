const SUPABASE_URL = 'https://mgalvfcnytusbklahkjy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_GRAiUwNcIIDaBwl8Ux1TuA_1JhaIv6h'; 
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentMode = 'login';

// 1. ПРОВЕРКА ПОЛЬЗОВАТЕЛЯ И МЕНЮ
async function checkUser() {
    const { data: { user } } = await _supabase.auth.getUser();
    const authContainer = document.getElementById('auth-buttons');
    const adminPanel = document.getElementById('admin-editor');
    const settingsLink = document.getElementById('link-settings');

    if (!user) {
        if (adminPanel) adminPanel.style.display = 'none';
        return;
    }

    const { data: profile, error } = await _supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (error) {
        authContainer.innerHTML = `<span>${user.email}</span> <button class="btn btn-outline" onclick="logout()">EXIT</button>`;
        return;
    }

    if (profile) {
        const avatarHtml = profile.avatar_url 
            ? `<img src="${profile.avatar_url}" style="width:30px; height:30px; border-radius:50%; object-fit:cover; border:1px solid var(--accent); margin-right:10px;">`
            : `<div style="width:30px; height:30px; border-radius:50%; background:#222; display:inline-block; margin-right:10px; vertical-align:middle;"></div>`;

        // Обновляем шапку с обработчиком открытия меню
        authContainer.innerHTML = `
            <div style="display:flex; align-items:center; cursor:pointer;" onclick="toggleDropdown(event)">
                ${avatarHtml}
                <div style="display:flex; flex-direction:column; margin-right:15px; text-align:right;">
                    <span style="font-size:0.7rem; font-weight:900; line-height:1;">${profile.username.toUpperCase()}</span>
                    <span style="font-size:0.5rem; color:var(--accent);">${profile.role.toUpperCase()}</span>
                </div>
                <span style="font-size: 0.5rem;">▼</span>
            </div>
        `;

        // Данные для выпадающего меню
        const dropName = document.getElementById('dropdown-user-name');
        const dropRole = document.getElementById('dropdown-user-role');
        if (dropName) dropName.innerText = profile.username.toUpperCase();
        if (dropRole) dropRole.innerText = profile.role.toUpperCase();

        if (adminPanel && (profile.role === 'artist' || profile.role === 'admin' || profile.role === 'beatmaker')) {
            adminPanel.style.display = 'block';
        }

        const setUsername = document.getElementById('settings-username');
        const setAvatar = document.getElementById('settings-avatar-preview');
        if (setUsername) setUsername.value = profile.username || '';
        if (setAvatar && profile.avatar_url) setAvatar.src = profile.avatar_url;
    }
}

// УПРАВЛЕНИЕ МЕНЮ
function toggleDropdown(event) {
    event.stopPropagation();
    const menu = document.getElementById('user-dropdown');
    if (menu) menu.classList.toggle('active');
}

function closeDropdown() {
    const menu = document.getElementById('user-dropdown');
    if (menu) menu.classList.remove('active');
}

window.onclick = function(event) {
    if (!event.target.closest('.nav-right') && !event.target.closest('#user-dropdown')) {
        closeDropdown();
    }
};

async function logout() {
    await _supabase.auth.signOut();
    location.reload();
}

// 2. ПОЛУЧЕНИЕ ПОСТОВ + ЛОГИКА ЛАЙКОВ
async function fetchPosts() {
    const container = document.getElementById('posts-container');
    const { data: { user } } = await _supabase.auth.getUser();

    // Загружаем посты и сразу проверяем, какие лайкнуты текущим юзером
    const { data: posts, error } = await _supabase
        .from('posts')
        .select(`*, profiles:user_id (username, avatar_url)`)
        .order('created_at', { ascending: false });

    let likedIds = [];
    if (user) {
        const { data: likes } = await _supabase.from('liked_bits').select('post_id').eq('user_id', user.id);
        likedIds = likes ? likes.map(l => l.post_id) : [];
    }
    
    if (error) {
        container.innerHTML = `<p>Ошибка: ${error.message}</p>`;
        return;
    }

    container.innerHTML = posts.map(post => {
        const isOwner = user && user.id === post.user_id;
        const isLiked = likedIds.includes(post.id);
        const authorName = post.profiles?.username || 'ARTIST';
        const authorAvatar = post.profiles?.avatar_url || 'https://via.placeholder.com/20';
        
        return `
            <div class="track-card" id="post-${post.id}">
                <div class="track-img">
                    <span class="system-label">
                        <img src="${authorAvatar}" style="width:12px; height:12px; border-radius:50%; vertical-align:middle;"> ${authorName}
                    </span>
                    <small class="ref-id">REF_${post.id.substring(0,8)}</small>
                </div>
                <strong>${post.title}</strong>
                <p class="genre-tag">${post.genre || 'Experimental'}</p>
                ${post.track_url ? `<audio controls src="${post.track_url}"></audio>` : ''}
                <div class="post-actions" style="margin-top:10px; display:flex; gap:10px;">
                    <button class="like-btn ${isLiked ? 'active' : ''}" onclick="toggleLike('${post.id}')">
                        ${isLiked ? '🔥 LIKED' : '🔥 LIKE'}
                    </button>
                    ${isOwner ? `<button class="delete-btn" onclick="deletePost('${post.id}')">[ DELETE ]</button>` : ''}
                </div>
                <p class="post-content" style="font-size:0.7rem; margin-top:10px; opacity:0.6;">${post.content || ''}</p>
            </div>
        `;
    }).join('');
}

// ЛОГИКА ЛАЙКА
async function toggleLike(postId) {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return alert("Войди в аккаунт!");

    const { data: existing } = await _supabase
        .from('liked_bits')
        .select('*')
        .eq('user_id', user.id)
        .eq('post_id', postId)
        .single();

    if (existing) {
        await _supabase.from('liked_bits').delete().eq('id', existing.id);
    } else {
        await _supabase.from('liked_bits').insert([{ user_id: user.id, post_id: postId }]);
    }
    fetchPosts(); // Обновляем ленту
}

// 3. СТРАНИЦА LIKED BITS
async function fetchLikedBits() {
    const container = document.getElementById('liked-bits-container');
    container.innerHTML = "<p>Загрузка общей базы лайков...</p>";
    
    // Тянем все лайки из таблицы, включая данные о постах и о тех, кто лайкнул
    // Чтобы это работало, у тебя должны быть настроены Foreign Keys в Supabase
    const { data: allLikes, error } = await _supabase
        .from('liked_bits')
        .select(`
            user_id,
            profiles:user_id (username, avatar_url),
            posts:post_id (
                id, 
                title, 
                track_url, 
                genre,
                author:user_id (username)
            )
        `);

    if (error || !allLikes.length) {
        container.innerHTML = "<p>В базе пока пусто. Лайков еще нет.</p>";
        return;
    }

    // Группируем лайки по постам, чтобы если один бит лайкнули трое, он не дублировался трижды
    const grouped = {};
    allLikes.forEach(item => {
        const postId = item.posts.id;
        if (!grouped[postId]) {
            grouped[postId] = {
                ...item.posts,
                likers: []
            };
        }
        grouped[postId].likers.push(item.profiles.username);
    });

    container.innerHTML = Object.values(grouped).map(post => `
        <div class="track-card">
            <div class="track-img">
                <span class="system-label">PROD BY: ${post.author?.username || 'UNKNOWN'}</span>
                <small class="ref-id">ID: ${post.id.substring(0,5)}</small>
            </div>
            <strong>${post.title}</strong>
            <p class="genre-tag">${post.genre || 'Beat'}</p>
            
            <div class="likers-list" style="margin: 10px 0; padding: 5px; background: rgba(255,0,0,0.1); border-radius: 4px;">
                <span style="font-size: 0.6rem; color: var(--accent); font-weight: bold;">КТО ЛАЙКНУЛ:</span>
                <p style="font-size: 0.7rem; margin: 0;">${post.likers.join(', ')}</p>
            </div>

            <audio controls src="${post.track_url}" style="width: 100%;"></audio>
        </div>
    `).join('');
}

// 4. ОСТАЛЬНАЯ ЛОГИКА (CRUD)
async function deletePost(postId) {
    if (!confirm('Удалить навсегда?')) return;
    await _supabase.from('posts').delete().eq('id', postId);
    fetchPosts();
}

async function createPost() {
    const btn = document.getElementById('upload-btn');
    const file = document.getElementById('post-audio').files[0];
    const title = document.getElementById('post-title').value;
    
    if (!file || !title) return alert("Заполни данные!");
    btn.disabled = true;

    const fileName = `${Date.now()}_${file.name}`;
    const { error: sErr } = await _supabase.storage.from('tracks').upload(fileName, file);
    if (sErr) { alert(sErr.message); btn.disabled = false; return; }

    const { data: { publicUrl } } = _supabase.storage.from('tracks').getPublicUrl(fileName);
    const { data: { user } } = await _supabase.auth.getUser();

    await _supabase.from('posts').insert([{
        title, genre: document.getElementById('post-genre').value,
        content: document.getElementById('post-desc').value,
        user_id: user.id, track_url: publicUrl
    }]);
    location.reload();
}

async function handleAuth() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const username = document.getElementById('auth-username').value;

    if (currentMode === 'reg') {
        const { error } = await _supabase.auth.signUp({
            email, password, options: { data: { username: username } } 
        });
        if (error) alert(error.message); else alert('Проверь почту!');
    } else {
        const { error } = await _supabase.auth.signInWithPassword({ email, password });
        if (error) alert(error.message); else { closeModal(); location.reload(); }
    }
}

async function updateProfile() {
    const { data: { user } } = await _supabase.auth.getUser();
    const newUsername = document.getElementById('settings-username').value;
    const avatarFile = document.getElementById('settings-avatar-input').files[0];
    let avatarUrl = document.getElementById('settings-avatar-preview').src;

    if (avatarFile) {
        const fileName = `avatar_${user.id}_${Date.now()}`;
        await _supabase.storage.from('avatars').upload(fileName, avatarFile);
        const { data: { publicUrl } } = _supabase.storage.from('avatars').getPublicUrl(fileName);
        avatarUrl = publicUrl;
    }

    await _supabase.from('profiles').update({ username: newUsername, avatar_url: avatarUrl }).eq('id', user.id);
    alert("Saved!"); location.reload();
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-center a').forEach(a => a.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    document.getElementById('link-' + (pageId === 'liked-bits' ? 'feed' : pageId))?.classList.add('active');
    
    if (pageId === 'feed') fetchPosts();
    if (pageId === 'liked-bits') fetchLikedBits();
}

function openModal(type) {
    currentMode = type;
    document.getElementById('authModal').style.display = 'flex';
    document.getElementById('modalTitle').innerText = (type === 'login' ? 'ВХОД' : 'РЕГИСТРАЦИЯ');
    document.getElementById('auth-username').style.display = (type === 'reg' ? 'block' : 'none');
    document.getElementById('auth-submit-btn').onclick = handleAuth;
}

function closeModal() { document.getElementById('authModal').style.display = 'none'; }

window.onload = () => {
    checkUser();
    fetchPosts();
};

