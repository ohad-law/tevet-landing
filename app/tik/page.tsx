import type { Metadata } from "next";
import Upload from "./Upload";

export const metadata: Metadata = {
  title: 'העלאת מסמכים | אוהד טבת עו"ד',
  description: "העלאת תלושי שכר, דוחות נוכחות ודוחות פנסיה לתחשיב החוסרים.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <Upload />;
}
