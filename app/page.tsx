"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

const OHAD_PHOTO =
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692364cc62edd448d4415194/33ca10aa6_image.png";

// פרופיל Google של המשרד — נבדק ידנית מול Google Maps ב-10/08/2026.
// לעדכן את המספרים כשהם משתנים; הם מוצגים לגולש כעובדה.
const GOOGLE_PROFILE_URL = "https://g.page/r/Cf-b2dk5FCCuEBM";
const GOOGLE_RATING = 5.0;
const GOOGLE_REVIEW_COUNT = 15;

const PROOF_CLIENTS = [
  { initials: "ד.כ", name: "ד. כהן", role: "עובד ותיק · 31 שנה\nללא זכויות סוציאליות", pronoun: "קיבל", amount: "700,000 ₪" },
  { initials: "מ.ל", name: "מ. לוי", role: "נהג הובלות · 6 שנים\nהסדר פשרה לאחר שנה בלבד", pronoun: "קיבל", amount: "210,000 ₪" },
  { initials: "ר.מ", name: "ר. מזרחי", role: "עובדת מסחר · 8 שנים\nהפרשות פנסיה חסרות", pronoun: "קיבלה", amount: "120,000 ₪" },
  { initials: "א.ס", name: "א. סבג", role: "עובד בניין · 4 שנים\nשכר חלקי במזומן", pronoun: "קיבל", amount: "56,000 ₪" },
  { initials: "י.פ", name: "י. פרץ", role: "מנהלת חשבונות · 9 שנים\nפיטורין ללא שימוע וחוסרים בהפרשות פנסיוניות", pronoun: "קיבלה", amount: "195,000 ₪" },
  { initials: "ח.ב", name: "ח. ביטון", role: "שמירה ואבטחה · 5 שנים\nחוסרים שלא שולמו מכוח צו הרחבה בענף השמירה והאבטחה", pronoun: "קיבל", amount: "38,000 ₪" },
  { initials: "נ.א", name: "נ. אברהם", role: "עובד מכירות · 7 שנים\nבונוסים שלא נלקחו בחשבון בחישוב הזכויות הסוציאליות", pronoun: "קיבל", amount: "145,000 ₪" },
  { initials: "ש.ג", name: "ש. גבאי", role: "קופאית רשת · 11 שנים\nפוטרה אחרי חופשת לידה", pronoun: "קיבלה", amount: "178,000 ₪" },
];

function scrollToForm() {
  document.getElementById("form")?.scrollIntoView({ behavior: "smooth" });
}

export default function Home() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [years, setYears] = useState("");
  const [situation, setSituation] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [isUnderYear, setIsUnderYear] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isTikTokBrowser, setIsTikTokBrowser] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || "";
    setIsTikTokBrowser(/musical_ly|tiktok|bytedance|bytedancewebview/i.test(ua));
  }, []);

  function handleUploadClick() {
    fileInputRef.current?.click();
  }

  function handleYearsChange(val: string) {
    setYears(val);
    setIsUnderYear(val === "פחות משנה");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim() || !phone.trim()) { setError("נא למלא שם וטלפון"); return; }
    if (!years) { setError("נא לבחור כמה שנים עבדת"); return; }
    if (isUnderYear) { setError("אנחנו מייצגים עובדים שעבדו לפחות שנה"); return; }
    if (!privacyChecked) { setError("נא לאשר את מדיניות הפרטיות"); return; }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("name", name.trim());
      fd.append("phone", phone.trim());
      fd.append("years", years);
      fd.append("situation", situation);
      // התלושים אופציונליים — מי שלא הצליח להעלות (למשל בדפדפן של טיקטוק)
      // עדיין נשלח, ומקבל מסלול WhatsApp במסך התודה
      if (files) for (let i = 0; i < files.length; i++) fd.append("files", files[i]);

      const res = await fetch("/api/submit", { method: "POST", body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "שגיאה בשליחה");
      }
      setSubmitted(true);
      // Fire conversion pixels
      if (typeof window !== "undefined") {
        // Meta Pixel
        if ((window as unknown as Record<string, unknown>).fbq) {
          (window as unknown as { fbq: (...args: unknown[]) => void }).fbq("track", "Lead");
        }
        // TikTok Pixel
        const w = window as unknown as Record<string, unknown>;
        if (w.ttq && typeof (w.ttq as { track?: (...a: unknown[]) => void }).track === "function") {
          (w.ttq as { track: (...a: unknown[]) => void }).track("SubmitForm");
        }
        // Google Ads
        if ((window as unknown as Record<string, unknown>).gtag) {
          (window as unknown as { gtag: (...args: unknown[]) => void }).gtag("event", "conversion", {
            send_to: process.env.NEXT_PUBLIC_GOOGLE_ADS_ID,
          });
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "שגיאה בשליחה, נסה שוב");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* NAV */}
      <nav className="nav">
        <div className="nav-logo">
          TEVET
          <span>TEVET | LAW OFFICE | טבת משרד עורכי דין</span>
        </div>
        <button className="nav-cta" onClick={scrollToForm}>גלה כמה מגיע לך</button>
      </nav>

      {/* §1 HERO */}
      <div className="hero">
        <div className="hero-inner">
          <div className="h1-setup">אתה עבדת שנים —</div>
          <div className="h1-main">
            ואף פעם לא ידעת<br />
            <span className="gold">כמה כסף באמת מגיע לך.</span>
          </div>
          <div className="h1-bridge">
            כי הסתכלת על שורת הנטו בלבד.<br />
            <strong>הכסף האמיתי נמצא בין שאר השורות בתלוש</strong> — שורות שאף אחד לא לימד אותך לקרוא.
          </div>

          <div className="revelation">
            בבית הדין לעבודה <strong>לא מדברים בנטו. מדברים ברוטו.</strong><br />
            ואת ההפרש הזה — <span className="gold">מגיע לך לקבל. זה הכסף שלך.</span>
            <span className="emotional">אתה זה שעבד קשה כל השנים האלה.</span>
          </div>

          <div className="promise-line">
            שלח 2-3 תלושי שכר — ותקבל <span className="gold">אינדיקציה מדויקת</span> על החוסרים בשכר שלך לאורך השנים.
          </div>
          <div className="promise-detail">
            אוהד טבת — עו&quot;ד לדיני עבודה ובודק שכר מוסמך · עונה תוך 24 שעות
          </div>

          <div className="form-box" id="form">
            {submitted ? (
              <div className="success-box">
                <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>✓</div>
                <strong style={{ fontSize: "1.1rem", display: "block", marginBottom: "0.5rem" }}>
                  תודה! הפנייה התקבלה.
                </strong>
                {files && files.length > 0 ? (
                  <p>עו&quot;ד אוהד טבת יבדוק את התלושים ויחזור אליך תוך 24-48 שעות עם האינדיקציה.</p>
                ) : (
                  <>
                    <p style={{ marginBottom: "0.75rem" }}>
                      כדי שנוכל לבדוק את השכר שלך, שלח 2-3 תלושי שכר ב-WhatsApp:
                    </p>
                    <a
                      href={`https://wa.me/972545960645?text=${encodeURIComponent("היי אוהד, שלחתי פנייה דרך האתר. מצרף תלושי שכר לבדיקה:")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="whatsapp-btn"
                    >
                      שלח תלושים ב-WhatsApp
                    </a>
                    <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", marginTop: "0.5rem" }}>
                      אוהד יחזור אליך תוך 24-48 שעות עם האינדיקציה
                    </p>
                  </>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                <h3>→ מלא פרטים והעלה תלושים —<br />אוהד יחזור אליך עם האינדיקציה <span style={{ whiteSpace: "nowrap" }}>תוך 24 שעות</span></h3>

                <div className="form-grid">
                  <input type="text" placeholder="שם מלא" value={name} onChange={e => setName(e.target.value)} />
                  <input type="tel" placeholder="טלפון" value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
                <div className="form-grid">
                  <select value={years} onChange={e => handleYearsChange(e.target.value)}>
                    <option value="" disabled>כמה שנים עבדת?</option>
                    <option>פחות משנה</option>
                    <option>שנה עד 3 שנים</option>
                    <option>3 עד 7 שנים</option>
                    <option>מעל 7 שנים</option>
                  </select>
                  <select value={situation} onChange={e => setSituation(e.target.value)}>
                    <option value="" disabled>הסיטואציה שלך?</option>
                    <option>פוטרתי לאחרונה</option>
                    <option>התפטרתי</option>
                    <option>עדיין עובד, רוצה לבדוק</option>
                    <option>שכר במזומן / ללא תיעוד</option>
                    <option>שעות נוספות שלא שולמו</option>
                  </select>
                </div>

                {isUnderYear && (
                  <p className="filter-note">* עבדת פחות משנה? לצערנו לא נוכל לעזור לך</p>
                )}

                {isTikTokBrowser && (
                  <div className="webview-banner">
                    <strong>העלאת קבצים לא נתמכת בדפדפן טיקטוק</strong>
                    <button
                      type="button"
                      className="open-browser-btn"
                      onClick={() => {
                        window.location.href = "intent://tevet-landing.vercel.app#Intent;scheme=https;package=com.android.chrome;end";
                        setTimeout(() => { window.open(window.location.href, "_system"); }, 300);
                      }}
                    >
                      פתח בדפדפן חיצוני
                    </button>
                    <p style={{ fontSize: "0.72rem", marginTop: "0.35rem", opacity: 0.6 }}>
                      לחץ על ⋮ למעלה ובחר &quot;פתח בדפדפן&quot;
                    </p>
                  </div>
                )}

                <div
                  className="upload-label"
                  role="button"
                  tabIndex={0}
                  onClick={handleUploadClick}
                  onKeyDown={e => { if (e.key === "Enter" || e.key === " ") handleUploadClick(); }}
                  style={files && files.length > 0 ? { borderColor: "var(--gold)", color: "rgba(255,255,255,0.8)" } : {}}
                >
                  <strong>
                    {files && files.length > 0
                      ? `✓ ${files.length} קבצים נבחרו`
                      : "העלה תלושי שכר (אופציונלי)"}
                  </strong>
                  PDF, JPG או PNG · ניתן גם לשלוח ב-WhatsApp אחרי השליחה
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,image/*"
                  multiple
                  style={{ display: "none" }}
                  onChange={e => setFiles(e.target.files)}
                />
                <p className="upload-note">
                  * בלי תלושים לא נוכל לחשב כמה מגיע לך — אפשר לשלוח אותם גם ב-WhatsApp אחרי השליחה
                  <br />
                  🔒 התלושים נשמרים באחסון פרטי ומוצפן, נצפים על ידי עו&quot;ד אוהד טבת בלבד,
                  לא מועברים לאף גורם — וימחקו לבקשתך בכל שלב.
                </p>

                <div className="privacy-consent">
                  <input
                    type="checkbox"
                    id="privacy"
                    checked={privacyChecked}
                    onChange={e => setPrivacyChecked(e.target.checked)}
                  />
                  <label htmlFor="privacy">
                    קראתי ואני מסכים/ה ל<Link href="/privacy">מדיניות הפרטיות</Link> ול<Link href="/terms">תנאי השימוש</Link>. ידוע לי שהפרטים והתלושים ישמשו לצורך בדיקת שכר בלבד, בהתאם לתיקון 13 לחוק הגנת הפרטיות.
                  </label>
                </div>

                {error && <div className="error-msg">{error}</div>}

                <button type="submit" className="cta-btn" disabled={submitting}>
                  {submitting ? "שולח..." : "גלה כמה כסף מגיע לך"}
                </button>
                <p className="form-note">שילוב שאין בשוק · עונה תוך 24 שעות · המידע מאובטח לחלוטין</p>
              </form>
            )}
          </div>

          <div className="proof-strip">
            עובד שעבד <strong>מעל 30 שנה</strong> ללא זכויות סוציאליות — בדקנו את תלושיו
            והשבנו לו <strong>700,000 ש&quot;ח.</strong> הוא לא ידע שמגיע לו. <strong>אתה יודע?</strong>
          </div>
        </div>
      </div>

      {/* TRUST BAR */}
      <div className="trust-bar">
        <div className="trust-item"><span className="trust-dot" />עו&quot;ד מוסמך לדיני עבודה</div>
        <div className="trust-item"><span className="trust-dot" />בודק שכר מוסמך מטעם משרד העבודה</div>
        <div className="trust-item"><span className="trust-dot" />ניסיון כמעסיק של 50+ עובדים</div>
        <div className="trust-item"><span className="trust-dot" />מידע מאובטח · לא מועבר לשום גורם</div>
      </div>

      {/* §2 WHY OHAD */}
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
              <div className="ohad-title">עו&quot;ד לדיני עבודה<br />בודק שכר מוסמך מטעם משרד העבודה</div>
            </div>

            <div>
              <div className="section-label">§2</div>
              <h2 className="section-title">
                למה דווקא עו&quot;ד ובודק שכר<br />
                מוסמך <span className="gold">אוהד טבת?</span>
              </h2>
              <div className="divider" />
              <div className="usp-cards">
                <div className="usp-card">
                  <div className="usp-num">01</div>
                  <div>
                    <h4>עו&quot;ד מוסמך לדיני עבודה</h4>
                    <p>יודע בדיוק מה ניתן לתבוע, כמה, ואיך — בבית הדין לעבודה ומול המעסיק.</p>
                  </div>
                </div>
                <div className="usp-card">
                  <div className="usp-num">02</div>
                  <div>
                    <h4>בודק שכר מוסמך — קורא תלושים לעומק</h4>
                    <span className="badge-tag">מוסמך מטעם משרד העבודה</span>
                    <p style={{ marginTop: "0.45rem" }}>5 שנות ניסיון במשרד רואה חשבון. מוצא את הפערים שאחרים מפספסים — בכל שורה.</p>
                  </div>
                </div>
                <div className="usp-card">
                  <div className="usp-num">03</div>
                  <div>
                    <h4>היה מעסיק של 50+ עובדים</h4>
                    <p>מכיר את שני הצדדים מבפנים. יודע איפה מעסיקים חוסכים — ואיפה זה לא חוקי.</p>
                  </div>
                </div>
                <div className="usp-stat">
                  <span className="usp-stat-num">אלפי</span>
                  <div className="usp-stat-text">
                    <strong>בדיקות תלושי שכר שביצע אוהד</strong>
                    ניסיון שמאפשר לאתר חריגות בתוך דקות — גם כשהמעסיק חושב שהכל מסודר
                  </div>
                </div>
              </div>
              <div className="ohad-quote">
                &quot;אני היחיד שמבין גם כעורך דין, גם כבודק שכר, וגם כמעסיק לשעבר. אני מכיר את התמונה המלאה.&quot;
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* §3 HOW IT WORKS */}
      <section className="how-it-works">
        <div className="container" style={{ textAlign: "center" }}>
          <div className="section-label">התהליך</div>
          <h2 className="section-title">
            איך זה עובד — <span className="gold">3 שלבים פשוטים</span>
          </h2>
          <div className="divider" style={{ margin: "0 auto 0.5rem" }} />
          <p style={{ color: "var(--text-dim)", fontSize: "0.9rem", marginBottom: "1rem" }}>
            מרגע שמילאת טופס ועד שתדע כמה מגיע לך
          </p>
          <div className="steps">
            <div className="step">
              <div className="step-num">1</div>
              <h4>מלא טופס + העלה תלושים</h4>
              <p>ממלא שם וטלפון, ומעלה 2-3 תלושי שכר ישירות בטופס. הכל מאובטח.</p>
            </div>
            <div className="step">
              <div className="step-num">2</div>
              <h4>אוהד טבת בודק אישית</h4>
              <p>כבודק שכר מוסמך מטעם משרד העבודה, מנתח כל שורה בתלוש ומחשב את הפערים מול החוק.</p>
              <span className="step-badge">תשובה תוך 24 שעות</span>
            </div>
            <div className="step">
              <div className="step-num">3</div>
              <h4>מקבל אינדיקציה + ייעוץ</h4>
              <p>תדע כמה כסף חסר לך ומה ניתן לתבוע. ייעוץ ראשוני — ללא עלות.</p>
            </div>
          </div>
        </div>
      </section>

      {/* §4 SOCIAL PROOF */}
      <section className="social-proof">
        <div className="container">
          <div className="header-row">
            <h2><span className="gold">מאות לקוחות</span> שייצגנו.<br />הנה 8 מהם.</h2>
            <p>כל אחד מהם לא ידע כמה כסף מגיע לו — עד שבדקנו.</p>
          </div>
          <div className="proof-grid">
            {PROOF_CLIENTS.map((c) => (
              <div key={c.initials} className="proof-card">
                <div className="proof-initials">{c.initials}</div>
                <div className="proof-name">{c.name}</div>
                <div className="proof-role" style={{ whiteSpace: "pre-line" }}>{c.role}</div>
                <div className="proof-result-label">{c.pronoun}</div>
                <div className="proof-amount">{c.amount}</div>
              </div>
            ))}
          </div>

          {/* דירוג גוגל — הוכחה שאפשר לאמת, בניגוד לכרטיסיות שמעליה */}
          <a
            className="google-rating"
            href={GOOGLE_PROFILE_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="google-rating-score">{GOOGLE_RATING.toFixed(1)}</span>
            <span className="google-rating-stars" aria-hidden="true">★★★★★</span>
            <span className="google-rating-text">
              {GOOGLE_REVIEW_COUNT} ביקורות בפרופיל Google של המשרד
            </span>
            <span className="google-rating-link">לצפייה בביקורות →</span>
          </a>
        </div>
      </section>

      {/* §5 FAQ */}
      <section className="faq">
        <div className="container">
          <div className="section-label">שאלות נפוצות</div>
          <h2 className="section-title">
            תשובות ל<span className="gold">כל השאלות שמעכבות אותך</span>
          </h2>
          <div className="divider" />
          <div className="faq-list">
            <div className="faq-item">
              <div className="faq-q">האם זה עולה לי כסף?</div>
              <div className="faq-a">
                הייעוץ הראשוני והבדיקה הראשונית הם <strong>ללא עלות</strong> — עו&quot;ד טבת בודק, מנתח ומחזיר לך תמונה ברורה על מה שמגיע לך.
                <br /><br />
                במידה וימצאו ליקויים וחוסרים בבדיקה המקימים עילת תביעה, <strong>שכר הטרחה בנוי מאחוזים בסוף ההליך ותשלום ראשוני טרם הגשת התביעה.</strong>
              </div>
            </div>
            <div className="faq-item">
              <div className="faq-q">מה יעשו עם תלוש השכר שלי?</div>
              <div className="faq-a">
                התלושים ישמשו <strong>אך ורק לבדיקת זכויותיך</strong>. המידע מאובטח, לא מועבר לשום גורם חיצוני, ונשמר בהתאם לדרישות <strong>תיקון 13 לחוק הגנת הפרטיות</strong>. בכל עת תוכל לבקש מחיקת כל המידע שמסרת.
                <br />לפניות פרטיות: <a href="mailto:ohad@tevet-law.com">ohad@tevet-law.com</a>
              </div>
            </div>
            <div className="faq-item">
              <div className="faq-q">עבדתי בלי חוזה / חלק מהשכר שולם במזומן — האם אפשר בכל זאת?</div>
              <div className="faq-a">
                כן, בהחלט. גם ללא חוזה כתוב יש לך זכויות. בדיקת התלושים — גם אם חלקיים — לרוב <strong>מספיקה כדי לקבוע מה מגיע לך</strong> ולבנות תביעה מוצקה.
              </div>
            </div>
            <div className="faq-item">
              <div className="faq-q">כמה זמן לוקח התהליך?</div>
              <div className="faq-a">
                הבדיקה הראשונית — תוך <strong>24-48 שעות</strong> מקבלת התלושים. הליך משפטי מול בית הדין לעבודה — תלוי במקרה ובמורכבות התיק.
              </div>
            </div>
            <div className="faq-item">
              <div className="faq-q">עבדתי פחות משנה — האם אני זכאי?</div>
              <div className="faq-a">אנחנו מייצגים עובדים שעבדו לכל הפחות שנה.</div>
            </div>
            <div className="faq-item">
              <div className="faq-q">מה קורה אם לא מצאתם ליקויים בבדיקה?</div>
              <div className="faq-a">
                איזה כיף — לפחות גילית שעבדת במקום עבודה שנתן לך את כל מה שמגיע לך. זה ממש לא מובן מאליו, ואנחנו שמחים לבשר לך את זה.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* §6 FINAL CTA */}
      <section className="final-cta">
        <div className="container inner">
          <div className="section-label" style={{ textAlign: "center" }}>אל תמשיך לא לדעת</div>
          <h2>
            הכסף הזה מחכה לך.<br />
            <span className="gold">לא צריך להמשיך לעבוד בלי לדעת.</span>
          </h2>
          <p>
            שלח 2-3 תלושים — תקבל אינדיקציה מדויקת על מה שחסר לך.<br />
            ללא התחייבות. תוך 24 שעות.
          </p>
          <button className="cta-btn" onClick={scrollToForm}>
            גלה כמה כסף מגיע לך
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="footer-inner">
          <div className="footer-grid">
            <div>
              <div className="footer-logo">TEVET</div>
              <div className="footer-logo-sub">TEVET | LAW OFFICE | טבת משרד עורכי דין</div>
              <div className="footer-info">
                אוהד טבת, עו&quot;ד ובודק שכר מוסמך<br />
                בסר 3, בני ברק<br />
                מייצג בכל הארץ<br />
                <a href="mailto:ohad@tevet-law.com" style={{ color: "rgba(201,168,76,0.5)" }}>ohad@tevet-law.com</a>
              </div>
            </div>
            <div className="footer-col">
              <h4>מידע משפטי</h4>
              <Link href="/terms">תנאי שימוש</Link>
              <Link href="/privacy">מדיניות פרטיות</Link>
              <a href="#">הצהרת נגישות</a>
            </div>
            <div className="footer-col">
              <h4>פרטיות ותיקון 13</h4>
              <a href="mailto:ohad@tevet-law.com">פניות למחיקת מידע</a>
              <Link href="/privacy#rights">זכויות נושא מידע</Link>
              <Link href="/privacy#security">אבטחת מידע</Link>
            </div>
          </div>
          <div className="footer-bottom">
            האתר אינו מהווה ייעוץ משפטי. הפרטים נמסרים לצורך יצירת קשר בלבד.<br />
            המידע האישי ותלושי השכר נאספים ומעובדים בהתאם לתיקון 13 לחוק הגנת הפרטיות, התשמ&quot;א-1981.<br />
            לבקשת מחיקת מידע: <a href="mailto:ohad@tevet-law.com">ohad@tevet-law.com</a>
            {" "}|{" "}
            © 2026 משרד עורכי דין טבת · כל הזכויות שמורות
          </div>
        </div>
      </footer>
    </>
  );
}
