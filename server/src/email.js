import nodemailer from 'nodemailer';
import './config/env.js';

const smtpConfig = {
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
};

const transporter = nodemailer.createTransport(smtpConfig);
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);

export async function sendLeadNotification(lead) {
  const requiredSettings = [
    process.env.SMTP_HOST,
    process.env.SMTP_PORT,
    process.env.SMTP_SECURE,
    process.env.SMTP_USER,
    process.env.SMTP_PASSWORD,
    process.env.SMTP_FROM,
    process.env.ADMIN_EMAIL,
  ];

  if (requiredSettings.some((value) => !value)) {
    throw new Error('SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASSWORD, SMTP_FROM, and ADMIN_EMAIL must be configured.');
  }

  if (!Number.isInteger(smtpConfig.port) || smtpConfig.port < 1 || smtpConfig.port > 65535) {
    throw new Error('SMTP_PORT must be a valid TCP port.');
  }

  if (!['true', 'false'].includes(process.env.SMTP_SECURE)) {
    throw new Error('SMTP_SECURE must be set to "true" or "false".');
  }

  const receivedAt = new Date().toLocaleString('he-IL', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jerusalem',
  });
  const safeName = escapeHtml(lead.client_name);
  const safeEmail = escapeHtml(lead.client_email);
  const safePhone = escapeHtml(lead.phone || 'לא צוין');
  const safeService = escapeHtml(lead.service_type);
  const safeReceivedAt = escapeHtml(receivedAt);

  return transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: process.env.ADMIN_EMAIL,
    replyTo: lead.client_email,
    subject: 'פנייה חדשה התקבלה דרך האתר',
    text: [
      'התקבלה פנייה חדשה באתר.',
      '',
      `שם: ${lead.client_name}`,
      `דוא״ל: ${lead.client_email}`,
      `טלפון: ${lead.phone || 'לא צוין'}`,
      `שירות מבוקש: ${lead.service_type}`,
      `תאריך קבלה: ${receivedAt}`,
    ].join('\n'),
    html: `
      <!doctype html>
      <html lang="he" dir="rtl">
        <body style="margin:0;padding:32px 12px;background:#f3f1ec;color:#292b25;font-family:Arial,Helvetica,sans-serif;direction:rtl;text-align:right;">
          <table role="presentation" style="width:100%;max-width:620px;margin:0 auto;border-spacing:0;background:#fffefa;border:1px solid #e5e0d5;">
            <tr>
              <td style="padding:18px 30px;background:#292c25;color:#e0cfaa;font-size:11px;letter-spacing:2px;">
                STUDIO&nbsp;&nbsp; / &nbsp;&nbsp;פנייה חדשה
              </td>
            </tr>
            <tr>
              <td style="padding:30px 30px 12px;">
                <p style="margin:0 0 9px;color:#a68a5b;font-size:12px;letter-spacing:1px;">התקבלה פנייה חדשה</p>
                <h1 style="margin:0;color:#292b25;font-family:Georgia,serif;font-size:30px;font-weight:400;line-height:1.3;">פרטי הלקוח והפרויקט</h1>
                <p style="margin:12px 0 18px;color:#6f7068;font-size:14px;line-height:1.8;">הפנייה נשמרה באתר. אפשר להשיב ישירות למייל הזה כדי לפנות אל הלקוח.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 30px 24px;">
                <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px;">
                  <tr><td style="width:32%;padding:14px 12px;border-bottom:1px solid #ece9e1;color:#85857c;font-size:12px;">שם מלא</td><td style="padding:14px 12px;border-bottom:1px solid #ece9e1;color:#292b25;font-weight:600;">${safeName}</td></tr>
                  <tr><td style="padding:14px 12px;border-bottom:1px solid #ece9e1;color:#85857c;font-size:12px;">כתובת דוא״ל</td><td style="padding:14px 12px;border-bottom:1px solid #ece9e1;color:#292b25;"><a href="mailto:${encodeURIComponent(lead.client_email)}" style="color:#78633e;text-decoration:underline;">${safeEmail}</a></td></tr>
                  <tr><td style="padding:14px 12px;border-bottom:1px solid #ece9e1;color:#85857c;font-size:12px;">טלפון</td><td style="padding:14px 12px;border-bottom:1px solid #ece9e1;color:#292b25;">${safePhone}</td></tr>
                  <tr><td style="padding:14px 12px;border-bottom:1px solid #ece9e1;color:#85857c;font-size:12px;">שירות מבוקש</td><td style="padding:14px 12px;border-bottom:1px solid #ece9e1;color:#292b25;font-weight:600;">${safeService}</td></tr>
                  <tr><td style="padding:14px 12px;color:#85857c;font-size:12px;">תאריך קבלה</td><td style="padding:14px 12px;color:#292b25;">${safeReceivedAt}</td></tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:17px 30px;border-top:1px solid #e9e5dc;color:#85857c;font-size:11px;line-height:1.7;">
                הודעה אוטומטית מטופס יצירת הקשר באתר.
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  });
}

function requireMailSettings() {
  const requiredSettings = [
    process.env.SMTP_HOST,
    process.env.SMTP_PORT,
    process.env.SMTP_SECURE,
    process.env.SMTP_USER,
    process.env.SMTP_PASSWORD,
    process.env.SMTP_FROM,
  ];

  if (requiredSettings.some((value) => !value)) {
    throw new Error('SMTP settings must be configured to send client emails.');
  }
}

function clientEmailHtml({ heading, greeting, body, button, url, footer }) {
  return `<!doctype html><html lang="he" dir="rtl"><body style="margin:0;padding:32px 12px;background:#f3f1ec;color:#292b25;font-family:Arial,Helvetica,sans-serif;direction:rtl;text-align:right;">
    <table role="presentation" style="width:100%;max-width:620px;margin:0 auto;border-spacing:0;background:#fffefa;border:1px solid #e5e0d5;">
      <tr><td style="padding:18px 30px;background:#292c25;color:#e0cfaa;font-size:11px;letter-spacing:2px;">STUDIO&nbsp;&nbsp; / &nbsp;&nbsp;עדכון מהסטודיו</td></tr>
      <tr><td style="padding:32px 30px 16px;"><p style="margin:0 0 9px;color:#a68a5b;font-size:12px;">${escapeHtml(greeting)}</p>
        <h1 style="margin:0;color:#292b25;font-family:Georgia,serif;font-size:30px;font-weight:400;line-height:1.3;">${escapeHtml(heading)}</h1>
        <p style="margin:18px 0;color:#6f7068;font-size:14px;line-height:1.9;">${escapeHtml(body)}</p></td></tr>
      <tr><td style="padding:16px 30px 28px;"><a href="${escapeHtml(url)}" style="display:inline-block;padding:15px 26px;background:#292c25;color:#fffefa;text-decoration:none;font-size:14px;">${escapeHtml(button)} ←</a></td></tr>
      <tr><td style="padding:17px 30px;border-top:1px solid #e9e5dc;color:#85857c;font-size:11px;line-height:1.7;">${escapeHtml(footer)}</td></tr>
    </table></body></html>`;
}

export async function sendClientWelcome({ name, email, password, loginUrl }) {
  requireMailSettings();
  return transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: 'הפרויקט שלך נפתח — פרטי הכניסה לאתר',
    text: `שלום ${name},\n\nנפתח עבורך אזור לקוח באתר.\nכתובת כניסה: ${loginUrl}\nמייל: ${email}\nסיסמה: ${password}\n\nשמור/י את פרטי הכניסה במקום פרטי.`,
    html: clientEmailHtml({
      heading: 'הפרויקט שלך מתחיל כאן',
      greeting: `שלום ${name},`,
      body: `נפתח עבורך אזור לקוח באתר. אפשר לעקוב בו אחר כל הפרויקטים המקושרים לכתובת ${email}. פרטי הכניסה שלך: מייל ${email} | סיסמה ${password}`,
      button: 'כניסה לאזור הלקוח', url: loginUrl,
      footer: 'שמור/י את פרטי הכניסה במקום פרטי. אם לא ביקשת פרויקט, אפשר להשיב למייל הזה.',
    }),
  });
}

export async function sendProjectReviewRequest({ name, email, projectTitle, loginUrl }) {
  requireMailSettings();

  return transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: `הפרויקט ${projectTitle} הושלם — נשמח לשמוע את דעתך`,
    text: `שלום ${name},\n\nהפרויקט ${projectTitle} הושלם. תודה על האמון!\nנשמח אם תתחבר/י לאזור הלקוח ותשתף/י אותנו בחוויה שלך: ${loginUrl}`,
    html: clientEmailHtml({
      heading: 'הפרויקט הושלם. תודה על האמון',
      greeting: `שלום ${name},`,
      body: `הפרויקט ״${projectTitle}״ הושלם. נשמח לקרוא את התגובה שלך באתר. יש להיכנס לאזור הלקוח באמצעות פרטי הכניסה שכבר נשלחו אליך ולבחור את הפרויקט שהושלם.`,
      button: 'כניסה והשארת תגובה', url: loginUrl,
      footer: 'ההודעה נשלחה בעקבות השלמת הפרויקט שלך.',
    }),
  });
}
