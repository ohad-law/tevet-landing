import type { Metadata } from "next";
import Checklist from "./Checklist";

/**
 * הצ'קליסט. הדבר החינמי שנשלח לכל מי שמגיב, ושעולה למשרד אפס זמן.
 *
 * זה מחליף את הקריאה לפעולה הקודמת ("שלח לי תלוש ואבדוק"), שהייתה
 * מייצרת בדיקות חינם בלי סוף. כאן הגולש בודק את עצמו, ומי שמגלה
 * שחסרים לו רכיבים פונה למשרד כשהוא כבר משוכנע שיש לו כסף על
 * הרצפה. אותה בדיקה בדיוק, רק בשלב שבו היא שווה משהו.
 *
 * הדף פתוח לגמרי בכוונה, בלי טופס שחוסם את התוכן. מי שרק קרא
 * והלך קיבל ערך, והמשרד קיבל סמכות. מי שמצא חוסר פונה מעצמו.
 */

const TITLE = "5 הרכיבים שהכי חסרים בתלוש שכר";
const DESC =
  "צ'קליסט קצר לבדיקה עצמית, לפי 86 תיקים שנבדקו במשרד. " +
  "שתי דקות מול התלוש שלך, בלי להשאיר פרטים.";

export const metadata: Metadata = {
  title: `${TITLE} | אוהד טבת עו"ד`,
  description: DESC,
  openGraph: { title: TITLE, description: DESC, locale: "he_IL", type: "article" },
  alternates: { canonical: "/tlush" },
};

export default function Page() {
  return <Checklist />;
}
