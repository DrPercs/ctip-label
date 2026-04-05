async function checkUser() {
    const { data: { user } } = await _supabase.auth.getUser();
    const authContainer = document.getElementById('auth-buttons');

    if (!user) {
        authContainer.innerHTML = `
            <button class="btn btn-outline" onclick="openModal('login')">Вход</button>
            <button class="btn btn-fill" onclick="openModal('reg')">Join</button>
        `;
        return;
    }

    const { data: profile } = await _supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    authContainer.innerHTML = `
        <span>${profile.username}</span>
        <button onclick="logout()">EXIT</button>
    `;
}

async function logout() {
    await _supabase.auth.signOut();
    location.reload();
}

async function handleAuth() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const username = document.getElementById('auth-username').value;

    if (currentMode === 'reg') {
        await _supabase.auth.signUp({
            email,
            password,
            options: { data: { username } }
        });
        alert('Проверь почту');
    } else {
        await _supabase.auth.signInWithPassword({ email, password });
        location.reload();
    }
}
