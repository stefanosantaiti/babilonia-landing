// Lead Capture Module - Salva lead in Supabase + notifica Telegram
// Da integrare in qualifier-a/index.html e index.html (Qualifier B)

const SUPABASE_URL = 'https://esgjushznmidzdhqsyyx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzZ2p1c2h6bm1pZHpkaHFzeXl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NTYwMTcsImV4cCI6MjA5MTIzMjAxN30.cKWfWEkgRTtPKbUduGgNxX6gF18Gqkjg2bWn6twQTbs';

// Invia lead a Supabase + Telegram (parallelo)
async function saveLead(data) {
    // 1. Salva in Supabase
    const supabasePromise = fetch(`${SUPABASE_URL}/rest/v1/leads`, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify(data)
    }).catch(err => {
        console.log('Supabase save failed:', err);
        return null;
    });

    // 2. Notifica Telegram (in parallelo, non bloccante)
    const telegramPromise = notifyTelegram(data);

    // Attendi entrambi (Telegram non blocca se fallisce)
    const [supabaseResult] = await Promise.all([supabasePromise, telegramPromise]);
    
    return supabaseResult;
}

// Notifica Telegram (funzione esistente, estratta per chiarezza)
async function notifyTelegram(data) {
    const BOT_TOKEN = '8619224941:AAFRV8prDTn58MseqNKKBbEUEBbsNZnu9wk';
    const CHAT_ID = '354943189';
    
    const text = data.lead_type === 'cliente' 
        ? formatClientMessage(data)
        : formatCollaboratorMessage(data);

    try {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                chat_id: CHAT_ID, 
                text: text,
                parse_mode: 'HTML'
            })
        });
    } catch (e) {
        console.log('Telegram notify failed:', e);
    }
}

function formatClientMessage(data) {
    return `🔔 NUOVO LEAD CLIENTE BABILONIA

👤 ${data.name}
📧 ${data.email}
📱 ${data.phone}
💬 Telegram: ${data.telegram_username || 'Non fornito'}
📍 ${data.city || 'N/D'}

📊 PUNTEGGIO: ${data.score}/10
🏷️ CATEGORIA: ${data.category}

📝 RISPOSTE: ${JSON.stringify(data.answers, null, 2)}`;
}

function formatCollaboratorMessage(data) {
    return `🔔 NUOVO CANDIDATO BABILONIA

👤 ${data.name}
📧 ${data.email}
📱 ${data.phone}
💬 Telegram: ${data.telegram_username || 'Non fornito'}
📍 ${data.city || 'N/D'}

📊 PUNTEGGIO: ${data.score}/16
🏷️ CATEGORIA: ${data.category}

📝 RISPOSTE: ${JSON.stringify(data.answers, null, 2)}`;
}

// Esempio uso per Qualifier A (Clienti):
// const leadData = {
//     name: formData.nome + ' ' + formData.cognome,
//     email: formData.email,
//     phone: formData.telefono,
//     telegram_username: formData.telegram_username,
//     city: formData.citta,
//     lead_type: 'cliente',
//     score: calculateScore(),
//     category: getCategory(calculateScore()).name,
//     answers: {
//         eta: q1Value,
//         obiettivo: q2Value,
//         asset: q3Values,
//         timing: q4Value
//     },
//     source: 'qualifier-a'
// };
// await saveLead(leadData);

// Esempio uso per Qualifier B (Collaboratori):
// const leadData = {
//     name: formData.nome + ' ' + formData.cognome,
//     email: formData.email,
//     phone: formData.telefono,
//     telegram_username: formData.telegram_username,
//     city: formData.citta,
//     lead_type: 'collaboratore',
//     score: calculateScore(),
//     category: getCategory(calculateScore()).name,
//     answers: {
//         professione: professioneValue,
//         visione: visioneValue,
//         tempo: tempoValue,
//         lavoro_ideale: lavoroIdealeValues,
//         motivazione: motivazioneValue,
//         decisione: decisioneValue
//     },
//     source: 'qualifier-b'
// };
// await saveLead(leadData);