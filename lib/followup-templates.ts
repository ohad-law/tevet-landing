/**
 * תבניות הודעות פולואפ אוטומטיות לוואטסאפ.
 *
 * רצף: יום 0 (חימום) → יום 3 (ערך) → יום 7 (פרידה רכה).
 * כללים קבועים: אסור "חינם", אסור "תשלום". מותר "ללא עלות". בלי מקף ארוך.
 */

export type Situation = 'fired' | 'resigned' | 'wage' | 'general'

const TIKTOK = 'https://www.tiktok.com/@ohad.tevet6'
const INSTAGRAM = 'https://www.instagram.com/ohad.tevet.adv/'
const SOCIAL = [`📱 טיקטוק: ${TIKTOK}`, `📷 אינסטגרם: ${INSTAGRAM}`]

/** מסווג את הסיטואציה לפי טקסט חופשי מהליד */
export function classifySituation(situation: string): Situation {
  const s = (situation || '').toLowerCase()
  if (s.includes('פוטר') || s.includes('פיטור')) return 'fired'
  if (s.includes('התפטר') || s.includes('התפטרות')) return 'resigned'
  if (s.includes('שכר') || s.includes('מזומן') || s.includes('תלוש')) return 'wage'
  return 'general'
}

// ── יום 3 — ערך, סמכות וסרטונים ─────────────────────────────────
function buildDay3(name: string): string {
  return [
    `${name}, רק רציתי לוודא שראית.`,
    `אני אוהד טבת, עו"ד לדיני עבודה ו*בודק שכר מוסמך מטעם משרד העבודה*. בדקנו כבר אלפי תלושים.`,
    ``,
    `יש לי בעמוד הרבה סרטונים שמלמדים איך לקרוא תלוש שכר ולזהות טעויות, מוזמן לצפות 👇`,
    ...SOCIAL,
    ``,
    `בדיקה ראשונית של התיק שלך ללא עלות.`,
    `מתי תרצה שנתאם שיחה קצרה בעניין המקרה שלך?`,
  ].join('\n')
}

// ── יום 7 — פרידה רכה, ערך לעתיד ─────────────────────────────────
function buildDay7(name: string): string {
  return [
    `${name}, אולי עכשיו פשוט לא הזמן המתאים, וזה בסדר גמור 🙂`,
    ``,
    `בתור עו"ד לדיני עבודה ובודק שכר מוסמך מטעם משרד העבודה, אני משתף בעמוד הרבה ידע וערך שיעזרו לך בעתיד. מוזמן לעקוב 👇`,
    ...SOCIAL,
    ``,
    `מאחל לך הצלחה בכל מה שתעשה 🤝`,
    ``,
    `_(אם לא רלוונטי, אפשר להשיב "הסר".)_`,
  ].join('\n')
}

/**
 * הודעת חימום ראשונית (יום 0). נשלחת ע"י /incoming לליד חדש,
 * וגם ע"י הרובוט ללידים משוחזרים שלא קיבלו חימום (followup_stage = -1).
 */
export function buildWarmMessage(fullName: string | null, situationText: string): string {
  const name = (fullName || '').split(' ')[0] || 'שלום'
  const situation = classifySituation(situationText)
  let hook: string
  switch (situation) {
    case 'fired':
      hook = 'ברוב מקרי הפיטורים מגיע יותר ממה שחושבים 💡'; break
    case 'resigned':
      hook = 'גם מי שהתפטר עשוי להיות זכאי לזכויות 💡'; break
    case 'wage':
      hook = 'בעיות שכר ותלושים הן בדיוק התחום שלנו 💡'; break
    default:
      hook = 'ייתכן שמגיע לך יותר ממה שחושבים 💡'
  }
  return [
    `שלום ${name} 👋`,
    `קיבלתי את פנייתך.`,
    hook,
    ``,
    `אני אוהד טבת, עו"ד לדיני עבודה ו*בודק שכר מוסמך מטעם משרד העבודה*. בדקנו כבר אלפי תלושים.`,
    ``,
    `מוזמן לצפות בעמוד שלי בינתיים 👇`,
    ...SOCIAL,
    ``,
    `מתי נוח לך לשיחה קצרה של 10 דקות?`,
  ].join('\n')
}

/**
 * מחזיר את הודעת הפולואפ לשלב שנשלח כעת.
 * 1 = יום 3 (ערך), 2 = יום 7 (פרידה).
 */
export function buildFollowupMessage(stage: number, fullName: string | null): string | null {
  const name = (fullName || '').split(' ')[0] || 'שלום'
  switch (stage) {
    case 1: return buildDay3(name)
    case 2: return buildDay7(name)
    default: return null
  }
}

/**
 * מספר הימים מהפולואפ הנוכחי עד הבא.
 * אחרי יום 3 (שלב 1) → עוד 4 ימים (יום 7). אחרי יום 7 (שלב 2) → null (סוף).
 */
export function daysUntilNextFollowup(stageJustSent: number): number | null {
  switch (stageJustSent) {
    case 1: return 4
    default: return null
  }
}

/** מילים שמסמנות בקשת הסרה מהרצף */
export function isOptOut(text: string): boolean {
  const t = (text || '').trim().toLowerCase()
  return t === 'הסר' || t === 'הסרה' || t === 'הפסק' || t === 'הפסיקו' ||
         t === 'stop' || t === 'תפסיק' || t === 'הורד אותי'
}
