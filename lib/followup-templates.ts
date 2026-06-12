/**
 * תבניות הודעות פולואפ אוטומטיות לוואטסאפ.
 *
 * רצף: שלב 1 (יום +1), שלב 2 (יום +3), שלב 3 (יום +7).
 * כללים קבועים: אסור "חינם", אסור "תשלום". מותר "ללא עלות".
 *
 * שלב 0 (הודעת החימום הראשונה) נשלח מ-/api/leads/incoming ולא מכאן.
 */

export type Situation = 'fired' | 'resigned' | 'wage' | 'general'

/** מסווג את הסיטואציה לפי טקסט חופשי מהליד */
export function classifySituation(situation: string): Situation {
  const s = (situation || '').toLowerCase()
  if (s.includes('פוטר') || s.includes('פיטור')) return 'fired'
  if (s.includes('התפטר') || s.includes('התפטרות')) return 'resigned'
  if (s.includes('שכר') || s.includes('מזומן') || s.includes('תלוש')) return 'wage'
  return 'general'
}

// ── שלב 1 — יום אחרי: תזכורת עדינה ──────────────────────────────
function buildStage1(name: string, situation: Situation): string {
  const topic: Record<Situation, string> = {
    fired: 'בנוגע לפיטורים.',
    resigned: 'בנוגע לסיום ההעסקה.',
    wage: 'בנוגע לבדיקת השכר/התלושים.',
    general: 'בנוגע לפנייה שלך.',
  }
  const nudge: Record<Situation, string> = {
    fired: 'לא תמיד נוח לדבר, אבל חבל לפספס. מתי נוח לך לשיחה קצרה של 10 דקות?',
    resigned: 'גם מי שהתפטר לרוב זכאי לזכויות, וחבל לפספס. מתי נוח לך ל-10 דקות?',
    wage: 'חבל לפספס זכויות שאולי מגיעות לך. מתי נוח לך לשיחה קצרה?',
    general: 'חבל לפספס. מתי נוח לך לשיחה קצרה של 10 דקות?',
  }
  return [
    `היי ${name}, כאן אוהד טבת 👋`,
    `ניסיתי להשיג אותך ${topic[situation]}`,
    nudge[situation],
    ``,
    `ובינתיים, יש לי בעמוד הרבה סרטונים שמסבירים איך לקרוא תלוש שכר ולזהות טעויות 👇`,
    `📱 טיקטוק: https://www.tiktok.com/@ohad.tevet6`,
    `📷 אינסטגרם: https://www.instagram.com/ohad.tevet.adv/`,
  ].join('\n')
}

// ── שלב 2 — 3 ימים אחרי: ערך + אמון ─────────────────────────────
function buildStage2(name: string): string {
  return [
    `${name}, רק שתכיר.`,
    `אני עו"ד לדיני עבודה וגם *בודק שכר מוסמך*.`,
    ``,
    `עד שנדבר, מוזמן לצפות בעמוד שלי. העליתי שם הרבה סרטונים שמלמדים איך לקרוא ולנתח תלוש שכר, אני בטוח שזה יעזור לך 👇`,
    `📱 טיקטוק: https://www.tiktok.com/@ohad.tevet6`,
    `📷 אינסטגרם: https://www.instagram.com/ohad.tevet.adv/`,
    ``,
    `בדיקה ראשונית של התיק שלך ללא עלות.`,
    `מתי תרצה שנתאם שיחה קצרה בעניין המקרה שלך?`,
  ].join('\n')
}

// ── שלב 3 — 7 ימים אחרי: הזדמנות אחרונה, מכובד ──────────────────
function buildStage3(name: string): string {
  return [
    `${name}, אולי עכשיו פשוט לא הזמן המתאים, וזה בסדר גמור 🙂`,
    ``,
    `אתה מוזמן לעקוב אחרי העמוד שלי ולקבל הרבה ידע וערך שיעזרו לך בעתיד 👇`,
    `📱 טיקטוק: https://www.tiktok.com/@ohad.tevet6`,
    `📷 אינסטגרם: https://www.instagram.com/ohad.tevet.adv/`,
    ``,
    `מאחל לך הצלחה בכל מה שתעשה 🤝`,
    ``,
    `_(אם לא רלוונטי, אפשר להשיב "הסר".)_`,
  ].join('\n')
}

/**
 * מחזיר את הודעת הפולואפ לשלב הנתון (1-3).
 * stage מתייחס לפולואפ שעומד להישלח כעת.
 */
export function buildFollowupMessage(
  stage: number,
  fullName: string | null,
  situationText: string
): string | null {
  const name = (fullName || '').split(' ')[0] || 'שלום'
  const situation = classifySituation(situationText)
  switch (stage) {
    case 1: return buildStage1(name, situation)
    case 2: return buildStage2(name)
    case 3: return buildStage3(name)
    default: return null
  }
}

/**
 * הודעת חימום ראשונית (שלב 0). נשלחת ע"י /incoming לליד חדש,
 * וגם ע"י הרובוט ללידים משוחזרים שלא קיבלו חימום (followup_stage = -1).
 */
export function buildWarmMessage(fullName: string | null, situationText: string): string {
  const name = (fullName || '').split(' ')[0] || 'שלום'
  const situation = classifySituation(situationText)
  let hook: string
  switch (situation) {
    case 'fired':
      hook = 'לפי הסיטואציה שתיארת, ברוב מקרי הפיטורים מגיע יותר ממה שחושבים 💡'; break
    case 'resigned':
      hook = 'גם מי שהתפטר עשוי להיות זכאי לזכויות 💡'; break
    case 'wage':
      hook = 'בעיות שכר ותלושים הן בדיוק התחום שלנו, ויש לנו תוצאות 💡'; break
    default:
      hook = 'לפי הפרטים שמסרת, ייתכן שמגיע לך יותר ממה שחושבים 💡'
  }
  return [
    `שלום ${name} 👋`,
    ``,
    `קיבלתי את פנייתך.`,
    hook,
    ``,
    `אני *אוהד טבת*, עו"ד לדיני עבודה ובודק שכר מוסמך.`,
    ``,
    `מתי נוח לך לשיחה קצרה של 10 דקות?`,
    `אפשר לענות ישירות כאן 👇`,
  ].join('\n')
}

/**
 * מספר הימים מהפולואפ הנוכחי עד הבא.
 * אחרי שלב 1 → עוד יומיים (יום 3). אחרי שלב 2 → עוד 4 ימים (יום 7).
 * אחרי שלב 3 → null (מיצינו את הרצף).
 */
export function daysUntilNextFollowup(stageJustSent: number): number | null {
  switch (stageJustSent) {
    case 1: return 2
    case 2: return 4
    default: return null
  }
}

/** מילים שמסמנות בקשת הסרה מהרצף */
export function isOptOut(text: string): boolean {
  const t = (text || '').trim().toLowerCase()
  return t === 'הסר' || t === 'הסרה' || t === 'הפסק' || t === 'הפסיקו' ||
         t === 'stop' || t === 'תפסיק' || t === 'הורד אותי'
}
