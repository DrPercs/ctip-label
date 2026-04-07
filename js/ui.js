window.currentMode = 'login';

// 1. ПЕРЕКЛЮЧЕНИЕ СТРАНИЦ
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    const page = document.getElementById(pageId);
    if (page) page.classList.add('active');

    // Логика загрузки данных
    if (pageId === 'feed' && window.fetchPosts) fetchPosts();
    if (pageId === 'requests' && window.fetchRequests) fetchRequests();
    
    // Если заходим на ивент — запускаем нашу безопасную функцию
    if (pageId === 'event') fetchContestSafe();
}

// 2. БЕЗОПАСНАЯ ЗАГРУЗКА КОНКУРСА (БЕЗ ОШИБКИ 400)
async function fetchContestSafe() {
    const podiumContainer = document.getElementById('podium-container');
    const grid = document.getElementById('contest-grid');
    
    if (!podiumContainer || !grid) return;

    podiumContainer.innerHTML = '<p style="color:var(--gray); font-size:0.6rem; letter-spacing:2px;">SYNCING SYSTEM...</p>';

    try {
        // 1. Берем записи конкурса (id здесь выступает как идентификатор автора)
        const { data: entries, error } = await _supabase
            .from('contest_entries')
            .select('*')
            .order('votes_count', { ascending: false });

        if (error) throw error;
        if (!entries || entries.length === 0) {
            podiumContainer.innerHTML = "<p style='color:#444;'>EMPTY RECORDS</p>";
            return;
        }

        // 2. Собираем ID авторов (из колонки id таблицы contest_entries)
        const authorIds = [...new Set(entries.map(e => e.id).filter(val => val))];
        
        const userMap = {};
        
        // 3. Запрашиваем ники из таблицы profiles
        if (authorIds.length > 0) {
            const { data: profiles, error: profError } = await _supabase
                .from('profiles')
                .select('id, username')
                .in('id', authorIds);

            if (!profError) {
                profiles?.forEach(p => {
                    userMap[p.id] = p.username;
                });
            }
        }

        // 4. Рендерим ПОДИУМ (Топ-3)
        const top3 = entries.slice(0, 3);
        const podiumOrder = [];
        if (top3[1]) podiumOrder.push(top3[1]); // 2nd
        if (top3[0]) podiumOrder.push(top3[0]); // 1st
        if (top3[2]) podiumOrder.push(top3[2]); // 3rd

        podiumContainer.innerHTML = podiumOrder.map(entry => {
            const isFirst = entry.id === top3[0].id;
            const isSecond = top3[1] && entry.id === top3[1].id;
            const height = isFirst ? '220px' : (isSecond ? '160px' : '120px');
            const color = isFirst ? 'var(--accent)' : '#444';
            
            // Берем имя из карты по id
            const name = userMap[entry.id] || "ANON";
            
            return `
                <div class="podium-item" style="height: ${height}; width: 110px; background: var(--card); border: 1px solid ${color}; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; padding-bottom: 20px; position: relative; border-radius: 5px 5px 0 0;">
                    <div style="position: absolute; top: -50px; text-align: center; width: 130px;">
                        <div style="font-size: 0.7rem; font-weight: 900; color: #fff; letter-spacing:1px;">${name.toUpperCase()}</div>
                        <div style="font-size: 0.5rem; color: var(--gray); text-transform: uppercase;">${entry.track_title || 'COMPETITOR'}</div>
                    </div>
                    <div style="font-size: 1.2rem; font-weight: 900; color: ${color};">${isFirst ? '1ST' : (isSecond ? '2ND' : '3RD')}</div>
                </div>
            `;
        }).join('');

        // 5. Рендерим ОСТАЛЬНУЮ СЕТКУ
        const others = entries.slice(3);
        grid.innerHTML = others.map(entry => `
            <div class="track-card">
                <div style="font-size: 0.6rem; color: var(--accent); font-weight: 900;">${userMap[entry.id] || 'PARTICIPANT'}</div>
                <div style="font-weight: 900; text-transform: uppercase; margin: 5px 0;">${entry.track_title || 'UNTITLED'}</div>
                <audio src="${entry.track_url}" controls style="width: 100%; height: 30px; filter: invert(1); opacity: 0.8;"></audio>
                <div style="margin-top: 10px; font-size: 0.6rem; color: var(--gray); letter-spacing: 2px;">VOTES: ${entry.votes_count || 0}</div>
            </div>
        `).join('');

    } catch (err) {
        console.error("UI Render Error:", err);
        podiumContainer.innerHTML = "<p style='color:var(--accent); font-size:0.6rem;'>DATA_ACCESS_DENIED</p>";
    }
}
// 3. МОДАЛКИ
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
    if (el) el.style.display = 'none';
}

// Глобальный доступ
window.showPage = showPage;
window.fetchContestSafe = fetchContestSafe;
window.openModal = openModal;
window.closeModal = closeModal;
