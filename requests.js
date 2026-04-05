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

async function fetchRequests() {
    const container = document.getElementById('requests-container');

    const { data } = await _supabase
        .from('requests')
        .select(`*, profiles:user_id (username)`)
        .order('created_at', { ascending: false });

    container.innerHTML = data.map(req => `
        <div class="track-card">
            <strong>${req.title}</strong>
            <p>${req.style} | ${req.bpm} BPM</p>
            <p>${req.description}</p>

            <small>by ${req.profiles?.username}</small>

            <input type="file" onchange="submitBeat(event, '${req.id}')">
        </div>
    `).join('');
}

async function submitBeat(e, requestId) {
    const file = e.target.files[0];

    const { data: { user } } = await _supabase.auth.getUser();

    const fileName = `req_${Date.now()}_${file.name}`;
    await _supabase.storage.from('tracks').upload(fileName, file);

    const { data } = _supabase.storage.from('tracks').getPublicUrl(fileName);

    await _supabase.from('request_submissions').insert([{
        request_id: requestId,
        user_id: user.id,
        track_url: data.publicUrl
    }]);

    alert("Отправлено 🔥");
}
