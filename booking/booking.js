// Widget Booking - Clienti BABILONIA
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/+esm';

const SUPABASE_URL = 'https://esgjushznmidzdhqsyyx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzZ2p1c2h6bm1pZHpkaHFzeXl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NTYwMTcsImV4cCI6MjA5MTIzMjAxN30.cKWfWEkgRTtPKbUduGgNxX6gF18Gqkjg2bWn6twQTbs';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let currentStep = 1;
let selectedSeller = null;
let selectedDate = null;
let selectedSlot = null;
let availableSlots = [];
let sellers = [];

// Carica seller
async function loadSellers() {
    const { data, error } = await supabase
        .from('sellers')
        .select('*')
        .eq('active', true);
    
    if (error) {
        console.error('Errore caricamento seller:', error);
        return;
    }
    
    sellers = data;
    const select = document.getElementById('seller-select');
    select.innerHTML = '<option value="">-- Seleziona consulente --</option>';
    
    sellers.forEach(seller => {
        const option = document.createElement('option');
        option.value = seller.id;
        option.textContent = seller.name;
        select.appendChild(option);
    });
}

// Carica slot disponibili
async function loadAvailableSlots() {
    const container = document.getElementById('calendar-container');
    container.innerHTML = '<div class="loading">Caricamento calendario...</div>';
    
    const { data: slots, error } = await supabase
        .from('slots')
        .select('*')
        .eq('seller_id', selectedSeller)
        .eq('available', true')
        .order('date', { ascending: true })
        .order('time', { ascending: true });
    
    if (error) {
        container.innerHTML = '<div class="loading">Errore caricamento</div>';
        return;
    }
    
    availableSlots = slots || [];
    renderCalendar();
}

// Render calendario
function renderCalendar() {
    const container = document.getElementById('calendar-container');
    
    if (availableSlots.length === 0) {
        container.innerHTML = '<div class="loading">Nessuno slot disponibile. Contatta il consulente.</div>';
        return;
    }
    
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
            <div class="calendar-day available" onclick="selectDate('${dateStr}')" data-date="${dateStr}">
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
            <div class="time-slot" onclick="selectTime('${slot.id}', '${slot.time}')" data-slot="${slot.id}">
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
    if (step === 2 && !document.getElementById('seller-select').value) {
        alert('Seleziona un consulente');
        return;
    }
    
    if (step === 3) {
        selectedSeller = parseInt(document.getElementById('seller-select').value);
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
        // Verifica slot ancora disponibile
        const { data: slot, error: slotError } = await supabase
            .from('slots')
            .select('*')
            .eq('id', selectedSlot)
            .eq('available', true)
            .single();
        
        if (slotError || !slot) {
            alert('Slot non più disponibile. Riprova.');
            btn.disabled = false;
            btn.textContent = '✓ Conferma Appuntamento';
            goToStep(3);
            return;
        }
        
        // Crea appuntamento
        const appointmentId = `apt_${Date.now()}`;
        const { error: aptError } = await supabase
            .from('appointments')
            .insert({
                id: appointmentId,
                slot_id: selectedSlot,
                seller_id: selectedSeller,
                client_name: name,
                client_email: email,
                client_phone: phone,
                type: 'conoscitivo',
                status: 'confirmed'
            });
        
        if (aptError) throw aptError;
        
        // Aggiorna slot
        await supabase
            .from('slots')
            .update({ available: false })
            .eq('id', selectedSlot);
        
        // Invia notifica Telegram (opzionale, via webhook)
        await notifyTelegram(name, email, phone, selectedDate, slot.time);
        
        goToStep(5);
        
    } catch (error) {
        console.error('Errore prenotazione:', error);
        alert('Errore durante la prenotazione. Riprova.');
        btn.disabled = false;
        btn.textContent = '✓ Conferma Appuntamento';
    }
};

// Notifica Telegram
async function notifyTelegram(name, email, phone, date, time) {
    const seller = sellers.find(s => s.id == selectedSeller);
    const dateObj = new Date(date + 'T00:00:00');
    const dateStr = dateObj.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' });
    
    const message = `🔔 **NUOVO APPUNTAMENTO**

👤 ${name}
📧 ${email}
📱 ${phone}

📅 ${dateStr} alle ${time}
👨‍💼 Consulente: ${seller?.name || 'N/D'}

🔗 Confermato via web`;

    // Notifica al bot (token esistente)
    try {
        await fetch(`https://api.telegram.org/bot8619224941:AAFRV8prDTn58MseqNKKBbEUEBbsNZnu9wk/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: '354943189',
                text: message,
                parse_mode: 'Markdown'
            })
        });
    } catch (e) {
        console.log('Notifica Telegram opzionale fallita');
    }
}

// Inizializza
document.addEventListener('DOMContentLoaded', loadSellers);
