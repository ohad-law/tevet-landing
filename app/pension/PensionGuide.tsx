"use client";

/**
 * מדריך בדיקת הפקדות פנסיה, נבנה 14/09/2026.
 *
 * הפיתיון החינמי שנשלח בבוט האינסטגרם למי שמגיב "פנסיה". אותה שפה
 * עיצובית כמו /bdika ו-/tlush (globals.css, navy/gold), בלי CSS module
 * נפרד. גם התלוש וגם דוח ההפקדות הם מסמכים אמיתיים שאוהד הכין לקורס
 * שלו (שם/מעסיק/ת.ז הוסרו) - לא בדויים, ולא של לקוח. שני המסמכים
 * תואמים זה לזה (4/2025: ניכוי 360 בתלוש = הפקדת עמית 360 בדוח),
 * ולכן הדוגמה מראה דוח "נקי" בכוונה, לא פער מומצא.
 */

import { useState, useRef } from "react";
import { submitPensionLead } from "./actions";

const OHAD_WHATSAPP = "972515937329";

type LeadState = "idle" | "sending" | "sent" | "error";

export default function PensionGuide() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [foundGap, setFoundGap] = useState("");
  const [state, setState] = useState<LeadState>("idle");
  const [error, setError] = useState("");
  const formRef = useRef<HTMLDivElement>(null);

  function toForm() {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!phone.trim() || !foundGap) return;
    setState("sending");
    setError("");
    const res = await submitPensionLead(name, phone, foundGap);
    if (res.ok) {
      setState("sent");
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
          מצאתי פער
        </button>
      </nav>

      <div className="hero">
        <div className="hero-inner">
          <div className="h1-setup">בתלוש כתוב שהפרישו לכם לפנסיה.</div>
          <div className="h1-main">
            <span className="gold">זה לא אומר שהכסף הגיע לקופה.</span>
          </div>
          <div className="h1-bridge">
            יש מקרים שבהם המעסיק מנכה, אבל ההפקדה בפועל מתעכבת, חסרה, או לא
            מתבצעת בכלל.
            <br />
            <strong>הבדיקה לוקחת חמש דקות, ואתם עושים אותה בעצמכם.</strong>
          </div>
        </div>
      </div>

      <section className="how-it-works">
        <div className="container">
          <h2 className="section-title">
            <span className="gold">4 שלבים</span> לבדיקה עצמית
          </h2>
          <div className="divider" />

          <div className="pension-steps">
            <div className="pstep">
              <div className="step-num">1</div>
              <h4>מוצאים בתלוש את שם הקופה</h4>
              <p>
                בתלוש שלכם כתובה שורה כמו &quot;קופת גמל לקצבה&quot; או
                &quot;קרן פנסיה&quot;, ולידה שם הקופה (הראל, הפניקס, מגדל,
                מנורה, כלל וכו&apos;).
              </p>
            </div>
            <div className="pstep">
              <div className="step-num">2</div>
              <h4>נכנסים לאתר של אותה קופה</h4>
              <p>
                לא לאתר ממשלתי, ישר לאתר של הקופה עצמה. מתחברים לאזור האישי,
                בדרך כלל עם תעודת זהות ומספר טלפון.
              </p>
            </div>
            <div className="pstep">
              <div className="step-num">3</div>
              <h4>פותחים דוחות שנתיים</h4>
              <p>
                מחפשים באזור האישי &quot;דוחות שנתיים&quot; או &quot;דוח
                הפקדות&quot;, ופותחים את השנה הנוכחית.
              </p>
            </div>
            <div className="pstep">
              <div className="step-num">4</div>
              <h4>משווים חודש מול חודש</h4>
              <p>
                מה שהתלוש אומר שהופרש, מול מה שבאמת נכנס לקופה - וגם מתי זה
                נכנס. הפקדה אחרי ה-15 לחודש שלאחר חודש השכר היא בעיה בפני
                עצמה, גם אם הסכום נכון.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="pension-demo">
        <div className="container">
          <h2 className="section-title">
            איפה בדיוק <span className="gold">מוצאים את זה</span>
          </h2>
          <div className="divider" />
          <p className="lede">
            ככה זה נראה על תלוש אמיתי (מהקורס שלי, שם ומעסיק הוסרו) - החלק
            שמעניין אתכם הוא &quot;ניכויי חובה&quot;, השורה עם שם הקופה:
          </p>

          <figure className="doc-figure">
            <img src="/proof/pension-payslip-deductions.png" alt="טבלת ניכויי חובה בתלוש שכר, כולל שורת הפרשה לקופת הפנסיה" loading="lazy" />
            <figcaption>ניכויי החובה בתלוש 4/2025. שימו לב לשורה &quot;הראל פנסיה, 360.00&quot;.</figcaption>
          </figure>

          <p className="lede" style={{ marginTop: "2rem" }}>
            ואחרי שנכנסתם לדוחות השנתיים באתר הקופה, ככה נראית הטבלה שמשווים
            מולה - זה דוח ההפקדות האמיתי של אותו תלוש, מהראל:
          </p>

          <figure className="doc-figure">
            <img src="/proof/pension-deposits-report.png" alt="טבלת פירוט הפקדות כספים בקרן הפנסיה לפי חודש, כולל מועד ההפקדה" loading="lazy" />
            <figcaption>
              עמודת &quot;מרכיב תגמולים עמית&quot; היא ניכוי חלק העובד - 360.00
              בכל חודש, תואם לתלוש. אבל תסתכלו על עמודת &quot;מועד הפקדה&quot;.
            </figcaption>
          </figure>
          <p className="lede">
            יש כאן שני דברים נפרדים לבדוק, לא רק אחד. <strong>הסכום</strong> -
            שבדוגמה הזו תקין. <strong>והתאריך</strong> - שבדוגמה הזו דווקא לא:
            שימו לב שכמה הפקדות בוצעו אחרי ה-15 לחודש (20/04, 16/05, 16/09,
            16/11). החוק מחייב את המעסיק להפקיד עד ה-15 בחודש שאחרי חודש
            השכר. הפקדה מאוחרת היא בעיה בפני עצמה, גם כשהסכום נכון.
          </p>
          <p className="fineprint">
            כלומר: גם אם הסכומים אצלכם תואמים, שווה לבדוק גם את התאריכים. שני
            הדברים ביחד הם הפער שמחפשים.
          </p>
        </div>
      </section>

      <section className="urgency" ref={formRef}>
        <div className="container">
          <h2 className="section-title">
            מצאתם <span className="gold">פער?</span>
          </h2>
          <div className="divider" />
          <p className="lede">
            כל הכסף שלא הופקד הוא כסף שלכם, ולפעמים מגלים את זה רק בגיל
            פרישה. הכי מהיר: לשלוח לי הודעה בוואטסאפ ואני אעבור על זה איתכם.
          </p>
          <a
            className="cta-btn narrow"
            href={`https://wa.me/${OHAD_WHATSAPP}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-block", textDecoration: "none", textAlign: "center" }}
          >
            שליחת הודעה בוואטסאפ
          </a>

          <div className="form-box" style={{ marginTop: "2rem" }}>
            {state === "sent" ? (
              <div className="success-box">
                <h3>קיבלתי. אחזור אליכם בהקדם.</h3>
              </div>
            ) : (
              <form onSubmit={submit}>
                <h3>או שתשאירו פרטים ואני אחזור אליכם</h3>
                <div className="form-grid">
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
                  value={foundGap}
                  onChange={(e) => setFoundGap(e.target.value)}
                >
                  <option value="">מצאתם פער?</option>
                  <option>כן, מצאתי פער</option>
                  <option>לא בטוח, רוצה שיעברו איתי</option>
                  <option>לא מצאתי, אבל יש לי שאלה</option>
                </select>
                {error && <div className="error-msg">{error}</div>}
                <button type="submit" className="cta-btn" disabled={state === "sending"}>
                  {state === "sending" ? "שולח..." : "השאירו פרטים"}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      <style jsx global>{`
        .pension-steps {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.5rem;
          margin-top: 2.5rem;
        }
        .pstep { text-align: center; }
        .pstep h4 { font-size: 0.95rem; font-weight: 800; margin-bottom: 0.4rem; }
        .pstep p { font-size: 0.8rem; color: var(--text-dim); line-height: 1.6; }
        /* קטע הדוגמה בנייר בהיר, לא נייבי. שני קטעי נייבי כהה ברצף
           (הירו + הדוגמה) הרגישו כמו קיר צבע אחד כבד. הנייר גם
           מתאים יותר להדגמה של מסמך אמיתי - זה מרגיש כמו נייר. */
        .pension-demo { background: #f7f5f0; padding: 3.5rem 1.5rem; }
        .pension-demo .section-title, .pension-demo .section-title .gold { color: #0d1b2a; }
        .pension-demo .lede { color: #4a5468; }
        .pension-demo .lede strong { color: #0d1b2a; }
        .pension-demo .fineprint { color: #6b7280; }
        .doc-figure {
          margin-top: 1.25rem;
          background: #fff;
          border: 1px solid rgba(13,27,42,0.1);
          border-radius: 12px;
          padding: 0.75rem;
          box-shadow: 0 1px 3px rgba(13,27,42,0.06);
          max-width: 560px;
        }
        .doc-figure img {
          width: 100%; height: auto; display: block; border-radius: 6px;
        }
        .doc-figure figcaption {
          font-size: 0.78rem; color: #6b7280; line-height: 1.6;
          margin-top: 0.6rem; padding: 0 0.25rem;
        }
        .cta-btn.narrow { width: auto; padding: 0.9rem 2.25rem; margin-top: 0.5rem; }
        .success-box h3 { color: var(--gold); text-align: center; font-size: 1rem; }
        .error-msg { color: #ff9d8a; font-size: 0.8rem; text-align: center; margin-bottom: 0.5rem; }
        @media (max-width: 760px) {
          .pension-steps { grid-template-columns: 1fr 1fr; }
        }
      `}</style>
    </>
  );
}
