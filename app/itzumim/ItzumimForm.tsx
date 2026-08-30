"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ITZUM_STAGES, ITZUM_AMOUNTS } from "@/lib/leadScore";
import s from "./itzumim.module.css";

/**
 * הטופס של קו העיצומים הכספיים.
 *
 * שתי החלטות שקובעות אם הליד שווה משהו:
 *
 * 1. *השלב בהליך הוא שדה חובה.* להליך יש מועדים קשיחים (30 יום
 *    להגיב על כוונת חיוב, 28 יום לערר), ובלי לדעת איפה המעסיק
 *    עומד אי אפשר לדעת אם צריך לחזור אליו היום או מחר. השדה הזה
 *    הוא גם מה שמייצר את התראת הדחיפות בוואטסאפ של אוהד.
 *
 * 2. *המכתב מהמשרד הוא הקובץ שמבקשים, לא תלוש.* המכתב מכיל את
 *    ההפרה, הסכום והמועד, כלומר את כל מה שצריך כדי לתמחר את
 *    התיק לפני השיחה. הוא אופציונלי בכוונה, כי מעסיק בלחץ לא
 *    תמיד סרק אותו, ופנייה בלי מכתב היא עדיין ליד.
 *
 * הטופס נשלח ל-/api/submit עם product=itzumim. אין route חדש
 * בכוונה, ראה ההערה בראש app/api/submit/route.ts.
 */

const OHAD_WHATSAPP_PUBLIC = "972515937329";

/** השלבים שבהם המועד עדיין רץ, ולכן מוצגת אזהרה בזמן אמת */
const URGENT_STAGES = new Set<string>([
  "קיבלתי הודעה על כוונת חיוב",
  "קיבלתי דרישת תשלום או החלטת ממונה",
  "זומנתי לחקירה או למתן גרסה",
]);

export default function ItzumimForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [stage, setStage] = useState("");
  const [amount, setAmount] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [consent, setConsent] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const urgent = URGENT_STAGES.has(stage);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim() || !phone.trim()) { setError("נא למלא שם וטלפון"); return; }
    if (!stage) { setError("נא לבחור באיזה שלב אתה"); return; }
    if (!consent) { setError("נא לאשר את מדיניות הפרטיות"); return; }

    setSending(true);
    try {
      const fd = new FormData();
      fd.append("product", "itzumim");
      fd.append("name", name.trim());
      fd.append("phone", phone.trim());
      fd.append("company", company.trim());
      fd.append("stage", stage);
      fd.append("amount", amount);
      if (files) for (let i = 0; i < files.length; i++) fd.append("files", files[i]);

      const res = await fetch("/api/submit", { method: "POST", body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "שגיאה בשליחה");
      }
      setDone(true);

      // אירועי המרה, אותה תבנית כמו בדף התלושים
      if (typeof window !== "undefined") {
        const w = window as unknown as Record<string, unknown>;
        if (typeof w.fbq === "function") (w.fbq as (...a: unknown[]) => void)("track", "Lead");
        const ttq = w.ttq as { track?: (...a: unknown[]) => void } | undefined;
        if (ttq && typeof ttq.track === "function") ttq.track("SubmitForm");
        if (typeof w.gtag === "function") {
          (w.gtag as (...a: unknown[]) => void)("event", "conversion", {
            send_to: process.env.NEXT_PUBLIC_GOOGLE_ADS_ID,
          });
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "שגיאה בשליחה, נסו שוב");
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className={s.formCard} id="form">
        <div className={s.done}>
          <div className={s.doneMark} aria-hidden="true">✓</div>
          <div className={s.doneTitle}>הפנייה התקבלה.</div>
          <p className={s.doneBody}>
            {urgent
              ? "השלב שציינת אומר שהמועד עדיין רץ. אוהד חוזר אליך היום."
              : "אוהד טבת יעבור על הפרטים ויחזור אליך."}
          </p>
          {!files?.length && (
            <>
              <p className={s.doneBody} style={{ marginTop: "0.7rem" }}>
                כדי לקצר את השיחה, שלח את המכתב שקיבלת ממשרד העבודה ב-WhatsApp:
              </p>
              <a
                className={s.waBtn}
                href={`https://wa.me/${OHAD_WHATSAPP_PUBLIC}?text=${encodeURIComponent(
                  "היי אוהד, השארתי פרטים בדף העיצומים. מצרף את המכתב שקיבלתי ממשרד העבודה:"
                )}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                שלח את המכתב ב-WhatsApp
              </a>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={s.formCard} id="form">
      <form onSubmit={handleSubmit} noValidate>
        <div className={s.formTitle}>בדיקה ראשונית של העיצום שקיבלת</div>
        <p className={s.formSub}>
          שלושה שדות. אוהד עובר על הפרטים אישית ומחזיר תשובה לגבי מה עוד אפשר לעשות בשלב
          שבו אתה נמצא.
        </p>

        <div className={s.grid2}>
          <input
            className={s.field}
            type="text"
            placeholder="שם מלא"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className={s.field}
            type="tel"
            placeholder="טלפון"
            autoComplete="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        {/* השלב הוא השדה שקובע דחיפות, ולכן הוא נשאר גלוי */}
        <select
          className={s.select}
          value={stage}
          onChange={(e) => setStage(e.target.value)}
          aria-label="באיזה שלב אתה"
          style={{ marginBottom: "0.65rem" }}
        >
          <option value="" disabled>באיזה שלב אתה?</option>
          {ITZUM_STAGES.map((st) => <option key={st}>{st}</option>)}
        </select>

        {urgent && (
          <div className={s.hintUrgent}>
            <strong>בשלב הזה יש מועד שרץ.</strong> לוועדת הערר אין סמכות להאריך אותו, למעט
            מקרים חריגים. פנייה שמגיעה בתוך המועד היא פנייה שאפשר לעשות איתה משהו.
          </div>
        )}

        <button
          type="button"
          className={s.moreToggle}
          onClick={() => setShowMore((v) => !v)}
          aria-expanded={showMore}
        >
          <span>
            <b>רוצה תשובה מדויקת יותר?</b>
            הוסף את שם החברה, הסכום, וצילום של המכתב. לא חובה.
          </span>
          <span className={`${s.moreChevron} ${showMore ? s.moreChevronOpen : ""}`} aria-hidden="true">
            ▼
          </span>
        </button>

        {showMore && (
          <div className={s.morePanel}>
            <div className={s.grid2}>
              <input
                className={s.field}
                type="text"
                placeholder="שם החברה או העסק"
                autoComplete="organization"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
              <select
                className={s.select}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                aria-label="סכום העיצום"
              >
                <option value="" disabled>סכום העיצום</option>
                {ITZUM_AMOUNTS.map((a) => <option key={a}>{a}</option>)}
              </select>
            </div>

            <button
              type="button"
              className={`${s.upload} ${files?.length ? s.uploadOn : ""}`}
              onClick={() => fileRef.current?.click()}
            >
              <strong>
                {files?.length ? `✓ ${files.length} קבצים נבחרו` : "צרף את המכתב ממשרד העבודה"}
              </strong>
              PDF או צילום. אפשר גם לשלוח ב-WhatsApp אחרי השליחה
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,image/*"
              multiple
              style={{ display: "none" }}
              onChange={(e) => setFiles(e.target.files)}
            />
          </div>
        )}

        <div className={s.consent}>
          <input
            type="checkbox"
            id="itzum-consent"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <label htmlFor="itzum-consent">
            קראתי ואני מסכים/ה ל<Link href="/privacy">מדיניות הפרטיות</Link> ול
            <Link href="/terms">תנאי השימוש</Link>. ידוע לי שהפרטים והמסמכים ישמשו לבחינת
            העיצום בלבד, בהתאם לתיקון 13 לחוק הגנת הפרטיות.
          </label>
        </div>

        {error && <div className={s.err}>{error}</div>}

        <button type="submit" className={s.submit} disabled={sending}>
          {sending ? "שולח..." : "לבדיקה ראשונית של העיצום"}
        </button>
        <p className={s.formNote}>
          ללא התחייבות · המסמכים נשמרים באחסון פרטי ומוצפן ונצפים על ידי עו&quot;ד טבת בלבד
        </p>
      </form>
    </div>
  );
}
