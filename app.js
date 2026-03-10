const SUPABASE_URL = 'https://mgalvfcnytusbklahkjy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_GRAiUwNcIIDaBwl8Ux1TuA_1JhaIv6h'; 
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentMode = 'login';
let contestState = { is_final: false };

// 1. ПРОВЕРКА ПОЛЬЗОВАТЕЛЯ И МЕНЮ
async function checkUser() {
    const { data: { user } } = await _supabase.auth.getUser();
    const authContainer = document.getElementById('auth-buttons');
    const adminPanel = document.getElementById('admin-editor');
    const settingsLink = document.getElementById('link-settings');
    const eventAdminControls = document.getElementById('admin-event-controls');

    if (!user) {
        if (adminPanel) adminPanel.style.display = 'none';
        // Если юзера нет, показываем кнопки входа (фиксим твой баг с исчезновением)
        authContainer.innerHTML = `
            <button class="btn btn-outline" onclick="openModal('login')">Вход</button>
            <button class="btn btn-fill" onclick="openModal('reg')">Join</button>
        `;
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

        const dropName = document.getElementById('dropdown-user-name');
        const dropRole = document.getElementById('dropdown-user-role');
        if (dropName) dropName.innerText = profile.username.toUpperCase();
        if (dropRole) dropRole.innerText = profile.role.toUpperCase();

        // Панель постов для ролей
        if (adminPanel && (['artist', 'admin', 'beatmaker'].includes(profile.role))) {
            adminPanel.style.display = 'block';
        }

        // Кнопка управления ивентом ТОЛЬКО для админа
        if (eventAdminControls && profile.role === 'admin') {
            eventAdminControls.style.display = 'block';
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

// 2. ЛОГИКА ПОСТОВ И ЛАЙКОВ
async function fetchPosts() {
    const container = document.getElementById('posts-container');
    if (!container) return;
    const { data: { user } } = await _supabase.auth.getUser();

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

async function toggleLike(postId) {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return alert("Войди в аккаунт!");

    const { data: existing } = await _supabase.from('liked_bits')
        .select('*').eq('user_id', user.id).eq('post_id', postId).single();

    if (existing) {
        await _supabase.from('liked_bits').delete().eq('id', existing.id);
    } else {
        await _supabase.from('liked_bits').insert([{ user_id: user.id, post_id: postId }]);
    }
    fetchPosts();
}

// 3. СТРАНИЦА LIKED BITS
async function fetchLikedBits() {
    const container = document.getElementById('liked-bits-container');
    if (!container) return;
    container.innerHTML = "<p>Загрузка общей базы лайков...</p>";
    
    const { data: allLikes, error } = await _supabase.from('liked_bits').select(`
        user_id,
        profiles:user_id (username, avatar_url),
        posts:post_id (id, title, track_url, genre, author:user_id (username))
    `);

    if (error || !allLikes?.length) {
        container.innerHTML = "<p>В базе пока пусто. Лайков еще нет.</p>";
        return;
    }

    const grouped = {};
    allLikes.forEach(item => {
        if (!item.posts) return;
        const postId = item.posts.id;
        if (!grouped[postId]) {
            grouped[postId] = { ...item.posts, likers: [] };
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

// 4. КОНКУРС (EVENT) LOGIC
async function fetchContest() {
    const grid = document.getElementById('contest-grid');
    if (!grid) return;

    // 1. Получаем статус ивента
    const { data: settings } = await _supabase.from('contest_settings').select('*').single();
    contestState = settings;
    
    // Ссылка на лупы
    const loopLink = document.getElementById('loop-download-link');
    if (loopLink) loopLink.href = settings.loop_link;

    // 2. Получаем роль юзера
    const { data: { user } } = await _supabase.auth.getUser();
    let isAdmin = false;
    if (user) {
        const { data: p } = await _supabase.from('profiles').select('role').eq('id', user.id).single();
        isAdmin = p?.role === 'admin';
    }

    // 3. UI адаптация
    document.getElementById('submission-ui').style.display = settings.is_final ? 'none' : 'block';
    document.getElementById('leaderboard').style.display = settings.is_final ? 'block' : 'none';
    document.getElementById('toggle-final-btn').innerText = settings.is_final ? 'STOP FINAL (RESET)' : 'START FINAL STAGE';

    // 4. Загрузка битов
    let query = _supabase.from('contest_entries').select('*');
    if (settings.is_final) query = query.eq('is_finalist', true);
    const { data: entries } = await query.order('votes_count', { ascending: false });

    // 5. Пьедестал
    if (settings.is_final) {
        document.body.classList.add('final-mode'); 
        subUI.style.display = 'none';
        const top3 = entries.slice(0, 3);
        const podium = document.getElementById('podium-container');
        podium.innerHTML = top3.map((item, i) => `
            <div class="podium-item" style="border: 1px solid ${i === 0 ? 'gold' : '#333'}">
                <div style="font-size:1.5rem;">${i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</div>
                <div style="font-size:0.6rem; color:var(--accent);">${item.votes_count} VOTES</div>
            </div>
        `).join('');
    } else {
    document.body.classList.remove('final-mode'); // Убираем, если финал окончен
    subUI.style.display = 'block';

    // 6. Сетка битов
    grid.innerHTML = entries.map((item, index) => {
        const isVoted = localStorage.getItem('voted_' + item.id);
        const displayName = settings.is_final ? `УЧАСТНИК №${entries.length - index}` : item.author_name;
        
        return `
            <div class="track-card" style="${item.is_finalist ? 'border:1px solid var(--accent)' : ''}">
                <strong>${displayName.toUpperCase()}</strong>
                <audio controls src="${item.track_url}" style="width:100%; margin:10px 0;"></audio>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <button class="btn ${isVoted ? 'btn-fill' : 'btn-outline'}" 
                        onclick="voteContest('${item.id}', ${item.votes_count})"
                        ${(!settings.is_final && !isAdmin) ? 'disabled' : ''}>
                        ${settings.is_final ? 'VOTE' : 'В ФИНАЛ'} (${item.votes_count})
                    </button>
                    ${isAdmin && item.is_finalist ? '<span>⭐</span>' : ''}
                </div>
            </div>
        `;
    }).join('');
}

async function uploadContestBit() {
    const name = document.getElementById('contest-author').value;
    const file = document.getElementById('contest-file').files[0];
    if (!name || !file) return alert("Заполни поля!");

    const btn = document.getElementById('contest-upload-btn');
    btn.innerText = "UPLOADING..."; btn.disabled = true;

    const fileName = `contest_${Date.now()}`;
    await _supabase.storage.from('tracks').upload(fileName, file);
    const { data: { publicUrl } } = _supabase.storage.from('tracks').getPublicUrl(fileName);

    await _supabase.from('contest_entries').insert([{ author_name: name, track_url: publicUrl }]);
    alert("Отправлено!"); location.reload();
}

async function voteContest(id, currentVotes) {
    const { data: { user } } = await _supabase.auth.getUser();
    let isAdmin = false;
    if (user) {
        const { data: p } = await _supabase.from('profiles').select('role').eq('id', user.id).single();
        isAdmin = p?.role === 'admin';
    }

    if (!contestState.is_final && !isAdmin) return;
    if (localStorage.getItem('voted_' + id)) return alert("Уже голосовал!");

    if (!contestState.is_final && isAdmin) {
        // Админ выбирает финалиста
        await _supabase.from('contest_entries').update({ is_finalist: true, votes_count: 1 }).eq('id', id);
    } else {
        // Голосование в финале
        await _supabase.from('contest_entries').update({ votes_count: currentVotes + 1 }).eq('id', id);
    }
    
    localStorage.setItem('voted_' + id, 'true');
    fetchContest();
}

async function toggleFinalStage() {
    const newState = !contestState.is_final;
    await _supabase.from('contest_settings').update({ is_final: newState }).eq('id', 1);
    location.reload();
}

// 5. CRUD И СИСТЕМНЫЕ ФУНКЦИИ
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
    await _supabase.storage.from('tracks').upload(fileName, file);
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
    
    const targetPage = document.getElementById(pageId);
    if (targetPage) targetPage.classList.add('active');
    
    document.getElementById('link-' + (pageId === 'liked-bits' ? 'feed' : pageId))?.classList.add('active');
    
    if (pageId === 'feed') fetchPosts();
    if (pageId === 'liked-bits') fetchLikedBits();
    if (pageId === 'event') fetchContest();
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
    // Определяем, какая страница активна при загрузке
    const activePage = document.querySelector('.page.active')?.id;
    if (activePage === 'feed') fetchPosts();
    if (activePage === 'event') fetchContest();
};

