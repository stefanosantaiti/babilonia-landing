// Edge Function: Daily Appointment Reminders
// Invia reminder automatici per appuntamenti del giorno
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY') || '';
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || '';
const ADMIN_CHAT_ID = Deno.env.get('ADMIN_CHAT_ID') || '354943189';
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') || 'stefano.santaiti@gmail.com';
const SENDER_EMAIL = Deno.env.get('SENDER_EMAIL') || 'stefano.santaiti@gmail.com';
const SENDER_NAME = Deno.env.get('SENDER_NAME') || 'Babilonia - Care is Gold';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://esgjushznmidzdhqsyyx.supabase.co';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_KEY') || '';

interface Appointment {
  id: string;
  date: string;
  time: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  telegram: string | null;
  status: string;
  seller_id: number;
  sellers: {
    name: string;
    zoom_link: string | null;
  };
}

serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // Data oggi (YYYY-MM-DD)
    const today = new Date().toISOString().split('T')[0];
    console.log(`[Reminders] Data: ${today}`);

    // 1. Recupera appuntamenti di oggi
    const appointments = await getTodayAppointments(today);
    console.log(`[Reminders] Trovati ${appointments.length} appuntamenti`);

    if (appointments.length === 0) {
      await sendTelegram(ADMIN_CHAT_ID, `📅 Nessun appuntamento oggi (${today})`);
      return jsonResponse({ success: true, message: 'Nessun appuntamento' });
    }

    // Raggruppa per consulente
    const bySeller = groupBySeller(appointments);

    // 2. Invia riepilogo a Stefano (email + Telegram)
    await sendAdminSummary(today, bySeller, appointments.length);

    // 3. Invia reminder ai clienti
    for (const apt of appointments) {
      // Email reminder
      await sendClientEmailReminder(apt);
      
      // Telegram reminder (se ha @username)
      if (apt.telegram && apt.telegram.startsWith('@')) {
        await sendClientTelegramReminder(apt);
      }
      
      // Delay tra invii
      await delay(100);
    }

    return jsonResponse({ 
      success: true, 
      message: `Inviati ${appointments.length} reminder`,
      appointments: appointments.length 
    });

  } catch (error) {
    console.error('[Reminders] Errore:', error);
    return jsonResponse({ error: error.message }, 500);
  }
});

// Helper: Recupera appuntamenti di oggi
async function getTodayAppointments(today: string): Promise<Appointment[]> {
  const url = `${SUPABASE_URL}/rest/v1/appointments?select=*,sellers(name,zoom_link)&date=eq.${today}&status=eq.confirmed&order=time.asc`;
  
  const res = await fetch(url, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
  });
  
  if (!res.ok) {
    throw new Error(`Errore query Supabase: ${res.status}`);
  }
  
  return await res.json();
}

// Helper: Raggruppa per consulente
function groupBySeller(appointments: Appointment[]) {
  const grouped: { [key: string]: Appointment[] } = {};
  for (const apt of appointments) {
    const sellerName = apt.sellers?.name || 'Sconosciuto';
    if (!grouped[sellerName]) grouped[sellerName] = [];
    grouped[sellerName].push(apt);
  }
  return grouped;
}

// Helper: Invia riepilogo admin
async function sendAdminSummary(today: string, bySeller: { [key: string]: Appointment[] }, total: number) {
  // Telegram riepilogo
  let tgMsg = `📅 <b>RIEPILOGO APPUNTAMENTI OGGI</b>\n`;
  tgMsg += `📆 ${formatDateItalian(today)}\n\n`;
  
  for (const [seller, apts] of Object.entries(bySeller)) {
    tgMsg += `👤 <b>${seller}</b>\n`;
    for (const apt of apts) {
      tgMsg += `  ⏰ ${apt.time?.substring(0, 5) || '--:--'} - ${apt.client_name}\n`;
      tgMsg += `     📱 ${apt.client_phone}\n`;
      tgMsg += `     📧 ${apt.client_email}\n`;
      if (apt.telegram) tgMsg += `     💬 ${apt.telegram}\n`;
    }
    tgMsg += '\n';
  }
  tgMsg += `Totale: ${total} appuntamenti`;
  
  await sendTelegram(ADMIN_CHAT_ID, tgMsg);

  // Email riepilogo
  if (BREVO_API_KEY) {
    let emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #d4af37;">📅 Riepilogo Appuntamenti - ${formatDateItalian(today)}</h2>
`;
    
    for (const [seller, apts] of Object.entries(bySeller)) {
      emailHtml += `<h3 style="color: #333;">👤 ${seller}</h3>`;
      emailHtml += `<table style="border-collapse: collapse; width: 100%; margin-bottom: 20px;" border="1" cellpadding="8">`;
      emailHtml += `<tr style="background: #f0f0f0;"><th>Ora</th><th>Nome</th><th>Telefono</th><th>Email</th><th>Telegram</th></tr>`;
      
      for (const apt of apts) {
        emailHtml += `<tr>`;
        emailHtml += `<td>${apt.time?.substring(0, 5) || '--:--'}</td>`;
        emailHtml += `<td>${apt.client_name}</td>`;
        emailHtml += `<td>${apt.client_phone}</td>`;
        emailHtml += `<td>${apt.client_email}</td>`;
        emailHtml += `<td>${apt.telegram || '-'}</td>`;
        emailHtml += `</tr>`;
      }
      emailHtml += `</table>`;
    }
    
    emailHtml += `</body></html>`;
    
    await sendBrevoEmail(ADMIN_EMAIL, `📅 Appuntamenti ${today}`, emailHtml);
  }
}

// Helper: Invia email reminder al cliente
async function sendClientEmailReminder(apt: Appointment) {
  if (!BREVO_API_KEY) {
    console.log(`[Reminders] Brevo non configurato, skip email per ${apt.client_name}`);
    return;
  }

  const subject = `🌅 Reminder: Appuntamento oggi alle ${apt.time?.substring(0, 5)}`;
  const manageUrl = `https://stefanosantaiti.github.io/babilonia-landing/manage/?id=${apt.id}`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reminder Appuntamento Babilonia</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="background: linear-gradient(135deg, #d4af37 0%, #c9a227 100%); padding: 30px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">BABILONIA</h1>
        <p style="color: #ffffff; margin: 5px 0 0; opacity: 0.9;">Care is Gold</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px;">
        <h2 style="color: #333; margin-top: 0;">🌅 Buongiorno ${apt.client_name}!</h2>
        
        <p style="color: #555; line-height: 1.6;">
          Ti ricordiamo l'appuntamento di <strong>oggi</strong>:
        </p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #d4af37;">
          <p style="margin: 8px 0; color: #333;"><strong>📅 Data:</strong> ${formatDateItalian(apt.date)}</p>
          <p style="margin: 8px 0; color: #333;"><strong>⏰ Ora:</strong> ${apt.time?.substring(0, 5)}</p>
          <p style="margin: 8px 0; color: #333;"><strong>👤 Consulente:</strong> ${apt.sellers?.name || 'Team Babilonia'}</p>
          <p style="margin: 8px 0; color: #333;"><strong>⏱️ Durata:</strong> 15-20 minuti</p>
        </div>
        
        <div style="text-align: center; margin: 25px 0;">
          <a href="${apt.sellers?.zoom_link || '#'}" style="display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #c9a227 100%); color: #ffffff; text-decoration: none; padding: 15px 30px; border-radius: 25px; font-weight: 600;">
            🔗 Entra su Zoom
          </a>
        </div>
        
        <div style="background: #fff3cd; padding: 15px; border-radius: 10px; margin: 20px 0; border: 1px solid #ffeaa7;">
          <p style="margin: 0; color: #856404; font-size: 14px;">
            <strong>⚠️ Importante:</strong> Per modificare o cancellare l'appuntamento, clicca qui sotto.
          </p>
        </div>
        
        <div style="text-align: center; margin: 25px 0;">
          <a href="${manageUrl}" style="display: inline-block; background: #6c757d; color: #ffffff; text-decoration: none; padding: 12px 25px; border-radius: 20px; font-size: 14px;">
            Gestisci Appuntamento
          </a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        
        <p style="color: #888; font-size: 12px; text-align: center; line-height: 1.6;">
          ID appuntamento: ${apt.id}<br>
          A più tardi! 🎸
        </p>
      </td>
    </tr>
    <tr>
      <td style="background: #333; padding: 20px; text-align: center;">
        <p style="color: #999; margin: 0; font-size: 12px;">© 2025 Babilonia - Care is Gold</p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await sendBrevoEmail(apt.client_email, subject, html);
  console.log(`[Reminders] Email inviata a ${apt.client_name}`);
}

// Helper: Invia Telegram reminder al cliente
async function sendClientTelegramReminder(apt: Appointment) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.log(`[Reminders] Telegram non configurato, skip per ${apt.client_name}`);
    return;
  }

  const chatId = apt.telegram?.replace('@', '');
  if (!chatId) return;

  const msg = `🌅 <b>Buongiorno ${apt.client_name}!</b>\n\n` +
    `Ti ricordo l'appuntamento di <b>oggi</b>:\n\n` +
    `📅 <b>Data:</b> ${formatDateItalian(apt.date)}\n` +
    `⏰ <b>Ora:</b> ${apt.time?.substring(0, 5)}\n` +
    `👤 <b>Consulente:</b> ${apt.sellers?.name || 'Team Babilonia'}\n\n` +
    `🔗 <b>Zoom:</b> ${apt.sellers?.zoom_link || 'da confermare'}\n\n` +
    `⏱️ Durata: 15-20 minuti\n\n` +
    `A più tardi! 🎸`;

  await sendTelegram(chatId, msg);
  console.log(`[Reminders] Telegram inviato a ${apt.client_name}`);
}

// Helper: Invia email via Brevo
async function sendBrevoEmail(to: string, subject: string, htmlContent: string) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': BREVO_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: SENDER_NAME, email: SENDER_EMAIL },
      to: [{ email: to }],
      subject: subject,
      htmlContent: htmlContent,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Brevo error: ${res.status} - ${error}`);
  }
}

// Helper: Invia messaggio Telegram
async function sendTelegram(chatId: string, text: string) {
  if (!TELEGRAM_BOT_TOKEN) return;
  
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    console.error(`[Reminders] Telegram error: ${error}`);
  }
}

// Helper: Formatta data italiana
function formatDateItalian(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// Helper: Delay
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper: JSON response
function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
