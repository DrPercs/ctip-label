// authorization.js

// ------------------------------
// Инициализация глобальных функций
// ------------------------------

async function checkUser() {
    const authContainer = document.getElementById('auth-buttons');
    if (!authContainer) return;

    const { data: { user }, error: userError } = await _supabase.auth.getUser();
    if (userError) {
        console.log('Auth getUser error:', userError);
        authContainer.innerHTML = '';
        return;
    }

    if (!user) {
        // пользователь не вошел
        authContainer.innerHTML = `
            <button class="btn btn-outline" onclick="openModal('login')">Вход</button>
            <button class="btn btn-fill" onclick="openModal('reg')">Join</button>
        `;
        window.currentUser = null;
        return;
    }

    // пользователь вошел, получаем профиль
    const { data: profile, error: profileError } = await _supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle(); // безопасно, если профиля нет

    if (profileError) console.log('Profile fetch error:', profileError);

    window.currentUser = {
        id: user.id,
        email: user.email,
        username: profile?.username || 'user',
        role: profile?.role || 'guest',
        avatar: profile?.avatar || null
    };

    renderUserMenu();
}

// ------------------------------
// Рендер меню пользователя
// ------------------------------
function renderUserMenu() {
    const authContainer = document.getElementById('auth-buttons');
    if (!authContainer || !window.currentUser) return;

    authContainer.innerHTML = `
        <div class="profile-menu">
            <img src="${window.currentUser.avatar || 'default-avatar.png'}" class="profile-avatar" onclick="toggleProfileMenu()" />
            <span>${window.currentUser.username}</span>
            <div id="profile-dropdown" class="profile-dropdown" style="display: none;">
                <button onclick="goToLikedBeats()">Liked Beats</button>
                <button onclick="goToProfile()">Profile Settings</button>
                <button onclick="logout()">EXIT</button>
            </div>
        </div>
    `;
}

function toggleProfileMenu() {
    const dropdown = document.getElementById('profile-dropdown');
    if (!dropdown) return;
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
}

// ------------------------------
// Функции перехода
// ------------------------------
function goToLikedBeats() {
    showPage('liked-beats'); // нужно, чтобы была страница liked-beats
}

function goToProfile() {
    showPage('profile'); // нужно, чтобы была страница profile
}

// ------------------------------
// Вход / Регистрация
// ------------------------------
async function handleAuth(currentMode) {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const username = document.getElementById('auth-username')?.value;

    try {
        if (currentMode === 'reg') {
            const { data, error } = await _supabase.auth.signUp({
                email,
                password,
                options: { data: { username } }
            });
            if (error) throw error;
            alert('Проверь почту для подтверждения регистрации');
        } else {
            const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
        }
        await checkUser(); // обновляем UI после успешного входа/регистрации
        closeModal(currentMode === 'reg' ? 'reg' : 'login');
    } catch (err) {
        console.log('Auth error:', err);
        alert(err.message || 'Ошибка авторизации');
    }
}

// ------------------------------
// Выход
// ------------------------------
async function logout() {
    try {
        const { error } = await _supabase.auth.signOut();
        if (error) throw error;
        window.currentUser = null;
        checkUser();
    } catch (err) {
        console.log('Logout error:', err);
    }
}

// ------------------------------
// Глобальные функции для SPA
// ------------------------------
window.checkUser = checkUser;
window.handleAuth = handleAuth;
window.logout = logout;
window.toggleProfileMenu = toggleProfileMenu;
window.goToLikedBeats = goToLikedBeats;
window.goToProfile = goToProfile;
