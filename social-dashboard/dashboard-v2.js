// BABILONIA Social Dashboard v2.0 - Legge da Supabase
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/+esm';

const SUPABASE_URL = 'https://esgjushznmidzdhqsyyx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzZ2p1c2h6bm1pZHpkaHFzeXl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NTYwMTcsImV4cCI6MjA5MTIzMjAxN30.cKWfWEkgRTtPKbUduGgNxX6gF18Gqkjg2bWn6twQTbs';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let posts = [];
let editingPost = null;

// Carica post da Supabase
async function loadPosts() {
    try {
        const { data, error } = await supabase
            .from('social_posts')
            .select('*')
            .eq('status', 'pending_approval')
            .order('created_at', { ascending: false })
            .limit(3);
        
        if (error) throw error;
        
        posts = data || [];
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
    
    container.innerHTML = posts.map(post => createPostHTML(post)).join('');
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
    
    return `
        <div class="post-card" data-id="${post.id}">
            <div class="post-header">
                <span class="post-id">#${post.id}</span>
                <div>
                    <span class="post-score">⭐ ${post.relevance_score}/10</span>
                    <span class="status-badge badge-pending">In attesa</span>
                </div>
            </div>
            <div class="post-meta">
                <span>📰 <span class="post-source">${post.source}</span></span>
                <span>📅 ${post.pub_date} ${post.pub_time ? 'alle ' + post.pub_time : ''}</span>
                <span class="post-template">${post.template_used}</span>
            </div>
            <div class="post-content">${escapeHtml(post.body)}</div>
            <div class="post-hashtags">${post.hashtags}</div>
            <div class="post-actions">
                <button class="btn btn-approve" onclick="approvePost(${post.id})">✅ Approva</button>
                <button class="btn btn-edit" onclick="editPost(${post.id})">✏️ Modifica</button>
                <button class="btn btn-preview" onclick="previewPost(${post.id})">👁️ Anteprima</button>
                <button class="btn btn-reject" onclick="rejectPost(${post.id})">❌ Rifiuta</button>
            </div>
        </div>
    `;
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Aggiorna statistiche
function updateStats() {
    document.getElementById('pending-count').textContent = posts.length;
}

// Mostra stato vuoto
function showEmptyState() {
    const container = document.getElementById('posts-container');
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">📝</div>
            <div class="empty-title">Nessun post in attesa</div>
            <div class="empty-subtitle">Torna più tardi per vedere i nuovi post generati</div>
        </div>
    `;
}

// Mostra errore
function showErrorState() {
    const container = document.getElementById('posts-container');
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">⚠️</div>
            <div class="empty-title">Errore di caricamento</div>
            <div class="empty-subtitle">Riprova tra qualche momento</div>
        </div>
    `;
}

// Approva post
async function approvePost(id) {
    try {
        const { error } = await supabase
            .from('social_posts')
            .update({ 
                status: 'approved',
                approved_at: new Date().toISOString()
            })
            .eq('id', id);
        
        if (error) throw error;
        
        // Ricarica post
        await loadPosts();
        alert('✅ Post approvato!');
    } catch (err) {
        console.error('Errore:', err);
        alert('Errore nell\'approvare il post');
    }
}

// Rifiuta post
async function rejectPost(id) {
    if (!confirm('Rifiutare questo post?')) return;
    
    try {
        const { error } = await supabase
            .from('social_posts')
            .update({ status: 'rejected' })
            .eq('id', id);
        
        if (error) throw error;
        
        await loadPosts();
    } catch (err) {
        console.error('Errore:', err);
        alert('Errore nel rifiutare il post');
    }
}

// Modifica post
function editPost(id) {
    editingPost = id;
    renderPosts();
}

// Salva modifica
async function saveEdit(id) {
    const newText = document.getElementById(`edit-text-${id}`).value;
    
    try {
        const { error } = await supabase
            .from('social_posts')
            .update({ body: newText })
            .eq('id', id);
        
        if (error) throw error;
        
        editingPost = null;
        await loadPosts();
    } catch (err) {
        console.error('Errore:', err);
        alert('Errore nel salvare le modifiche');
    }
}

// Annulla modifica
function cancelEdit() {
    editingPost = null;
    renderPosts();
}

// Anteprima post
function previewPost(id) {
    const post = posts.find(p => p.id === id);
    if (post) {
        document.getElementById('preview-text').innerHTML = post.body.replace(/\n/g, '<br>');
        document.getElementById('preview-modal').style.display = 'flex';
    }
}

// Chiudi anteprima
function closePreview() {
    document.getElementById('preview-modal').style.display = 'none';
}

// Eventi
document.addEventListener('click', (e) => {
    if (e.target.id === 'preview-modal') closePreview();
});

// Carica all'avvio
document.addEventListener('DOMContentLoaded', loadPosts);

// Esporta funzioni globali
window.approvePost = approvePost;
window.rejectPost = rejectPost;
window.editPost = editPost;
window.saveEdit = saveEdit;
window.cancelEdit = cancelEdit;
window.previewPost = previewPost;
window.closePreview = closePreview;