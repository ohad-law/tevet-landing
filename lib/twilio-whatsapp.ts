/**
 * שליחת וואטסאפ דרך הערוץ הרשמי של מטא, בתיווך טוויליו.
 *
 * למה לא lib/whatsapp.ts: שם יושב גרין אפיי, שהוא ערוץ לא רשמי על
 * מספר המשרד 051. כאן מדובר במספר הרשמי 053-964-9422, שרשום למטא
 * ומיועד לשליחה יזומה להמונים בלי סיכון חסימה.
 *
 * 🚨 בערוץ הרשמי אי אפשר לשלוח טקסט חופשי למי שלא כתב לנו ב-24 השעות
 * האחרונות. שליחה יזומה חייבת תבנית מאושרת מראש (ContentSid).
 */
const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || ''
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || ''

/** המספר הרשמי. hard-coded בכוונה, כדי ששינוי env לא ישלח ממספר אחר */
export const WA_SENDER = 'whatsapp:+972539649422'

const API = 'https://api.twilio.com/2010-04-01'

function authHeader(): string {
  return 'Basic ' + Buffer.from(`${ACCOUNT_SID}:${AUTH_TOKEN}`).toString('base64')
}

export function twilioConfigured(): boolean {
  return Boolean(ACCOUNT_SID && AUTH_TOKEN)
}

export type SendResult = { ok: boolean; sid?: string; error?: string }

/**
 * שולח תבנית מאושרת. `variables` ממופה לפי מספר, למשל {"1":"דני"}.
 * מחזיר את מזהה ההודעה כדי שאפשר יהיה לבדוק מסירה בהמשך.
 */
export async function sendTemplate(
  toPhone972: string,
  contentSid: string,
  variables: Record<string, string>
): Promise<SendResult> {
  if (!twilioConfigured()) return { ok: false, error: 'twilio_not_configured' }

  const body = new URLSearchParams({
    From: WA_SENDER,
    To: `whatsapp:+${toPhone972}`,
    ContentSid: contentSid,
    ContentVariables: JSON.stringify(variables),
  })

  try {
    const res = await fetch(`${API}/Accounts/${ACCOUNT_SID}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: authHeader(), 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(20000),
    })
    const data = (await res.json()) as { sid?: string; message?: string }
    if (!res.ok || !data.sid) return { ok: false, error: data.message || `http_${res.status}` }
    return { ok: true, sid: data.sid }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

/**
 * מושך את כל ההודעות שנשלחו מהמספר הרשמי ומחזיר את הנמענים.
 *
 * זהו מקור האמת לשאלה "למי כבר שלחנו". עדיף על סימון בבסיס הנתונים
 * כי הוא לא יכול לצאת מסנכרון עם מה שבאמת יצא.
 */
export async function fetchSentRecipients(maxPages = 20): Promise<Set<string>> {
  const sent = new Set<string>()
  if (!twilioConfigured()) return sent

  let url: string | null =
    `${API}/Accounts/${ACCOUNT_SID}/Messages.json?From=${encodeURIComponent(WA_SENDER)}&PageSize=200`

  for (let page = 0; page < maxPages && url; page++) {
    try {
      const res = await fetch(url, {
        headers: { Authorization: authHeader() },
        signal: AbortSignal.timeout(20000),
      })
      if (!res.ok) break
      const data = (await res.json()) as {
        messages?: { to?: string }[]
        next_page_uri?: string | null
      }
      for (const m of data.messages || []) {
        const digits = (m.to || '').replace(/\D/g, '')
        if (digits) sent.add(digits)
      }
      url = data.next_page_uri ? `https://api.twilio.com${data.next_page_uri}` : null
    } catch {
      break
    }
  }
  return sent
}

export type DeliveryStats = { total: number; delivered: number; failed: number }

/** בודק מה עלה בגורל ההודעות ששלחנו לאחרונה, בשביל בלם החירום */
export async function recentDeliveryStats(limit = 60): Promise<DeliveryStats> {
  const stats: DeliveryStats = { total: 0, delivered: 0, failed: 0 }
  if (!twilioConfigured()) return stats
  try {
    const res = await fetch(
      `${API}/Accounts/${ACCOUNT_SID}/Messages.json?From=${encodeURIComponent(WA_SENDER)}&PageSize=${limit}`,
      { headers: { Authorization: authHeader() }, signal: AbortSignal.timeout(20000) }
    )
    if (!res.ok) return stats
    const data = (await res.json()) as { messages?: { status?: string }[] }
    for (const m of data.messages || []) {
      const s = String(m.status || '')
      stats.total++
      if (s === 'delivered' || s === 'read') stats.delivered++
      if (s === 'failed' || s === 'undelivered') stats.failed++
    }
  } catch {
    // בלם שלא הצליח לבדוק נחשב ללא מידע, והקורא מחליט מה לעשות
  }
  return stats
}
