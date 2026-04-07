async function loadHallOfFame() {
    const podium = document.getElementById('podium-container');
    if (!podium) return;

    // Тянем данные из contest_entries, джоиним профили авторов
    const { data: entries, error } = await _supabase
        .from('contest_entries')
        .select('*, profiles(username)')
        .order('votes_count', { ascending: false }) // Либо по лайкам
        .limit(3);

    if (error || !entries || entries.length < 1) {
        podium.innerHTML = "<p style='color: #444;'>HISTORY IS BEING WRITTEN...</p>";
        return;
    }

    // Визуальный порядок: [2 место, 1 место, 3 место]
    const podiumOrder = [];
    if (entries[1]) podiumOrder.push(entries[1]); // 2-е
    if (entries[0]) podiumOrder.push(entries[0]); // 1-е
    if (entries[2]) podiumOrder.push(entries[2]); // 3-е

    podium.innerHTML = podiumOrder.map((entry, idx) => {
        // Если это единственный победитель, он будет в центре
        const isFirst = entry.id === entries[0].id;
        const height = isFirst ? '220px' : (idx === 0 ? '160px' : '130px');
        const color = isFirst ? 'var(--accent)' : '#555';
        
        return `
            <div class="podium-item" style="height: ${height}; width: 120px; background: var(--card); border: 1px solid ${color}; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; padding-bottom: 20px; position: relative; transition: 1s ease;">
                <div style="position: absolute; top: -40px; width: 150px; text-align: center;">
                    <div style="font-size: 0.7rem; font-weight: 900; color: #fff;">${(entry.profiles?.username || 'ANON').toUpperCase()}</div>
                    <div style="font-size: 0.5rem; color: var(--gray);">${entry.track_title || 'Untitled'}</div>
                </div>
                <div style="font-size: 1.2rem; font-weight: 900; color: ${color};">${isFirst ? '1ST' : (idx === 0 ? '2ND' : '3RD')}</div>
            </div>
        `;
    }).join('');
}
