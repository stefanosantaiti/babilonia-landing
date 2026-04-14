// BABILONIA Social Dashboard v2 - Legge da Supabase

const SUPABASE_URL = 'https://esgjushznmidzdhqsyyx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzZ2p1c2h6bm1pZHpkaHFzeXl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NTYwMTcsImV4cCI6MjA5MTIzMjAxN30.cKWfWEkgRTtPKbUduGgNxX6gF18Gqkjg2bWn6twQTbs';

let posts = [];
let editingPost = null;

// Carica post da Supabase
async function loadPosts(true) {
    try {
        showLoadingState();
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/social_posts?select=*&order=created_at.desc`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        posts = data || [];
        
        console.log(`📊 Caricati ${posts.length} post da Supabase`);
        renderPosts();
        updateStats();
        
    } catch (err) {
        console.error('❌ Errore caricamento Supabase:', err);
        showErrorState(err.message);
    }
}

// Renderizza post
function renderPosts() {
    const container = document.getElementById('posts-container');
    
    if (!posts || posts.length === 0) {
        showEmptyState();
        return;
    }
    
    // Prendi solo i primi 5 post pending
    const pendingPosts = posts.filter(p => p.status === 'pending' || p.status === 'pending_approval').slice(0, 5);
    
    if (pendingPosts.length === 0) {
        showAllApprovedState();
        return;
    }
    
    container.innerHTML = pendingPosts.map(post => createPostHTML(post)).join('');
}

// Crea HTML per un post
function createPostHTML(post) {
    const isEditing = editingPost === post.id;
    
    // Formatta data
    const createdDate = new Date(post.created_at).toLocaleDateString('it-IT', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    if (isEditing) {
        return `
            <div class="post-card" data-id="${post.id}">
                <div class="post-header">
                    <span class="post-id">#${post.id}</span>
                    <span class="post-score">⭐ ${post.relevance_score || 'N/A'}/10</span>
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
                <span class="post-score">⭐ ${post.relevance_score || 'N/A'}/10</span>
                <span class="post-status pending">⏳ In attesa</span>
            </div>
            <div class="post-meta">
                <span>📰 <span class="post-source">${post.source || 'Fonte sconosciuta'}</span></span>
                <span>📅 ${createdDate}</span>
                <span class="post-template">${post.template_used || 'default'}</span>
            </div>
            <div class="post-content">${escapeHtml(post.body)}</div>
            ${post.source_url ? `<div class="post-link">🔗 <a href="${post.source_url}" target="_blank">Fonte originale</a></div>` : ''}
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
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showLoadingState() {
    document.getElementById('posts-container').innerHTML = `
        <div class="empty-state">
            <h2>⏳ Caricamento post...</h2>
            <p>Connessione a Supabase in corso...</p>
        </div>
    `;
}

function showEmptyState() {
    document.getElementById('posts-container').innerHTML = `
        <div class="empty-state">
            <h2>🎉 Nessun post in attesa!</h2>
            <p>I post verranno generati automaticamente dal News Scout.</p>
            <p style="margin-top: 20px; color: #d4af37;">Prossima generazione: domattina alle 7:00</p>
            <button class="btn btn-refresh" onclick="loadPosts(true)" style="margin-top: 30px;">🔄 Ricarica ora</button>
        </div>
    `;
}

function showAllApprovedState() {
    const approvedCount = posts.filter(p => p.status === 'approved').length;
    document.getElementById('posts-container').innerHTML = `
        <div class="empty-state">
            <h2>✅ Tutto in ordine!</h2>
            <p>Tutti i post sono stati approvati.</p>
            <p style="margin-top: 10px; color: #d4af37;">${approvedCount} post approvati in totale</p>
            <p style="margin-top: 20px; color: #888;">Prossimi post disponibili: domattina alle 7:00</p>
            <button class="btn btn-refresh" onclick="loadPosts(true)" style="margin-top: 30px;">🔄 Ricarica ora</button>
        </div>
    `;
}

function showErrorState(error) {
    document.getElementById('posts-container').innerHTML = `
        <div class="empty-state" style="border: 2px solid #ff4444;">
            <h2>❌ Errore connessione</h2>
            <p>Impossibile connettersi a Supabase</p>
            <p style="margin-top: 10px; color: #ff4444;">${error}</p>
            <button class="btn btn-refresh" onclick="loadPosts(true)" style="margin-top: 30px;">🔄 Riprova</button>
        </div>
    `;
}

function updateStats() {
    const pending = posts.filter(p => p.status === 'pending' || p.status === 'pending_approval').length;
    const approved = posts.filter(p => p.status === 'approved').length;
    const published = posts.filter(p => p.status === 'published').length;
    
    document.getElementById('pending-count').textContent = pending;
    document.getElementById('approved-count').textContent = approved;
    document.getElementById('published-count').textContent = published;
}

// Azioni
async function approvePost(id) {
    const post = posts.find(p => p.id === id);
    if (!post) return;
    
    try {
        // Aggiorna su Supabase
        const response = await fetch(`${SUPABASE_URL}/rest/v1/social_posts?id=eq.${id}`, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
                status: 'approved',
                approved_at: new Date().toISOString()
            })
        });
        
        if (response.ok) {
            post.status = 'approved';
            post.approved_at = new Date().toISOString();
            alert(`✅ Post approvato!\n\n"${post.title.substring(0, 50)}..."\n\nPronto per pubblicazione Facebook.`);
            renderPosts();
            updateStats();
        } else {
            alert('❌ Errore durante l\'approvazione');
        }
    } catch (err) {
        alert('❌ Errore di connessione: ' + err.message);
    }
}

function editPost(id) {
    editingPost = id;
    renderPosts();
}

async function saveEdit(id) {
    const post = posts.find(p => p.id === id);
    const newText = document.getElementById(`edit-text-${id}`)?.value;
    
    if (!post || !newText) return;
    
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/social_posts?id=eq.${id}`, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
                body: newText,
                edited: true,
                updated_at: new Date().toISOString()
            })
        });
        
        if (response.ok) {
            post.body = newText;
            post.edited = true;
            editingPost = null;
            renderPosts();
            alert('✅ Modifiche salvate!');
        } else {
            alert('❌ Errore durante il salvataggio');
        }
    } catch (err) {
        alert('❌ Errore di connessione: ' + err.message);
    }
}

function cancelEdit() {
    editingPost = null;
    renderPosts();
}

async function rejectPost(id) {
    const post = posts.find(p => p.id === id);
    if (!post || !confirm(`Rifiutare questo post?\n\n"${post.title}"`)) return;
    
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/social_posts?id=eq.${id}`, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        
        if (response.ok) {
            posts = posts.filter(p => p.id !== id);
            renderPosts();
            updateStats();
            alert('🗑️ Post rimosso');
        } else {
            alert('❌ Errore durante la rimozione');
        }
    } catch (err) {
        alert('❌ Errore di connessione: ' + err.message);
    }
}

function previewPost(id) {
    const post = posts.find(p => p.id === id);
    if (!post) return;
    
    document.getElementById('preview-text').innerHTML = escapeHtml(post.body).replace(/\n/g, '<br>');
    document.getElementById('preview-modal').style.display = 'flex';
}

function closePreview() {
    document.getElementById('preview-modal').style.display = 'none';
}

// Eventi
document.addEventListener('click', (e) => {
    if (e.target.id === 'preview-modal') closePreview();
});

// Carica all'avvio
loadPosts(true);

// Aggiorna ogni 30 secondi
setInterval(loadPosts, 30000);

console.log('🚀 Babilonia Social Dashboard v2 - Supabase Ready');
