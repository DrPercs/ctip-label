let currentRequestId = null;

// 1. ЗАГРУЗКА ВСЕХ РЕФОВ
async function fetchRequests() {
    const container = document.getElementById('requests-container');
    if (!container) return;

    const { data: requests, error } = await _supabase
        .from('requests')
        .select('*, profiles(username)')
        .order('created_at', { ascending: false });

    if (error) return console.error(error);

    container.innerHTML = requests.map(req => {
        const isMyRef = req.user_id === window.currentUserId;
        const canDrop = (window.userRole === 'beatmaker' || window.userRole === 'admin');
        
        // Артист не видит кнопку на своем рефе, чтобы не спамить самому себе
        const showDropBtn = canDrop && !isMyRef;

        return `
            <div class="track-card" style="border-left: 3px solid var(--accent);">
                <div style="display:flex; justify-content:space-between;">
                    <small style="color:var(--accent)">REQ BY: ${req.profiles?.username || 'ANON'}</small>
                    <small>${req.bpm || '?'} BPM | ${req.style || 'ANY'}</small>
                </div>
                <h3 style="margin:10px 0;">${req.title}</h3>
                <p style="font-size:0.8rem; color:var(--gray);">${req.description || ''}</p>
                
                <div style="margin-top:15px; display:flex; gap:10px;">
                    <button class="btn btn-outline" style="font-size:0.6rem;" onclick="openRequestDetails('${req.id}')">СЛУШАТЬ ОТКЛИКИ</button>
                    ${showDropBtn ? `<button class="btn btn-fill" style="font-size:0.6rem;" onclick="prepareUpload('${req.id}')">DROP BEAT</button>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// 2. ОТКРЫТИЕ ДЕТАЛЕЙ (Показать биты на конкретный реф)
async function openRequestDetails(reqId) {
    currentRequestId = reqId;
    showPage('request-detail'); // Создадим эту страницу в HTML
    
    const container = document.getElementById('submissions-list');
    container.innerHTML = '<p>LOADING BEATS...</p>';

    const { data: subs, error } = await _supabase
        .from('request_submissions')
        .select('*, profiles(username)')
        .eq('request_id', reqId);

    if (error) return;

    container.innerHTML = subs.map(sub => `
        <div class="track-card">
            <small>BEAT BY: ${sub.profiles?.username || 'ANON'}</small>
            <audio src="${sub.track_url}" controls style="width:100%; filter:invert(1); margin-top:10px;"></audio>
        </div>
    `).join('') || '<p>Пока никто не откликнулся</p>';
}

// 3. ЗАГРУЗКА БИТА (От Битмейкера)
async function submitBeat() {
    const file = document.getElementById('sub-file').files[0];
    if (!file || !currentRequestId) return alert("Выбери файл!");

    const btn = document.getElementById('sub-btn');
    btn.innerText = "UPLOADING...";
    btn.disabled = true;

    try {
        const fileName = `sub_${Date.now()}_${file.name}`;
        const { error: upErr } = await _supabase.storage.from('tracks').upload(fileName, file);
        if (upErr) throw upErr;

        const { data: urlData } = _supabase.storage.from('tracks').getPublicUrl(fileName);

        // 1. В отклики
        await _supabase.from('request_submissions').insert([{
            request_id: currentRequestId,
            user_id: window.currentUserId,
            track_url: urlData.publicUrl
        }]);

        // 2. В общую ленту POSTS (как ты и хотел)
        await _supabase.from('posts').insert([{
            user_id: window.currentUserId,
            title: "Response to Ref #" + currentRequestId.substring(0,5),
            track_url: urlData.publicUrl,
            genre: 'REF_RESPONSE'
        }]);

        alert("Бит успешно отправлен!");
        openRequestDetails(currentRequestId);
    } catch (e) {
        alert(e.message);
    } finally {
        btn.innerText = "ОТПРАВИТЬ";
        btn.disabled = false;
    }
}

window.createRequest = createRequest;
window.fetchRequests = fetchRequests;
window.openRequestDetails = openRequestDetails;
window.submitBeat = submitBeat;
window.prepareUpload = (id) => { currentRequestId = id; openModal('upload-sub'); };
