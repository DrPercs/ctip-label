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

    try {
        // стабильнее чем getUser()
        const { data: sessionData, error: sessionError } =
            await _supabase.auth.getSession();

        if (sessionError) {
            console.log('Session error:', sessionError);
        }

        const user = sessionData?.session?.user;

        // --------------------------
        // NOT LOGGED IN
        // --------------------------
        if (!user) {
            window.currentUser = null;

            authContainer.innerHTML = `
                <button class="btn btn-outline" onclick="openModal('login')">Вход</button>
                <button class="btn btn-fill" onclick="openModal('reg')">Join</button>
            `;
            return;
        }

        // --------------------------
        // LOAD PROFILE
        // --------------------------
        const { data: profile, error: profileError } = await _supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

        if (profileError) {
            console.log('Profile error:', profileError);
        }

        // --------------------------
        // GLOBAL USER STATE
        // --------------------------
        window.currentUser = {
            id: user.id,
            email: user.email,
            username: profile?.username || 'user',
            role: profile?.role || 'guest',
            avatar: profile?.avatar || null
        };

        // --------------------------
        // RENDER UI
        // --------------------------
        renderUserMenu();

    } catch (err) {
        console.log('checkUser fatal error:', err);
    }
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

    try {
        if (mode === 'reg') {
            const { error } = await _supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { username }
                }
            });

            if (error) throw error;

            alert('Проверь почту для подтверждения');
        }

        if (mode === 'login') {
            const { error } = await _supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;
        }

        closeModal(mode);
        await checkUser();

    } catch (err) {
        console.log('Auth error:', err);
        alert(err.message || 'Auth error');
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
