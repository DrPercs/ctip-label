const SUPABASE_URL = 'https://mgalvfcnytusbklahkjy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_GRAiUwNcIIDaBwl8Ux1TuA_1JhaIv6h'; 
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentMode = 'login';

// 1. ПРОВЕРКА ПОЛЬЗОВАТЕЛЯ И ЕГО РОЛИ
async function checkUser() {
    const { data: { user } } = await _supabase.auth.getUser();
    const authContainer = document.getElementById('auth-buttons');
    const adminPanel = document.getElementById('admin-editor');

    if (!user) {
        console.log("Пользователь не авторизован");
        return;
    }

    // Запрашиваем данные из таблицы profiles
    const { data: profile, error } = await _supabase
        .from('profiles')
        .select('username, role, avatar_url')
        .eq('id', user.id)
        .single();

    if (error) {
        console.error("Ошибка получения профиля:", error);
        // Если профиля нет, выводим хотя бы почту
        authContainer.innerHTML = `<span>${user.email} (Нет профиля)</span> <button onclick="logout()">Выход</button>`;
        return;
    }

    if (profile) {
        console.log("Профиль загружен:", profile);
        
        // Рендерим ник и аватар в шапке
        const avatarImg = profile.avatar_url 
            ? `<img src="${profile.avatar_url}" style="width:30px; height:30px; border-radius:50%; object-fit:cover; border:1px solid var(--accent); margin-right:10px;">`
            : `<div style="width:30px; height:30px; border-radius:50%; background:#222; display:inline-block; margin-right:10px; vertical-align:middle;"></div>`;

        authContainer.innerHTML = `
            <div style="display:flex; align-items:center;">
                ${avatarImg}
                <div style="display:flex; flex-direction:column; margin-right:15px;">
                    <span style="font-size:0.8rem; font-weight:900; line-height:1;">${profile.username.toUpperCase()}</span>
                    <span style="font-size:0.6rem; color:var(--accent);">${profile.role.toUpperCase()}</span>
                </div>
                <button class="btn btn-outline" style="padding:5px 10px; font-size:0.6rem;" onclick="logout()">EXIT</button>
            </div>
        `;

        // ВКЛЮЧАЕМ АДМИНКУ
        if (adminPanel && (profile.role === 'artist' || profile.role === 'admin')) {
            console.log("Доступ к админке разрешен");
            adminPanel.style.display = 'block';
        }
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

// 4. СОЗДАНИЕ ПОСТА С ПРОВЕРКОЙ ОШИБОК
async function createPost() {
    const btn = document.getElementById('upload-btn');
    const fileInput = document.getElementById('post-audio');
    const title = document.getElementById('post-title').value;
    
    if (!fileInput.files[0] || !title) return alert("Название и файл обязательны!");

    btn.disabled = true;
    btn.innerText = "UPLOADING...";

    const file = fileInput.files[0];
    const fileName = `${Date.now()}_${file.name}`;

    // 1. Загрузка в Storage
    const { data: sData, error: sErr } = await _supabase.storage.from('tracks').upload(fileName, file);
    if (sErr) {
        alert("Ошибка загрузки файла: " + sErr.message);
        btn.disabled = false;
        return;
    }

    // 2. Получение ссылки
    const { data: { publicUrl } } = _supabase.storage.from('tracks').getPublicUrl(fileName);
    const { data: { user } } = await _supabase.auth.getUser();

    // 3. Сохранение в базу
    const { error: dbErr } = await _supabase.from('posts').insert([{
        title: title,
        genre: document.getElementById('post-genre').value,
        content: document.getElementById('post-desc').value,
        user_id: user.id,
        track_url: publicUrl
    }]);

    if (dbErr) {
        console.error("Ошибка вставки в БД:", dbErr);
        alert("Ошибка сохранения: " + dbErr.message);
        btn.disabled = false;
        btn.innerText = "Опубликовать релиз";
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

// 1. Показываем ссылку на настройки только залогиненным
async function checkUser() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (user) {
        document.getElementById('link-settings').style.display = 'inline-block';
        // Подгружаем текущие данные в поля настроек
        loadSettingsData(user.id);
    }
}

async function loadSettingsData(userId) {
    const { data: profile } = await _supabase.from('profiles').select('*').eq('id', userId).single();
    if (profile) {
        document.getElementById('settings-username').value = profile.username || '';
        if (profile.avatar_url) {
            document.getElementById('settings-avatar-preview').src = profile.avatar_url;
        }
    }
}

// 2. Обновление ника и аватара
async function updateProfile() {
    const { data: { user } } = await _supabase.auth.getUser();
    const newUsername = document.getElementById('settings-username').value;
    const avatarFile = document.getElementById('settings-avatar-input').files[0];
    let avatarUrl = document.getElementById('settings-avatar-preview').src;

    // Если выбрано новое фото
    if (avatarFile) {
        const fileName = `avatar_${user.id}_${Date.now()}`;
        const { data, error } = await _supabase.storage.from('avatars').upload(fileName, avatarFile);
        if (error) return alert("Ошибка загрузки фото: " + error.message);
        
        const { data: { publicUrl } } = _supabase.storage.from('avatars').getPublicUrl(fileName);
        avatarUrl = publicUrl;
    }

    const { error } = await _supabase.from('profiles').update({ 
        username: newUsername,
        avatar_url: avatarUrl 
    }).eq('id', user.id);

    if (error) alert(error.message);
    else {
        alert("Профиль обновлен!");
        location.reload();
    }
}

// 3. Смена пароля
async function updatePassword() {
    const newPassword = document.getElementById('settings-password').value;
    if (newPassword.length < 6) return alert("Пароль должен быть минимум 6 символов");

    const { error } = await _supabase.auth.updateUser({ password: newPassword });

    if (error) alert(error.message);
    else alert("Пароль успешно изменен!");
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




