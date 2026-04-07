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

    podiumContainer.innerHTML = '<p style="color:var(--gray); font-size:0.6rem; letter-spacing:2px;">LOADING EVENT...</p>';

    try {
        // 1. Берем данные из таблицы (как на твоем скриншоте)
        const { data: entries, error } = await _supabase
            .from('contest_entries')
            .select('*')
            .order('votes_count', { ascending: false });

        if (error) throw error;
        if (!entries || entries.length === 0) {
            podiumContainer.innerHTML = "<p style='color:#444;'>HISTORY IS EMPTY</p>";
            return;
        }

        // 2. Рендерим ПОДИУМ (Топ-3)
        const top3 = entries.slice(0, 3);
        const podiumOrder = [];
        if (top3[1]) podiumOrder.push(top3[1]); // 2-е место (слева)
        if (top3[0]) podiumOrder.push(top3[0]); // 1-е место (центр)
        if (top3[2]) podiumOrder.push(top3[2]); // 3-е место (справа)

        podiumContainer.innerHTML = podiumOrder.map(entry => {
            const isFirst = entry.id === top3[0].id;
            const isSecond = top3[1] && entry.id === top3[1].id;
            
            // Высота и цвет под места
            const height = isFirst ? '220px' : (isSecond ? '160px' : '120px');
            const color = isFirst ? 'var(--accent)' : '#444';
            
            // Берем имя напрямую из колонки author_name
            const name = entry.author_name || "ANON";
            const track = entry.track_title || "COMPETITOR";

            return `
                <div class="podium-item" style="height: ${height}; width: 110px; background: var(--card); border: 1px solid ${color}; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; padding-bottom: 20px; position: relative; border-radius: 5px 5px 0 0;">
                    <div style="position: absolute; top: -50px; text-align: center; width: 130px;">
                        <div style="font-size: 0.7rem; font-weight: 900; color: #fff; letter-spacing:1px;">${name.toUpperCase()}</div>
                        <div style="font-size: 0.5rem; color: var(--gray); text-transform: uppercase;">${track}</div>
                    </div>
                    <div style="font-size: 1.2rem; font-weight: 900; color: ${color};">${isFirst ? '1ST' : (isSecond ? '2ND' : '3RD')}</div>
                </div>
            `;
        }).join('');

        // 3. Рендерим ОСТАЛЬНУЮ СЕТКУ (все кто ниже 3-го места)
        const others = entries.slice(3);
        grid.innerHTML = others.map(entry => `
            <div class="track-card">
                <div style="font-size: 0.6rem; color: var(--accent); font-weight: 900;">${(entry.author_name || 'PARTICIPANT').toUpperCase()}</div>
                <div style="font-weight: 900; text-transform: uppercase; margin: 5px 0;">${entry.track_title || 'UNTITLED'}</div>
                <audio src="${entry.track_url}" controls style="width: 100%; height: 30px; filter: invert(1); opacity: 0.8;"></audio>
                <div style="margin-top: 10px; font-size: 0.6rem; color: var(--gray); letter-spacing: 2px;">VOTES: ${entry.votes_count || 0}</div>
            </div>
        `).join('');

    } catch (err) {
        console.error("UI Render Error:", err);
        podiumContainer.innerHTML = "<p style='color:var(--accent); font-size:0.6rem;'>CRITICAL_DB_ERROR</p>";
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
