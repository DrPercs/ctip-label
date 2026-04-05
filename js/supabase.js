const SUPABASE_URL = 'https://mgalvfcnytusbklahkjy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_GRAiUwNcIIDaBwl8Ux1TuA_1JhaIv6h';

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

window.createRequest = createRequest;
window.fetchRequests = fetchRequests;
window.submitBeat = submitBeat;
window.showPage = showPage;
window.toggleLike = toggleLike;
window.fetchPosts = fetchPosts;
window.handleAuth = handleAuth;
window.logout = logout;
