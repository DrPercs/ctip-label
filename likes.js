async function toggleLike(postId) {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return alert("Войди!");

    const { data: existing } = await _supabase
        .from('liked_bits')
        .select('*')
        .eq('user_id', user.id)
        .eq('post_id', postId)
        .single();

    if (existing) {
        await _supabase.from('liked_bits').delete().eq('id', existing.id);
    } else {
        await _supabase.from('liked_bits').insert([{
            user_id: user.id,
            post_id: postId
        }]);
    }

    fetchPosts();
}
