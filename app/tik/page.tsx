import type { Metadata } from "next";
import Upload from "./Upload";
import PaidPixel from "./PaidPixel";

export const metadata: Metadata = {
  title: 'העלאת מסמכים | אוהד טבת עו"ד',
  description: "העלאת תלושי שכר, דוחות נוכחות ודוחות פנסיה לתחשיב החוסרים.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <>
      <PaidPixel />
      <Upload />
    </>
  );
}
