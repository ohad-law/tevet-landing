"use client";

import { useEffect, useState } from "react";
import s from "./itzumim.module.css";

/**
 * CTA צף במובייל.
 *
 * נוסף בעקבות סורק דפי המכירה של הנקסט לבל (30/08/2026), שסימן
 * את זה כאחד משלושת התיקונים החשובים: "הדף ארוך מאוד, וגולש
 * שמשתכנע באמצע צריך דרך מיידית לחזור לטופס בלי לגלול חזרה."
 *
 * מופיע רק אחרי שהטופס העליון יצא מהמסך, כי אחרת הוא מתחרה
 * בטופס שכבר מולו ורק מסתיר תוכן. נעלם שוב כשחוזרים למעלה.
 */
export default function StickyCta() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const form = document.getElementById("form");
    if (!form) return;

    // IntersectionObserver ולא מאזין scroll, כדי לא לחשב פריסה בכל פיקסל
    const io = new IntersectionObserver(
      ([entry]) => setShow(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { threshold: 0 }
    );
    io.observe(form);
    return () => io.disconnect();
  }, []);

  return (
    <div className={`${s.stickyCta} ${show ? s.stickyCtaOn : ""}`} aria-hidden={!show}>
      <div className={s.stickyText}>
        <strong>נשארו לך 30 יום</strong>
        מהיום שהמכתב נמסר
      </div>
      <a className={s.stickyBtn} href="#form" tabIndex={show ? 0 : -1}>
        לבדיקת העיצום
      </a>
    </div>
  );
}
