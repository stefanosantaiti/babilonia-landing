// Widget Booking - Clienti BABILONIA
// Versione semplificata con fetch diretto

const SUPABASE_URL = 'https://esgjushznmidzdhqsyyx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzZ2p1c2h6bm1pZHpkaHFzeXl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NTYwMTcsImV4cCI6MjA5MTIzMjAxN30.cKWfWEkgRTtPKbUduGgNxX6gF18Gqkjg2bWn6twQTbs';

let currentStep = 1;
let selectedSeller = null;
let selectedDate = null;
let selectedSlot = null;
let sellers = [];
let availableSlots = [];

// Helper per chiamate Supabase
async function supabaseFetch(table, query = '') {
    const url = `${SUPABASE_URL}/rest/v1/${table}${query}`;
    const response = await fetch(url, {
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
        }
    });
    return await response.json();
}

// Carica seller
async function loadSellers() {
    try {
        console.log('Caricamento seller...');
        const data = await supabaseFetch('sellers?select=*&active=eq.true');
        console.log('Seller caricati:', data);
        
        sellers = data || [];
        const select = document.getElementById('seller-select');
        
        if (!select) {
            console.error('Select non trovato');
            return;
        }
        
        // Reset
        select.innerHTML = '<option value="">-- Seleziona consulente --</option>';
        
        // Aggiungi seller
        sellers.forEach(seller => {
            const option = document.createElement('option');
            option.value = seller.id;
            option.textContent = seller.name;
            select.appendChild(option);
        });
        
        console.log(`Aggiunti ${sellers.length} seller`);
        
    } catch (error) {
        console.error('Errore caricamento seller:', error);
        alert('Errore caricamento. Ricarica la pagina.');
    }
}

// Carica slot disponibili
async function loadAvailableSlots() {
    const container = document.getElementById('calendar-container');
    container.innerHTML = '<div class="loading">Caricamento calendario...</div>';
    
    try {
        const data = await supabaseFetch(`slots?select=*&seller_id=eq.${selectedSeller}&available=eq.true&order=date.asc,time.asc`);
        availableSlots = data || [];
        
        if (availableSlots.length === 0) {
            container.innerHTML = '<div class="loading">Nessuno slot disponibile. Il consulente deve generare slot.</div>';
            return;
        }
        
        renderCalendar();
    } catch (error) {
        console.error('Errore caricamento slot:', error);
        container.innerHTML = '<div class="loading">Errore caricamento</div>';
    }
}

// Render calendario
function renderCalendar() {
    const container = document.getElementById('calendar-container');
    
    // Raggruppa per data
    const byDate = {};
    availableSlots.forEach(slot => {
        if (!byDate[slot.date]) byDate[slot.date] = [];
        byDate[slot.date].push(slot);
    });
    
    // Prendi prime 14 date
    const dates = Object.keys(byDate).slice(0, 14);
    
    let html = '<div class="calendar-grid">';
    
    dates.forEach(dateStr => {
        const date = new Date(dateStr + 'T00:00:00');
        const dayName = date.toLocaleDateString('it-IT', { weekday: 'short' });
        const dayNum = date.getDate();
        
        html += `
            <div class="calendar-day available" onclick="window.selectDate('${dateStr}')" data-date="${dateStr}">
                <span class="day-name">${dayName}</span>
                <span class="day-number">${dayNum}</span>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// Seleziona data
window.selectDate = function(dateStr) {
    selectedDate = dateStr;
    
    // Aggiorna UI
    document.querySelectorAll('.calendar-day').forEach(el => {
        el.classList.remove('selected');
        if (el.dataset.date === dateStr) {
            el.classList.add('selected');
        }
    });
    
    // Carica orari
    loadTimeSlots();
    goToStep(3);
};

// Carica orari disponibili
function loadTimeSlots() {
    const container = document.getElementById('time-container');
    const display = document.getElementById('selected-date-display');
    
    const date = new Date(selectedDate + 'T00:00:00');
    display.textContent = date.toLocaleDateString('it-IT', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long' 
    });
    
    const slots = availableSlots.filter(s => s.date === selectedDate);
    
    if (slots.length === 0) {
        container.innerHTML = '<div class="loading">Nessun orario disponibile</div>';
        return;
    }
    
    let html = '<div class="time-grid">';
    slots.forEach(slot => {
        html += `
            <div class="time-slot" onclick="window.selectTime('${slot.id}', '${slot.time}')" data-slot="${slot.id}">
                ${slot.time}
            </div>
        `;
    });
    html += '</div>';
    
    container.innerHTML = html;
}

// Seleziona orario
window.selectTime = function(slotId, time) {
    selectedSlot = slotId;
    
    // Aggiorna UI
    document.querySelectorAll('.time-slot').forEach(el => {
        el.classList.remove('selected');
        if (el.dataset.slot === slotId) {
            el.classList.add('selected');
        }
    });
    
    // Aggiorna riepilogo
    document.getElementById('summary-date').textContent = new Date(selectedDate + 'T00:00:00')
        .toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
    document.getElementById('summary-time').textContent = time;
    document.getElementById('summary-seller').textContent = sellers.find(s => s.id == selectedSeller)?.name || '--';
    
    goToStep(4);
};

// Navigazione step
window.goToStep = function(step) {
    // Validazioni
    if (step === 2) {
        const sellerValue = document.getElementById('seller-select').value;
        if (!sellerValue) {
            alert('Seleziona un consulente');
            return;
        }
        selectedSeller = parseInt(sellerValue);
        loadAvailableSlots();
    }
    
    // Nascondi tutti gli step
    document.querySelectorAll('.step').forEach(el => {
        el.classList.remove('active');
    });
    
    // Mostra step corrente
    document.getElementById(`step-${step}`).classList.add('active');
    currentStep = step;
    
    window.scrollTo(0, 0);
};

// Conferma prenotazione
window.confirmBooking = async function() {
    const name = document.getElementById('client-name').value.trim();
    const email = document.getElementById('client-email').value.trim();
    const phone = document.getElementById('client-phone').value.trim();
    
    if (!name || !email || !phone) {
        alert('Compila tutti i campi');
        return;
    }
    
    const btn = document.querySelector('#step-4 .btn:not(.back-btn)');
    btn.disabled = true;
    btn.textContent = 'Conferma in corso...';
    
    try {
        // Crea appuntamento via API
        const response = await fetch(`${SUPABASE_URL}/rest/v1/appointments`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
                id: `apt_${Date.now()}`,
                slot_id: selectedSlot,
                seller_id: selectedSeller,
                client_name: name,
                client_email: email,
                client_phone: phone,
                type: 'conoscitivo',
                status: 'confirmed'
            })
        });
        
        if (!response.ok) throw new Error('Errore creazione appuntamento');
        
        // Aggiorna slot
        await fetch(`${SUPABASE_URL}/rest/v1/slots?id=eq.${selectedSlot}`, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({ available: false })
        });
        
        // Notifica Telegram
        await notifyTelegram(name, email, phone);
        
        goToStep(5);
        
    } catch (error) {
        console.error('Errore prenotazione:', error);
        alert('Errore durante la prenotazione. Riprova.');
        btn.disabled = false;
        btn.textContent = '✓ Conferma Appuntamento';
    }
};

// Notifica Telegram
async function notifyTelegram(name, email, phone) {
    const seller = sellers.find(s => s.id == selectedSeller);
    const dateObj = new Date(selectedDate + 'T00:00:00');
    const dateStr = dateObj.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' });
    const timeStr = document.getElementById('summary-time').textContent;
    
    const message = `🔔 NUOVO APPUNTAMENTO

👤 ${name}
📧 ${email}
📱 ${phone}

📅 ${dateStr} alle ${timeStr}
👨‍💼 Consulente: ${seller?.name || 'N/D'}

✅ Confermato via web`;

    try {
        await fetch(`https://api.telegram.org/bot8619224941:AAFRV8prDTn58MseqNKKBbEUEBbsNZnu9wk/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: '354943189',
                text: message
            })
        });
    } catch (e) {
        console.log('Notifica Telegram opzionale');
    }
}

// Attendi che DOM sia pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(loadSellers, 100);
    });
} else {
    setTimeout(loadSellers, 100);
}
