const nodemailer = require('nodemailer');

let gmailTransporter = null;
function getGmailTransporter() {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return null;
  if (!gmailTransporter) {
    gmailTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });
  }
  return gmailTransporter;
}

async function sendEmail({ to, replyTo, subject, text }) {
  if (!to) return { sent: false, reason: 'no_destination' };

  // 1) Əvvəlcə Gmail SMTP (əgər GMAIL_USER + GMAIL_APP_PASSWORD təyin olunubsa)
  const transporter = getGmailTransporter();
  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"QR Profile Card" <${process.env.GMAIL_USER}>`,
        to,
        replyTo: replyTo || undefined,
        subject,
        text
      });
      return { sent: true, via: 'gmail' };
    } catch (e) {
      console.error('gmail send error', e);
      return { sent: false, reason: 'gmail_send_failed', detail: e.message };
    }
  }

  // 2) Gmail təyin olunmayıbsa — Resend-ə keç (əgər RESEND_API_KEY varsa)
  if (process.env.RESEND_API_KEY) {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM || 'QR Profile Card <onboarding@resend.dev>',
          to: [to],
          reply_to: replyTo || undefined,
          subject,
          text
        })
      });
      if (!r.ok) {
        const errText = await r.text();
        console.error('resend error', r.status, errText);
        return { sent: false, reason: 'resend_failed', detail: errText, status: r.status };
      }
      return { sent: true, via: 'resend' };
    } catch (e) {
      console.error('resend exception', e);
      return { sent: false, reason: 'exception', detail: e.message };
    }
  }

  return { sent: false, reason: 'no_email_provider_configured' };
}

module.exports = { sendEmail };
