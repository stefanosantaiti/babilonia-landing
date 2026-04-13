// Generazione automatica slot al caricamento pagina
// Se non ci sono slot per oggi/domani, li genera automaticamente

const SUPABASE_URL = 'https://esgjushznmidzdhqsyyx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzZ2p1c2h6bm1pZHpkaHFzeXl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NTYwMTcsImV4cCI6MjA5MTIzMjAxN30.cKWfWEkgRTtPKbUduGgNxX6gF18Gqkjg2bWn6twQTbs';

// Configurazione venditori
const SELLER_CONFIGS = {
  1: { // Stefano
    days: [1, 2, 3, 4, 5], // Lun-Ven
    morning: ['09:00', '10:00', '11:00'],
    afternoon: ['14:00', '15:00', '16:00', '17:00']
  },
  3: { // Luca
    days: [1, 2, 3, 4, 5],
    morning: ['09:30', '10:30', '11:30'],
    afternoon: ['14:30', '15:30', '16:30']
  }
};

// Genera ID slot
function generateSlotId(sellerId, date, time) {
  return `${sellerId}_${date}_${time}`;
}

// Verifica se ci sono slot per i prossimi 3 giorni
async function checkAndGenerateSlots() {
  const today = new Date().toISOString().split('T')[0];
  const threeDaysLater = new Date();
  threeDaysLater.setDate(threeDaysLater.getDate() + 3);
  const endDate = threeDaysLater.toISOString().split('T')[0];
  
  try {
    // Controlla slot esistenti
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/slots?select=count&id=gte.${today}&id=lte.${endDate}_23:59`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      }
    );
    
    const data = await response.json();
    const existingSlots = data.length;
    
    if (existingSlots < 10) {
      console.log('Slot insufficienti, generazione automatica...');
      await generateSlotsForAllSellers();
    } else {
      console.log(`Slot sufficienti: ${existingSlots} trovati`);
    }
  } catch (err) {
    console.error('Errore verifica slot:', err);
  }
}

// Genera slot per tutti i venditori
async function generateSlotsForAllSellers() {
  const today = new Date();
  
  for (const [sellerId, config] of Object.entries(SELLER_CONFIGS)) {
    const slots = [];
    
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dayOfWeek = date.getDay();
      
      if (!config.days.includes(dayOfWeek)) continue;
      
      const dateStr = date.toISOString().split('T')[0];
      
      // Slot mattina
      config.morning.forEach(time => {
        slots.push({
          id: generateSlotId(sellerId, dateStr, time),
          seller_id: parseInt(sellerId),
          date: dateStr,
          time: time + ':00',
          available: true,
          type: 'conoscitivo'
        });
      });
      
      // Slot pomeriggio
      config.afternoon.forEach(time => {
        slots.push({
          id: generateSlotId(sellerId, dateStr, time),
          seller_id: parseInt(sellerId),
          date: dateStr,
          time: time + ':00',
          available: true,
          type: 'conoscitivo'
        });
      });
    }
    
    // Inserisci slot su Supabase
    for (const slot of slots) {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/slots`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify(slot)
        });
      } catch (e) {
        // Slot potrebbe già esistere, ignora errore
      }
    }
  }
  
  console.log('Slot generati con successo!');
}

// Esegui al caricamento
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', checkAndGenerateSlots);
} else {
  checkAndGenerateSlots();
}

// Esporta per uso manuale
window.refreshSlots = checkAndGenerateSlots;