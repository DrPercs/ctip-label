let currentRequestId = null;

// -------------------
// FETCH REQUESTS
// -------------------
async function fetchRequests() {
    const container = document.getElementById('requests-container');
    if (!container) return;

    const { data, error } = await _supabase
        .from('requests')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.log('fetchRequests error:', error);
        return;
    }

    const safe = data || [];

    container.innerHTML = safe.map(req => `
        <div class="track-card" onclick="openRequest('${req.id}')">
            <strong>${req.title}</strong>
            <p>${req.style || ''} ${req.bpm ? '| ' + req.bpm + ' BPM' : ''}</p>
            <p>${req.description || ''}</p>
        </div>
    `).join('');
}

// -------------------
// CREATE REQUEST
// -------------------
async function createRequest() {
    const { data: { user } } = await _supabase.auth.getSession();
    const u = user?.user;

    if (!u) {
        alert("Войди!");
        return;
    }

    const { error } = await _supabase.from('requests').insert([{
        user_id: u.id,
        title: document.getElementById('req-title').value,
        bpm: document.getElementById('req-bpm').value,
        style: document.getElementById('req-style').value,
        description: document.getElementById('req-desc').value
    }]);

    if (error) {
        console.log('createRequest error:', error);
        return;
    }

    fetchRequests();
}

// -------------------
// OPEN REQUEST
// -------------------
async function openRequest(id) {
    currentRequestId = id;
    showPage('request-view');

    const { data, error } = await _supabase
        .from('requests')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.log('openRequest error:', error);
        return;
    }

    document.getElementById('request-title').innerText = data.title;
    document.getElementById('request-meta').innerText =
        `${data.style || ''} ${data.bpm ? '| ' + data.bpm + ' BPM' : ''}`;
    document.getElementById('request-desc').innerText = data.description || '';

    fetchSubmissions(id);
}

// -------------------
// FETCH SUBMISSIONS
// -------------------
async function fetchSubmissions(requestId) {
    const container = document.getElementById('submissions-container');
    if (!container) return;

    const { data, error } = await _supabase
        .from('request_submissions')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: false });

    if (error) {
        console.log('fetchSubmissions error:', error);
        return;
    }

    const safe = data || [];

    container.innerHTML = safe.map(sub => `
        <div class="track-card">
            <audio controls src="${sub.track_url}"></audio>
        </div>
    `).join('');
}

// -------------------
// SUBMIT TRACK
// -------------------
async function submitToCurrentRequest() {
    const file = document.getElementById('submission-file').files[0];
    if (!file) return alert("Выбери файл");

    const { data: { session } } = await _supabase.auth.getSession();
    const user = session?.user;

    if (!user) return alert("Войди!");

    const fileName = `sub_${Date.now()}_${file.name}`;

    const { error: uploadError } = await _supabase
        .storage
        .from('tracks')
        .upload(fileName, file);

    if (uploadError) {
        console.log(uploadError);
        return;
    }

    const { data } = _supabase.storage
        .from('tracks')
        .getPublicUrl(fileName);

    await _supabase.from('request_submissions').insert([{
        request_id: currentRequestId,
        user_id: user.id,
        track_url: data.publicUrl
    }]);

    fetchSubmissions(currentRequestId);
}

// -------------------
// EXPORTS
// -------------------
window.createRequest = createRequest;
window.fetchRequests = fetchRequests;
window.openRequest = openRequest;
window.submitToCurrentRequest = submitToCurrentRequest;
