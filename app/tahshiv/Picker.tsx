"use client";

import { useState } from "react";
import { TIERS, type Tier } from "./links";

/**
 * דף בחירת הוותק. הכתובת היחידה שנאמרת על המסך בוובינר
 * ובכל קריאה לפעולה, במקום שבעה קישורי תשלום נפרדים.
 *
 * הקופי בלשון רבים לפי rule_marketing_copy_plural.
 */
export default function Picker() {
  const [busy, setBusy] = useState<number | null>(null);

  function choose(t: Tier) {
    setBusy(t.years);
    // אירוע רכישה מתחילה, כדי שנדע במטא ובטיקטוק מי הגיע עד התשלום
    // ולא רק מי השאיר פרטים. זה הייחוס שחסר היום.
    const w = window as unknown as {
      fbq?: (...a: unknown[]) => void;
      ttq?: { track: (...a: unknown[]) => void };
    };
    try {
      w.fbq?.("track", "InitiateCheckout", {
        value: t.price,
        currency: "ILS",
        content_name: `תחשיב חוסרים ${t.years} שנות ותק`,
      });
      w.ttq?.track("InitiateCheckout", { value: t.price, currency: "ILS" });
    } catch {
      // מדידה לעולם לא חוסמת תשלום
    }
    window.location.href = t.url;
  }

  return (
    <main className="min-h-screen bg-[#fafaf9] px-5 py-10 sm:py-16">
      <div className="mx-auto w-full max-w-2xl">
        <header className="text-center">
          <p className="text-sm font-semibold tracking-wide text-amber-700">
            תחשיב חוסרים
          </p>
          <h1 className="mt-3 text-3xl font-extrabold leading-tight text-slate-900 sm:text-4xl">
            כמה שנים אתם עובדים שם?
          </h1>
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-slate-600">
            המחיר הוא 297 ש&quot;ח לכל שנת ותק. מה שתבחרו כאן זה
            מה שייבדק, אז בחרו את מספר השנים שתרצו שנבדוק. אפשר
            לחזור עד שבע שנים, כי זו תקופת ההתיישנות.
          </p>
        </header>

        <div className="mt-9 grid gap-3">
          {TIERS.map((t) => (
            <button
              key={t.years}
              onClick={() => choose(t)}
              disabled={busy !== null}
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 text-right shadow-sm transition hover:border-amber-500 hover:shadow-md disabled:opacity-50"
            >
              <span className="text-lg font-bold text-amber-700">
                {busy === t.years ? "מעביר לתשלום..." : `${t.price.toLocaleString("he-IL")} ₪`}
              </span>
              <span className="text-lg font-semibold text-slate-800">
                {t.years === 1 ? "שנה אחת" : `${t.years} שנים`}
              </span>
            </button>
          ))}
        </div>

        <section className="mt-9 rounded-xl border border-amber-200 bg-amber-50 p-6">
          <h2 className="text-lg font-bold text-slate-900">ההתחייבות שלי</h2>
          <p className="mt-2 leading-relaxed text-slate-700">
            אם תחשיב החוסרים לא ימצא לכם חוסרים בסכום
            גבוה ממה ששילמתם עליו, אני מחזיר לכם את הכסף. הכל.
          </p>
        </section>

        <section className="mt-6 space-y-3 text-sm leading-relaxed text-slate-600">
          <p>
            <strong className="text-slate-800">מה מקבלים.</strong>{" "}
            מסמך כתוב שעובר שורה שורה על התלושים, מראה מה לא
            חושב נכון וכמה זה שווה, ומצורפת אליו המלצת פעולה.
          </p>
          <p>
            <strong className="text-slate-800">כמה זמן.</strong>{" "}
            עד שבעה ימי עסקים מרגע שהתלושים מגיעים אלינו.
          </p>
          <p>
            <strong className="text-slate-800">אחרי התשלום.</strong>{" "}
            מגיעים לדף שבו מעלים את המסמכים: תלושי שכר, דוחות
            נוכחות ודוחות פנסיה.
          </p>
          <p className="pt-2 text-slate-500">
            לא כל מקרה מתאים, ואנחנו אומרים את זה מראש.
          </p>
        </section>

        <footer className="mt-10 border-t border-slate-200 pt-6 text-center text-xs text-slate-400">
          עו״ד אוהד טבת, דיני עבודה ובודק שכר מוסמך מטעם משרד העבודה.
          <br />
          התשלום מאובטח בתקן PCI, כרטיס אשראי או ביט.
        </footer>
      </div>
    </main>
  );
}
