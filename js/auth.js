// ==========================
// AUTH SYSTEM (FINAL)
// ==========================


window.currentUser = null;

// --------------------------
// CHECK USER (BOOTSTRAP)
// --------------------------
async function checkUser() {
    const authContainer = document.getElementById('auth-buttons');
    if (!authContainer) return;

    const { data: { session } } = await _supabase.auth.getSession();
    const user = session?.user;

    if (!user) {
        authContainer.innerHTML = `
            <button class="btn btn-outline" onclick="openModal('login')">Вход</button>
            <button class="btn btn-fill" onclick="openModal('reg')">Join</button>
        `;
        return;
    }

    const { data: profile } = await _supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();

    // РАБОЧАЯ ССЫЛКА (Imgur или любая прямая)
    const fallbackAvatar = 'https://i.imgur.com/6VBx3io.png';
    const avatarUrl = (profile && profile.avatar_url && !profile.avatar_url.includes('default-avatar.png')) 
                       ? profile.avatar_url 
                       : fallbackAvatar;

    authContainer.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px; cursor:pointer;" onclick="showPage('profile')">
            <span style="font-size:0.7rem; font-weight:900;">${(profile?.username || 'NEW_USER').toUpperCase()}</span>
            <img src="${avatarUrl}" onerror="this.src='${fallbackAvatar}'" style="width:35px; height:35px; border-radius:50%; border:1px solid var(--accent); object-fit:cover;">
        </div>
    `;

    // Если мы на странице профиля, обновим там превью
    const preview = document.getElementById('profile-preview-img');
    if (preview) preview.src = avatarUrl;
    const nameInput = document.getElementById('new-username');
    if (nameInput && profile) nameInput.value = profile.username || '';
}

// --------------------------
// USER MENU UI
// --------------------------
function renderUserMenu() {
    const authContainer = document.getElementById('auth-buttons');
    if (!authContainer || !window.currentUser) return;

    const u = window.currentUser;

    authContainer.innerHTML = `
        <div class="profile-wrapper">
            
            <div class="profile-trigger" onclick="toggleProfileMenu()">
                <img class="avatar"
                     src="${u.avatar || 'default-avatar.png'}"
                     alt="avatar"/>
                <span>${u.username}</span>
            </div>

            <div id="profile-dropdown" class="profile-dropdown" style="display:none;">
                <button onclick="goToLikedBeats()">❤️ Liked Beats</button>
                <button onclick="goToProfile()">⚙️ Profile</button>

                ${u.role === 'admin' ? `<button onclick="goToAdmin()">🛠 Admin</button>` : ''}

                <hr/>

                <button onclick="logout()">🚪 Logout</button>
            </div>

        </div>
    `;
}

// --------------------------
// TOGGLE MENU
// --------------------------
function toggleProfileMenu() {
    const el = document.getElementById('profile-dropdown');
    if (!el) return;

    el.style.display = el.style.display === 'block' ? 'none' : 'block';
}

// --------------------------
// AUTH (LOGIN / REGISTER)
// --------------------------
async function handleAuth(mode) {
    const email = document.getElementById('auth-email')?.value;
    const password = document.getElementById('auth-password')?.value;
    const username = document.getElementById('auth-username')?.value;

    if (!email || !password) return alert("Заполни все поля!");

    try {
        console.log("Attempting auth. Mode:", mode); // Чекнем в консоли, какой режим долетает

        if (mode === 'reg') {
            if (!username) return alert("Введи ник для регистрации!");
            
            const { data, error } = await _supabase.auth.signUp({
                email,
                password,
                options: { data: { username: username } }
            });
            if (error) throw error;
            alert('Регистрация успешна! Если подтверждение отключено — просто войди.');
        } 
        
        else if (mode === 'login') {
            const { data, error } = await _supabase.auth.signInWithPassword({
                email,
                password
            });
            if (error) throw error;
            console.log("Login success:", data);
        }

        closeModal();
        await checkUser(); // Обновляем шапку сайта

    } catch (err) {
        console.error('Auth error:', err);
        // Если юзер уже есть, а мы пытались регаться — пробуем сразу залогинить
        if (err.message.includes("already registered")) {
            alert("Этот Email уже зареган. Попробуй 'Вход'");
        } else {
            alert(err.message);
        }
    }
}

// --------------------------
// LOGOUT
// --------------------------
async function logout() {
    try {
        await _supabase.auth.signOut();
        window.currentUser = null;
        await checkUser();
    } catch (err) {
        console.log('Logout error:', err);
    }
}

// --------------------------
// NAV HELPERS
// --------------------------
function goToLikedBeats() {
    showPage('liked-beats');
}

function goToProfile() {
    showPage('profile');
}

function goToAdmin() {
    showPage('admin');
}

// --------------------------
// GLOBAL EXPORTS
// --------------------------
window.checkUser = checkUser;
window.handleAuth = handleAuth;
window.logout = logout;
