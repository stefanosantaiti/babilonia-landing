// BABILONIA Social Dashboard - Gestione post
// Carica e gestisce post dalla coda

const API_URL = 'https://esgjushznmidzdhqsyyx.supabase.co';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzZ2p1c2h6bm1pZHpkaHFzeXl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NTYwMTcsImV4cCI6MjA5MTIzMjAxN30.cKWfWEkgRTtPKbUduGgNxX6gF18Gqkjg2bWn6twQTbs';

let posts = [];
let editingPost = null;

// Carica post dal file JSON locale (in attesa di integrazione Supabase)
async function loadPosts() {
    try {
        // Per ora carica da localStorage o file statico
        // In produzione: fetch da Supabase table 'social_posts'
        const response = await fetch('../skills/babilonia-social-publisher/data/queue-pro.json');
        const data = await response.json();
        posts = data.posts || [];
        renderPosts();
        updateStats();
    } catch (err) {
        console.error('Errore caricamento:', err);
        showEmptyState();
    }
}

// Renderizza post
function renderPosts() {
    const container = document.getElementById('posts-container');
    const pending = posts.filter(p => p.status === 'pending_approval');
    
    if (pending.length === 0) {
        showEmptyState();
        return;
    }
    
    container.innerHTML = pending.map(post => createPostHTML(post)).join('');
}

// Crea HTML per un post
function createPostHTML(post) {
    const isEditing = editingPost === post.id;
    
    if (isEditing) {
        return `
            <div class="post-card" data-id="${post.id}">
                <div class="post-header">
                    <span class="post-id">${post.id}</span>
                    <span class="post-score">Score: ${post.relevance_score}</span>
                </div>
                <div class="edit-mode">
                    <textarea id="edit-text-${post.id}">${post.body}</textarea>
                    <div class="edit-actions">
                        <button class="btn btn-approve" onclick="saveEdit('${post.id}')">💾 Salva Modifiche</button>
                        <button class="btn btn-reject" onclick="cancelEdit()">❌ Annulla</button>
                    </div>
                </div>
            </div>
        `;
    }
    
    return `
        <div class="post-card" data-id="${post.id}">
            <div class="post-header">
                <span class="post-id">${post.id}</span>
                <span class="post-score">⭐ ${post.relevance_score}/10</span>
            </div>
            <div class="post-meta">
                <span>📰 <span class="post-source">${post.source}</span></span>
                <span>📅 ${post.pub_date} ${post.pub_time ? 'alle ' + post.pub_time : ''}</span>
                <span class="post-template">${post.template_used}</span>
            </div>
            <div class="post-content">${escapeHtml(post.body)}</div>
            <div class="post-hashtags">${post.hashtags}</div>
            <div class="post-actions">
                <button class="btn btn-approve" onclick="approvePost('${post.id}')">✅ Approva</button>
                <button class="btn btn-edit" onclick="editPost('${post.id}')">✏️ Modifica</button>
                <button class="btn btn-preview" onclick="previewPost('${post.id}')">👁️ Anteprima</button>
                <button class="btn btn-reject" onclick="rejectPost('${post.id}')">❌ Rifiuta</button>
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
            <p>Tutti i post sono stati revisionati. Controlla più tardi per nuovi contenuti.</p>
        </div>
    `;
}

function updateStats() {
    const pending = posts.filter(p => p.status === 'pending_approval').length;
    const approved = posts.filter(p => p.status === 'approved').length;
    const published = posts.filter(p => p.status === 'published').length;
    
    document.getElementById('pending-count').textContent = pending;
    document.getElementById('approved-count').textContent = approved;
    document.getElementById('published-count').textContent = published;
}

// Azioni
function approvePost(id) {
    const post = posts.find(p => p.id === id);
    if (post) {
        post.status = 'approved';
        post.approved_at = new Date().toISOString();
        alert(`✅ Post approvato!\n\n"${post.title.substring(0, 50)}..."\n\nPronto per la pubblicazione su Facebook.`);
        renderPosts();
        updateStats();
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
    }
}

function cancelEdit() {
    editingPost = null;
    renderPosts();
}

function rejectPost(id) {
    const post = posts.find(p => p.id === id);
    if (confirm(`Rifiutare questo post?\n\n"${post.title}"`)) {
        posts = posts.filter(p => p.id !== id);
        renderPosts();
        updateStats();
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

// Chiudi modal cliccando fuori
document.addEventListener('click', (e) => {
    if (e.target.id === 'preview-modal') {
        closePreview();
    }
});

// Carica all'avvio
loadPosts();

// Aggiorna ogni 30 secondi
setInterval(loadPosts, 30000);
