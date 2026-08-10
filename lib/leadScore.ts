/**
 * דירוג לידים — נוסחה אחת לכל המקורות (דף נחיתה, פייסבוק, טיקטוק).
 *
 * הרעיון: ליד שווה כסף כשיחסי העבודה הסתיימו ויש ותק.
 * עובד שעדיין מועסק ו"סתם רוצה לבדוק" הוא כמעט תמיד לא תיק.
 */

export type LeadTier = "A" | "B" | "C" | "D";

const TENURE_POINTS: Record<string, { minYears: number; points: number }> = {
  "מעל 7 שנים": { minYears: 7, points: 3 },
  "3 עד 7 שנים": { minYears: 3, points: 2 },
  "שנה עד 3 שנים": { minYears: 1, points: 1 },
  "פחות משנה": { minYears: 0, points: 0 },
};

/** סיטואציות שבהן יחסי העבודה הסתיימו — שם נמצא רוב הכסף */
const ENDED_MARKERS = ["פוטרתי", "התפטרתי", "מזומן"];

/** ענפים עם צווי הרחבה והפרות שיטתיות — שווי תיק גבוה מהממוצע */
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
    (ended ? 9 : 0) + (tenure?.points ?? 0) * 2 + (hotSector ? 2 : 0);

  let tier: LeadTier;
  if (!ended) tier = "D";
  else if (!tenure) tier = "C";
  else if (tenure.minYears >= 3) tier = "A";
  else if (tenure.minYears >= 1) tier = "B";
  else tier = "C";

  return { score, tier };
}

/**
 * פורמט ההערות — זהה לפורמט שמגיע מטופס הלידים של פייסבוק,
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
