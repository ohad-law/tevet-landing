"use client";

/**
 * דף הנחיתה של בדיקת השכר, נבנה 08/09/2026.
 *
 * לאן הוא נכנס במשפך: הליד משאיר פרטים בטופס הנייטיב של מטא, מקבל
 * וואטסאפ תוך דקה, והקישור בהודעה מוביל לכאן. עד היום לא היה כלום
 * בין הטופס לשיחה, ולכן שיחת הטלפון נאלצה לבנות אמון מאפס.
 *
 * הפעולה היחידה בדף: להעלות תלוש. מתוך 89 לידים באוגוסט שניים
 * שלחו תלוש, ושתי השיחות היחידות שהתקרבו לסגירה היו של מי ששלח
 * מסמכים מראש.
 *
 * 🚨 כללי ברזל בקופי כאן:
 *  - אסור לנקוב בשכר טרחה, כלל 3(ב)(14) לכללי הפרסומת. גם לא
 *    "ללא עלות" ולא "חינם". מותר לתאר את הליווי כתהליך מקצועי,
 *    וזה מה שמייצר את הציפייה לתשלום בלי לומר מספר.
 *  - אסור מקף ארוך ומקף בינוני.
 *  - הנתון מהתיקים שנבדקו מנוסח תמיד כ"מתוך התיקים שנבדקו במשרד".
 *    המדגם מוטה, כולם אנשים שכבר חשדו ופנו לעורך דין.
 *  - המסמכים בתיקיית public/proof מושחרים, וההשחרה שרופה לפיקסלים.
 *
 * העיצוב משתמש במחלקות של app/globals.css, אותה שפה של דף הבית.
 * אין כאן styled-jsx בכוונה: דף שנראה אחרת מהאתר נראה כמו זיוף.
 */

import { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";

const OHAD_PHOTO =
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692364cc62edd448d4415194/33ca10aa6_image.png";
const GOOGLE_PROFILE_URL = "https://g.page/r/Cf-b2dk5FCCuEBM";
const OHAD_WHATSAPP = "972515937329";

const RESULTS = [
  { initials: "ד.כ", name: "ד. כהן", role: "31 שנה ללא זכויות סוציאליות", amount: "700,000 ₪" },
  { initials: "מ.ל", name: "מ. לוי", role: "נהג הובלות · פשרה תוך שנה", amount: "210,000 ₪" },
  { initials: "י.פ", name: "י. פרץ", role: "פוטרה ללא שימוע · חוסרים בפנסיה", amount: "195,000 ₪" },
  { initials: "ש.ג", name: "ש. גבאי", role: "קופאית רשת · פוטרה אחרי לידה", amount: "178,000 ₪" },
  { initials: "נ.א", name: "נ. אברהם", role: "בונוסים שלא נכללו בזכויות", amount: "145,000 ₪" },
  { initials: "ר.מ", name: "ר. מזרחי", role: "עובדת מסחר · הפרשות חסרות", amount: "120,000 ₪" },
];

const FAQ = [
  {
    q: "ואם תבדוק ולא תמצא כלום?",
    a: "גם זו תשובה, ויש לה ערך. אתה מפסיק לחשוב על זה, ואתה יודע שעבדת אצל אנשים ישרים. אני שומע את זה מלקוחות לא פעם ולא פעמיים. אבל מתוך התיקים שנבדקו אצלי במשרד, במרבית המקרים נמצאו שלושה רכיבים חסרים ומעלה.",
  },
  {
    q: "אני עדיין עובד שם. אפשר בכלל לבדוק?",
    a: "אפשר, וזה חסוי לחלוטין. אבל תדע שהחלק הגדול של הכסף בתיקים כאלה מתגלה דווקא בסיום העסקה, כי אז נכנסים פיצויים, הודעה מוקדמת ופדיון חופשה. מי שעדיין עובד רואה בדרך כלל תמונה חלקית.",
  },
  {
    q: "אין לי את כל התלושים, רק אחד או שניים.",
    a: "תלוש אחד מספיק לי כדי לומר לך אם יש כאן משהו. את השאר משלימים בהמשך, ואם חסרים לך תלושים המעסיק חייב למסור אותם לפי חוק.",
  },
  {
    q: "מה קורה אחרי שאני שולח?",
    a: "אני מסתכל על התלוש ומחזיר לך תשובה עניינית: אם ראיתי משהו, מה הוא ומה הסדר גודל. אם המקרה מתאים לתהליך שאנחנו עושים, נדבר בטלפון ואסביר לך בדיוק איך הליווי במשרד עובד, מה הוא כולל ומה עלותו. אתה מחליט אחר כך.",
  },
  {
    q: "המידע שלי מוגן?",
    a: "התלושים נשמרים באחסון פרטי ומוצפן, נצפים על ידי בלבד, לא מועברים לאף גורם, ונמחקים לבקשתך בכל שלב, בהתאם לתיקון 13 לחוק הגנת הפרטיות.",
  },
];

type State = "idle" | "sending" | "done" | "tooShort";

/**
 * אירועי ההמרה בדפדפן. אותה תבנית שמופעלת בדף העיצומים.
 * ה-eventId זהה לזה שנשלח ל-CAPI, ולכן מטא מזהה שזה אותו ליד.
 */
function fireConversion(eventId: string) {
  if (typeof window === "undefined") return;
  const w = window as unknown as Record<string, unknown>;
  if (typeof w.fbq === "function") {
    (w.fbq as (...a: unknown[]) => void)("track", "Lead", {}, { eventID: eventId });
  }
  const ttq = w.ttq as { track?: (...a: unknown[]) => void } | undefined;
  if (ttq && typeof ttq.track === "function") ttq.track("SubmitForm");
  if (typeof w.gtag === "function" && process.env.NEXT_PUBLIC_GOOGLE_ADS_ID) {
    (w.gtag as (...a: unknown[]) => void)("event", "conversion", {
      send_to: process.env.NEXT_PUBLIC_GOOGLE_ADS_ID,
    });
  }
}

export default function Bdika() {
  const [state, setState] = useState<State>("idle");
  const [err, setErr] = useState("");
  const [years, setYears] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  function toForm() {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr("");
    if (years === "פחות משנה") {
      setState("tooShort");
      return;
    }
    setState("sending");
    try {
      const fd = new FormData(e.currentTarget);
      files.forEach((f) => fd.append("files", f));
      // מזהה אחד לאירוע, נשלח גם לפיקסל בדפדפן וגם ל-CAPI בשרת,
      // כדי שמטא תספור ליד אחד ולא שניים.
      const eventId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : String(Date.now()) + Math.random().toString(36).slice(2);
      fd.append("event_id", eventId);

      const res = await fetch("/api/submit", { method: "POST", body: fd });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErr(d.error || "משהו השתבש, נסה שוב או שלח לי בוואטסאפ.");
        setState("idle");
        return;
      }
      fireConversion(eventId);
      setState("done");
    } catch {
      setErr("משהו השתבש, נסה שוב או שלח לי בוואטסאפ.");
      setState("idle");
    }
  }

  return (
    <>
      <nav className="nav">
        <div className="nav-logo">
          TEVET<span>משרד עורכי דין</span>
        </div>
        <button className="nav-cta" onClick={toForm}>
          שליחת תלוש
        </button>
      </nav>

      {/* ── הירו, עם הטופס מיד ── */}
      <div className="hero">
        <div className="hero-inner">
          <div className="h1-setup">עבדת שם שנים,</div>
          <div className="h1-main">
            <span className="gold">כמה מזה באמת קיבלת?</span>
          </div>
          <div className="h1-bridge">
            רוב האנשים פותחים את התלוש, מסתכלים על שורת הנטו, ורואים שהכל בסדר.
            <br />
            <strong>בבית הדין לעבודה לא מסתכלים שם.</strong>
          </div>

          <div className="revelation">
            שם מסתכלים על דבר אחד: כמה שולם לך בפועל, מה היית צריך לקבל, ומה
            ההפרש. <strong>וההפרש הזה חוזר בכל חודש, כפול כל השנים שעבדת.</strong>
            <span className="emotional">ככה מגיעים תיקים למאות אלפי שקלים.</span>
          </div>

          <div className="promise-line">
            תשלח לי תלוש אחד, ואני אנתח אותו ואומר לך אם יש שם משהו.
          </div>
          <div className="promise-detail">
            אוהד טבת, עו״ד לדיני עבודה ובודק שכר מוסמך · תשובה תוך 24 שעות
          </div>

          <div className="form-box" id="form" ref={formRef}>
            {state === "done" ? (
              <div className="success-box">
                <h3>קיבלתי. תודה.</h3>
                <p>
                  אני עובר על מה ששלחת ומחזיר לך תשובה עניינית. אם ראיתי משהו,
                  אגיד לך מה הוא ומה הסדר גודל, ואסביר איך התהליך במשרד עובד.
                </p>
                <a
                  className="whatsapp-btn"
                  href={`https://wa.me/${OHAD_WHATSAPP}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  שליחת תלוש נוסף בוואטסאפ
                </a>
              </div>
            ) : state === "tooShort" ? (
              <div className="success-box">
                <h3>אני אהיה כן איתך</h3>
                <p>
                  בפחות משנת עבודה הסכומים בדרך כלל קטנים מכדי שתהליך מלא יצדיק
                  את עצמו, ולא יהיה הוגן מצדי לקחת אותך לשם.
                  <br />
                  <br />
                  מה שכן שווה לך: לעבור על התלוש האחרון מול חמשת הרכיבים שהכי
                  הרבה פעמים חסרים. הכנתי את זה כרשימה קצרה.
                </p>
                <Link className="whatsapp-btn" href="/tlush">
                  לרשימת חמשת הרכיבים
                </Link>
              </div>
            ) : (
              <form onSubmit={submit}>
                <h3>
                  שלח תלוש אחד, אפילו האחרון שיש לך.
                  <br />
                  צילום מהטלפון מספיק.
                </h3>

                <div className="form-grid">
                  <input name="name" placeholder="שם מלא" required autoComplete="name" />
                  <input
                    name="phone"
                    placeholder="טלפון"
                    required
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                  />
                </div>

                <div className="form-grid">
                  <select
                    name="years"
                    required
                    value={years}
                    onChange={(e) => setYears(e.target.value)}
                  >
                    <option value="">כמה שנים עבדת?</option>
                    <option>פחות משנה</option>
                    <option>שנה עד 3 שנים</option>
                    <option>3 עד 7 שנים</option>
                    <option>מעל 7 שנים</option>
                  </select>
                  <select name="situation" required defaultValue="">
                    <option value="">הסיטואציה שלך?</option>
                    <option>פוטרתי לאחרונה</option>
                    <option>התפטרתי</option>
                    <option>עדיין עובד, רוצה לבדוק</option>
                    <option>שכר במזומן / ללא תיעוד</option>
                  </select>
                </div>

                <p className="filter-note">
                  * עבדת פחות משנה? כנראה שלא נוכל לעזור, ואני אומר את זה מראש
                </p>

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                  hidden
                />
                <button
                  type="button"
                  className="upload-label"
                  onClick={() => fileRef.current?.click()}
                >
                  {files.length
                    ? `נבחרו ${files.length} קבצים · להחלפה`
                    : "📎 העלאת תלוש שכר"}
                </button>
                <p className="upload-note">
                  PDF, JPG או PNG. אפשר גם לשלוח בוואטסאפ אחרי השליחה.
                </p>

                <div className="privacy-consent">
                  <input type="checkbox" id="privacy" required />
                  <label htmlFor="privacy">
                    🔒 התלושים נשמרים באחסון פרטי ומוצפן, נצפים על ידי עו״ד אוהד
                    טבת בלבד, ונמחקים לבקשתי בכל שלב. קראתי ואני מסכים/ה
                    ל<Link href="/privacy">מדיניות הפרטיות</Link> ול
                    <Link href="/terms">תנאי השימוש</Link>, בהתאם לתיקון 13 לחוק
                    הגנת הפרטיות.
                  </label>
                </div>

                {err && <div className="error-msg">{err}</div>}

                <button type="submit" className="cta-btn" disabled={state === "sending"}>
                  {state === "sending" ? "שולח..." : "שלח לבדיקה"}
                </button>
                <p className="form-note">
                  לא כל מקרה מתאים · תשובה תוך 24 שעות · המידע מאובטח לחלוטין
                </p>
              </form>
            )}
          </div>

          <div className="proof-strip">
            עובד שעבד <strong>מעל 30 שנה</strong> ללא זכויות סוציאליות. בדקנו את
            תלושיו והשבנו לו <strong>700,000 ש״ח</strong>. הוא לא ידע שמגיע לו.
            אתה יודע?
          </div>

          <a
            className="google-rating-link"
            href={GOOGLE_PROFILE_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="google-rating">
              <span className="google-rating-score">5.0</span>
              <span className="google-rating-stars">★★★★★</span>
              <span className="google-rating-text">15 ביקורות בגוגל</span>
            </div>
          </a>
        </div>
      </div>

      <div className="trust-bar">
        <div className="trust-item">
          <span className="trust-dot" />
          עו״ד מוסמך לדיני עבודה
        </div>
        <div className="trust-item">
          <span className="trust-dot" />
          בודק שכר מוסמך מטעם משרד העבודה
        </div>
        <div className="trust-item">
          <span className="trust-dot" />
          ניסיון כמעסיק של 50+ עובדים
        </div>
        <div className="trust-item">
          <span className="trust-dot" />
          מידע מאובטח · לא מועבר לשום גורם
        </div>
      </div>

      {/* ── המנגנון ── */}
      <section className="how-it-works">
        <div className="container">
          <h2 className="section-title">
            איך כסף נעלם מתלוש <span className="gold">בלי שאף אחד שם לב</span>
          </h2>
          <div className="divider" />

          <p className="lede">
            שני עובדים באותו מפעל, אותו תפקיד, שניהם מקבלים 12,000 ברוטו. בסוף
            החודש שניהם רואים אותו מספר בבנק. אבל בתלוש של אחד מהם השכר מפוצל
            לשניים: חצי כשכר יסוד, וחצי כתוספת.
          </p>

          <div className="visual-pair">
            <figure>
              <img src="/proof/split-slips.jpg" alt="שני תלושים עם אותו ברוטו ופיצול שונה" loading="lazy" />
            </figure>
            <figure>
              <img src="/proof/split-math.jpg" alt="חישוב הפער: 750 שקל בחודש, 63 אלף בשבע שנים" loading="lazy" />
            </figure>
          </div>

          <p className="lede">
            <strong>וההפרשות לפנסיה מחושבות רק מהחצי.</strong> לפי צו ההרחבה
            לפנסיה חובה המעסיק מפריש 12.5% מהשכר המבוטח. שנים עשר וחצי אחוז מתוך
            6,000 שלא בוטחו הם <strong>750 שקל בכל חודש</strong>, ועל פני שבע
            שנות ההתיישנות <strong>63 אלף שקל</strong>. מרכיב אחד.
          </p>
          <p className="lede">
            וזה עוד לפני ערך יום החופשה, ערך שעת העבודה הנוספת, ופיצויי
            הפיטורים, שכולם מחושבים מאותו בסיס נמוך.
          </p>
        </div>
      </section>

      {/* ── תוצאות ── */}
      <section className="social-proof">
        <div className="container">
          <h2 className="section-title">
            מה יצא <span className="gold">מהתיקים שכבר נבדקו</span>
          </h2>
          <div className="divider" />
          <p className="lede">
            מתוך התיקים שנבדקו אצלי במשרד, במרבית המקרים נמצאו שלושה רכיבים
            חסרים ומעלה. הנפוצים: דמי הבראה, פדיון חופשה, הפרשות פנסיה ושעות
            נוספות.
          </p>
          <div className="proof-grid">
            {RESULTS.map((r) => (
              <div className="proof-card" key={r.name}>
                <div className="proof-initials">{r.initials}</div>
                <div className="proof-name">{r.name}</div>
                <div className="proof-role">{r.role}</div>
                <div className="proof-result-label">קיבל</div>
                <div className="proof-amount">{r.amount}</div>
              </div>
            ))}
          </div>
          <p className="fineprint">
            תוצאות בתיקים שטופלו במשרד. כל תיק נבחן לגופו, ואין בכך הבטחה לתוצאה.
          </p>
        </div>
      </section>

      {/* ── פירוק חברות ── */}
      <section className="liq">
        <div className="container">
          <h2 className="section-title">
            החברה נסגרה. <span className="gold">זה לא אומר שהכסף נעלם.</span>
          </h2>
          <div className="divider" />
          <p className="lede">
            חברות קורסות. לפעמים הבעלים מעביר כספים החוצה עוד קודם. והעובד נשאר
            עם תלוש ביד ובלי אף אחד לגבות ממנו.
          </p>
          <p className="lede">
            <strong>גם במצב הזה אנחנו משיגים את הכסף של הלקוחות שלנו, דרך
            ביטוח לאומי.</strong> אנחנו מפרקים את החברה בבית המשפט המחוזי, ומשם
            מגישים תביעות חוב לביטוח הלאומי, שנכנס בנעלי החברה ומשלם לעובדים את
            זכויותיהם.
          </p>
          <p className="bignum">
            הנה לדוגמה חברה אחת שפורקה, עם <strong>עשרות עובדים</strong>,
            ולמעלה מ<strong>שני מיליון שקלים</strong> שהשבנו לעובדים.
          </p>

          <div className="docs">
            <figure>
              <img src="/proof/nii-201k.jpg" alt="אישור ביטוח לאומי על 201,003 שקלים, מושחר" loading="lazy" />
              <figcaption>
                אישור המוסד לביטוח לאומי, עובד אחד מתוך התיק.
                <br />
                סה״כ זכאות ברוטו: <b>201,003 ש״ח</b>
              </figcaption>
            </figure>
            <figure>
              <img src="/proof/nii-130k.jpg" alt="אישור ביטוח לאומי על 130,154 שקלים, מושחר" loading="lazy" />
              <figcaption>
                אישור נוסף מתיק פירוק, ממוען למשרד.
                <br />
                סה״כ זכאות ברוטו: <b>130,154 ש״ח</b>
              </figcaption>
            </figure>
          </div>
          <p className="fineprint">
            המסמכים מוצגים לאחר הסרת כל פרט מזהה של העובדים, המעסיקים ומספרי
            ההליכים.
          </p>
        </div>
      </section>

      {/* ── פסק דין ── */}
      <section className="judgment">
        <div className="container">
          <h2 className="section-title">
            דוגמה נוספת: <span className="gold">הליך שהסתיים בפשרה</span>
          </h2>
          <div className="divider" />
          <p className="lede">
            פועל חקלאי שעבד שנים. התביעה הוגשה לבית הדין לעבודה, וכעבור כשישה
            חודשים הסתיימה בהסכם פשרה שקיבל תוקף של פסק דין.
          </p>
          <div className="docs single">
            <figure>
              <img src="/proof/settlement-125k.jpg" alt="הסכם פשרה בתוקף פסק דין, 125,000 שקלים, מושחר" loading="lazy" />
              <figcaption>
                <b>125,000 ש״ח</b> כפיצויי פיטורים מוגדלים, בתוקף פסק דין
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* ── מי אני ── */}
      <section className="why-ohad">
        <div className="container">
          <div className="inner">
            <div className="ohad-photo-wrap">
              <Image
                className="ohad-photo"
                src={OHAD_PHOTO}
                alt="אוהד טבת עורך דין"
                width={210}
                height={210}
                unoptimized
              />
              <div className="ohad-name">אוהד טבת</div>
              <div className="ohad-title">
                עו״ד לדיני עבודה
                <br />
                בודק שכר מוסמך מטעם משרד העבודה
              </div>
            </div>

            <div>
              <h2 className="section-title">
                למה דווקא עו״ד <span className="gold">ובודק שכר מוסמך</span>
              </h2>
              <div className="divider" />
              <div className="usp-cards">
                <div className="usp-card">
                  <div className="usp-num">01</div>
                  <div>
                    <h4>עורך דין יודע לטעון, בודק שכר יודע לחשב</h4>
                    <p>
                      תיק שכר נופל או עומד על התחשיב. השילוב הזה הוא לא תואר, הוא
                      ההבדל בין הערכה כללית לבין מסמך שבית הדין מסתכל עליו.
                    </p>
                  </div>
                </div>
                <div className="usp-card">
                  <div className="usp-num">02</div>
                  <div>
                    <h4>לא הערכה. הצלבה</h4>
                    <p>
                      אני לוקח את התלושים לאורך כל תקופת ההעסקה, את דוחות הנוכחות
                      ואת דוחות הפנסיה, ומצליב ביניהם שורה אחר שורה. בסוף מתקבל
                      דוח שמראה מה שולם, מה היה צריך להיות משולם, ומה ההפרש בכל
                      רכיב.
                    </p>
                  </div>
                </div>
                <div className="usp-card">
                  <div className="usp-num">03</div>
                  <div>
                    <h4>הייתי מעסיק של 50+ עובדים</h4>
                    <p>
                      מכיר את שני הצדדים מבפנים. יודע איפה מעסיקים חוסכים, ואיפה
                      זה כבר לא חוקי.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── התיישנות ── */}
      <section className="urgency">
        <div className="container">
          <h2 className="section-title">
            ולמה זה דחוף <span className="gold">דווקא עכשיו</span>
          </h2>
          <div className="divider" />
          <div className="urgency-inner">
            <figure>
              <img src="/proof/clock.jpg" alt="שבע שנים של חודשים, החודשים הישנים נמחקים" loading="lazy" />
            </figure>
            <div>
              <p className="lede">
                תביעות שכר מתיישנות. בית הדין מסתכל{" "}
                <strong>שבע שנים אחורה, וזהו</strong>. מה שקדם לזה פשוט לא קיים.
              </p>
              <p className="lede">
                וזה לא נעצר. כל חודש שעובר, החודש הכי ישן שלך נמחק מהתביעה. מרוץ
                ההתיישנות נעצר רק ביום שמוגש כתב תביעה.
              </p>
              <p className="lede">
                <strong>
                  אם עבדת שם שנים וחסרים לך רכיבים, כל חודש של המתנה הוא כסף
                  שיוצא לך מהכיס.
                </strong>
              </p>
              <button className="cta-btn narrow" onClick={toForm}>
                לשליחת תלוש
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── שאלות ── */}
      <section className="faq">
        <div className="container">
          <h2 className="section-title">
            שאלות <span className="gold">שאני נשאל</span>
          </h2>
          <div className="divider" />
          <div className="faq-list">
            {FAQ.map((f) => (
              <details className="faq-item" key={f.q}>
                <summary className="faq-q">{f.q}</summary>
                <div className="faq-a">{f.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── סיום ── */}
      <section className="final-cta">
        <div className="container">
          <h2 className="section-title">משפט אחרון</h2>
          <p className="lede center">
            אני לא יכול להבטיח לך שמגיע לך כסף. אני יכול להבטיח שתדע.
            <br />
            והדבר היחיד שגרוע יותר מלגלות שנדפקת, הוא לגלות את זה אחרי שהזכות
            התיישנה.
          </p>
          <button className="cta-btn narrow" onClick={toForm}>
            לשליחת תלוש
          </button>
          <p className="sig">אוהד טבת, עו״ד</p>
        </div>
      </section>

      <style jsx global>{`
        .lede {
          font-size: 0.95rem;
          line-height: 1.85;
          color: var(--text-dim);
          margin-bottom: 1rem;
          max-width: 62ch;
        }
        .lede strong {
          color: #fff;
        }
        .lede.center {
          margin: 0 auto 1.5rem;
          text-align: center;
        }
        .fineprint {
          font-size: 0.72rem;
          color: var(--text-faint);
          line-height: 1.7;
          margin-top: 1rem;
        }
        .how-it-works,
        .social-proof,
        .liq,
        .judgment,
        .urgency,
        .faq,
        .final-cta {
          padding: 3.5rem 1.5rem;
        }
        .liq,
        .urgency {
          background: var(--navy-mid);
        }
        .visual-pair {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin: 1.75rem 0;
        }
        .visual-pair img,
        .docs img,
        .urgency-inner img {
          width: 100%;
          height: auto;
          display: block;
          border-radius: 12px;
          border: 1px solid var(--gold-border);
        }
        .bignum {
          background: rgba(201, 168, 76, 0.07);
          border: 1px solid var(--gold-border);
          border-radius: 12px;
          padding: 1.1rem 1.4rem;
          font-size: 1.02rem;
          line-height: 1.75;
          margin: 1.5rem 0;
        }
        .bignum strong {
          color: var(--gold);
          font-weight: 900;
        }
        .docs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.25rem;
          margin-top: 1.5rem;
        }
        .docs.single {
          grid-template-columns: 1fr;
          max-width: 520px;
        }
        .docs figcaption {
          font-size: 0.78rem;
          color: var(--text-dim);
          line-height: 1.65;
          margin-top: 0.6rem;
        }
        .docs figcaption b {
          color: var(--gold);
        }
        .urgency-inner {
          display: grid;
          grid-template-columns: 0.85fr 1.15fr;
          gap: 2.25rem;
          align-items: center;
        }
        .cta-btn.narrow {
          width: auto;
          padding: 0.9rem 2.25rem;
          margin-top: 0.75rem;
        }
        .final-cta {
          text-align: center;
        }
        .sig {
          color: var(--gold);
          font-weight: 800;
          margin-top: 1.25rem;
          font-size: 0.9rem;
        }
        .google-rating-link {
          display: block;
          margin-top: 1.1rem;
          text-decoration: none;
        }
        @media (max-width: 760px) {
          .visual-pair,
          .docs,
          .urgency-inner {
            grid-template-columns: 1fr;
          }
          .why-ohad .inner {
            grid-template-columns: 1fr;
            gap: 2rem;
          }
          .ohad-photo-wrap {
            position: static;
          }
        }
      `}</style>
    </>
  );
}
