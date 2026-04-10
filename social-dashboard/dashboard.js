// BABILONIA Social Dashboard - Gestione post
// Legge post da file JSON locale (posts.json)

const posts = [];
let editingPost = null;

// Carica post dal file JSON locale
async function loadPosts() {
    try {
        const response = await fetch('./posts.json');
        const data = await response.json();
        posts.length = 0;
        posts.push(...(data.posts || []));
        renderPosts();
        updateStats();
    } catch (err) {
        console.error('Errore caricamento:', err);
        showErrorState();
    }
}

// Renderizza post
function renderPosts() {
    const container = document.getElementById('posts-container');
    
    if (posts.length === 0) {
        showEmptyState();
        return;
    }
    
    // Prendi solo i primi 3
    const topPosts = posts.slice(0, 3);
    container.innerHTML = topPosts.map(post => createPostHTML(post)).join('');
}

// Crea HTML per un post
function createPostHTML(post) {
    const isEditing = editingPost === post.id;
    
    if (isEditing) {
        return `
            <div class="post-card" data-id="${post.id}">
                <div class="post-header">
                    <span class="post-id">#${post.id}</span>
                    <span class="post-score">⭐ ${post.relevance_score}/10</span>
                </div>
                <div class="edit-mode">
                    <textarea id="edit-text-${post.id}">${post.body}</textarea>
                    <div class="edit-actions">
                        <button class="btn btn-approve" onclick="saveEdit(${post.id})">💾 Salva</button>
                        <button class="btn btn-reject" onclick="cancelEdit()">❌ Annulla</button>
                    </div>
                </div>
            </div>
        `;
    }
    
    const keywords = post.keywords_matched ? post.keywords_matched.join(', ') : 'N/A';
    
    return `
        <div class="post-card" data-id="${post.id}">
            <div class="post-header">
                <span class="post-id">#${post.id}</span>
                <span class="post-score">⭐ ${post.relevance_score}/10</span>
            </div>
            <div class="post-meta">
                <span>📰 <span class="post-source">${post.source}</span></span>
                <span>📅 ${post.pub_date || 'Oggi'} ${post.pub_time ? 'alle ' + post.pub_time : ''}</span>
                <span class="post-template">${post.template_used}</span>
            </div>
            <div class="post-content">${escapeHtml(post.body)}</div>
            <div class="post-hashtags">${post.hashtags || ''}</div>
            <div class="post-actions">
                <button class="btn btn-approve" onclick="approvePost(${post.id})">✅ Approva</button>
                <button class="btn btn-edit" onclick="editPost(${post.id})">✏️ Modifica</button>
                <button class="btn btn-preview" onclick="previewPost(${post.id})">👁️ Anteprima</button>
                <button class="btn btn-reject" onclick="rejectPost(${post.id})">❌ Rifiuta</button>
            </div>
        </div>
    `;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showEmptyState() {
    document.getElementById('posts-container').innerHTML = `
        <div class="empty-state">
            <h2>🎉 Nessun post in attesa!</h2>
            <p>I post verranno generati automaticamente dal News Scout.</p>
            <p style="margin-top: 20px; color: #d4af37;">Prossima generazione: domattina alle 7:30</p>
        </div>
    `;
}

function showWaitingState() {
    document.getElementById('posts-container').innerHTML = `
        <div class="empty-state">
            <h2>�️ In attesa di dati...</h2>
            <p>La tabella Supabase è in fase di configurazione.</p>
            <p style="margin-top: 20px; color: #888;">Esegui l'SQL sul database per attivare il sistema.</p>
        </div>
    `;
}

function updateStats() {
    // In futuro: fetch conteggi reali da Supabase
    document.getElementById('pending-count').textContent = posts.filter(p => p.status === 'pending_approval').length;
    document.getElementById('approved-count').textContent = posts.filter(p => p.status === 'approved').length;
    document.getElementById('published-count').textContent = posts.filter(p => p.status === 'published').length;
}

// Azioni
function approvePost(id) {
    const post = posts.find(p => p.id === id);
    if (post) {
        post.status = 'approved';
        post.approved_at = new Date().toISOString();
        alert(`✅ Post approvato!\n\n"${post.title.substring(0, 50)}..."\n\nPronto per pubblicazione Facebook.`);
        renderPosts();
        updateStats();
        
        // Salva stato approvato (in produzione: invia a Meta API)
        savePosts();
    }
}

function editPost(id) {
    editingPost = id;
    renderPosts();
}

function saveEdit(id) {
    const post = posts.find(p => p.id === id);
    const newText = document.getElementById(`edit-text-${id}`).value;
    if (post && newText) {
        post.body = newText;
        post.edited = true;
        editingPost = null;
        renderPosts();
        savePosts();
    }
}

function cancelEdit() {
    editingPost = null;
    renderPosts();
}

function rejectPost(id) {
    const post = posts.find(p => p.id === id);
    if (confirm(`Rifiutare questo post?\n\n"${post.title}"`)) {
        posts.splice(posts.indexOf(post), 1);
        renderPosts();
        updateStats();
        savePosts();
    }
}

function previewPost(id) {
    const post = posts.find(p => p.id === id);
    if (post) {
        document.getElementById('preview-text').innerHTML = post.body.replace(/\n/g, '<br>');
        document.getElementById('preview-modal').style.display = 'flex';
    }
}

function closePreview() {
    document.getElementById('preview-modal').style.display = 'none';
}

function savePosts() {
    // In produzione: salva su server/Supabase
    // Per ora: log in console
    console.log('Posts aggiornati:', posts.length);
}

// Eventi
document.addEventListener('click', (e) => {
    if (e.target.id === 'preview-modal') closePreview();
});

// Carica all'avvio
loadPosts();

// Aggiorna ogni 30 secondi
setInterval(loadPosts, 30000);
