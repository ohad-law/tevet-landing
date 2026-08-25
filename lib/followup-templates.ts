/**
 * תבניות הודעות פולואפ אוטומטיות לוואטסאפ.
 *
 * רצף: יום 0 (פתיחה) ואז יום 7 (פרידה רכה). זהו.
 *
 * הודעת יום 3 הוסרה ב-24/08/2026 בהחלטת אוהד. הסיבה: מרדכי ואוהד
 * מתקשרים ללידים בעצמם, והודעה אוטומטית באמצע הטווח הזה נשלחת
 * למי שכבר דיבר איתם ונראית כאילו לא זוכרים את השיחה.
 *
 * כללים קבועים, אין יוצא מן הכלל:
 *  - אסור "חינם" ואסור "ללא עלות". המודל הוא פגישת אבחון בתשלום.
 *  - אסור מקף ארוך ומקף בינוני, גם בהערות בקוד.
 *  - כל שורה בקופי: עד 4 מילים.
 *  - אסור נתון סטטיסטי שאין לו מקור מאומת.
 */

export type Situation = 'fired' | 'resigned' | 'wage' | 'general'

const TIKTOK = 'https://www.tiktok.com/@ohad.tevet6'
const INSTAGRAM = 'https://www.instagram.com/ohad.tevet.adv/'

/** מסווג את הסיטואציה לפי טקסט חופשי מהליד */
export function classifySituation(situation: string): Situation {
  const s = (situation || '').toLowerCase()
  if (s.includes('פוטר') || s.includes('פיטור')) return 'fired'
  if (s.includes('התפטר') || s.includes('התפטרות')) return 'resigned'
  if (s.includes('שכר') || s.includes('מזומן') || s.includes('תלוש')) return 'wage'
  return 'general'
}

/**
 * הודעת יום 0. נשלחת ע"י /incoming לליד חדש, וגם ע"י הרובוט
 * ללידים משוחזרים שלא קיבלו פתיחה (followup_stage = -1).
 *
 * פותחת בזהות ובהסמכה, כי זה הרגע היחיד שבטוח מגיע לפני
 * שאיש המכירות מתקשר. הבקשה היא תלושים, ולא הבטחת בדיקה.
 */
export function buildWarmMessage(fullName: string | null, _situationText: string): string {
  const name = (fullName || '').split(' ')[0] || 'שלום'
  return [
    `${name}, אני אוהד טבת.`,
    `עורך דין לדיני עבודה`,
    `ובודק שכר מוסמך`,
    `מטעם משרד העבודה.`,
    ``,
    `קיבלתי את הפרטים שלך.`,
    ``,
    `שלח לי 3 תלושים,`,
    `ואבדוק אם המקרה שלך`,
    `מתאים לתהליך שאנחנו עושים.`,
    ``,
    `לא כל מקרה מתאים.`,
    ``,
    `הכל חסוי 🔒`,
  ].join('\n')
}

/**
 * הודעת יום 7. פרידה רכה, בלי מכירה.
 * המטרה היחידה היא להשאיר את הליד בקהל האורגני לעתיד,
 * ולכן זו ההודעה היחידה ברצף שמכילה קישורים לרשתות.
 */
function buildDay7(name: string): string {
  return [
    `${name}, אולי עכשיו`,
    `פשוט לא הזמן.`,
    `וזה בסדר גמור.`,
    ``,
    `משפט אחד לפני שנפרדים:`,
    `תביעות שכר מתיישנות.`,
    `שבע שנים אחורה, וזהו.`,
    `כל חודש שעובר,`,
    `חודש נוסף נמחק.`,
    ``,
    `אני משתף הרבה ידע`,
    `על תלושי שכר וזכויות.`,
    `מוזמן לעקוב 👇`,
    ``,
    `📱 טיקטוק: ${TIKTOK}`,
    `📷 אינסטגרם: ${INSTAGRAM}`,
    ``,
    `בהצלחה בכל מה שתעשה 🤝`,
    ``,
    `_(לא רלוונטי? השב הסר.)_`,
  ].join('\n')
}

/**
 * מחזיר את הודעת הפולואפ לשלב שנשלח כעת.
 * שלב 1 = יום 7 (פרידה). אין שלב 2, הרצף נגמר אחריו.
 */
export function buildFollowupMessage(stage: number, fullName: string | null): string | null {
  const name = (fullName || '').split(' ')[0] || 'שלום'
  switch (stage) {
    case 1: return buildDay7(name)
    default: return null
  }
}

/**
 * מספר הימים מהפולואפ הנוכחי עד הבא.
 * אחרי יום 7 (שלב 1) הרצף נגמר, ולכן תמיד null.
 */
export function daysUntilNextFollowup(_stageJustSent: number): number | null {
  return null
}

/** מילים שמסמנות בקשת הסרה מהרצף */
export function isOptOut(text: string): boolean {
  const t = (text || '').trim().toLowerCase()
  return t === 'הסר' || t === 'הסרה' || t === 'הפסק' || t === 'הפסיקו' ||
         t === 'stop' || t === 'תפסיק' || t === 'הורד אותי'
}
