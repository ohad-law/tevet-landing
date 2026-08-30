/**
 * דירוג לידים, נוסחה אחת לכל המקורות (דף נחיתה, פייסבוק, טיקטוק).
 *
 * הרעיון: ליד שווה כסף כשיחסי העבודה הסתיימו ויש ותק.
 * עובד שעדיין מועסק ו"סתם רוצה לבדוק" הוא כמעט תמיד לא תיק.
 */

export type LeadTier = "A" | "B" | "C" | "D";

/**
 * הניקוד בסולם 0,100, ולא בסולם פנימי שרירותי.
 * ה-CRM מסמן "ליד חם" מ-75 ומעלה, ולכן הסולם מכויל כך שכל ליד
 * שיחסי העבודה שלו הסתיימו ויש לו ותק של שלוש שנים ומעלה
 * חוצה את הסף מעצמו (50 + 25).
 */
const ENDED_POINTS = 50;
const SECTOR_POINTS = 15;

const TENURE_POINTS: Record<string, { minYears: number; points: number }> = {
  "מעל 7 שנים": { minYears: 7, points: 35 },
  "3 עד 7 שנים": { minYears: 3, points: 25 },
  "שנה עד 3 שנים": { minYears: 1, points: 15 },
  "פחות משנה": { minYears: 0, points: 0 },
};

/** סיטואציות שבהן יחסי העבודה הסתיימו, שם נמצא רוב הכסף */
const ENDED_MARKERS = ["פוטרתי", "התפטרתי", "מזומן"];

/** ענפים עם צווי הרחבה והפרות שיטתיות, שווי תיק גבוה מהממוצע */
const HIGH_VALUE_SECTORS = [
  "ניקיון",
  "בניין",
  "שמירה",
  "אבטחה",
  "הובלה",
  "נהג",
  "מסעדנ",
  "שירות",
];

export function scoreLead(input: {
  years?: string | null;
  situation?: string | null;
  field?: string | null;
}): { score: number; tier: LeadTier } {
  const years = input.years ?? "";
  const situation = input.situation ?? "";
  const field = input.field ?? "";

  const ended = ENDED_MARKERS.some((m) => situation.includes(m));
  const tenure = TENURE_POINTS[years];
  const hotSector = HIGH_VALUE_SECTORS.some((s) => field.includes(s));

  const score =
    (ended ? ENDED_POINTS : 0) +
    (tenure?.points ?? 0) +
    (hotSector ? SECTOR_POINTS : 0);

  let tier: LeadTier;
  if (!ended) tier = "D";
  else if (!tenure) tier = "C";
  else if (tenure.minYears >= 3) tier = "A";
  else if (tenure.minYears >= 1) tier = "B";
  else tier = "C";

  return { score, tier };
}

/**
 * פורמט ההערות, זהה לפורמט שמגיע מטופס הלידים של פייסבוק,
 * כדי שכל הלידים ייראו אותו דבר ב-CRM ובסקריפטים.
 */
export function buildLeadNotes(input: {
  years?: string | null;
  field?: string | null;
  situation?: string | null;
}): string {
  const parts: string[] = [];
  if (input.years) parts.push(`שנות עבודה: ${input.years}`);
  if (input.field) parts.push(`תחום: ${input.field}`);
  if (input.situation) parts.push(`סיטואציה: ${input.situation}`);
  return parts.join(" | ");
}

/* ─────────────────────────────────────────────────────────────
 * עיצומים כספיים, קו מוצר נפרד
 *
 * כאן הליד הוא מעסיק ולא עובד, ולכן הנוסחה שונה לגמרי.
 * מה שקובע את שווי הליד זה שני דברים: באיזה שלב בהליך הוא
 * נמצא, וכמה כסף על הפרק.
 *
 * השלב חשוב יותר מהסכום, כי להליך יש מועדים קשיחים:
 * 30 יום להגיב על הודעת כוונת חיוב, 28 יום להגיש ערר על
 * החלטת הממונה, ו-45 יום לערער לבית הדין. מי שכבר שילם,
 * הדלת נסגרה והוא ליד של מניעה ולא של טיפול.
 * ─────────────────────────────────────────────────────────── */

/** השלבים בהליך, מהמוקדם למאוחר. הערך הוא מה שנשלח מהטופס. */
export const ITZUM_STAGES = [
  "קיבלתי הודעה על כוונת חיוב",
  "קיבלתי דרישת תשלום או החלטת ממונה",
  "זומנתי לחקירה או למתן גרסה",
  "הייתה ביקורת, טרם קיבלתי הודעה",
  "כבר שילמתי את העיצום",
  "לא קיבלתי כלום, רוצה להיערך מראש",
] as const;

/** טווחי סכומים. הערך הוא מה שנשלח מהטופס. */
export const ITZUM_AMOUNTS = [
  "עד 20,000 ₪",
  "20,000 עד 50,000 ₪",
  "50,000 עד 150,000 ₪",
  "מעל 150,000 ₪",
  "עדיין לא יודע",
] as const;

/** דחיפות: כמה חלון הפעולה פתוח. זה מה שקובע אם מתקשרים היום. */
const STAGE_POINTS: Record<string, number> = {
  "קיבלתי הודעה על כוונת חיוב": 55,
  "קיבלתי דרישת תשלום או החלטת ממונה": 50,
  "זומנתי לחקירה או למתן גרסה": 45,
  "הייתה ביקורת, טרם קיבלתי הודעה": 30,
  "כבר שילמתי את העיצום": 10,
  "לא קיבלתי כלום, רוצה להיערך מראש": 15,
};

/** שווי התיק. סכום גבוה מצדיק שכר טרחה גבוה יותר. */
const AMOUNT_POINTS: Record<string, number> = {
  "מעל 150,000 ₪": 45,
  "50,000 עד 150,000 ₪": 35,
  "20,000 עד 50,000 ₪": 22,
  "עד 20,000 ₪": 10,
  "עדיין לא יודע": 20,
};

/** שלבים שבהם המועד עדיין פתוח, ולכן חייבים לחזור באותו יום */
const URGENT_STAGES = [
  "קיבלתי הודעה על כוונת חיוב",
  "קיבלתי דרישת תשלום או החלטת ממונה",
  "זומנתי לחקירה או למתן גרסה",
];

export function scoreItzumLead(input: {
  stage?: string | null;
  amount?: string | null;
}): { score: number; tier: LeadTier; urgent: boolean } {
  const stage = input.stage ?? "";
  const amount = input.amount ?? "";

  const score = (STAGE_POINTS[stage] ?? 0) + (AMOUNT_POINTS[amount] ?? 0);
  const urgent = URGENT_STAGES.includes(stage);

  let tier: LeadTier;
  if (!urgent) tier = score >= 40 ? "C" : "D";
  else if (score >= 85) tier = "A";
  else if (score >= 65) tier = "B";
  else tier = "C";

  return { score, tier, urgent };
}

export function buildItzumNotes(input: {
  company?: string | null;
  stage?: string | null;
  amount?: string | null;
}): string {
  const parts: string[] = [];
  if (input.company) parts.push(`חברה: ${input.company}`);
  if (input.stage) parts.push(`שלב: ${input.stage}`);
  if (input.amount) parts.push(`סכום העיצום: ${input.amount}`);
  return parts.join(" | ");
}
