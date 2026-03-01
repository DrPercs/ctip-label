const SUPABASE_URL = 'https://mgalvfcnytusbklahkjy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_GRAiUwNcIIDaBwl8Ux1TuA_1JhaIv6h'; 
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentMode = 'login';

// 1. ПРОВЕРКА СТАТУСА ЮЗЕРА
async function checkUser() {
    const { data: { user } } = await _supabase.auth.getUser();
    const authContainer = document.getElementById('auth-buttons');
    const adminPanel = document.getElementById('admin-editor');

    if (user) {
        authContainer.innerHTML = `
            <span class="user-email">${user.email}</span>
            <button class="btn btn-outline" onclick="logout()">Выход</button>
        `;
        if (adminPanel) adminPanel.style.display = 'block';
    }
}

async function logout() {
    await _supabase.auth.signOut();
    location.reload();
}

// 2. ПОЛУЧЕНИЕ ПОСТОВ С ПРОВЕРКОЙ ВЛАДЕЛЬЦА
async function fetchPosts() {
    const { data: { user } } = await _supabase.auth.getUser();
    const { data, error } = await _supabase.from('posts').select('*').order('created_at', { ascending: false });
    const container = document.getElementById('posts-container');
    
    if (error) {
        container.innerHTML = "<p>Ошибка загрузки.</p>";
        return;
    }

    container.innerHTML = data.map(post => {
        // Проверяем: совпадает ли ID залогиненного юзера с user_id поста
        const isOwner = user && user.id === post.user_id;
        
        return `
            <div class="track-card" id="post-${post.id}">
                <div class="track-img">
                    <span class="system-label">CTIP_SYSTEM</span>
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

    // Удаляем из таблицы 'posts'
    const { error } = await _supabase
        .from('posts')
        .delete()
        .eq('id', postId);

    if (error) {
        alert('Ошибка при удалении: ' + error.message);
    } else {
        // Убираем карточку с экрана без перезагрузки
        const element = document.getElementById(`post-${postId}`);
        if (element) element.remove();
    }
}

// 4. СОЗДАНИЕ ПОСТА
async function createPost() {
    const btn = document.getElementById('upload-btn');
    const file = document.getElementById('post-audio').files[0];
    const title = document.getElementById('post-title').value;

    if (!file || !title) return alert("Заполни название и выбери файл!");

    btn.disabled = true;
    btn.innerText = "UPLOADING...";

    // Загрузка в Storage
    const fileName = `${Date.now()}_${file.name}`;
    const { data: sData, error: sErr } = await _supabase.storage.from('tracks').upload(fileName, file);
    
    if (sErr) {
        alert("Ошибка загрузки файла: " + sErr.message);
        btn.disabled = false;
        return;
    }

    // Получаем URL и ID юзера
    const { data: { publicUrl } } = _supabase.storage.from('tracks').getPublicUrl(fileName);
    const { data: { user } } = await _supabase.auth.getUser();
    
    // Сохраняем в базу
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

// --- ВСПОМОГАТЕЛЬНОЕ ---
async function handleAuth() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const { error } = (currentMode === 'reg') 
        ? await _supabase.auth.signUp({ email, password })
        : await _supabase.auth.signInWithPassword({ email, password });

    if (error) alert(error.message);
    else { closeModal(); checkUser(); fetchPosts(); }
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-center a').forEach(a => a.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    document.getElementById('link-' + pageId).classList.add('active');
    if (pageId === 'feed') fetchPosts();
}

function openModal(type) {
    currentMode = type;
    document.getElementById('authModal').style.display = 'flex';
    document.getElementById('modalTitle').innerText = (type === 'login') ? 'ВХОД' : 'РЕГИСТРАЦИЯ';
    document.getElementById('auth-submit-btn').onclick = handleAuth;
}

function closeModal() { document.getElementById('authModal').style.display = 'none'; }

window.onload = () => {
    checkUser();
    fetchPosts();
};
