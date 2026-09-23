/**
 * TikTok Events API, שליחת המרות מהשרת.
 *
 * למה זה קיים בכלל, ולמה דווקא אצל אוהד:
 * הפיקסל שבדפדפן מפספס כל מי שחוסם עוגיות, גולש במצב פרטי, או
 * שהדפדפן שלו מונע מעקב. הצד השרתי לא מושפע מזה. טיקטוק מדווחת
 * על שיפור של כ-15 אחוז ב-CPA כששני הערוצים עובדים יחד.
 *
 * 🚨 והסיבה האמיתית: אירוע הרכישה של אוהד קורה ב-UPAY, כלומר
 * מחוץ לאתר לגמרי. הדפדפן של הלקוח לא עובר דרך שום דף שלנו
 * ברגע התשלום, ולכן הפיקסל לעולם לא יראה אותו בוודאות. הווהבוק
 * של UPAY הוא המקום היחיד שבו אנחנו *יודעים* שהתקבל כסף.
 *
 * ⚠️ כבוי כל עוד TIKTOK_ACCESS_TOKEN אינו מוגדר. בלי הטוקן
 * הפונקציה מדלגת בשקט ולא שוברת שום זרימה קיימת.
 *
 * הטוקן מגיע מ-Events Manager, במסך ההקמה של הפיקסל, שלב
 * "Implement Events API". ראה project_tiktok_ads_setup.
 */
import crypto from 'crypto'

const PIXEL_ID = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID ?? ''
const ACCESS_TOKEN = process.env.TIKTOK_ACCESS_TOKEN ?? ''
const ENDPOINT = 'https://business-api.tiktok.com/open_api/v1.3/event/track/'

/** טיקטוק דורשת SHA256 על ערך מנורמל. טלפון חייב להיות בפורמט E.164. */
function hash(value: string): string {
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex')
}

/** 0501234567 או 972501234567 הופכים ל-+972501234567 */
function toE164(phone: string): string | null {
  const d = String(phone).replace(/\D/g, '')
  if (!d) return null
  if (d.startsWith('972')) return `+${d}`
  if (d.startsWith('0')) return `+972${d.slice(1)}`
  if (d.length === 9) return `+972${d}`
  return `+${d}`
}

export type TikTokEvent = {
  /** שם האירוע בתקן טיקטוק: CompletePayment, SubmitForm, ViewContent */
  event: string
  /** מזהה ייחודי לאירוע. חייב להיות זהה לזה שבדפדפן כדי למנוע ספירה כפולה */
  eventId?: string
  phone?: string | null
  email?: string | null
  value?: number | null
  currency?: string
  contentName?: string
  /** כתובת הדף שממנה נובע האירוע */
  url?: string
}

/**
 * שולח אירוע יחיד. לעולם לא זורק, כי מדידה אסור שתפיל תשלום.
 * מחזיר true רק כשטיקטוק אישרה קליטה.
 */
export async function sendTikTokEvent(e: TikTokEvent): Promise<boolean> {
  if (!PIXEL_ID || !ACCESS_TOKEN) {
    console.log('[tiktok-events] לא מוגדר, מדלג:', e.event)
    return false
  }

  const e164 = e.phone ? toE164(e.phone) : null
  const user: Record<string, string> = {}
  if (e164) user.phone = hash(e164)
  if (e.email) user.email = hash(e.email)

  // בלי שום מזהה משתמש אין לטיקטוק למי לשייך, ושליחה כזו רק
  // מזהמת את הדיווח בלי להוסיף ייחוס.
  if (Object.keys(user).length === 0) {
    console.warn('[tiktok-events] אין טלפון ואין מייל, מדלג:', e.event)
    return false
  }

  const body = {
    event_source: 'web',
    event_source_id: PIXEL_ID,
    data: [
      {
        event: e.event,
        event_time: Math.floor(Date.now() / 1000),
        ...(e.eventId ? { event_id: e.eventId } : {}),
        user,
        properties: {
          ...(e.value != null ? { value: e.value } : {}),
          currency: e.currency ?? 'ILS',
          ...(e.contentName ? { content_name: e.contentName } : {}),
        },
        page: { url: e.url ?? 'https://tevet-landing.vercel.app' },
      },
    ],
  }

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Access-Token': ACCESS_TOKEN,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    })
    const json = (await res.json()) as { code?: number; message?: string }
    if (json.code === 0) {
      console.log('[tiktok-events] נשלח:', e.event)
      return true
    }
    console.error('[tiktok-events] נדחה:', json.code, json.message)
    return false
  } catch (err) {
    console.error('[tiktok-events] שגיאה:', err)
    return false
  }
}
