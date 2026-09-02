/**
 * Green API, WhatsApp client
 * Sends messages via Green API (instance 7105435035)
 */

const GREEN_INSTANCE = process.env.GREEN_API_INSTANCE!
const GREEN_TOKEN = process.env.GREEN_API_TOKEN!
/**
 * ההוסט הייעודי של ה-instance ולא הכתובת המשותפת.
 * api.greenapi.com מפיל חיבורים לסירוגין; הכתובת שמתחילה בארבע הספרות
 * הראשונות של מספר ה-instance היא זו ש-Green API ממליצה עליה, והיא יציבה.
 */
const BASE_URL = () =>
  `https://${String(GREEN_INSTANCE).slice(0, 4)}.api.greenapi.com/waInstance${GREEN_INSTANCE}`

const configured = () => Boolean(GREEN_INSTANCE && GREEN_TOKEN)

export async function sendWhatsApp(phone: string, message: string): Promise<boolean> {
  if (!GREEN_INSTANCE || !GREEN_TOKEN) {
    console.warn('[WhatsApp] Green API not configured')
    return false
  }
  try {
    const chatId = phone.includes('@') ? phone : `${phone}@c.us`
    const res = await fetch(`${BASE_URL()}/sendMessage/${GREEN_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId, message }),
    })
    return res.ok
  } catch (e) {
    console.error('[WhatsApp] Send error:', e)
    return false
  }
}

/**
 * האם למספר יש בכלל חשבון וואטסאפ.
 *
 * למה זה קריטי: שליחה חוזרת למספרים שאין להם וואטסאפ היא אחד הסימנים
 * שמטא סופרת כספאם, וזה בדיוק הדפוס שמביא חסימה. בנוסף זה חוסך אבחוני שווא,
 * כי הודעה למספר בלי וואטסאפ נכשלת בשקט והצ'אט בכרטיס נשאר ריק.
 *
 * נכשל לטובת השליחה: אם ה-API לא עונה מחזירים true, כדי שתקלת רשת
 * לא תעצור פולואפים לגיטימיים.
 */
export async function hasWhatsApp(phone: string): Promise<boolean> {
  if (!configured()) return false
  const phoneNorm = phone.replace(/\D/g, '')
  if (phoneNorm.length < 10) return false
  try {
    const res = await fetch(`${BASE_URL()}/checkWhatsapp/${GREEN_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: Number(phoneNorm) }),
      // תקרת זמן: הבדיקה לא תתקע לעולם את קליטת הליד. אם Green API מתעכב,
      // נשלח בכל מקרה. ליד שאבד גרוע בהרבה מהודעה מיותרת אחת.
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return true
    const data = await res.json()
    return data?.existsWhatsapp !== false
  } catch (e) {
    console.error('[WhatsApp] checkWhatsapp error:', e)
    return true
  }
}

export interface OutgoingHealth {
  checked: number
  reached: number
  healthy: boolean
}

/**
 * גלאי חסימה שקטה (yellowCard).
 *
 * כשמטא מסמנת את המספר, ה-API ממשיך להחזיר 200 ו-sent בזמן שההודעות
 * נבלעות ולא מגיעות לאיש. הדרך היחידה לדעת היא הסטטוס האמיתי: רק
 * delivered או read מוכיחים מסירה. בודקים רק הודעות שעברה עליהן שעה,
 * כדי לא לפסול הודעות שפשוט עוד בדרך.
 */
export async function outgoingHealth(minutes = 1440): Promise<OutgoingHealth> {
  const unknown: OutgoingHealth = { checked: 0, reached: 0, healthy: true }
  if (!configured()) return unknown
  try {
    const res = await fetch(`${BASE_URL()}/lastOutgoingMessages/${GREEN_TOKEN}?minutes=${minutes}`, {
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return unknown
    const rows = await res.json()
    if (!Array.isArray(rows)) return unknown

    const hourAgo = Date.now() / 1000 - 3600
    const settled = rows.filter((r: { timestamp?: number }) => (r?.timestamp ?? 0) < hourAgo)
    const reached = settled.filter((r: { statusMessage?: string }) =>
      r?.statusMessage === 'delivered' || r?.statusMessage === 'read'
    ).length

    return {
      checked: settled.length,
      reached,
      // חשד רק כשיש מדגם משמעותי ואף הודעה אחת לא הגיעה
      healthy: settled.length < 3 || reached > 0,
    }
  } catch (e) {
    console.error('[WhatsApp] outgoingHealth error:', e)
    return unknown
  }
}

/** Set the incoming messages webhook URL in Green API */
export async function setIncomingWebhook(webhookUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL()}/SetSettings/${GREEN_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webhookUrl }),
    })
    return res.ok
  } catch {
    return false
  }
}
