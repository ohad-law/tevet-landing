import type { Metadata } from "next";
import Link from "next/link";
import { FAQ, WHAT_YOU_GET, CHOICES } from "./copy";

/**
 * דף המכירה של תחשיב החוסרים.
 *
 * למה הוא קיים בנפרד מ-/tahshiv: שם זו קופה, ומי שמגיע אליה כבר
 * החליט. כאן מוכרים למי שלא ראה וובינר ולא דיבר בטלפון, כלומר
 * תנועה מטיקטוק, מהקהל המותאם ומהחייאת הלידים. זה מה שמאפשר
 * למכור בלי שאוהד ידבר עם כל אחד, וזה צוואר הבקבוק היום.
 *
 * מבנה 11 החלקים של הנקסט לבל, ראה copy.ts.
 * noindex: דף מכירה עם מחירים נשאר נגיש בקישור בלבד, כדי לא
 * להיחשב פרסומת לפי כלל 3(ב)(14). המודעה עצמה נקייה ממחיר.
 */

const TITLE = "כמה כסף המעסיק שלכם החסיר מכם";
const DESC =
  "תחשיב חוסרים כתוב על תלושי השכר שלכם, עם התחייבות להחזר מלא אם לא יימצאו חוסרים גדולים מהעלות.";

export const metadata: Metadata = {
  title: `${TITLE} | אוהד טבת עו"ד`,
  description: DESC,
  openGraph: { title: TITLE, description: DESC, locale: "he_IL", type: "website" },
  alternates: { canonical: "/tlush-check" },
  robots: { index: false, follow: false },
};

function Cta({ label = "לבחירת הוותק שלכם" }: { label?: string }) {
  return (
    <Link
      href="/tahshiv"
      className="block w-full rounded-xl bg-amber-600 px-6 py-4 text-center text-lg font-bold text-white shadow-lg shadow-amber-600/20 transition hover:bg-amber-700"
    >
      {label}
    </Link>
  );
}

export default function Page() {
  return (
    <main className="min-h-screen bg-[#fafaf9] text-slate-800">
      <div className="mx-auto w-full max-w-2xl px-5 py-12 sm:py-16">

        {/* 1. כותרת */}
        <p className="text-sm font-semibold tracking-wide text-amber-700">
          לעובדים שכירים עם שלוש שנות ותק ומעלה
        </p>
        <h1 className="mt-3 text-3xl font-extrabold leading-tight text-slate-900 sm:text-[2.6rem]">
          הבוס קורא לזה &quot;שכר גלובלי&quot;.
          <br />
          בית הדין קורא לזה לא חוקי.
        </h1>

        {/* 2. הליד */}
        <div className="mt-6 space-y-4 text-lg leading-relaxed text-slate-700">
          <p>
            פעם בחודש נכנס תלוש. אתם מסתכלים על השורה התחתונה,
            המספר בערך מה שציפיתם, וסוגרים. ככה עוברות שנים.
          </p>
          <p>
            הבעיה היא שהמספר בסוף לא מספר לכם כלום על איך הוא חושב.
            ורוב החוסרים בתלוש לא נראים בנטו. הם נראים בבסיס.
          </p>
        </div>

        {/* 3. הסיפור */}
        <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-slate-900">
            תלוש אחד, ושלושה דברים שאיש לא ראה
          </h2>
          <div className="mt-4 space-y-4 leading-relaxed text-slate-700">
            <p>
              תלוש אמיתי מאפריל 2025. סך התשלומים:{" "}
              <strong>14,053 ש&quot;ח</strong>. עשרה רכיבי שכר. עובד
              ותיק, מעסיק מסודר.
            </p>
            <p>
              והשכר שממנו הופרשו הפנסיה והפיצויים?{" "}
              <strong className="text-amber-700">6,000 ש&quot;ח.</strong>{" "}
              פחות מחצי.
            </p>
            <p>
              קו צפון, נגלה נוספת, שישי, בונוס משטחים. ארבעה רכיבים
              קבועים שחוזרים כל חודש, ונשארו מחוץ לבסיס. יחד הם
              4,832 ש&quot;ח שלא נספרו.
            </p>
            <p>
              וזה עוד לא החלק המוזר. באותו תלוש, בשורת
              &quot;אינפורמטיבי&quot;, כתוב שחור על גבי לבן ששכר
              המינימום לשעה הוא 34.32. ובפועל שולם{" "}
              <strong>32.97</strong>. התלוש הדפיס בעצמו את הפער.
            </p>
            <p className="border-r-4 border-amber-500 pr-4 text-slate-800">
              האחוזים בתלוש הזה היו מצוינים. 20.83 אחוז הפרשה, מעל
              המינימום שהחוק דורש. <strong>הבסיס היה חצי.</strong> וזה
              בדיוק מה שאף אחד לא בודק.
            </p>
          </div>
        </section>

        {/* 4. הוכחות חברתיות */}
        {/* 🚨 ריק בכוונה עד שאוהד אוסף המלצות משלושת הלקוחות שנסגרו.
            אין להמציא המלצות בשום מצב. */}

        {/* 5. ההצעה */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold text-slate-900">
            מה אתם מקבלים
          </h2>
          <div className="mt-5 grid gap-4">
            {WHAT_YOU_GET.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-slate-200 bg-white p-5"
              >
                <h3 className="font-bold text-slate-900">{item.title}</h3>
                <p className="mt-1.5 leading-relaxed text-slate-600">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-5 leading-relaxed text-slate-700">
            המחיר הוא <strong>297 ש&quot;ח לכל שנת ותק</strong>, עד שבע
            שנים אחורה, וניתן לפרוס עד שלושה תשלומים.
          </p>
        </section>

        {/* 8. אחריות */}
        <section className="mt-10 rounded-2xl border-2 border-amber-300 bg-amber-50 p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-slate-900">
            ההתחייבות שלי
          </h2>
          <p className="mt-3 text-lg leading-relaxed text-slate-800">
            אני עושה עשרות תחשיבים כל חודש, כבר שנים, וכמעט תמיד מוצא
            חוסרים ששווים כסף.
          </p>
          <p className="mt-3 text-lg leading-relaxed text-slate-800">
            <strong>
              אם התחשיב לא ימצא לכם חוסרים בסכום גבוה ממה ששילמתם
              עליו, אני מחזיר לכם את הכסף. הכל.
            </strong>
          </p>
          <p className="mt-3 leading-relaxed text-slate-600">
            אני יכול להתחייב לזה כי אני יודע מה יש שם.
          </p>
        </section>

        {/* 6. הנעה לפעולה שמייצרת ודאות */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold text-slate-900">
            מה קורה אחרי שאתם לוחצים
          </h2>
          <ol className="mt-5 space-y-4">
            {[
              "בוחרים כמה שנים אתם עובדים שם. המחיר מתעדכן לפי זה.",
              "משלמים בכרטיס אשראי או בביט, בדף מאובטח בתקן PCI.",
              "מקבלים מאיתנו וואטסאפ עם הסבר בדיוק אילו מסמכים לשלוח. צילום מהטלפון מספיק.",
              "תוך שבעה ימי עסקים מקבלים את תחשיב החוסרים הכתוב, ואת הגישה לקורס.",
            ].map((step, i) => (
              <li key={i} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-600 font-bold text-white">
                  {i + 1}
                </span>
                <span className="pt-1 leading-relaxed text-slate-700">
                  {step}
                </span>
              </li>
            ))}
          </ol>
          <div className="mt-8">
            <Cta />
          </div>
        </section>

        {/* 7. סקרסיטי */}
        <section className="mt-12 rounded-2xl bg-slate-900 p-6 text-white sm:p-8">
          <h2 className="text-2xl font-bold">למה דווקא עכשיו</h2>
          <p className="mt-3 text-lg leading-relaxed text-slate-200">
            אפשר לחזור שבע שנים אחורה. לא יותר.
          </p>
          <p className="mt-3 text-lg leading-relaxed text-slate-200">
            כלומר{" "}
            <strong className="text-amber-400">
              כל חודש שעובר מוחק לכם חודש
            </strong>{" "}
            מהקצה השני של החישוב. זה לא לחץ שיווקי, זו התיישנות, והיא
            רצה בין אם תבדקו ובין אם לא.
          </p>
        </section>

        {/* 9. שאלות ותשובות */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold text-slate-900">
            שאלות שחוזרות
          </h2>
          <div className="mt-5 space-y-4">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="rounded-xl border border-slate-200 bg-white p-5"
              >
                <summary className="cursor-pointer list-none font-bold text-slate-900">
                  {item.q}
                </summary>
                <p className="mt-3 leading-relaxed text-slate-600">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* 10. הבחירה */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold text-slate-900">
            יש לכם שלוש אפשרויות
          </h2>
          <div className="mt-5 space-y-3">
            {CHOICES.map((c, i) => (
              <div
                key={i}
                className={`rounded-xl border p-5 leading-relaxed ${
                  i === 2
                    ? "border-amber-400 bg-amber-50 text-slate-800"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                <span className="font-bold">{i + 1}. </span>
                {c}
              </div>
            ))}
          </div>
        </section>

        {/* 11. מסר אישי */}
        <section className="mt-12 border-t border-slate-200 pt-8">
          <p className="leading-relaxed text-slate-700">
            אני אוהד טבת, עורך דין לדיני עבודה ובודק שכר מוסמך מטעם
            משרד העבודה. אני לא רק מוציא תחשיבים, אני גם תובע איתם
            בבתי הדין, וזה מה שמבדיל אותי ממי שהדוח אצלו הוא סוף
            הדרך.
          </p>
          <p className="mt-4 leading-relaxed text-slate-700">
            אני אומר לכם מראש שלא כל מקרה מתאים, ואני אומר את זה גם
            כשזה עולה לי בעסקה. אבל בלי לבדוק אי אפשר לדעת, ובינתיים
            השעון רץ.
          </p>
          <div className="mt-8">
            <Cta label="לבדוק כמה חסר לי" />
          </div>
          <p className="mt-6 text-center text-xs leading-relaxed text-slate-400">
            התשלום מאובטח בתקן PCI. כרטיס אשראי או ביט.
            <br />
            הכל חסוי.
          </p>
        </section>
      </div>
    </main>
  );
}
