// Gestione Appuntamento - Conferma/Sposta/Annulla
const SUPABASE_URL = 'https://esgjushznmidzdhqsyyx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzZ2p1c2h6bm1pZHpkaHFzeXl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NTYwMTcsImV4cCI6MjA5MTIzMjAxN30.cKWfWEkgRTtPKbUduGgNxX6gF18Gqkjg2bWn6twQTbs';

let appointmentId = null;
let appointmentData = null;
let sellerId = null;

// Ottieni parametri URL
const urlParams = new URLSearchParams(window.location.search);
appointmentId = urlParams.get('id');

// Carica appuntamento
async function loadAppointment() {
    if (!appointmentId) {
        showError('ID appuntamento mancante');
        return;
    }

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/appointments?id=eq.${appointmentId}&select=*,slots(date,time),sellers(name,email)`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });

        const data = await response.json();
        if (!data || data.length === 0) {
            showError('Appuntamento non trovato');
            return;
        }

        appointmentData = data[0];
        sellerId = appointmentData.seller_id;
        renderAppointmentDetails();

    } catch (error) {
        console.error('Errore caricamento:', error);
        showError('Errore caricamento appuntamento');
    }
}

function renderAppointmentDetails() {
    document.getElementById('loading-card').style.display = 'none';
    document.getElementById('appointment-card').style.display = 'block';

    const date = new Date(appointmentData.slots.date);
    const dateStr = date.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });

    document.getElementById('appointment-details').innerHTML = `
        <div class="info-row">
            <div class="info-label">Data:</div>
            <div class="info-value">${dateStr}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Ora:</div>
            <div class="info-value">${appointmentData.slots.time.substring(0, 5)}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Consulente:</div>
            <div class="info-value">${appointmentData.sellers.name}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Tipo:</div>
            <div class="info-value">${appointmentData.type === 'conoscitivo' ? 'Colloquio Conoscitivo (15 min)' : 'Colloquio Approfondito (60 min)'}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Stato:</div>
            <div class="info-value">${getStatusText(appointmentData.status)}</div>
        </div>
    `;
}

function getStatusText(status) {
    const statuses = {
        'confirmed': '✅ Confermato',
        'needs_confirmation': '⏳ In attesa di conferma',
        'rescheduled': '🔄 Spostato',
        'cancelled': '❌ Annullato'
    };
    return statuses[status] || status;
}

// Conferma appuntamento
window.confirmAppointment = async function() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/appointments?id=eq.${appointmentId}`, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({ status: 'confirmed', confirmed_at: new Date().toISOString() })
        });

        if (response.ok) {
            showSuccess('Appuntamento confermato! Riceverai un reminder il giorno prima.');
            notifyTelegram('✅ Appuntamento confermato dal cliente');
        } else {
            throw new Error('Errore conferma');
        }
    } catch (error) {
        showError('Errore durante la conferma');
    }
};

// Sposta appuntamento
window.rescheduleAppointment = async function() {
    document.getElementById('action-buttons').style.display = 'none';
    document.getElementById('reschedule-card').style.display = 'block';

    // Carica slot disponibili
    const response = await fetch(`${SUPABASE_URL}/rest/v1/slots?seller_id=eq.${sellerId}&available=eq.true&select=*&order=date.asc,time.asc`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });

    const slots = await response.json();
    renderRescheduleOptions(slots);
};

function renderRescheduleOptions(slots) {
    const container = document.getElementById('available-slots');

    if (!slots || slots.length === 0) {
        container.innerHTML = '<p>Nessuno slot disponibile per lo spostamento.</p>';
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Raggruppa per data (solo future)
    const byDate = {};
    slots.forEach(slot => {
        const slotDate = new Date(slot.date);
        if (slotDate >= today) {
            if (!byDate[slot.date]) byDate[slot.date] = [];
            byDate[slot.date].push(slot);
        }
    });

    let html = '';
    Object.keys(byDate).sort().forEach(dateStr => {
        const date = new Date(dateStr);
        html += `<h3 style="margin: 20px 0 10px 0; color: #1a1a2e;">${date.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>`;
        html += '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px;">';

        byDate[dateStr].forEach(slot => {
            const timeFormatted = slot.time ? slot.time.substring(0, 5) : '--:--';
            html += `<button class="btn" style="padding: 12px; font-size: 0.9rem;" onclick="selectNewSlot('${slot.id}')">${timeFormatted}</button>`;
        });

        html += '</div>';
    });

    container.innerHTML = html;
}

// Seleziona nuovo slot
window.selectNewSlot = async function(newSlotId) {
    if (!confirm('Confermi di voler spostare l\'appuntamento a questo orario?')) return;

    try {
        // Libera slot vecchio
        await fetch(`${SUPABASE_URL}/rest/v1/slots?id=eq.${appointmentData.slot_id}`, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({ available: true })
        });

        // Aggiorna appuntamento con nuovo slot
        await fetch(`${SUPABASE_URL}/rest/v1/appointments?id=eq.${appointmentId}`, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
                slot_id: newSlotId,
                status: 'rescheduled',
                rescheduled_at: new Date().toISOString()
            })
        });

        // Occupa nuovo slot
        await fetch(`${SUPABASE_URL}/rest/v1/slots?id=eq.${newSlotId}`, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({ available: false })
        });

        showSuccess('Appuntamento spostato con successo! Riceverai una nuova conferma via email.');
        notifyTelegram('🔄 Appuntamento spostato dal cliente');

    } catch (error) {
        showError('Errore durante lo spostamento');
    }
};

// Annulla appuntamento
window.cancelAppointment = async function() {
    if (!confirm('Sei sicuro di voler annullare l\'appuntamento?')) return;

    try {
        // Libera slot
        await fetch(`${SUPABASE_URL}/rest/v1/slots?id=eq.${appointmentData.slot_id}`, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({ available: true })
        });

        // Annulla appuntamento
        await fetch(`${SUPABASE_URL}/rest/v1/appointments?id=eq.${appointmentId}`, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        });

        showSuccess('Appuntamento annullato. Puoi prenotare un nuovo appuntamento quando vuoi.');
        notifyTelegram('❌ Appuntamento annullato dal cliente');

    } catch (error) {
        showError('Errore durante l\'annullamento');
    }
};

// Notifica Telegram
async function notifyTelegram(message) {
    const text = `${message}

📅 Appuntamento: ${appointmentData.slots.date} ${appointmentData.slots.time.substring(0, 5)}
👤 Cliente: ${appointmentData.client_name}
📧 ${appointmentData.client_email}`;

    try {
        await fetch(`https://api.telegram.org/bot8619224941:AAFRV8prDTn58MseqNKKBbEUEBbsNZnu9wk/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: '354943189', text: text })
        });
    } catch (e) {
        console.log('Notifica Telegram opzionale');
    }
}

function showSuccess(message) {
    document.getElementById('appointment-card').style.display = 'none';
    document.getElementById('reschedule-card').style.display = 'none';
    document.getElementById('success-card').style.display = 'block';
    document.getElementById('success-message').textContent = message;
}

function showError(message) {
    document.getElementById('loading-card').innerHTML = `<div class="status-error" style="display: block;">${message}</div>`;
}

// Inizializza
document.addEventListener('DOMContentLoaded', loadAppointment);
