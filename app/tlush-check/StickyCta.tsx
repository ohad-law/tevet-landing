"use client";

import { useEffect, useState } from "react";
import s from "./tlush-check.module.css";

/**
 * CTA צף במובייל.
 *
 * זה אחד משלושת התיקונים שסורק דפי המכירה של הנקסט לבל נתן על
 * דף העיצומים ב-30/08/2026: "הדף ארוך מאוד, וגולש שמשתכנע
 * באמצע צריך דרך מיידית לחזור בלי לגלול". אותו עיקרון כאן.
 *
 * מופיע רק אחרי שהכפתור הראשון יצא מהמסך, כדי לא להתחרות
 * בכפתור שממילא מול העיניים ולא להסתיר תוכן סתם.
 */
export default function StickyCta() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const anchor = document.getElementById("first-cta");
    if (!anchor) return;

    // IntersectionObserver ולא מאזין scroll, כדי לא לחשב פריסה בכל פיקסל
    const io = new IntersectionObserver(
      ([e]) => setShow(!e.isIntersecting && e.boundingClientRect.top < 0),
      { threshold: 0 }
    );
    io.observe(anchor);
    return () => io.disconnect();
  }, []);

  return (
    <div className={`${s.sticky} ${show ? s.stickyOn : ""}`} aria-hidden={!show}>
      <div className={s.stickyText}>
        <strong>כל חודש מוחק חודש</strong>
        אפשר לחזור שבע שנים אחורה
      </div>
      <a className={s.stickyBtn} href="/tahshiv" tabIndex={show ? 0 : -1}>
        לבדוק כמה חסר
      </a>
    </div>
  );
}
