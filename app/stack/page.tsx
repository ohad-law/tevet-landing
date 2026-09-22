import type { Metadata } from "next";
import StackGuide from "./StackGuide";

const TITLE = "המערכות שאני מריץ במשרד עורכי הדין שלי";
const DESC =
  "הרשימה המלאה של הכלים והאוטומציות שבניתי למשרד דיני עבודה: CRM, " +
  "בוטים, סוכנת טלפון ו-AI. מה חי, מה בבנייה ומה נשרף בדרך.";

export const metadata: Metadata = {
  title: `${TITLE} | אוהד טבת עו"ד`,
  description: DESC,
  openGraph: { title: TITLE, description: DESC, locale: "he_IL", type: "article" },
  alternates: { canonical: "/stack" },
};

export default function Page() {
  return <StackGuide />;
}
