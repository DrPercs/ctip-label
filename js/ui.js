window.currentMode = 'login';
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    const page = document.getElementById(pageId);
    if (page) page.classList.add('active');

    // безопасные вызовы (чтобы не падало)
    if (pageId === 'feed' && window.fetchPosts) fetchPosts();
    if (pageId === 'requests' && window.fetchRequests) fetchRequests();
    if (pageId === 'event') loadHallOfFame();
}

function openModal(mode) {
    const modal = document.getElementById('authModal');
    if (!modal) return;

    window.currentMode = mode;

    const username = document.getElementById('auth-username');
    const title = document.getElementById('modalTitle');

    if (mode === 'reg') {
        if (username) username.style.display = 'block';
        if (title) title.innerText = 'Регистрация';
    } else {
        if (username) username.style.display = 'none';
        if (title) title.innerText = 'Вход';
    }

    modal.style.display = 'block';
}

function closeModal(id = 'authModal') {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = 'none';
}

async function fetchContest() {
    const podiumContainer = document.getElementById('podium-container');
    const grid = document.getElementById('contest-grid');
    
    if (!podiumContainer || !grid) return;

    // 1. Тянем ВСЕХ участников, сортируем по голосам
    const { data: entries, error } = await _supabase
        .from('contest_entries')
        .select('*, profiles(username)')
        .order('votes_count', { ascending: false });

    if (error || !entries) return console.error(error);

    // 2. Рисуем ПОДИУМ (Топ-3)
    const top3 = entries.slice(0, 3);
    // Для верстки подиума: [2 место, 1 место, 3 место]
    const podiumOrder = [];
    if (top3[1]) podiumOrder.push(top3[1]);
    if (top3[0]) podiumOrder.push(top3[0]);
    if (top3[2]) podiumOrder.push(top3[2]);

    podiumContainer.innerHTML = podiumOrder.map(entry => {
        const isFirst = entry.id === top3[0].id;
        const height = isFirst ? '220px' : (top3[1] && entry.id === top3[1].id ? '160px' : '120px');
        const color = isFirst ? 'var(--accent)' : '#444';
        
        return `
            <div class="podium-item" style="height: ${height}; width: 110px; background: var(--card); border: 1px solid ${color}; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; padding-bottom: 20px; position: relative; border-radius: 5px 5px 0 0;">
                <div style="position: absolute; top: -50px; text-align: center; width: 130px;">
                    <div style="font-size: 0.7rem; font-weight: 900; color: #fff;">${(entry.profiles?.username || 'ANON').toUpperCase()}</div>
                    <div style="font-size: 0.5rem; color: var(--gray);">${entry.track_title || 'DEMO'}</div>
                </div>
                <div style="font-size: 1.2rem; font-weight: 900; color: ${color};">${isFirst ? '1ST' : (entry.id === top3[1]?.id ? '2ND' : '3RD')}</div>
            </div>
        `;
    }).join('');

    // 3. Рисуем ОСТАЛЬНЫХ участников (те, кто ниже 3 места) в сетку
    const others = entries.slice(3);
    grid.innerHTML = others.map(entry => `
        <div class="track-card">
            <div style="font-size: 0.6rem; color: var(--accent); font-weight: 900;">${entry.profiles?.username || 'ANON'}</div>
            <div style="font-weight: 900;">${entry.track_title}</div>
            <audio src="${entry.track_url}" controls style="width: 100%; height: 30px; margin-top: 10px;"></audio>
            <div style="margin-top: 10px; font-size: 0.7rem; color: var(--gray);">VOTES: ${entry.votes_count}</div>
        </div>
    `).join('');
}

// Не забудь сделать её глобальной
window.fetchContest = fetchContest;

async function loadHallOfFame() {
    const podium = document.getElementById('podium-container');
    if (!podium) return;

    podium.innerHTML = '<p style="color: var(--gray); font-size: 0.7rem;">LOADING CHAMPIONS...</p>';

    try {
        // Запрос к твоей таблице contest_entries
        const { data: entries, error } = await _supabase
            .from('contest_entries')
            .select('*, profiles(username)')
            .order('votes_count', { ascending: false }) 
            .limit(3);

        if (error) throw error;

        if (!entries || entries.length === 0) {
            podium.innerHTML = "<p style='color: #444; font-size: 0.7rem;'>HISTORY IS BEING WRITTEN...</p>";
            return;
        }

        // Формируем порядок для подиума: [2 место, 1 место, 3 место]
        const podiumOrder = [];
        if (entries[1]) podiumOrder.push(entries[1]); 
        if (entries[0]) podiumOrder.push(entries[0]); 
        if (entries[2]) podiumOrder.push(entries[2]); 

        podium.innerHTML = podiumOrder.map((entry, idx) => {
            const isFirst = entry.id === entries[0].id;
            // Определяем высоту столбика
            const height = isFirst ? '200px' : (entries.length > 1 && entry.id === entries[1].id ? '150px' : '110px');
            const color = isFirst ? 'var(--accent)' : '#444';
            
            return `
                <div class="podium-item" style="height: ${height}; width: 100px; background: var(--card); border: 1px solid ${color}; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; padding-bottom: 15px; position: relative;">
                    <div style="position: absolute; top: -45px; width: 120px; text-align: center;">
                        <div style="font-size: 0.6rem; font-weight: 900; color: #fff; text-transform: uppercase;">${(entry.profiles?.username || 'ANON')}</div>
                        <div style="font-size: 0.5rem; color: var(--gray); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${entry.track_title || 'Untitled'}</div>
                    </div>
                    <div style="font-size: 1rem; font-weight: 900; color: ${color};">${isFirst ? '1ST' : (entry.id === entries[1]?.id ? '2ND' : '3RD')}</div>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error("Hall of Fame Error:", err);
        podium.innerHTML = "<p style='color: red;'>DATABASE ERROR</p>";
    }
}

// экспорт
window.showPage = showPage;
window.fetchContest = fetchContest;
window.loadHallOfFame = loadHallOfFame;
window.openModal = openModal;
window.closeModal = closeModal;
