const SUPABASE_URL = 'https://mgalvfcnytusbklahkjy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_GRAiUwNcIIDaBwl8Ux1TuA_1JhaIv6h'; 
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentMode = 'login';

// 1. ЕДИНАЯ ФУНКЦИЯ ПРОВЕРКИ ПОЛЬЗОВАТЕЛЯ
async function checkUser() {
    const { data: { user } } = await _supabase.auth.getUser();
    const authContainer = document.getElementById('auth-buttons');
    const adminPanel = document.getElementById('admin-editor');
    const settingsLink = document.getElementById('link-settings');

    if (!user) {
        console.log("Пользователь не авторизован");
        if (adminPanel) adminPanel.style.display = 'none';
        if (settingsLink) settingsLink.style.display = 'none';
        return;
    }

    // Запрашиваем профиль один раз для всего
    const { data: profile, error } = await _supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (error) {
        console.error("Ошибка профиля:", error);
        authContainer.innerHTML = `<span>${user.email}</span> <button class="btn btn-outline" onclick="logout()">EXIT</button>`;
        return;
    }

    if (profile) {
        // Рендерим шапку (Аватар + Ник)
        const avatarImg = profile.avatar_url 
            ? `<img src="${profile.avatar_url}" style="width:30px; height:30px; border-radius:50%; object-fit:cover; border:1px solid var(--accent); margin-right:10px;">`
            : `<div style="width:30px; height:30px; border-radius:50%; background:#222; display:inline-block; margin-right:10px; vertical-align:middle;"></div>`;

        authContainer.innerHTML = `
            <div style="display:flex; align-items:center;">
                ${avatarImg}
                <div style="display:flex; flex-direction:column; margin-right:15px; text-align:right;">
                    <span style="font-size:0.8rem; font-weight:900; line-height:1;">${profile.username.toUpperCase()}</span>
                    <span style="font-size:0.6rem; color:var(--accent);">${profile.role.toUpperCase()}</span>
                </div>
                <button class="btn btn-outline" style="padding:5px 10px; font-size:0.6rem;" onclick="logout()">EXIT</button>
            </div>
        `;

        // Показываем ссылку на настройки
        if (settingsLink) settingsLink.style.display = 'inline-block';

        // ВКЛЮЧАЕМ АДМИНКУ (если роль позволяет)
        if (adminPanel && (profile.role === 'artist' || profile.role === 'admin' || profile.role === 'beatmaker')) {
            adminPanel.style.display = 'block';
        }

        // Заполняем данные в полях настроек, если мы на странице настроек
        const setUsername = document.getElementById('settings-username');
        const setAvatar = document.getElementById('settings-avatar-preview');
        if (setUsername) setUsername.value = profile.username || '';
        if (setAvatar && profile.avatar_url) setAvatar.src = profile.avatar_url;
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

    const { data, error } = await _supabase
        .from('posts')
        .select(`*, profiles:user_id (username, avatar_url)`)
        .order('created_at', { ascending: false });
    
    if (error) {
        container.innerHTML = `<p style="color:var(--accent)">Ошибка: ${error.message}</p>`;
        return;
    }

    container.innerHTML = data.map(post => {
        const isOwner = user && user.id === post.user_id;
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
                <p class="post-content">${post.content || ''}</p>
                ${isOwner ? `<button class="delete-btn" onclick="deletePost('${post.id}')">[ DELETE ]</button>` : ''}
            </div>
        `;
    }).join('');
}

// 3. УДАЛЕНИЕ ПОСТА
async function deletePost(postId) {
    if (!confirm('Удалить навсегда?')) return;
    const { error } = await _supabase.from('posts').delete().eq('id', postId);
    if (error) alert(error.message);
    else document.getElementById(`post-${postId}`)?.remove();
}

// 4. СОЗДАНИЕ ПОСТА
async function createPost() {
    const btn = document.getElementById('upload-btn');
    const fileInput = document.getElementById('post-audio');
    const title = document.getElementById('post-title').value;
    
    if (!fileInput.files[0] || !title) return alert("Заполни название и выбери файл!");

    btn.disabled = true;
    btn.innerText = "UPLOADING...";

    const file = fileInput.files[0];
    const fileName = `${Date.now()}_${file.name}`;

    const { error: sErr } = await _supabase.storage.from('tracks').upload(fileName, file);
    if (sErr) { alert(sErr.message); btn.disabled = false; return; }

    const { data: { publicUrl } } = _supabase.storage.from('tracks').getPublicUrl(fileName);
    const { data: { user } } = await _supabase.auth.getUser();

    const { error: dbErr } = await _supabase.from('posts').insert([{
        title: title,
        genre: document.getElementById('post-genre').value,
        content: document.getElementById('post-desc').value,
        user_id: user.id,
        track_url: publicUrl
    }]);

    if (dbErr) { alert(dbErr.message); btn.disabled = false; } 
    else { location.reload(); }
}

// 5. АВТОРИЗАЦИЯ
async function handleAuth() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const username = document.getElementById('auth-username').value;

    if (currentMode === 'reg') {
        const { error } = await _supabase.auth.signUp({
            email, password, options: { data: { username: username } } 
        });
        if (error) alert(error.message);
        else alert('Проверь почту!');
    } else {
        const { error } = await _supabase.auth.signInWithPassword({ email, password });
        if (error) alert(error.message);
        else { closeModal(); location.reload(); }
    }
}

// 6. НАСТРОЙКИ (ПРОФИЛЬ)
async function updateProfile() {
    const { data: { user } } = await _supabase.auth.getUser();
    const newUsername = document.getElementById('settings-username').value;
    const avatarFile = document.getElementById('settings-avatar-input').files[0];
    let avatarUrl = document.getElementById('settings-avatar-preview').src;

    if (avatarFile) {
        const fileName = `avatar_${user.id}_${Date.now()}`;
        const { error: upErr } = await _supabase.storage.from('avatars').upload(fileName, avatarFile);
        if (upErr) return alert("Ошибка фото: " + upErr.message);
        const { data: { publicUrl } } = _supabase.storage.from('avatars').getPublicUrl(fileName);
        avatarUrl = publicUrl;
    }

    const { error } = await _supabase.from('profiles').update({ 
        username: newUsername, avatar_url: avatarUrl 
    }).eq('id', user.id);

    if (error) alert(error.message);
    else { alert("Профиль обновлен!"); location.reload(); }
}

async function updatePassword() {
    const newPassword = document.getElementById('settings-password').value;
    if (newPassword.length < 6) return alert("Минимум 6 символов!");
    const { error } = await _supabase.auth.updateUser({ password: newPassword });
    alert(error ? error.message : "Пароль изменен!");
}

// 7. НАВИГАЦИЯ
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
