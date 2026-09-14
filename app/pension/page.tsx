import type { Metadata } from "next";
import PensionGuide from "./PensionGuide";

const TITLE = "איך לבדוק אם ההפקדות לפנסיה שלכם באמת נכנסו לקופה";
const DESC =
  "מדריך קצר לבדיקה עצמית: מה שכתוב בתלוש על הפרשות הפנסיה לא תמיד " +
  "תואם למה שבאמת נכנס לקופה. 4 שלבים לבדוק בעצמכם, תוך חמש דקות.";

export const metadata: Metadata = {
  title: `${TITLE} | אוהד טבת עו"ד`,
  description: DESC,
  openGraph: { title: TITLE, description: DESC, locale: "he_IL", type: "article" },
  alternates: { canonical: "/pension" },
};

export default function Page() {
  return <PensionGuide />;
}
