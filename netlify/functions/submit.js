// Netlify Function - Gestione submit form Qualifier B
// Invia dati a Telegram con punteggio calcolato

exports.handler = async (event, context) => {
  // Solo POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse form data
    const params = new URLSearchParams(event.body);
    const data = {};
    
    params.forEach((value, key) => {
      if (key === 'q4') {
        // Domanda 4 multipla
        if (!data[key]) data[key] = [];
        data[key].push(value);
      } else {
        data[key] = value;
      }
    });

    // Calcola punteggio
    const score = calculateScore(data);
    const category = getCategory(score);

    // Prepara messaggio Telegram
    const message = formatTelegramMessage(data, score, category);

    // Invia a Telegram
    const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8619224941:AAFRV8prDTn58MseqNKKBbEUEBbsNZnu9wk';
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '354943189';

    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML'
      })
    });

    const result = await response.json();

    if (!result.ok) {
      throw new Error(`Telegram API error: ${result.description}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        score: score.toFixed(2),
        category: category
      })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message
      })
    };
  }
};

function calculateScore(data) {
  let total = 0;
  
  // Domande 1-3, 5-6
  const singleQuestions = ['q1', 'q2', 'q3', 'q5', 'q6'];
  
  singleQuestions.forEach(q => {
    if (data[q]) {
      total += parseFloat(data[q]);
    }
  });
  
  // Domanda 4 (multipla) - media
  if (data.q4 && Array.isArray(data.q4) && data.q4.length > 0) {
    const sum = data.q4.reduce((acc, val) => acc + parseFloat(val), 0);
    total += (sum / data.q4.length);
  }
  
  return total;
}

function getCategory(score) {
  if (score >= 12) return '🔥 HOT';
  if (score >= 10) return '🟡 WARM';
  if (score >= 8) return '🔵 TEPID';
  return '❌ NON IDONEO';
}

function formatTelegramMessage(data, score, category) {
  const getLabel = (q, val) => {
    const labels = {
      q1: {
        '2.00': 'Lavoro dipendente (soddisfatto)',
        '2.50': 'Lavoro dipendente (insoddisfatto)',
        '3.00': 'Libero professionista / Imprenditore'
      },
      q2: {
        '1.00': 'Non ho idee chiare',
        '2.00': 'Cerco stabilità',
        '2.50': 'Più libertà economica',
        '3.00': 'Progetto chiaro'
      },
      q3: {
        '0.50': 'Zero tempo',
        '1.00': 'Non lo so',
        '2.00': '3-4 ore/sett',
        '2.50': '5-10 ore/sett',
        '3.00': '10+ ore/sett'
      },
      q5: {
        '1.00': 'Solo informarmi',
        '2.00': 'Insoddisfatto',
        '2.50': 'Libertà economica',
        '3.00': 'Costruire qualcosa di mio'
      },
      q6: {
        '0.50': 'Non ancora',
        '1.50': 'Curioso',
        '2.50': 'Molto motivato',
        '3.00': 'Pronto a impegnarmi'
      }
    };
    return labels[q]?.[val] || val;
  };

  let message = `<b>🎯 NUOVA CANDIDATURA - Qualifier B</b>\n\n`;
  
  message += `<b>📊 PUNTEGGIO:</b> ${score.toFixed(2)}/15\n`;
  message += `<b>📋 CATEGORIA:</b> ${category}\n\n`;
  
  message += `<b>👤 ANAGRAFICA:</b>\n`;
  message += `Nome: ${data.nome || 'N/D'} ${data.cognome || ''}\n`;
  message += `Email: ${data.email || 'N/D'}\n`;
  message += `Tel: ${data.telefono || 'N/D'}\n`;
  message += `Città: ${data.citta || 'N/D'}\n\n`;
  
  message += `<b>📝 RISPOSTE:</b>\n`;
  message += `1. Professione: ${getLabel('q1', data.q1)}\n`;
  message += `2. Visione 5 anni: ${getLabel('q2', data.q2)}\n`;
  message += `3. Tempo disponibile: ${getLabel('q3', data.q3)}\n`;
  
  if (data.q4 && Array.isArray(data.q4)) {
    const q4Avg = (data.q4.reduce((a, b) => parseFloat(a) + parseFloat(b), 0) / data.q4.length).toFixed(2);
    message += `4. Lavoro ideale: Media ${q4Avg} (${data.q4.length} selezioni)\n`;
  }
  
  message += `5. Motivazione: ${getLabel('q5', data.q5)}\n`;
  message += `6. Decisione: ${getLabel('q6', data.q6)}\n\n`;
  
  message += `⏰ Invio: ${new Date().toLocaleString('it-IT')}`;
  
  return message;
}
