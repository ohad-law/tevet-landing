"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import s from "./tik.module.css";

/**
 * העלאת מסמכים אחרי תשלום.
 *
 * הפער שאוהד זיהה: אחרי הסליקה לא הייתה שום דרך להעלות מסמכים,
 * והתהליך נשען על הודעת וואטסאפ ידנית שמסבירה מה לשלוח. זה מאבד
 * את הרגע שבו הלקוח הכי מחויב, ומעביר את העבודה לאוהד.
 *
 * 🚨 אין כאן route חדש ב-api. הדף שולח ל-`/api/submit` הקיים,
 * בדיוק בחוזה שלו (name, phone, years, situation, files), כדי לא
 * להוסיף פונקציית serverless ולא לגעת בזרימה שעובדת בייצור.
 * ההבחנה נעשית דרך השדה situation.
 *
 * שלוש קטגוריות נפרדות בממשק אבל אותו שדה `files`, כי זה מה
 * ש-/api/submit יודע לקלוט. ההפרדה היא לטובת הלקוח, שידע מה
 * בכלל צריך להביא.
 */

type Bucket = { key: string; title: string; hint: string; required: boolean };

const BUCKETS: Bucket[] = [
  {
    key: "payslips",
    title: "תלושי שכר",
    hint: "כמה שיותר, עד שבע שנים אחורה. עדיף PDF, ואם צילום מהטלפון, באיכות הכי גבוהה.",
    required: true,
  },
  {
    key: "attendance",
    title: "דוחות נוכחות",
    hint: "אם יש. זה מה שמאפשר לחשב שעות נוספות במדויק.",
    required: false,
  },
  {
    key: "pension",
    title: "דוחות פנסיה או הפקדות",
    hint: "הדוח השנתי מחברת הביטוח או מקרן הפנסיה. זה מה שמצליבים מול התלוש.",
    required: false,
  },
];

const YEARS = [
  "שנה עד 3 שנים",
  "3 עד 7 שנים",
  "מעל 7 שנים",
];

export default function Upload() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [years, setYears] = useState("");
  const [picked, setPicked] = useState<Record<string, File[]>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  const refs = useRef<Record<string, HTMLInputElement | null>>({});

  const total = Object.values(picked).reduce((n, f) => n + f.length, 0);

  function onPick(key: string, list: FileList | null) {
    if (!list) return;
    setPicked((prev) => ({ ...prev, [key]: Array.from(list) }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!name.trim() || !phone.trim()) {
      setErr("צריך שם וטלפון, כדי שנדע לאיזה תשלום לשייך את המסמכים.");
      return;
    }
    if (total === 0) {
      setErr("לא נבחר אף קובץ.");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("name", name.trim());
      fd.append("phone", phone.trim());
      fd.append("years", years);
      // המחרוזת הזו היא מה שמבדיל לקוח משלם מליד רגיל בכרטיס
      const breakdown = BUCKETS.filter((b) => picked[b.key]?.length)
        .map((b) => `${b.title}: ${picked[b.key].length}`)
        .join(", ");
      fd.append(
        "situation",
        `שילם תחשיב חוסרים, העלה מסמכים בדף התיק. ${breakdown}`
      );
      for (const b of BUCKETS) {
        for (const f of picked[b.key] ?? []) fd.append("files", f);
      }
      const res = await fetch("/api/submit", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "שגיאה");
      setDone(true);
    } catch (e) {
      setErr(
        e instanceof Error ? e.message : "משהו נתקע. אפשר לשלוח בוואטסאפ."
      );
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className={s.page}>
        <div className={s.wrap}>
          <div className={s.doneBox}>
            <div className={s.doneMark}>✓</div>
            <h1 className={s.h1}>המסמכים התקבלו</h1>
            <p className={s.p}>
              קיבלנו {total} קבצים. עוברים עליהם, ואם משהו חסר או לא
              קריא נחזור אליכם בוואטסאפ.
            </p>
            <p className={s.p}>
              <strong>התחשיב אצלכם תוך שבעה ימי עסקים.</strong>
            </p>
            <a
              className={s.waLink}
              href="https://wa.me/972515937329"
              target="_blank"
              rel="noopener noreferrer"
            >
              יש עוד מסמך? אפשר לשלוח בוואטסאפ
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={s.page}>
      <header className={s.top}>
        <Image
          className={s.topLogo}
          src="/tevet-logo.png"
          alt="משרד עורכי דין טבת"
          width={140}
          height={34}
          priority
        />
        <span className={s.topNote}>התשלום התקבל</span>
      </header>

      <div className={s.wrap}>
        <div className={s.block}>
          <h1 className={s.h1}>עכשיו תשלח לנו את המסמכים</h1>
          <p className={s.p}>
            ככל שתעלו יותר, התחשיב יהיה מדויק יותר. אפשר להעלות הכל
            עכשיו, ואפשר להשלים אחר כך בוואטסאפ.
          </p>
          <p className={s.p}>
            <strong>עדיף קבצי PDF.</strong> אם אתם מצלמים מהטלפון,
            תוודאו שהמספרים קריאים לגמרי. תלוש מטושטש הוא תלוש
            שאי אפשר לחשב ממנו.
          </p>

          <form onSubmit={submit} className={s.form}>
            <div className={s.row}>
              <label className={s.field}>
                <span className={s.label}>שם מלא</span>
                <input
                  className={s.input}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </label>
              <label className={s.field}>
                <span className={s.label}>טלפון</span>
                <input
                  className={s.input}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  required
                />
              </label>
            </div>
            <label className={s.field}>
              <span className={s.label}>כמה זמן עבדתם שם</span>
              <select
                className={s.input}
                value={years}
                onChange={(e) => setYears(e.target.value)}
              >
                <option value="">בחרו</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>

            {BUCKETS.map((b) => {
              const n = picked[b.key]?.length ?? 0;
              return (
                <div key={b.key} className={s.bucket}>
                  <div className={s.bucketHead}>
                    <span className={s.bucketTitle}>{b.title}</span>
                    <span className={s.bucketFlag}>
                      {b.required ? "חובה" : "אם יש"}
                    </span>
                  </div>
                  <p className={s.bucketHint}>{b.hint}</p>
                  <button
                    type="button"
                    className={`${s.drop} ${n ? s.dropOn : ""}`}
                    onClick={() => refs.current[b.key]?.click()}
                  >
                    {n ? `✓ ${n} קבצים נבחרו` : "בחירת קבצים"}
                  </button>
                  <input
                    ref={(el) => {
                      refs.current[b.key] = el;
                    }}
                    type="file"
                    multiple
                    accept="image/*,application/pdf"
                    hidden
                    onChange={(e) => onPick(b.key, e.target.files)}
                  />
                </div>
              );
            })}

            {err && <p className={s.err}>{err}</p>}

            <button className={s.cta} disabled={busy}>
              {busy ? "מעלה..." : `שליחת ${total || ""} המסמכים`.trim()}
            </button>
            <p className={s.ctaNote}>
              הכל חסוי. הקבצים נשמרים מוצפנים ונגישים למשרד בלבד.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
