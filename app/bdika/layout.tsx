import type { Metadata } from "next";

export const metadata: Metadata = {
  title: 'בדיקת תלוש שכר | עו"ד אוהד טבת, בודק שכר מוסמך',
  description:
    "עבדת שם שנים. כמה מזה באמת קיבלת? שלח תלוש אחד ואנתח אותו. עו\"ד לדיני עבודה ובודק שכר מוסמך מטעם משרד העבודה.",
  openGraph: {
    title: "עבדת שם שנים. כמה מזה באמת קיבלת?",
    description:
      "שלח תלוש אחד, ואומר לך אם יש שם משהו. עו\"ד אוהד טבת, בודק שכר מוסמך.",
    locale: "he_IL",
    type: "website",
  },
  // 🚧 חסום לאינדוקס עד לאישור התוכן. להחליף ל-index: true כשעולים לאוויר.
  robots: { index: false, follow: false },
};

export default function BdikaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
