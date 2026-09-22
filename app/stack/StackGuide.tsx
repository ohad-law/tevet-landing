"use client";

/**
 * עמוד הסטאק, נבנה 22/09/2026.
 *
 * הפיתיון החינמי של קהל עורכי הדין והיזמים, נשלח בבוט האינסטגרם למי
 * שמגיב "מערכת" או "בוט". זה הקהל השני של החשבון, ולכן הליד נכנס
 * ל-product_line נפרד ("AI ואוטומציה") ולא לצינור של דיני עבודה.
 *
 * הכלל של העמוד: רק מה שבאמת רץ במשרד. עמודת הסטטוס מציגה גם את מה
 * שהושהה ומה שנשרף, כי זו בדיוק העמדה של החשבון - בונה בשידור חי,
 * לא מוכר הצלחות. מי שיוסיף כאן כלי שלא מריצים בפועל שובר את העמוד.
 *
 * אין כאן מחירים. חלקם משתנים, וחלקם לא מאומתים, ועדיף בלי מאשר לא
 * מדויק. אם אוהד ירצה להוסיף, זה שדה note בכל פריט.
 */

import { useState, useRef } from "react";
import { submitStackLead } from "./actions";

type LeadState = "idle" | "sending" | "sent" | "error";

type Status = "live" | "building" | "burned";

type Tool = {
  name: string;
  what: string;
  mine: string;
  status: Status;
};

const STATUS_LABEL: Record<Status, string> = {
  live: "חי",
  building: "בבנייה",
  burned: "נשרף",
};

const GROUPS: { title: string; blurb: string; tools: Tool[] }[] = [
  {
    title: "הליבה",
    blurb: "אם הייתי מתחיל היום, הייתי מתחיל מכאן ולא מכלום אחר.",
    tools: [
      {
        name: "Claude Code",
        what: "כותב את הקוד של כל השאר",
        mine: "בניתי איתו את כל מה שרשום בעמוד הזה. אני לא מתכנת, ולא למדתי לתכנת בשביל זה.",
        status: "live",
      },
      {
        name: "CRM שבניתי לעצמי",
        what: "ניהול לידים, תיקים ומשימות",
        mine: "התחלתי על מערכת מדף, נתקעתי בה, ובניתי אחת משלי. ליד שנכנס נפתח לתיק עם משימות בלחיצה אחת.",
        status: "live",
      },
      {
        name: "Supabase ו-Vercel",
        what: "מסד הנתונים והאחסון",
        mine: "התשתית שכל המערכות יושבות עליה. שתיהן מתחילות בחינם, וזה מה שאיפשר להתחיל בלי להתחייב.",
        status: "live",
      },
    ],
  },
  {
    title: "השיווק והלידים",
    blurb: "מהרגע שמישהו מגיב לפוסט ועד שהוא יושב אצלי ביומן.",
    tools: [
      {
        name: "בוט תגובה להודעה פרטית",
        what: "מגיבים מילה, מקבלים מדריך בפרטי",
        mine: "הפוסטים עם הבוט מביאים לי פי 20 תגובות מפוסט רגיל. זה הדבר היחיד שבאמת שינה לי את האינסטגרם.",
        status: "live",
      },
      {
        name: "רובוט פולואפ בוואטסאפ",
        what: "חוזר ללידים שלא ענו",
        mine: "התחלתי עם רצף ארוך, זה היה נודניק, וקיצרתי ליום אפס ויום שביעי בלבד. פחות הודעות, יותר תשובות.",
        status: "live",
      },
      {
        name: "אוטומציה מפייסבוק ל-CRM",
        what: "ליד ממודעה נכנס למערכת מיד",
        mine: "לפני זה הייתי מגלה לידים באיחור של יום. היום זה מגיע תוך שניות עם התראה לטלפון.",
        status: "live",
      },
      {
        name: "עמודי נחיתה עם פיקסל ו-CAPI",
        what: "כל מדריך יושב על עמוד משלו",
        mine: "כל פיתיון הוא עמוד נפרד, וכל עמוד מדווח למטא בשרת ולא רק בדפדפן. בלי זה המודעות עובדות באפלה.",
        status: "live",
      },
    ],
  },
  {
    title: "הטלפון והשיחות",
    blurb: "כאן גיליתי את הדברים הכי לא נעימים על עצמי.",
    tools: [
      {
        name: "הקלטת שיחות",
        what: "כל שיחת מכירה מוקלטת ונשמרת",
        mine: "תמללתי עשרות שיחות ונתתי ל-AI לנתח. מה שיצא משם היה הדבר הכי שימושי והכי לא נעים שעשיתי השנה.",
        status: "live",
      },
      {
        name: "סוכנת AI טלפונית",
        what: "מתקשרת ללידים במקומי",
        mine: "בניתי אותה, היא עבדה, ועצרתי אותה. הטכנולוגיה הייתה מוכנה לפני שהתהליך שלי היה מוכן. חוזר לזה בהמשך.",
        status: "burned",
      },
    ],
  },
  {
    title: "הכספים והמשרד",
    blurb: "החלק הפחות סקסי, ובדיוק זה שהחזיר לי הכי הרבה שעות.",
    tools: [
      {
        name: "מנוע חשבוניות אוטומטי",
        what: "מושך חשבוניות מהמייל וממיין",
        mine: "הפסקתי להעביר קבצים ביד בסוף החודש. עדיין יש שם באגים שאני מתקן תוך כדי.",
        status: "live",
      },
      {
        name: "קישורי תשלום",
        what: "גבייה וחשבוניות מקוונות",
        mine: "לקוח מקבל קישור בוואטסאפ ומשלם מהטלפון. המערכת יודעת לבד שהתשלום נכנס.",
        status: "live",
      },
      {
        name: "דשבורד תזרים",
        what: "רואה את הכסף בזמן אמת",
        mine: "מושך מהבנקים ומסווג לבד. זה מה שגרם לי סוף סוף להסתכל על המספרים כל שבוע ולא כל רבעון.",
        status: "live",
      },
    ],
  },
];

export default function StackGuide() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");
  const [painPoint, setPainPoint] = useState("");
  const [state, setState] = useState<LeadState>("idle");
  const [error, setError] = useState("");
  const formRef = useRef<HTMLDivElement>(null);

  function toForm() {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!phone.trim() || !role || !painPoint.trim()) return;
    setState("sending");
    setError("");
    const res = await submitStackLead(name, phone, role, painPoint);
    if (res.ok) {
      setState("sent");
    } else {
      setState("error");
      setError(res.error || "שגיאה, נסו שוב");
    }
  }

  const liveCount = GROUPS.flatMap((g) => g.tools).filter(
    (t) => t.status === "live"
  ).length;

  return (
    <>
      <nav className="nav">
        <div className="nav-logo">
          TEVET<span>משרד עורכי דין</span>
        </div>
        <button className="nav-cta" onClick={toForm}>
          מה תוקע אתכם
        </button>
      </nav>

      <div className="hero">
        <div className="hero-inner">
          <div className="h1-setup">אני עורך דין, לא מתכנת.</div>
          <div className="h1-main">
            <span className="gold">אלה כל המערכות שאני מריץ במשרד.</span>
          </div>
          <div className="h1-bridge">
            בניתי את רובן לבד, בלי צוות פיתוח ובלי חברת תוכנה.
            <br />
            <strong>
              הרשימה כוללת גם את מה שהושהה ואת מה שנשרף, כי זה החלק שאף אחד לא
              מראה.
            </strong>
          </div>
        </div>
      </div>

      <section className="stack-intro">
        <div className="container">
          <div className="stack-stats">
            <div className="sstat">
              <b>{liveCount}</b>
              <span>מערכות חיות</span>
            </div>
            <div className="sstat">
              <b>0</b>
              <span>מפתחים במשרד</span>
            </div>
            <div className="sstat">
              <b>1</b>
              <span>נשרפה בדרך</span>
            </div>
          </div>
          <p className="lede" style={{ marginTop: "1.75rem" }}>
            כל מה שרשום כאן רץ אצלי בפועל. לא הוספתי כלים שרק ניסיתי, ולא
            כלים שמישהו שילם לי להמליץ עליהם.{" "}
            <strong>
              אם משהו כאן לא עבד, כתוב שהוא לא עבד.
            </strong>
          </p>
        </div>
      </section>

      {GROUPS.map((group) => (
        <section className="stack-group" key={group.title}>
          <div className="container">
            <h2 className="section-title">
              <span className="gold">{group.title}</span>
            </h2>
            <div className="divider" />
            <p className="lede">{group.blurb}</p>

            <div className="tool-list">
              {group.tools.map((tool) => (
                <div className="tool" key={tool.name}>
                  <div className="tool-head">
                    <h4>{tool.name}</h4>
                    <span className={`badge ${tool.status}`}>
                      {STATUS_LABEL[tool.status]}
                    </span>
                  </div>
                  <p className="tool-what">{tool.what}</p>
                  <p className="tool-mine">{tool.mine}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      <section className="stack-form" ref={formRef}>
        <div className="container narrow">
          <h2 className="section-title">
            מה <span className="gold">גוזל לכם</span> הכי הרבה זמן?
          </h2>
          <div className="divider" />
          <p className="lede">
            אני אוסף את השאלות שחוזרות, ועונה עליהן בתוכן. תכתבו לי מה התקיעה
            הכי גדולה שלכם, ואם יש לזה פתרון שאני מכיר, אחזור אליכם.
          </p>

          <div className="form-card">
            {state === "sent" ? (
              <div className="success-box">
                <h3>קיבלתי, תודה</h3>
                <p>
                  השאלה שלכם נכנסה לרשימה. אם יש לזה פתרון שאני מכיר, אחזור
                  אליכם.
                </p>
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
                  <option>מתמחה או עו״ד בתחילת דרך</option>
                  <option>בעל עסק, לא עורך דין</option>
                  <option>אחר</option>
                </select>
                <textarea
                  required
                  rows={3}
                  placeholder="מה גוזל לכם הכי הרבה זמן היום?"
                  value={painPoint}
                  onChange={(e) => setPainPoint(e.target.value)}
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
        .stack-intro {
          background: #f7f5f0;
          padding: 3rem 1.5rem;
        }
        .stack-intro .lede {
          color: #4a5468;
        }
        .stack-intro .lede strong {
          color: #0d1b2a;
        }
        .stack-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          max-width: 560px;
        }
        .sstat {
          background: #fff;
          border: 1px solid rgba(13, 27, 42, 0.1);
          border-radius: 12px;
          padding: 1.1rem 0.75rem;
          text-align: center;
        }
        .sstat b {
          display: block;
          font-size: 1.9rem;
          font-weight: 800;
          color: #0d1b2a;
          line-height: 1.1;
        }
        .sstat span {
          font-size: 0.78rem;
          color: #6b7280;
        }

        .stack-group {
          padding: 3.25rem 1.5rem;
        }
        .stack-group:nth-of-type(even) {
          background: rgba(255, 255, 255, 0.02);
        }
        .tool-list {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
          margin-top: 2rem;
        }
        .tool {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 1.15rem 1.25rem;
        }
        .tool-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          margin-bottom: 0.45rem;
        }
        .tool-head h4 {
          font-size: 1rem;
          font-weight: 800;
          margin: 0;
        }
        .badge {
          font-size: 0.68rem;
          font-weight: 700;
          padding: 0.15rem 0.6rem;
          border-radius: 99px;
          white-space: nowrap;
        }
        .badge.live {
          background: rgba(45, 168, 110, 0.18);
          color: #6ee7a8;
        }
        .badge.building {
          background: rgba(201, 162, 39, 0.2);
          color: var(--gold);
        }
        .badge.burned {
          background: rgba(220, 90, 70, 0.18);
          color: #ff9d8a;
        }
        .tool-what {
          font-size: 0.86rem;
          color: var(--gold);
          margin: 0 0 0.5rem;
          font-weight: 600;
        }
        .tool-mine {
          font-size: 0.85rem;
          color: var(--text-dim);
          line-height: 1.7;
          margin: 0;
        }

        .stack-form {
          padding: 3.25rem 1.5rem 4.5rem;
        }
        .container.narrow {
          max-width: 620px;
        }
        .form-card {
          margin-top: 2rem;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 14px;
          padding: 1.5rem;
        }
        .form-card .row2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
        }
        .form-card textarea {
          resize: vertical;
          font-family: inherit;
        }
        .success-box h3 {
          color: var(--gold);
          text-align: center;
          font-size: 1rem;
        }
        .success-box p {
          text-align: center;
          font-size: 0.88rem;
          color: var(--text-dim);
          margin-top: 0.5rem;
        }
        .error-msg {
          color: #ff9d8a;
          font-size: 0.8rem;
          text-align: center;
          margin-bottom: 0.5rem;
        }
        .fineprint {
          font-size: 0.72rem;
          color: #6b7280;
          text-align: center;
          margin-top: 0.85rem;
          line-height: 1.6;
        }

        @media (max-width: 760px) {
          .tool-list {
            grid-template-columns: 1fr;
          }
          .stack-stats {
            grid-template-columns: 1fr 1fr 1fr;
            gap: 0.6rem;
          }
          .sstat b {
            font-size: 1.5rem;
          }
          .form-card .row2 {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}
