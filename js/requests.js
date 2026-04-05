let currentRequestId = null;

// загрузка всех рефов
async function fetchRequests() {
    const container = document.getElementById('requests-container');

    const { data } = await _supabase
        .from('requests')
        .select('*')
        .order('created_at', { ascending: false });

    container.innerHTML = data.map(req => `
        <div class="track-card" onclick="openRequest('${req.id}')">
            <strong>${req.title}</strong>
            <p>${req.style || ''} ${req.bpm ? '| ' + req.bpm + ' BPM' : ''}</p>
            <p>${req.description || ''}</p>
            <small>by ${req.profiles?.username || 'user'}</small>
        </div>
    `).join('');
}

// создание рефа
async function createRequest() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return alert("Войди!");

    await _supabase.from('requests').insert([{
        user_id: user.id,
        title: document.getElementById('req-title').value,
        bpm: document.getElementById('req-bpm').value,
        style: document.getElementById('req-style').value,
        description: document.getElementById('req-desc').value
    }]);

    fetchRequests();
}

// открыть страницу рефа
async function openRequest(id) {
    currentRequestId = id;
    showPage('request-view');

    const { data: req } = await _supabase
        .from('requests')
        .select('*')
        .eq('id', id)
        .single();

    document.getElementById('request-title').innerText = req.title;
    document.getElementById('request-meta').innerText =
        `${req.style || ''} ${req.bpm ? '| ' + req.bpm + ' BPM' : ''}`;
    document.getElementById('request-desc').innerText = req.description || '';

    fetchSubmissions(id);
}

// загрузка всех битов под реф
async function fetchSubmissions(requestId) {
    const container = document.getElementById('submissions-container');

    const { data } = await _supabase
        .from('request_submissions')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: false });

    container.innerHTML = data.map(sub => `
        <div class="track-card">
            <strong>${sub.profiles?.username || 'user'}</strong>
            <audio controls src="${sub.track_url}"></audio>
        </div>
    `).join('');
}

// отправка бита
async function submitToCurrentRequest() {
    const file = document.getElementById('submission-file').files[0];
    if (!file) return alert("Выбери файл");

    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return alert("Войди!");

    const fileName = `sub_${Date.now()}_${file.name}`;
    await _supabase.storage.from('tracks').upload(fileName, file);

    const { data } = _supabase.storage.from('tracks').getPublicUrl(fileName);

    await _supabase.from('request_submissions').insert([{
        request_id: currentRequestId,
        user_id: user.id,
        track_url: data.publicUrl
    }]);

    fetchSubmissions(currentRequestId);
}

window.createRequest = createRequest;
window.fetchRequests = fetchRequests;
window.openRequest = openRequest;
window.submitToCurrentRequest = submitToCurrentRequest;
