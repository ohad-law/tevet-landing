"use client";

import { useEffect } from "react";

/**
 * אירוע רכישה לפיקסלים, בדף התיק.
 *
 * 🚨 למה דווקא כאן: UPAY לא מחזירה את הגולש לדף שלנו, והווהבוק
 * הוא צד שרת ולכן אינו נראה לפיקסל שבדפדפן. `/tik` הוא הנקודה
 * היחידה בכל המשפך שבה גולש שכבר שילם פותח דף אצלנו.
 *
 * 🚨 ורק כשיש `?y=` בכתובת. הפרמטר הזה נוצר אך ורק בווהבוק
 * מתוך הסכום ששולם, ולכן הוא הסימן הקרוב ביותר שיש לנו לתשלום
 * אמיתי. מי שמגיע לדף בלי הפרמטר, למשל דרך קישור ישיר, לא
 * נספר כרכישה. עדיף לפספס רכישה מאשר ללמד את האלגוריתם על
 * המרה שלא קרתה.
 *
 * הערך נגזר מהשנים כפול 297, המחיר לשנת ותק.
 */
const PRICE_PER_YEAR = 297;

export default function PaidPixel() {
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("y");
    const years = Number(raw);
    if (!Number.isInteger(years) || years < 1 || years > 7) return;

    const value = years * PRICE_PER_YEAR;
    const w = window as unknown as {
      fbq?: (...a: unknown[]) => void;
      ttq?: { track: (...a: unknown[]) => void };
      gtag?: (...a: unknown[]) => void;
    };
    try {
      w.fbq?.("track", "Purchase", {
        value,
        currency: "ILS",
        content_name: `תחשיב חוסרים ${years} שנות ותק`,
      });
      w.ttq?.track("CompletePayment", { value, currency: "ILS" });
    } catch {
      // מדידה לעולם לא חוסמת את הדף
    }
  }, []);

  return null;
}
