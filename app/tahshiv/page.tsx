import type { Metadata } from "next";
import Picker from "./Picker";

const TITLE = "תחשיב חוסרים, בחירת ותק";
const DESC =
  "בחרו כמה שנים אתם עובדים וקבלו תחשיב חוסרים כתוב על תלושי השכר שלכם.";

export const metadata: Metadata = {
  title: `${TITLE} | אוהד טבת עו"ד`,
  description: DESC,
  openGraph: { title: TITLE, description: DESC, locale: "he_IL", type: "website" },
  alternates: { canonical: "/tahshiv" },
  robots: { index: false, follow: false },
};

export default function Page() {
  return <Picker />;
}
