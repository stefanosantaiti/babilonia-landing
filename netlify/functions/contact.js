// Netlify Function - Contact Form Handler
// Sends notification via Telegram

const TELEGRAM_BOT_TOKEN = '8847416923:AAEcWKU3M4L0NguzYaaOclNRZTUdKO1GSX8';
const TELEGRAM_CHAT_ID = '354943189';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const data = JSON.parse(event.body);
    const { nome, cognome, citta, telefono, email, messaggio } = data;

    if (!nome || !cognome || !email || !messaggio) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Campi obbligatori mancanti' }) };
    }

    // Telegram notification
    const text = `📩 *Nuovo messaggio dal sito BABILONIA*\n\n` +
      `👤 *${nome} ${cognome}*\n` +
      `📍 ${citta || 'Non indicata'}\n` +
      `📧 ${email}\n` +
      `📱 ${telefono || 'Non indicato'}\n\n` +
      `💬 _${messaggio}_`;

    const tgResp = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: text,
        parse_mode: 'Markdown'
      })
    });

    const tgResult = await tgResp.json();

    if (!tgResult.ok) {
      console.error('Telegram error:', tgResult);
      // Still return success to user, but log the error
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };

  } catch (e) {
    console.error('Contact form error:', e);
    return { statusCode: 500, body: JSON.stringify({ error: 'Errore interno' }) };
  }
};