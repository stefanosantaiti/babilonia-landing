#!/usr/bin/env node
/**
 * BABILONIA - Appointment Reminders
 * Invia reminder giornalieri per appuntamenti
 * 
 * Esecuzione: node scripts/appointment-reminders.js
 * 
 * Invia:
 * - Email a te (riepilogo giornata)
 * - Telegram a te (riepilogo giornata)
 * - Telegram al cliente (se ha @username)
 */

const https = require('https');

// Configurazione
const CONFIG = {
    // Supabase
    supabaseUrl: 'https://esgjushznmidzdhqsyyx.supabase.co',
    supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzZ2p1c2h6bm1pZHpkaHFzeXl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NTYwMTcsImV4cCI6MjA5MTIzMjAxN30.cKWfWEkgRTtPKbUduGgNxX6gF18Gqkjg2bWn6twQTbs',
    
    // Telegram Bot
    botToken: '8619224941:AAFRV8prDTn58MseqNKKBbEUEBbsNZnu9wk',
    adminChatId: '354943189', // Stefano
    
    // Brevo API (da configurare)
    brevoApiKey: process.env.BREVO_API_KEY || null,
    brevoSender: 'stefano@babilonia.it', // da configurare
    adminEmail: 'stefano.santaiti@gmail.com'
};

// Helper per chiamate Supabase
function supabaseQuery(endpoint, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(`${CONFIG.supabaseUrl}/rest/v1/${endpoint}`);
        
        const options = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'apikey': CONFIG.supabaseKey,
                'Authorization': `Bearer ${CONFIG.supabaseKey}`,
                'Content-Type': 'application/json'
            }
        };
        
        if (body) {
            options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(body));
        }
        
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve(data);
                }
            });
        });
        
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

// Helper per invio Telegram
function sendTelegramMessage(chatId, text) {
    return new Promise((resolve, reject) => {
        const payload = {
            chat_id: chatId,
            text: text,
            parse_mode: 'HTML'
        };
        
        const options = {
            hostname: 'api.telegram.org',
            path: `/bot${CONFIG.botToken}/sendMessage`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        });
        
        req.on('error', reject);
        req.write(JSON.stringify(payload));
        req.end();
    });
}

// Helper per invio Email via Brevo
function sendBrevoEmail(to, subject, htmlContent) {
    return new Promise((resolve, reject) => {
        if (!CONFIG.brevoApiKey) {
            console.log('⚠️ BREVO_API_KEY non configurata, email non inviata');
            resolve({ skipped: true });
            return;
        }
        
        const payload = {
            sender: { email: CONFIG.brevoSender, name: 'Stefano - Babilonia' },
            to: [{ email: to }],
            subject: subject,
            htmlContent: htmlContent
        };
        
        const options = {
            hostname: 'api.brevo.com',
            path: '/v3/smtp/email',
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': CONFIG.brevoApiKey,
                'content-type': 'application/json'
            }
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(JSON.parse(data));
                } else {
                    reject(new Error(`Brevo error: ${res.statusCode} - ${data}`));
                }
            });
        });
        
        req.on('error', reject);
        req.write(JSON.stringify(payload));
        req.end();
    });
}

// Formatta data italiana
function formatDateItalian(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('it-IT', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

// Main function
async function main() {
    try {
        console.log('📅 BABILONIA - Reminder System');
        console.log('================================');
        
        // Data oggi (formato YYYY-MM-DD)
        const today = new Date().toISOString().split('T')[0];
        console.log(`Data odierna: ${today}`);
        
        // Recupera appuntamenti di oggi
        const appointments = await supabaseQuery(
            `appointments?select=*,sellers(name,email,zoom_link)&date=eq.${today}&status=eq.confirmed&order=time.asc`
        );
        
        // Gestisci risposta vuota o non-array
        const appointmentsList = Array.isArray(appointments) ? appointments : [];
        
        console.log(`\n📊 Trovati ${appointmentsList.length} appuntamenti oggi`);
        
        if (appointmentsList.length === 0) {
            console.log('Nessun appuntamento da notificare.');
            return;
        }
        
        // Categorizza appuntamenti
        const bySeller = {};
        const clientNotifications = [];
        
        appointmentsList.forEach(apt => {
            const sellerName = apt.sellers?.name || 'Sconosciuto';
            if (!bySeller[sellerName]) bySeller[sellerName] = [];
            bySeller[sellerName].push(apt);
            
            // Se ha telegram, prepara notifica
            if (apt.telegram && apt.telegram.startsWith('@')) {
                clientNotifications.push(apt);
            }
        });
        
        // 1. Riepilogo per Stefano (admin)
        let summaryText = `📅 <b>RIEPILOGO APPUNTAMENTI OGGI</b>\n`;
        summaryText += `📆 ${formatDateItalian(today)}\n\n`;
        
        for (const [seller, apts] of Object.entries(bySeller)) {
            summaryText += `👤 <b>${seller}</b>\n`;
            apts.forEach(apt => {
                summaryText += `  ⏰ ${apt.time?.substring(0, 5) || '--:--'} - ${apt.client_name}\n`;
                summaryText += `     📱 ${apt.client_phone}\n`;
                summaryText += `     📧 ${apt.client_email}\n`;
                if (apt.telegram) summaryText += `     💬 ${apt.telegram}\n`;
                summaryText += `\n`;
            });
        }
        
        summaryText += `\nTotale: ${appointmentsList.length} appuntamenti`;
        
        // Invia riepilogo a Stefano via Telegram
        console.log('\n📤 Invio riepilogo a Stefano (Telegram)...');
        await sendTelegramMessage(CONFIG.adminChatId, summaryText);
        console.log('✅ Riepilogo inviato');
        
        // 2. Email riepilogo a Stefano (se Brevo configurato)
        if (CONFIG.brevoApiKey) {
            console.log('\n📧 Invio email riepilogo...');
            let emailHtml = `<h2>📅 Riepilogo Appuntamenti - ${formatDateItalian(today)}</h2>`;
            
            for (const [seller, apts] of Object.entries(bySeller)) {
                emailHtml += `<h3>👤 ${seller}</h3>`;
                emailHtml += `<table border="1" cellpadding="8" style="border-collapse: collapse; margin-bottom: 20px;">`;
                emailHtml += `<tr style="background: #f0f0f0;"><th>Ora</th><th>Nome</th><th>Telefono</th><th>Email</th><th>Telegram</th></tr>`;
                apts.forEach(apt => {
                    emailHtml += `<tr>`;
                    emailHtml += `<td>${apt.time?.substring(0, 5) || '--:--'}</td>`;
                    emailHtml += `<td>${apt.client_name}</td>`;
                    emailHtml += `<td>${apt.client_phone}</td>`;
                    emailHtml += `<td>${apt.client_email}</td>`;
                    emailHtml += `<td>${apt.telegram || '-'}</td>`;
                    emailHtml += `</tr>`;
                });
                emailHtml += `</table>`;
            }
            
            await sendBrevoEmail(CONFIG.adminEmail, `Appuntamenti ${today}`, emailHtml);
            console.log('✅ Email inviata');
        }
        
        // 3. Notifiche ai clienti (Telegram)
        if (clientNotifications.length > 0) {
            console.log(`\n📤 Invio reminder a ${clientNotifications.length} clienti (Telegram)...`);
            
            for (const apt of clientNotifications) {
                const clientMsg = `🌅 <b>Buongiorno!</b>\n\n` +
                    `Ti ricordo l'appuntamento di oggi:\n\n` +
                    `📅 <b>Data:</b> ${formatDateItalian(today)}\n` +
                    `⏰ <b>Ora:</b> ${apt.time?.substring(0, 5)}\n` +
                    `👤 <b>Consulente:</b> ${apt.sellers?.name || 'Stefano'}\n\n` +
                    `🔗 <b>Link Zoom:</b> ${apt.sellers?.zoom_link || 'da confermare'}\n\n` +
                    `⏱️ Durata: 15-20 minuti\n\n` +
                    `A più tardi! 🎸`;
                
                try {
                    // Rimuovi @ dal username per chat_id
                    const chatId = apt.telegram.replace('@', '');
                    await sendTelegramMessage(chatId, clientMsg);
                    console.log(`  ✅ Reminder inviato a ${apt.client_name} (${apt.telegram})`);
                } catch (e) {
                    console.log(`  ❌ Errore invio a ${apt.client_name}: ${e.message}`);
                }
                
                // Piccolo delay per rispettare rate limit Telegram
                await new Promise(r => setTimeout(r, 100));
            }
        } else {
            console.log('\n⚠️ Nessun cliente con Telegram per reminder diretto');
        }
        
        // 4. Email reminder ai clienti (se Brevo configurato)
        if (CONFIG.brevoApiKey) {
            console.log('\n📧 Invio email reminder ai clienti...');
            
            for (const apt of appointmentsList) {
                const subject = `Reminder: Appuntamento oggi alle ${apt.time?.substring(0, 5)}`;
                const html = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #d4af37;">🌅 Buongiorno!</h2>
                        <p>Ti ricordiamo l'appuntamento di oggi:</p>
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
                            <p><strong>📅 Data:</strong> ${formatDateItalian(today)}</p>
                            <p><strong>⏰ Ora:</strong> ${apt.time?.substring(0, 5)}</p>
                            <p><strong>👤 Consulente:</strong> ${apt.sellers?.name || 'Stefano'}</p>
                            <p><strong>⏱️ Durata:</strong> 15-20 minuti</p>
                        </div>
                        <p><strong>🔗 Link Zoom:</strong><br>
                        <a href="${apt.sellers?.zoom_link || '#'}" style="color: #d4af37;">${apt.sellers?.zoom_link || 'da confermare'}</a></p>
                        <p style="margin-top: 30px; color: #666; font-size: 0.9rem;">
                            Per modificare o cancellare: <a href="https://stefanosantaiti.github.io/babilonia-landing/manage/?id=${apt.id}">clicca qui</a>
                        </p>
                    </div>
                `;
                
                try {
                    await sendBrevoEmail(apt.client_email, subject, html);
                    console.log(`  ✅ Email inviata a ${apt.client_name}`);
                } catch (e) {
                    console.log(`  ❌ Errore email a ${apt.client_name}: ${e.message}`);
                }
                
                await new Promise(r => setTimeout(r, 100));
            }
        } else {
            console.log('\n⚠️ Brevo non configurato, nessuna email inviata');
        }
        
        console.log('\n✅ Tutti i reminder completati!');
        
    } catch (error) {
        console.error('❌ Errore:', error.message);
        process.exit(1);
    }
}

// Esegui
main();
