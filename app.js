const SUPABASE_URL = 'https://mgalvfcnytusbklahkjy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_GRAiUwNcIIDaBwl8Ux1TuA_1JhaIv6h'; 
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentMode = 'login';

// --- ÀÂÒÎÐÈÇÀÖÈß ---
async function handleAuth() {
    const email = document.querySelector('#auth-email').value;
    const password = document.querySelector('#auth-password').value;
    if (currentMode === 'reg') {
        const { error } = await _supabase.auth.signUp({ email, password });
        if (error) alert(error.message);
        else alert('Ïðîâåðü ïî÷òó!');
    } else {
        const { error } = await _supabase.auth.signInWithPassword({ email, password });
        if (error) alert(error.message);
        else { closeModal(); checkUser(); }
    }
}

async function checkUser() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (user) {
        document.getElementById('auth-buttons').innerHTML = `
            <span style="font-size: 0.7rem; color: #555; margin-right: 15px;">${user.email}</span>
            <button class="btn btn-outline" onclick="_supabase.auth.signOut().then(()=>location.reload())">Âûõîä</button>
        `;
        document.getElementById('admin-editor').style.display = 'block';
    }
}

// --- ÐÀÁÎÒÀ Ñ ÏÎÑÒÀÌÈ ---
async function fetchPosts() {
    const { data: { user } } = await _supabase.auth.getUser();
    const { data, error } = await _supabase.from('posts').select('*').order('created_at', { ascending: false });
    const container = document.getElementById('posts-container');
    
    if (error) return;

    container.innerHTML = data.map(post => {
        // Æåñòêàÿ ïðîâåðêà
        const userId = user ? String(user.id).toLowerCase() : null;
        const postOwnerId = post.user_id ? String(post.user_id).toLowerCase() : null;
        const isOwner = userId && postOwnerId && (userId === postOwnerId);

        return `
            <div class="track-card" id="post-${post.id}">
                <div class="track-img">
                    <span style="color:var(--accent)">CTIP_SYSTEM</span>
                    <small style="opacity:0.2; font-size:10px; margin-top:5px;">REF_${post.id.substring(0,8)}</small>
                </div>
                <strong>${post.title}</strong>
                <p style="color: var(--gray); font-size: 0.8rem; margin: 5px 0;">${post.genre || 'Experimental'}</p>
                
                ${post.track_url ? `<audio controls src="${post.track_url}"></audio>` : ''}
                
                <p style="font-size: 0.8rem; color: #555;">${post.content || ''}</p>

                <div style="margin-top: 10px; border-top: 1px solid #222; pt: 10px;">
                    ${isOwner ? `
                        <button onclick="deletePost('${post.id}')" 
                                style="background:var(--accent); border:none; color:#fff; 
                                font-size:0.7rem; cursor:pointer; padding:8px 12px; font-weight:bold;">
                            DELETE RELEASE
                        </button>
                    ` : `
                        <small style="color:#333; font-size:0.6rem;">READ_ONLY_ACCESS</small>
                    `}
                </div>
            </div>
        `;
    }).join('');
}

async function createPost() {
    const btn = document.getElementById('upload-btn');
    const file = document.getElementById('post-audio').files[0];
    const title = document.getElementById('post-title').value;
    const genre = document.getElementById('post-genre').value;
    const content = document.getElementById('post-desc').value;

    if (!file || !title) return alert("Çàïîëíè äàííûå!");

    btn.disabled = true;
    btn.innerText = "UPLOADING...";

    const fileName = `${Date.now()}_${file.name}`;
    const { data: sData, error: sErr } = await _supabase.storage.from('tracks').upload(fileName, file);
    if (sErr) { alert(sErr.message); btn.disabled = false; return; }

    const { data: { publicUrl } } = _supabase.storage.from('tracks').getPublicUrl(fileName);
    const { data: { user } } = await _supabase.auth.getUser();
    
    await _supabase.from('posts').insert([{ 
        title, genre, content, user_id: user.id, track_url: publicUrl 
    }]);

    location.reload();
}

async function deletePost(postId) {
    if (!confirm('Óäàëèòü ðåëèç?')) return;
    const { error } = await _supabase.from('posts').delete().eq('id', postId);
    if (!error) document.getElementById(`post-${postId}`).remove();
}

// --- ÍÀÂÈÃÀÖÈß ---
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-center a').forEach(l => l.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    const link = document.getElementById('link-' + pageId);
    if(link) link.classList.add('active');
    if(pageId === 'feed') fetchPosts();
}

function openModal(type) {
    currentMode = type;
    document.getElementById('authModal').style.display = 'flex';
    document.getElementById('modalTitle').innerText = type === 'login' ? 'ÂÕÎÄ' : 'ÐÅÃÈÑÒÐÀÖÈß';
    document.getElementById('auth-submit-btn').onclick = handleAuth;
}

function closeModal() { document.getElementById('authModal').style.display = 'none'; }

window.onload = () => { checkUser(); fetchPosts(); };