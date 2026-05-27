import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: 'תנאי שימוש | אוהד טבת עו"ד',
};

export default function TermsPage() {
  return (
    <>
      <nav className="nav">
        <div className="nav-logo">
          TEVET
          <span>TEVET | LAW OFFICE | טבת משרד עורכי דין</span>
        </div>
        <Link href="/" className="nav-cta" style={{ textDecoration: "none" }}>חזרה לדף הראשי</Link>
      </nav>

      <section style={{ minHeight: "80vh" }}>
        <div className="container" style={{ maxWidth: "760px" }}>
          <div className="section-label">משפטי</div>
          <h1 className="section-title">תנאי שימוש</h1>
          <div className="divider" />

          <div style={{ fontSize: "0.88rem", color: "rgba(255,255,255,0.6)", lineHeight: 2, display: "flex", flexDirection: "column", gap: "1.5rem" }}>

            <div>
              <h3 style={{ color: "#fff", fontWeight: 800, marginBottom: "0.5rem" }}>1. כללי</h3>
              <p>
                האתר מופעל על ידי אוהד טבת, עורך דין ובודק שכר מוסמך. השימוש באתר מהווה הסכמה לתנאים אלה.
              </p>
            </div>

            <div>
              <h3 style={{ color: "#fff", fontWeight: 800, marginBottom: "0.5rem" }}>2. אין ייעוץ משפטי</h3>
              <p>
                המידע המופיע באתר הוא <strong style={{ color: "#fff" }}>מידע כללי בלבד</strong> ואינו מהווה ייעוץ משפטי.
                כל פנייה דרך הטופס מהווה בקשה לקבלת מידע ראשוני בלבד — לא קשר משפטי מחייב.
              </p>
            </div>

            <div>
              <h3 style={{ color: "#fff", fontWeight: 800, marginBottom: "0.5rem" }}>3. דיוק המידע</h3>
              <p>
                האינדיקציה שתתקבל מבוססת על המידע שנמסר. דיוק התוצאות תלוי בשלמות ואמינות התלושים שהועלו.
                התוצאה הסופית תיקבע בהליך משפטי בלבד.
              </p>
            </div>

            <div>
              <h3 style={{ color: "#fff", fontWeight: 800, marginBottom: "0.5rem" }}>4. שכר טרחה</h3>
              <p>
                הבדיקה הראשונית ניתנת ללא עלות. במידה ויימצאו ליקויים המקימים עילת תביעה,
                שכר הטרחה יסוכם בנפרד עם הלקוח לפני כל פעולה משפטית.
              </p>
            </div>

            <div>
              <h3 style={{ color: "#fff", fontWeight: 800, marginBottom: "0.5rem" }}>5. קניין רוחני</h3>
              <p>כל התוכן באתר — טקסטים, עיצוב, לוגו — שייך למשרד עורכי דין טבת. אסור לשכפל ללא אישור.</p>
            </div>

            <div>
              <h3 style={{ color: "#fff", fontWeight: 800, marginBottom: "0.5rem" }}>6. שינויים בתנאים</h3>
              <p>המשרד רשאי לעדכן תנאים אלה בכל עת. המשך השימוש באתר לאחר שינוי מהווה הסכמה לתנאים המעודכנים.</p>
            </div>

            <div>
              <h3 style={{ color: "#fff", fontWeight: 800, marginBottom: "0.5rem" }}>7. יצירת קשר</h3>
              <p>
                לשאלות ופניות: <a href="mailto:ohad@tevet-law.com" style={{ color: "var(--gold)" }}>ohad@tevet-law.com</a>
              </p>
            </div>

            <p style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "1rem", fontSize: "0.78rem" }}>
              עדכון אחרון: מאי 2026 · הדין החל: דין מדינת ישראל
            </p>
          </div>
        </div>
      </section>

      <footer>
        <div className="footer-inner">
          <div className="footer-bottom">
            האתר אינו מהווה ייעוץ משפטי. ·{" "}
            © 2026 משרד עורכי דין טבת · כל הזכויות שמורות
          </div>
        </div>
      </footer>
    </>
  );
}
