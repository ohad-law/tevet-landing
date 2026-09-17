/**
 * POST /api/webhooks/upay
 *
 * מקבל מ-UPAY הודעה על תשלום שהתקבל ("קישור לעדכון שרת" בעמוד התשלום).
 * מסמן את הליד כמי ששילם, רושם פעילות, ומודיע לאוהד בוואטסאפ.
 *
 * 🚨 מבנה ההודעה של UPAY אינו מתועד ולא נמסר לנו.
 * לכן הראוט מפרסר בשלוש דרכים (JSON, טופס, פרמטרים בכתובת),
 * שומר את המטען הגולמי כפי שהוא, ומחלץ שדות לפי דפוס ולא לפי שם.
 * כשתגיע ההודעה האמיתית הראשונה, היא תופיע במלואה בהערה על הליד
 * וגם בהתראה לאוהד, ואז אפשר להדק את הפרסור.
 *
 * אבטחה: הכתובת אינה מפורסמת בשום מקום, וכתיבה מתבצעת רק כשהטלפון
 * שבמטען תואם ליד קיים. בנוסף אפשר להגדיר UPAY_WEBHOOK_SECRET,
 * ואז נדרש שהפרמטר k בכתובת יתאים. אוהד מקבל התראה על כל תשלום,
 * כך שחיוב שלא הוא יזם ייראה מיד.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendWhatsApp } from '@/lib/whatsapp'
import { normalizePhone } from '@/lib/base44'

const OHAD_WA = '972542274497' // hard-coded, אסור לשנות דרך env var למניעת דליפה

/** מעל הסכום הזה מדובר בדמי פתיחת תיק ולא בפגישת ייעוץ */
const OPENING_FEE_THRESHOLD = 4000

type LeadTable = 'leads' | 'leads_talush'
type Supa = ReturnType<typeof createServiceClient>

/** קורא את הגוף בכל אחד משלושת הפורמטים האפשריים */
async function readPayload(req: NextRequest): Promise<Record<string, string>> {
  const out: Record<string, string> = {}

  req.nextUrl.searchParams.forEach((v, k) => { out[k] = v })

  const raw = await req.text().catch(() => '')
  if (!raw) return out

  try {
    const j = JSON.parse(raw)
    if (j && typeof j === 'object') {
      for (const [k, v] of Object.entries(j as Record<string, unknown>)) {
        out[k] = typeof v === 'object' ? JSON.stringify(v) : String(v)
      }
      return out
    }
  } catch {
    // לא JSON, ננסה טופס
  }

  try {
    new URLSearchParams(raw).forEach((v, k) => { out[k] = v })
  } catch {
    out._raw = raw.slice(0, 2000)
  }
  if (Object.keys(out).length === 0) out._raw = raw.slice(0, 2000)
  return out
}

/** מחפש בכל הערכים משהו שנראה כמו טלפון ישראלי */
function findPhone(p: Record<string, string>): string | null {
  for (const v of Object.values(p)) {
    const digits = String(v).replace(/\D/g, '')
    if (/^(972|0)5\d{8}$/.test(digits)) return normalizePhone(digits)
  }
  return null
}

/** מחפש בכל הערכים משהו שנראה כמו כתובת מייל */
function findEmail(p: Record<string, string>): string | null {
  for (const v of Object.values(p)) {
    const m = String(v).match(/[\w.+-]+@[\w-]+\.[\w.]+/)
    if (m) return m[0].toLowerCase()
  }
  return null
}

/** מחפש את סכום העסקה. מעדיף שדה ששמו מרמז על סכום */
function findAmount(p: Record<string, string>): number | null {
  const named = Object.entries(p).find(([k]) =>
    /(sum|amount|price|total|schum)/i.test(k))
  const candidates = named ? [named[1]] : Object.values(p)
  for (const v of candidates) {
    const n = Number(String(v).replace(/[^\d.]/g, ''))
    if (Number.isFinite(n) && n >= 50 && n <= 200000) return n
  }
  return null
}

/**
 * האם זה תשלום על תחשיב חוסרים.
 * התיאור שנקבע בעמודי התשלום הוא "תחשיב חוסרים שנה X", ולכן די
 * לחפש את המילה. אם לא נמצאה, ההתנהגות נשארת בדיוק כפי שהייתה.
 */
function isTahshiv(p: Record<string, string>): boolean {
  return Object.values(p).some(v => /תחשיב/.test(String(v)))
}

/**
 * הקישור שנשלח ללקוח מיד אחרי התשלום, להעלאת התלושים, דוחות
 * הנוכחות ודוחות הפנסיה.
 *
 * 🚨 למה בוואטסאפ ולא בדף החזרה של UPAY: דף החזרה מוגדר בתוך כל
 * עמוד תשלום בנפרד, ושינוי שלו אומר לגעת בשבעה קישורים. הווהבוק
 * הזה כבר מוגדר בכולם, ולכן ההודעה מגיעה בלי לגעת בכלום.
 * בונוס: הקישור נשאר בוואטסאפ של הלקוח, ודף חזרה נעלם ברגע
 * שסוגרים את הכרטיסייה.
 */
const UPLOAD_URL = 'https://tevet-landing.vercel.app/tik'

/** מחיר התחשיב לכל שנת ותק. ראה rule_tevet_price_list. */
const PRICE_PER_YEAR = 297

/**
 * כמה שנות ותק נקנו, לפי הסכום ששולם.
 *
 * 🚨 למה זה חשוב: בלי זה הלקוח מעלה שבע שנות תלושים גם כשהוא
 * שילם על שלוש, ואז הוא מצפה לעבודה שלא שילם עליה. השנים נכנסות
 * גם לגוף ההודעה וגם לכתובת, כדי שדף ההעלאה יגיד לו את המספר
 * שלו במקום "עד שבע שנים".
 */
function yearsFromAmount(amount: number | null): number | null {
  if (!amount) return null
  const y = Math.round(amount / PRICE_PER_YEAR)
  if (y < 1 || y > 7) return null
  // סטייה של עד עשרה שקלים, למקרה של עיגול או עמלה
  return Math.abs(y * PRICE_PER_YEAR - amount) <= 10 ? y : null
}

function buildUploadMessage(firstName: string, years: number | null): string {
  const link = years ? `${UPLOAD_URL}?y=${years}` : UPLOAD_URL
  const scope = years
    ? [
        `שילמת על ${years === 1 ? 'שנה אחת' : `${years} שנים`},`,
        `אז צריך את התלושים`,
        `של ${years === 1 ? 'השנה האחרונה' : `${years} השנים האחרונות`}.`,
      ]
    : [`צריך את התלושים`, `של התקופה ששילמת עליה.`]

  return [
    `${firstName}, התשלום התקבל.`,
    ``,
    `עכשיו שלב אחד אחרון,`,
    `להעלות את המסמכים:`,
    ``,
    `${link}`,
    ``,
    ...scope,
    ``,
    `ואם יש, גם נוכחות`,
    `ודוחות פנסיה.`,
    ``,
    `צילום מהטלפון מספיק,`,
    `אבל עדיף קובץ PDF.`,
    `ואם צילום,`,
    `שיהיה באיכות הכי גבוהה.`,
    ``,
    `התחשיב אצלך`,
    `תוך שבעה ימי עסקים.`,
  ].join('\n')
}

/** מחפש מזהה עסקה או אסמכתה */
function findRef(p: Record<string, string>): string | null {
  const hit = Object.entries(p).find(([k]) =>
    /(transaction|deal|ref|asmachta|confirm|invoice|id)/i.test(k) && p[k])
  return hit ? String(hit[1]).slice(0, 120) : null
}

/**
 * 🚨 אסור להשתמש כאן ב-maybeSingle. הוא זורק שגיאה כשיותר משורה אחת
 * תואמת, ובמערכת יש לידים כפולים עם אותו טלפון. אומת בפועל 31/08/2026:
 * תשלום לא שויך לליד רק מפני שהיה לו כפיל. לוקחים את החדש ביותר.
 */
async function findLead(supabase: Supa, phone: string | null, email: string | null) {
  for (const table of ['leads', 'leads_talush'] as LeadTable[]) {
    if (phone) {
      const local = '0' + phone.slice(3)
      const { data } = await supabase
        .from(table)
        .select('id, full_name, phone, status')
        .or(`phone.eq.${phone},phone.eq.${local}`)
        .order('created_at', { ascending: false })
        .limit(1)
      if (data && data.length > 0) return { ...data[0], table }
    }
    if (email) {
      const { data } = await supabase
        .from(table)
        .select('id, full_name, phone, status')
        .eq('email', email)
        .order('created_at', { ascending: false })
        .limit(1)
      if (data && data.length > 0) return { ...data[0], table }
    }
  }
  return null
}

export async function POST(req: NextRequest) {
  const payload = await readPayload(req)
  const asText = JSON.stringify(payload, null, 1).slice(0, 1500)

  // תמיד לרשום ביומן, גם אם שום דבר אחר לא יצליח
  console.log('[upay] מטען שהתקבל:', asText)

  const secret = process.env.UPAY_WEBHOOK_SECRET
  const authorized = !secret || payload.k === secret

  try {
    const supabase = createServiceClient()

    const phone = findPhone(payload)
    const email = findEmail(payload)
    const amount = findAmount(payload)
    const ref = findRef(payload)
    const lead = await findLead(supabase, phone, email)

    // ── לא זוהה ליד, או שהבקשה אינה מאומתת: להודיע בלי לכתוב ──
    if (!lead || !authorized) {
      const why = !authorized ? 'בקשה לא מאומתת' : 'לא זוהה ליד'
      console.warn(`[upay] ${why}:`, asText)
      await sendWhatsApp(OHAD_WA, [
        `🟡 תשלום ב-UPAY, ${why}`,
        ``,
        amount ? `סכום: ${amount} ש"ח` : `סכום לא זוהה`,
        phone ? `טלפון: ${phone}` : `בלי טלפון`,
        ``,
        `לא סומן בכרטיס.`,
        `צריך לעדכן ידנית.`,
        ``,
        asText.slice(0, 700),
      ].join('\n')).catch(() => {})

      // הלקוח שילם, גם אם לא מצאנו לו כרטיס. מגיע לו לדעת לאן
      // לשלוח את המסמכים, ואסור שכשל זיהוי פנימי יעצור אותו.
      if (authorized && phone) {
        await sendWhatsApp(phone, buildUploadMessage('שלום', yearsFromAmount(amount))).catch(() => {})
      }
      return NextResponse.json({ ok: true, matched: false })
    }

    // ── סכום גדול הוא דמי פתיחת תיק, אחרת פגישת ייעוץ ──
    const isOpeningFee = (amount ?? 0) >= OPENING_FEE_THRESHOLD
    // תחשיב חוסרים נמכר בין 297 ל-2,079, כלומר תמיד מתחת לסף.
    // בלי ההבחנה הזו לקוח משלם היה מסומן "פגישה נקבעה" במקום
    // "הפך ללקוח", והכרטיס שלו לא היה משקף שיש עבודה לעשות.
    const tahshiv = isTahshiv(payload)
    const now = new Date().toISOString()

    const update: Record<string, unknown> = { payment_provider_ref: ref }
    if (tahshiv) {
      update.consultation_paid_at = now
      if (amount) update.consultation_amount = amount
      update.status = 'הפך ללקוח'
    } else if (isOpeningFee) {
      update.opening_fee_paid_at = now
      if (amount) update.opening_fee_amount = amount
      update.status = 'הפך ללקוח'
    } else {
      update.consultation_paid_at = now
      if (amount) update.consultation_amount = amount
      update.status = 'פגישה נקבעה'
    }

    const { error } = await supabase.from(lead.table).update(update).eq('id', lead.id)
    if (error) console.error('[upay] עדכון הליד נכשל:', error)

    // ── רישום הפעילות, כולל המטען הגולמי לצורך אבחון ──
    await supabase.from('lead_activities').insert({
      lead_id: lead.id,
      activity_type: tahshiv
        ? 'שולם תחשיב חוסרים'
        : isOpeningFee ? 'שולמו דמי פתיחה' : 'שולם ייעוץ',
      amount: amount ?? null,
      note: `תשלום התקבל דרך UPAY${ref ? `, אסמכתה ${ref}` : ''}\n${asText}`,
      user_email: null,
    }).then(({ error: e }) => {
      if (e) console.error('[upay] רישום הפעילות נכשל:', e)
    })

    // ── התראה לאוהד ──
    const name = (lead.full_name || '').split(' ')[0] || 'ליד'
    await sendWhatsApp(OHAD_WA, [
      `💰 התקבל תשלום!`,
      ``,
      `${name} שילם${amount ? ` ${amount} ש"ח` : ''}.`,
      tahshiv ? `תחשיב חוסרים.` : isOpeningFee ? `דמי פתיחת תיק.` : `פגישת ייעוץ.`,
      ``,
      `טלפון: ${lead.phone}`,
      ref ? `אסמכתה: ${ref}` : '',
      ``,
      `הכרטיס עודכן לבד. 🎉`,
      tahshiv ? `\nנשלח אליו קישור להעלאת המסמכים.` : '',
    ].filter(l => l !== '').join('\n')).catch(() => {})

    // ── ההודעה ללקוח עצמו: לאן להעלות את המסמכים ──
    // יוצאת אחרי ההתראה לאוהד, כדי שגם אם היא תיכשל אוהד כבר יודע
    // שהתקבל תשלום ויוכל לשלוח ידנית.
    if (lead.phone) {
      await sendWhatsApp(
        normalizePhone(String(lead.phone).replace(/\D/g, '')),
        buildUploadMessage(name, yearsFromAmount(amount))
      ).catch(() => {})
    }

    return NextResponse.json({ ok: true, matched: true, lead_id: lead.id })
  } catch (e) {
    console.error('[upay] שגיאה:', e)
    // מחזירים 200 בכל מקרה, כדי ש-UPAY לא תנסה שוב ושוב
    return NextResponse.json({ ok: true })
  }
}

/** UPAY עשויה לפנות ב-GET לבדיקת זמינות */
export async function GET() {
  return NextResponse.json({ ok: true, service: 'upay-webhook' })
}
