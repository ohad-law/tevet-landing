import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: 'מדיניות פרטיות | אוהד טבת עו"ד',
};

export default function PrivacyPage() {
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
          <h1 className="section-title">מדיניות פרטיות</h1>
          <div className="divider" />

          <div style={{ fontSize: "0.88rem", color: "rgba(255,255,255,0.6)", lineHeight: 2, display: "flex", flexDirection: "column", gap: "1.5rem" }}>

            <div>
              <h3 style={{ color: "#fff", fontWeight: 800, marginBottom: "0.5rem" }}>1. מי אוסף את המידע</h3>
              <p>
                אוהד טבת, עורך דין ובודק שכר מוסמך, בסר 3, בני ברק.
                ליצירת קשר: <a href="mailto:ohad@tevet-law.com" style={{ color: "var(--gold)" }}>ohad@tevet-law.com</a>
              </p>
            </div>

            <div>
              <h3 style={{ color: "#fff", fontWeight: 800, marginBottom: "0.5rem" }}>2. מה נאסף</h3>
              <p>שם, מספר טלפון, מספר שנות עבודה, תיאור הסיטואציה, תלושי שכר (PDF/תמונה).</p>
            </div>

            <div>
              <h3 style={{ color: "#fff", fontWeight: 800, marginBottom: "0.5rem" }}>3. מטרת האיסוף</h3>
              <p>המידע ישמש <strong style={{ color: "#fff" }}>אך ורק לצורך בדיקת זכויות שכר</strong> ויצירת קשר עם הפונה. לא ייעשה בו כל שימוש אחר.</p>
            </div>

            <div>
              <h3 style={{ color: "#fff", fontWeight: 800, marginBottom: "0.5rem" }}>4. תלושי שכר, מידע רגיש</h3>
              <p>
                תלושי שכר מהווים <strong style={{ color: "#fff" }}>מידע פיננסי רגיש</strong> כמשמעותו בתיקון 13 לחוק הגנת הפרטיות, תשמ&quot;א-1981.
                המידע מאובטח בהצפנה, מוגן מפני גישה בלתי מורשית, ולא יועבר לצד שלישי כלשהו.
              </p>
            </div>

            <div>
              <h3 style={{ color: "#fff", fontWeight: 800, marginBottom: "0.5rem" }}>5. תקופת שמירה</h3>
              <p>המידע יישמר עד לסיום הטיפול בפנייה. לאחר מכן יימחק, אלא אם נדרש לצרכים משפטיים.</p>
            </div>

            <div>
              <h3 style={{ color: "#fff", fontWeight: 800, marginBottom: "0.5rem" }}>6. מי רשאי לגשת למידע</h3>
              <p>אוהד טבת בלבד. המידע לא יועבר לצד שלישי ולא יישמר מחוץ לישראל.</p>
            </div>

            <div id="rights">
              <h3 style={{ color: "#fff", fontWeight: 800, marginBottom: "0.5rem" }}>7. זכויות נושא המידע</h3>
              <p>בהתאם לתיקון 13 לחוק הגנת הפרטיות, עומדות לך הזכויות הבאות:</p>
              <ul style={{ paddingRight: "1.5rem", marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                <li><strong style={{ color: "#fff" }}>זכות עיון</strong>, לדעת אילו נתונים מוחזקים עליך</li>
                <li><strong style={{ color: "#fff" }}>זכות תיקון</strong>, לבקש תיקון מידע שגוי</li>
                <li><strong style={{ color: "#fff" }}>זכות מחיקה</strong>, לבקש מחיקת כל המידע שמסרת</li>
                <li><strong style={{ color: "#fff" }}>זכות התנגדות</strong>, לבקש הפסקת עיבוד נתוניך</li>
              </ul>
              <p style={{ marginTop: "0.75rem" }}>
                לבקשות פנה ל: <a href="mailto:ohad@tevet-law.com" style={{ color: "var(--gold)" }}>ohad@tevet-law.com</a>
                {" "}· נענה תוך 30 יום.
              </p>
            </div>

            <div id="security">
              <h3 style={{ color: "#fff", fontWeight: 800, marginBottom: "0.5rem" }}>8. אבטחת מידע</h3>
              <p>המידע מועבר בהצפנה (HTTPS). הגישה למידע מוגבלת. מיושמים אמצעי אבטחה תואמי סיכון בהתאם לדרישות החוק.</p>
            </div>

            <div>
              <h3 style={{ color: "#fff", fontWeight: 800, marginBottom: "0.5rem" }}>9. הפרת מידע</h3>
              <p>במקרה של הפרת מידע שמשפיעה על נושאי המידע, תדווח לרשות הגנת הפרטיות תוך 72 שעות ויידעו הנפגעים.</p>
            </div>

            <div>
              <h3 style={{ color: "#fff", fontWeight: 800, marginBottom: "0.5rem" }}>10. שינויים במדיניות</h3>
              <p>עדכונים למדיניות זו יפורסמו בדף זה. המשך השימוש באתר לאחר שינוי מהווה הסכמה למדיניות המעודכנת.</p>
            </div>

            <p style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "1rem", fontSize: "0.78rem" }}>
              עדכון אחרון: מאי 2026 · בהתאם לתיקון 13 לחוק הגנת הפרטיות, התשמ&quot;א-1981
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
