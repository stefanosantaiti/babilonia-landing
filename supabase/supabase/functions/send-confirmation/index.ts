// Edge Function: Invia email di conferma appuntamento via Brevo
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const BREVO_API_KEY = 'xkeysib-02319714740378973bf129a784';
const SENDER_EMAIL = 'stefano.santaiti@gmail.com';
const SENDER_NAME = 'Babilonia - Care is Gold';

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
    const { appointment_id, client_email, client_name, appointment_date, appointment_time, seller_name, zoom_link, manage_url } = await req.json();

    if (!client_email || !appointment_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Email HTML
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Conferma Appuntamento Babilonia</title>
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
        <h2 style="color: #333; margin-top: 0;">Ciao ${client_name},</h2>
        
        <p style="color: #555; line-height: 1.6;">
          Il tuo appuntamento è stato confermato! Ecco i dettagli:
        </p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #d4af37;">
          <p style="margin: 8px 0; color: #333;"><strong>📅 Data:</strong> ${appointment_date}</p>
          <p style="margin: 8px 0; color: #333;"><strong>⏰ Ora:</strong> ${appointment_time}</p>
          <p style="margin: 8px 0; color: #333;"><strong>👤 Consulente:</strong> ${seller_name || 'Team Babilonia'}</p>
          <p style="margin: 8px 0; color: #333;"><strong>⏱️ Durata:</strong> 15-20 minuti</p>
        </div>
        
        <div style="text-align: center; margin: 25px 0;">
          <a href="${zoom_link}" style="display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #c9a227 100%); color: #ffffff; text-decoration: none; padding: 15px 30px; border-radius: 25px; font-weight: 600;">
            🔗 Entra su Zoom
          </a>
        </div>
        
        <p style="color: #555; line-height: 1.6;">
          <strong>Cosa ti serve per il colloquio:</strong>
        </p>
        <ul style="color: #555; line-height: 1.8; padding-left: 20px;">
          <li>Documento d'identità (per l'identità digitale)</li>
          <li>IBAN del tuo conto corrente</li>
          <li>Una stima dei tuoi obiettivi pensionistici</li>
          <li>Eventuali domande su oro o investimenti</li>
        </ul>
        
        <div style="background: #fff3cd; padding: 15px; border-radius: 10px; margin: 20px 0; border: 1px solid #ffeaa7;">
          <p style="margin: 0; color: #856404; font-size: 14px;">
            <strong>⚠️ Importante:</strong> In caso di imprevisti, puoi modificare o cancellare l'appuntamento usando il link qui sotto.
          </p>
        </div>
        
        <div style="text-align: center; margin: 25px 0;">
          <a href="${manage_url}" style="display: inline-block; background: #6c757d; color: #ffffff; text-decoration: none; padding: 12px 25px; border-radius: 20px; font-size: 14px;">
            Gestisci Appuntamento
          </a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        
        <p style="color: #888; font-size: 12px; text-align: center; line-height: 1.6;">
          Ricevi questa email perché hai prenotato un appuntamento su Babilonia.<br>
          ID appuntamento: ${appointment_id}<br>
          Se non hai effettuato questa prenotazione, ignora questa email.
        </p>
      </td>
    </tr>
    <tr>
      <td style="background: #333; padding: 20px; text-align: center;">
        <p style="color: #999; margin: 0; font-size: 12px;">
          © 2025 Babilonia - Care is Gold. Tutti i diritti riservati.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // Invia email via Brevo API
    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: SENDER_NAME,
          email: SENDER_EMAIL,
        },
        to: [
          {
            email: client_email,
            name: client_name,
          },
        ],
        subject: `✅ Conferma Appuntamento - ${appointment_date} alle ${appointment_time}`,
        htmlContent: emailHtml,
      }),
    });

    if (!brevoResponse.ok) {
      const errorData = await brevoResponse.json();
      console.error('Brevo error:', errorData);
      throw new Error(`Brevo API error: ${JSON.stringify(errorData)}`);
    }

    const brevoData = await brevoResponse.json();
    console.log('Email sent:', brevoData);

    return new Response(
      JSON.stringify({ success: true, messageId: brevoData.messageId }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
