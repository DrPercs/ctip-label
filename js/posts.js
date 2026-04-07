// ==========================
// POSTS SYSTEM (FEED & PROFILE)
// ==========================

// 1. ГЛАВНАЯ ФУНКЦИЯ ЗАГРУЗКИ ПОСТОВ
async function fetchPosts() {
    const container = document.getElementById('posts-container');
    if (!container) return;

    // Загружаем посты и сразу пытаемся достать юзернеймы
    const { data: posts, error } = await _supabase
        .from('posts')
        .select(`
            *,
            profiles (username)
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching posts:', error);
        return;
    }

    renderPosts(posts, container);
}

// 2. ОТРИСОВКА КАРТОЧЕК (Универсальная)
function renderPosts(posts, container) {
    if (!posts || posts.length === 0) {
        container.innerHTML = '<p style="color:#444;">ПОКА ТУТ ПУСТО...</p>';
        return;
    }

    container.innerHTML = posts.map(post => {
        // Если профиля нет (джоин не сработал), пишем ANON
        const author = post.profiles?.username || "ANON";
        
        return `
            <div class="track-card">
                <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:10px;">
                    <div>
                        <div style="font-size:0.5rem; color:var(--accent); font-weight:900;">ARTIST: ${author.toUpperCase()}</div>
                        <div style="font-weight:900; font-size:1rem; letter-spacing:1px;">${post.title.toUpperCase()}</div>
                    </div>
                    <div style="font-size:0.6rem; color:#444;">${new Date(post.created_at).toLocaleDateString()}</div>
                </div>
                
                <audio src="${post.track_url}" controls style="width:100%; height:35px; filter: invert(1); margin: 10px 0;"></audio>

                <div style="display:flex; gap:10px; margin-top:5px;">
                    <button class="btn" style="padding:5px 10px; font-size:0.7rem;" onclick="toggleLike('${post.id}')">
                        🔥 <span>${post.likes_count || 0}</span>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// 3. СОЗДАНИЕ НОВОГО ПОСТА
async function createPost() {
    const { data: { session } } = await _supabase.auth.getSession();
    const user = session?.user;
    if (!user) return alert("Войди в аккаунт!");

    const file = document.getElementById('post-audio').files[0];
    const title = document.getElementById('post-title').value;
    if (!file || !title) return alert("Заполни название и выбери файл!");

    const btn = document.querySelector('.apply-container .btn');
    btn.innerText = "UPLOADING...";
    btn.disabled = true;

    try {
        // Грузим в бакет 'tracks' (он у тебя должен быть публичным)
        const fileName = `${user.id}_${Date.now()}_${file.name}`;
        const { error: uploadError } = await _supabase.storage
            .from('tracks')
            .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = _supabase.storage
            .from('tracks')
            .getPublicUrl(fileName);

        // Сохраняем в таблицу posts
        const { error: dbError } = await _supabase.from('posts').insert([{
            user_id: user.id,
            title: title,
            track_url: urlData.publicUrl,
            genre: 'TRAP' // можно добавить поле в HTML позже
        }]);

        if (dbError) throw dbError;

        alert("Успешно выложено!");
        location.reload(); 
    } catch (err) {
        alert(err.message);
    } finally {
        btn.innerText = "ВЫЛОЖИТЬ";
        btn.disabled = false;
    }
}

// ЭКСПОРТЫ
window.fetchPosts = fetchPosts;
window.createPost = createPost;
