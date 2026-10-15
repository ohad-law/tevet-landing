import type { Metadata } from "next";
import NevoGuide from "./NevoGuide";

const TITLE = "איך מחברים את נבו ל-Claude, ומה בודקים בכל תוצאה";
const DESC =
  "מדריך קצר לעורכי דין: חיבור מאגר נבו ל-Claude, שאלה ראשונה, " +
  "ורשימת בדיקה לפני שמצטטים. כל מקור נפתח, ואף ציטוט לא נכנס בלי אימות.";

export const metadata: Metadata = {
  title: `${TITLE} | אוהד טבת עו"ד`,
  description: DESC,
  openGraph: { title: TITLE, description: DESC, locale: "he_IL", type: "article" },
  alternates: { canonical: "/nevo" },
};

export default function Page() {
  return <NevoGuide />;
}
