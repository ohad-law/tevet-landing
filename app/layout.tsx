import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: 'בדיקת תלוש שכר | אוהד טבת עו"ד',
  description: "עבדת שנים ולא ידעת כמה כסף מגיע לך? עו\"ד אוהד טבת — בודק שכר מוסמך — יבדוק את תלושי השכר שלך ויגלה לך כמה חסר.",
  openGraph: {
    title: 'בדיקת תלוש שכר | אוהד טבת עו"ד',
    description: "עבדת שנים ולא ידעת כמה כסף מגיע לך? שלח 2-3 תלושים — קבל אינדיקציה מדויקת.",
    locale: "he_IL",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
