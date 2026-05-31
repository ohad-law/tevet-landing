import nodemailer from 'nodemailer'

const GREEN_API_INSTANCE = '7105435035'
const GREEN_API_TOKEN    = '25e05f98851f4262b11be4110f31a462306a88d0d7dd490695'
const OHAD_WHATSAPP      = process.env.OHAD_WHATSAPP_NUMBER ?? ''
const OHAD_EMAIL         = 'ohad@tevet-law.com'
const APP_URL            = process.env.NEXT_PUBLIC_PROD_URL ?? 'https://tevet-landing.vercel.app'

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false,
    auth: { user: process.env.SMTP_USER ?? '', pass: process.env.SMTP_PASS ?? '' },
  })
}

async function sendWA(chatId: string, message: string) {
  const url = `https://api.green-api.com/waInstance${GREEN_API_INSTANCE}/sendMessage/${GREEN_API_TOKEN}`
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId, message }),
  })
}

/* ── שליחה ללקוח ── */

export async function notifyClientWhatsApp(phone: string, clientName: string, docName: string, token: string) {
  const digits = phone.replace(/\D/g, '')
  const chatId = (digits.startsWith('972') ? digits : '972' + digits.replace(/^0/, '')) + '@c.us'
  const link   = `${APP_URL}/sign/${token}`
  const msg =
    `שלום ${clientName},\n\n` +
    `משרד עו"ד אוהד טבת שלח לך מסמך לחתימה דיגיטלית.\n\n` +
    `📄 *${docName}*\n\n` +
    `לחץ לחתימה:\n${link}\n\n` +
    `_הקישור תקף ל-30 יום._`
  await sendWA(chatId, msg)
}

export async function notifyClientEmail(email: string, clientName: string, docName: string, token: string) {
  const link = `${APP_URL}/sign/${token}`
  const transport = createTransport()
  await transport.sendMail({
    from: `"משרד עו"ד אוהד טבת" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `מסמך לחתימה דיגיטלית — ${docName}`,
    html: `
      <div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1e293b;">
        <div style="background:#0f172a;padding:24px;border-radius:8px 8px 0 0;text-align:center;">
          <h2 style="color:#d97706;margin:0;">משרד עו"ד אוהד טבת</h2>
          <p style="color:#94a3b8;margin:4px 0 0;">דיני עבודה</p>
        </div>
        <div style="background:#fff;padding:28px;border:1px solid #e2e8f0;border-radius:0 0 8px 8px;">
          <p>שלום <strong>${clientName}</strong>,</p>
          <p>נשלח לך מסמך לחתימה דיגיטלית:</p>
          <p style="font-size:16px;font-weight:bold;">📄 ${docName}</p>
          <div style="text-align:center;margin:28px 0;">
            <a href="${link}"
               style="background:#d97706;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:bold;">
              לחץ לחתימה
            </a>
          </div>
          <p style="color:#94a3b8;font-size:13px;">הקישור תקף ל-30 יום.<br/>אם לא ביקשת מסמך זה, אנא התעלם מהודעה זו.</p>
        </div>
      </div>`,
  })
}

/* ── התראה לאוהד ── */

export async function notifyAttorneyWhatsApp(clientName: string, docName: string, caseId: string) {
  if (!OHAD_WHATSAPP) return
  const digits = OHAD_WHATSAPP.replace(/\D/g, '')
  const chatId = (digits.startsWith('972') ? digits : '972' + digits.replace(/^0/, '')) + '@c.us'
  const msg =
    `✅ *חתימה התקבלה!*\n\n` +
    `👤 לקוח: ${clientName}\n` +
    `📄 מסמך: ${docName}\n\n` +
    `לצפייה בתיק:\n${APP_URL}/crm/cases/${caseId}`
  await sendWA(chatId, msg).catch(() => null)
}

export async function notifyAttorneyEmail(clientName: string, docName: string, caseId: string, signedUrl: string) {
  const transport = createTransport()
  await transport.sendMail({
    from: `"CRM טבת" <${process.env.SMTP_USER}>`,
    to: OHAD_EMAIL,
    subject: `✅ ${clientName} חתם על ${docName}`,
    html: `
      <div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#16a34a;">✅ חתימה התקבלה</h2>
        <p><strong>לקוח:</strong> ${clientName}</p>
        <p><strong>מסמך:</strong> ${docName}</p>
        <p><a href="${APP_URL}/crm/cases/${caseId}">פתח את התיק ב-CRM</a></p>
        ${signedUrl ? `<p><a href="${signedUrl}">הורד PDF חתום</a></p>` : ''}
      </div>`,
  }).catch(() => null)
}
