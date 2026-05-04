// BABILONIA — Server Config
// Carica da variabili d'ambiente con fallback per sviluppo locale.
// In produzione su GitHub Pages, token e chat_id sono esposti comunque lato client.
// Per sicurezza reale, spostare la logica di notifica su Netlify Function o Supabase Edge Function.

const config = {
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '8619224941:AAFRV8prDTn58MseqNKKBbEUEBbsNZnu9wk',
    chatId: process.env.TELEGRAM_CHAT_ID || '354943189'
  }
};

module.exports = config;
