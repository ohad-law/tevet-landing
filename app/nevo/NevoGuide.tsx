"use client";

/**
 * מדריך "נבו ל-Claude", נבנה 15/10/2026.
 *
 * מי שמגיב "נבו" בבוט האינסטגרם מקבל קישור לכאן. זה הנכס של קהל עורכי
 * הדין, ולכן הליד נכנס ל-product_line "AI ואוטומציה" ולא לדיני עבודה.
 *
 * 🚨 מה מאומת ומה לא, כדי שמי שיערוך יידע:
 *  - שלושת ערכי החיבור (שם, כתובת, Client ID) וגם הדרישה ל-Claude Pro
 *    או Max נלקחו מהמדריך הרשמי של נבו. הצעדים עצמם שם רק באנימציה.
 *  - נוסח התפריטים (Customize, Connectors, Add) נראה בצילום מסך של
 *    אוהד. התווית "מחבר מותאם אישית" בתפריט Add לא נצפתה בעיניים.
 *  - תוצאות השאילתה הן מחיפוש אחד שהורץ ב-15/10/2026 דרך החיבור.
 *
 * 🚨 אין כאן "חינם" ואין מחיר. כלל 3(ב)(14) של לשכת עורכי הדין.
 * 🚨 אין כאן הסקיל עצמו. הוא נשאר פרטי של אוהד בכוונה, והדף נותן
 *    את החיבור ואת רשימת הבדיקה האנושית בלבד.
 */

import { useState, useRef } from "react";
import { submitNevoLead } from "./actions";

type LeadState = "idle" | "sending" | "sent" | "error";

const CONNECTOR_NAME = "nevo-claude";
const CONNECTOR_URL = "https://stream.nevo.co.il/mcp/nevo";
const CONNECTOR_CLIENT_ID = "nevo-claude";
const FIRST_QUERY =
  "התפטרות בדין מפוטר בשל אי תשלום שכר במועד, תנאים וחובת התראה";

const NEEDS = [
  {
    title: "Claude בתשלום",
    body: "מנוי Pro או Max. כך כתוב במדריך ההתקנה של נבו.",
  },
  {
    title: "חשבון נבו",
    body: "החיבור עובד דרך החשבון שלכם, וכל חיפוש נספר במכסה שלו.",
  },
  {
    title: "שאלה כללית",
    body: "לבדיקה הראשונה. בלי שם לקוח, בלי מעסיק מזוהה, בלי מספר תיק.",
  },
];

const CHECKS = [
  {
    title: "פותחים את המקור",
    body: "קטע שחוזר בחיפוש הוא לא פסק הדין. לפני שמצטטים, פותחים את המסמך המלא.",
  },
  {
    title: "בודקים בית דין ותאריך",
    body: "אזורי, ארצי או עליון. הלכה של בית דין אזורי היא לא הלכת הארצי, ופסק דין ישן יכול להיות מוחלף.",
  },
  {
    title: "בודקים מי אומר את זה",
    body: "בקטעים חוזרות גם טענות של צדדים. הקביעה צריכה להיות של בית הדין, לא של התובע או של הנתבע.",
  },
  {
    title: "הלכה מצוטטת, מוצאים בנפרד",
    body: "כשפסק דין אזורי מצטט הלכה, לא מצטטים אותה דרכו. מוצאים אותה ופותחים אותה בעצמה.",
  },
  {
    title: "הפלט הוא טיוטה",
    body: "עורך דין קורא וחותם. הכלי מקצר את החיפוש, הוא לא מחליף את הקריאה.",
  },
];

function CopyBox({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* הדפדפן חסם את הלוח. הערך עדיין מוצג וניתן לסימון ידני. */
    }
  }
  return (
    <div className="copybox">
      <div className="copy-label">{label}</div>
      <div className="copy-row">
        <code dir="ltr">{value}</code>
        <button type="button" onClick={copy} className="copy-btn">
          {copied ? "הועתק" : "העתקה"}
        </button>
      </div>
    </div>
  );
}

export default function NevoGuide() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");
  const [topic, setTopic] = useState("");
  const [state, setState] = useState<LeadState>("idle");
  const [error, setError] = useState("");
  const formRef = useRef<HTMLDivElement>(null);

  function toForm() {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function trackLead() {
    try {
      (window as unknown as { fbq?: (...a: unknown[]) => void }).fbq?.(
        "track",
        "Lead",
        { content_name: "nevo_guide" }
      );
    } catch {
      /* פיקסל חסום בדפדפן. לא שובר את הדף. */
    }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!phone.trim() || !role || !topic.trim()) return;
    setState("sending");
    setError("");
    const res = await submitNevoLead(name, phone, role, topic);
    if (res.ok) {
      setState("sent");
      trackLead();
    } else {
      setState("error");
      setError(res.error || "שגיאה, נסו שוב");
    }
  }

  return (
    <>
      <nav className="nav">
        <div className="nav-logo">
          TEVET<span>משרד עורכי דין</span>
        </div>
        <button className="nav-cta" onClick={toForm}>
          מה לבדוק ראשון
        </button>
      </nav>

      <div className="hero">
        <div className="hero-inner">
          <div className="h1-setup">הפחד הראשון של עורכי דין מ-AI:</div>
          <div className="h1-main">
            <span className="gold">פסק דין שלא קיים.</span>
          </div>
          <div className="h1-bridge">
            כש-Claude מחובר לנבו, כל מקור חוזר עם קישור שאפשר לפתוח.
            <br />
            <strong>הנה איך מחברים, ומה בודקים בכל תוצאה לפני שמצטטים.</strong>
          </div>
        </div>
      </div>

      <section className="nv-section nv-paper">
        <div className="container">
          <h2 className="section-title">
            מה <span className="gold">צריך</span> לפני שמתחילים
          </h2>
          <div className="divider" />
          <div className="nv-grid3">
            {NEEDS.map((n) => (
              <div className="nv-card" key={n.title}>
                <h4>{n.title}</h4>
                <p>{n.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="nv-section">
        <div className="container">
          <h2 className="section-title">
            החיבור, <span className="gold">שישה צעדים</span>
          </h2>
          <div className="divider" />

          <ol className="nv-steps">
            <li>
              <b>פותחים את Claude</b> באפליקציה או באתר, בחשבון Pro או Max,
              ונכנסים ל-Customize ומשם ל-Connectors.
            </li>
            <li>
              <b>לוחצים Add</b> ובוחרים להוסיף מחבר מותאם אישית.
            </li>
            <li>
              <b>ממלאים שלושה שדות.</b> אפשר להעתיק מכאן:
              <div className="nv-copies">
                <CopyBox label="שם המחבר" value={CONNECTOR_NAME} />
                <CopyBox label="כתובת השרת" value={CONNECTOR_URL} />
                <CopyBox label="OAuth Client ID" value={CONNECTOR_CLIENT_ID} />
              </div>
            </li>
            <li>
              <b>מאשרים ומתחברים לנבו</b> כשמתבקשים. באתר claude.ai התהליך
              זהה, ושני חלונות אישור לא מופיעים.
            </li>
            <li>
              <b>בודקים שהמחבר מופיע ברשימה</b> עם הסימן Connected.
            </li>
            <li>
              <b>פותחים שיחה חדשה</b> ושואלים שאלה, כמו בדוגמה למטה.
            </li>
          </ol>

          <div className="nv-note">
            <b>מה תראו במסך:</b> המחבר מופיע עם תג Community, ובלי סימן
            האימות שיש ליד מחברים כמו Google Drive. זה לא סיבה לא להשתמש
            בו. זו סיבה לדעת מה שולחים אליו, ולכן הכלל הבא.
          </div>

          <p className="nv-source">
            הערכים והדרישה למנוי נלקחו ממדריך ההתקנה הרשמי של נבו.
          </p>
        </div>
      </section>

      <section className="nv-section nv-paper">
        <div className="container">
          <h2 className="section-title">
            השאלה <span className="gold">הראשונה</span>
          </h2>
          <div className="divider" />
          <p className="lede">
            זו השאלה שהרצתי דרך החיבור. היא כללית, בלי עובדות של תיק:
          </p>
          <CopyBox label="שאילתה לדוגמה" value={FIRST_QUERY} />

          <div className="nv-result">
            <p className="nv-result-title">מה חזר בחיפוש אחד</p>
            <div className="nv-grid3">
              <div className="nv-stat">
                <b>8</b>
                <span>פסקי דין שונים מבתי הדין האזוריים לעבודה</span>
              </div>
              <div className="nv-stat">
                <b>7</b>
                <span>סעיפי חקיקה, כולל סעיף 11(א) לחוק פיצויי פיטורים</span>
              </div>
              <div className="nv-stat">
                <b>1999 עד 8/2026</b>
                <span>הטווח בין פסק הדין הוותיק לחדש ביותר</span>
              </div>
            </div>
            <p className="nv-source" style={{ marginTop: "0.9rem" }}>
              אלה קטעים שהחיפוש החזיר. לא נפתחו פסקי הדין המלאים, ובדיוק
              בגלל זה יש את הרשימה הבאה.
            </p>
          </div>
        </div>
      </section>

      <section className="nv-section">
        <div className="container">
          <h2 className="section-title">
            מה בודקים <span className="gold">בכל תוצאה</span>
          </h2>
          <div className="divider" />
          <div className="nv-checks">
            {CHECKS.map((c, i) => (
              <div className="nv-check" key={c.title}>
                <span className="nv-num">{i + 1}</span>
                <div>
                  <h4>{c.title}</h4>
                  <p>{c.body}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="nv-note nv-warn">
            <b>מה לא נכנס לשאילתה:</b> שם לקוח, ת.ז., מעסיק מזוהה או מספר
            תיק. מנסחים שאלה כללית. פרטי הלקוח נשארים אצלכם.
          </div>
        </div>
      </section>

      <section className="nv-section nv-form" ref={formRef}>
        <div className="container narrow">
          <h2 className="section-title">
            מה הייתם <span className="gold">רוצים לבדוק</span> ראשון?
          </h2>
          <div className="divider" />
          <p className="lede">
            אני אוסף את השאלות שחוזרות, ובונה מהן את הצעד הבא. כתבו לי מה
            הייתם רוצים שיעבוד אחרת בעבודה עם AI.
          </p>

          <div className="form-card">
            {state === "sent" ? (
              <div className="success-box">
                <h3>קיבלתי, תודה</h3>
                <p>השאלה שלכם נכנסה לרשימה.</p>
              </div>
            ) : (
              <form onSubmit={submit}>
                <div className="row2">
                  <input
                    placeholder="שם מלא"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                  />
                  <input
                    placeholder="טלפון"
                    required
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                  />
                </div>
                <select
                  required
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="">מה אתם עושים?</option>
                  <option>עורך דין עצמאי</option>
                  <option>שותף או בעלים של משרד</option>
                  <option>עו״ד שכיר</option>
                  <option>מתמחה או בתחילת דרך</option>
                  <option>אחר</option>
                </select>
                <textarea
                  required
                  rows={3}
                  placeholder="מה הייתם רוצים לבדוק ראשון?"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
                {error && <div className="error-msg">{error}</div>}
                <button
                  type="submit"
                  className="cta-btn"
                  disabled={state === "sending"}
                >
                  {state === "sending" ? "שולח..." : "שלחו לי"}
                </button>
                <p className="fineprint">
                  זו לא פנייה לייעוץ משפטי ולא נוצרים יחסי עורך דין ולקוח.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      <style jsx global>{`
        .nv-section { padding: 3.25rem 1.5rem; }
        .nv-paper { background: #f7f5f0; }
        .nv-paper .section-title,
        .nv-paper .section-title .gold { color: #0d1b2a; }
        .nv-paper .lede { color: #4a5468; }
        .nv-grid3 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-top: 1.25rem;
        }
        .nv-card {
          background: #fff;
          border: 1px solid rgba(13, 27, 42, 0.1);
          border-radius: 12px;
          padding: 1.1rem 1.2rem;
        }
        .nv-card h4 { color: #0d1b2a; font-size: 1rem; font-weight: 800; margin: 0 0 0.35rem; }
        .nv-card p { color: #4a5468; font-size: 0.88rem; line-height: 1.7; margin: 0; }
        .nv-steps { margin: 1.5rem 0 0; padding: 0; list-style: none; counter-reset: s; display: grid; gap: 0.9rem; }
        .nv-steps li {
          counter-increment: s;
          position: relative;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.09);
          border-radius: 12px;
          padding: 1rem 3.4rem 1rem 1.2rem;
          line-height: 1.75;
          font-size: 0.95rem;
        }
        .nv-steps li::before {
          content: counter(s);
          position: absolute;
          right: 1rem;
          top: 0.95rem;
          width: 1.7rem;
          height: 1.7rem;
          border-radius: 50%;
          background: var(--gold);
          color: var(--navy);
          font-weight: 900;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .nv-copies { display: grid; gap: 0.6rem; margin-top: 0.8rem; }
        .copybox {
          background: rgba(0, 0, 0, 0.22);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          padding: 0.6rem 0.8rem;
        }
        .nv-paper .copybox { background: #fff; border-color: rgba(13, 27, 42, 0.12); }
        .copy-label { font-size: 0.72rem; opacity: 0.7; margin-bottom: 0.3rem; }
        .nv-paper .copy-label { color: #6b7280; opacity: 1; }
        .copy-row { display: flex; align-items: center; justify-content: space-between; gap: 0.7rem; }
        .copy-row code {
          font-family: ui-monospace, Menlo, monospace;
          font-size: 0.82rem;
          overflow-wrap: anywhere;
          text-align: left;
          flex: 1;
        }
        .nv-paper .copy-row code { color: #0d1b2a; }
        .copy-btn {
          background: var(--gold);
          color: var(--navy);
          border: none;
          border-radius: 8px;
          padding: 0.35rem 0.85rem;
          font-weight: 800;
          font-size: 0.78rem;
          cursor: pointer;
          font-family: inherit;
          white-space: nowrap;
        }
        .nv-note {
          margin-top: 1.4rem;
          background: rgba(201, 162, 39, 0.1);
          border-right: 4px solid var(--gold);
          border-radius: 10px;
          padding: 0.95rem 1.1rem;
          font-size: 0.9rem;
          line-height: 1.75;
        }
        .nv-warn { background: rgba(220, 90, 70, 0.1); border-right-color: #ff9d8a; }
        .nv-source { font-size: 0.78rem; opacity: 0.65; margin-top: 1rem; }
        .nv-paper .nv-source { color: #6b7280; opacity: 1; }
        .nv-result {
          margin-top: 1.6rem;
          background: #fff;
          border: 1px solid rgba(13, 27, 42, 0.1);
          border-radius: 14px;
          padding: 1.2rem 1.3rem;
        }
        .nv-result-title { color: #0d1b2a; font-weight: 800; margin: 0; }
        .nv-stat {
          background: #f7f5f0;
          border-radius: 10px;
          padding: 0.9rem 0.8rem;
          text-align: center;
        }
        .nv-stat b { display: block; color: #0d1b2a; font-size: 1.35rem; font-weight: 900; line-height: 1.2; }
        .nv-stat span { font-size: 0.76rem; color: #6b7280; line-height: 1.5; display: block; margin-top: 0.3rem; }
        .nv-checks { display: grid; gap: 0.9rem; margin-top: 1.4rem; }
        .nv-check {
          display: flex;
          gap: 0.9rem;
          align-items: flex-start;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.09);
          border-radius: 12px;
          padding: 1rem 1.1rem;
        }
        .nv-check h4 { margin: 0 0 0.25rem; font-size: 1rem; font-weight: 800; }
        .nv-check p { margin: 0; font-size: 0.88rem; line-height: 1.7; color: var(--text-dim); }
        .nv-num {
          flex: 0 0 auto;
          width: 1.8rem;
          height: 1.8rem;
          border-radius: 50%;
          background: var(--gold);
          color: var(--navy);
          font-weight: 900;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.9rem;
        }
        .container.narrow { max-width: 620px; }
        .nv-form { padding-bottom: 4.5rem; }
        .form-card {
          margin-top: 1.8rem;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 14px;
          padding: 1.5rem;
        }
        .form-card .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
        .form-card textarea { resize: vertical; font-family: inherit; }
        .success-box h3 { color: var(--gold); text-align: center; font-size: 1rem; }
        .success-box p { text-align: center; font-size: 0.88rem; color: var(--text-dim); margin-top: 0.5rem; }
        .error-msg { color: #ff9d8a; font-size: 0.8rem; text-align: center; margin-bottom: 0.5rem; }
        .fineprint { font-size: 0.72rem; color: #6b7280; text-align: center; margin-top: 0.85rem; line-height: 1.6; }
        @media (max-width: 760px) {
          .nv-grid3 { grid-template-columns: 1fr; }
          .form-card .row2 { grid-template-columns: 1fr; }
        }
      `}</style>
    </>
  );
}
