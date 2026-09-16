import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  FAQ,
  WHAT_YOU_GET,
  CHOICES,
  RESULTS_EARLY,
  RESULTS_LATE,
  DOCS,
} from "./copy";
import StickyCta from "./StickyCta";
import s from "./tlush-check.module.css";

/**
 * דף המכירה של תחשיב החוסרים.
 *
 * למה בנפרד מ-/tahshiv: שם זו קופה, ומי שמגיע אליה כבר החליט.
 * כאן מוכרים למי שלא ראה וובינר ולא דיבר בטלפון, כלומר תנועה
 * מטיקטוק, מהקהל המותאם ומהחייאת הלידים. זה מה שמאפשר למכור
 * בלי שאוהד ידבר עם כל אחד, וזה צוואר הבקבוק היום.
 *
 * מבנה 11 החלקים (reference_sales_page_11_buttons), טיפוגרפיה
 * ועיצוב לפי תקן יהב (reference_nextlevel_typography), ומידול
 * על דף העיצומים שקיבל שישה מתוך שמונה בסורק של המועדון.
 *
 * 🚨 אין כאן אף תג section, כי globals.css מוסיף לו padding של
 * 5rem. הגרסה הראשונה של הדף נשברה בדיוק מזה.
 *
 * noindex: דף עם מחירים נשאר נגיש בקישור בלבד, כדי לא להיחשב
 * פרסומת לפי כלל 3(ב)(14). המודעה עצמה נקייה ממחיר.
 */

const TITLE = "כמה כסף המעסיק שלכם החסיר מכם";
const DESC =
  "תחשיב חוסרים כתוב על תלושי השכר שלכם, עם התחייבות להחזר מלא אם לא יימצאו חוסרים גדולים מהעלות.";

export const metadata: Metadata = {
  title: `${TITLE} | אוהד טבת עו"ד`,
  description: DESC,
  openGraph: { title: TITLE, description: DESC, locale: "he_IL", type: "website" },
  alternates: { canonical: "/tlush-check" },
  robots: { index: false, follow: false },
};

type Result = {
  who: string; years: string; what: string; verb: string; amount: string;
};

/** שורות תוצאה. מפוזרות לאורך הדף ולא מרוכזות בקופסה אחת. */
function Results({ rows }: { rows: Result[] }) {
  return (
    <div className={s.results}>
      {rows.map((r) => (
        <div key={r.who + r.amount} className={s.result}>
          <div>
            <div className={s.resultWho}>
              {r.who}, {r.years}
            </div>
            <div className={s.resultWhat}>{r.what}</div>
          </div>
          <div className={`${s.resultAmount} ${s.num}`}>
            <span className={s.resultVerb}>{r.verb}</span>
            {r.amount}
          </div>
        </div>
      ))}
    </div>
  );
}

function Cta({ label, id }: { label: string; id?: string }) {
  return (
    <div id={id}>
      <Link href="/tahshiv" className={s.cta}>
        {label}
      </Link>
      <p className={s.ctaNote}>
        297 ש&quot;ח לשנת ותק, עד שלושה תשלומים. אשראי או ביט.
      </p>
    </div>
  );
}

export default function Page() {
  return (
    <div className={s.page}>
      <header className={s.top}>
        <Image
          className={s.topLogo}
          src="/tevet-logo.png"
          alt='משרד עורכי דין טבת'
          width={140}
          height={34}
          priority
        />
        <span className={s.topNote}>בודק שכר מוסמך מטעם משרד העבודה</span>
      </header>

      <div className={s.wrap}>

        {/* 1. כותרת · 2. הליד */}
        <div className={s.block}>
          <p className={s.eyebrow}>לשכירים עם שלוש שנות ותק ומעלה</p>
          <h1 className={s.h1}>
            הבוס קורא לזה &quot;שכר גלובלי&quot;.
            <br />
            <span className={s.brass}>בית הדין קורא לזה לא חוקי.</span>
          </h1>
          {/*
            כותרת משנה תועלתית. הסורק סימן שההוק חכם אבל לא אומר
            תוך שלוש שניות מה יוצא לגולש. ההוק נשאר, הבהירות
            נוספת מתחתיו.
          */}
          <p className={s.sub}>
            בדיקה שמגלה בדיוק כמה כסף חסר לכם בתלושים של שבע השנים
            האחרונות. <strong>אם לא נמצא, הכסף חוזר.</strong>
          </p>
          {/* סרגל אמון. נותן גיבוי מספרי לסמכות מיד אחרי הכותרת. */}
          <div className={s.trust}>
            <div className={s.trustItem}>
              <div className={`${s.trustNum} ${s.num}`}>6 מיליון ₪</div>
              <div className={s.trustLabel}>הושגו ללקוחות בשנה האחרונה</div>
            </div>
            <div className={s.trustItem}>
              <div className={`${s.trustNum} ${s.num}`}>מאות</div>
              <div className={s.trustLabel}>תלושים שנבדקו במשרד</div>
            </div>
            <div className={s.trustItem}>
              <div className={`${s.trustNum} ${s.num}`}>5.0</div>
              <div className={s.trustLabel}>דירוג בגוגל</div>
            </div>
          </div>

          <p className={`${s.p} ${s.pLead}`} style={{ marginTop: "1.8rem" }}>
            פעם בחודש נכנס תלוש. אתם מסתכלים על השורה התחתונה,
            המספר בערך מה שציפיתם, וסוגרים. ככה עוברות שנים.
          </p>
          <p className={s.p}>
            הבעיה היא שהמספר בסוף לא מספר כלום על איך הוא חושב.
            רוב החוסרים בתלוש לא נראים בנטו. הם נראים בבסיס.
          </p>
        </div>

        {/* 3. הסיפור. המספרים הם הגיבור */}
        <div className={`${s.block} ${s.hair}`}>
          <p className={s.eyebrow}>תלוש אמיתי, אפריל 2025</p>
          <h2 className={s.h2}>
            מעסיק מסודר. עשרה רכיבי שכר. והפרשה מחצי.
          </h2>

          <div className={s.figures}>
            <div className={s.figure}>
              <div className={s.figureLabel}>סך התשלומים בתלוש</div>
              <div className={`${s.figureValue} ${s.num}`}>14,053 ₪</div>
            </div>
            <div className={`${s.figure} ${s.figureAccent}`}>
              <div className={s.figureLabel}>השכר שממנו הופרשה פנסיה</div>
              <div className={`${s.figureValue} ${s.num}`}>6,000 ₪</div>
            </div>
          </div>

          <p className={s.p}>
            קו צפון, נגלה נוספת, שישי, בונוס משטחים. ארבעה רכיבים
            קבועים שחוזרים כל חודש ונשארו מחוץ לבסיס. יחד הם{" "}
            <strong className={s.num}>4,832 ש&quot;ח</strong> שלא נספרו.
          </p>
          <p className={s.p}>
            וזה עוד לא החלק המוזר. באותו תלוש, בשורת
            &quot;אינפורמטיבי&quot;, כתוב שחור על גבי לבן ששכר
            המינימום לשעה הוא{" "}
            <strong className={s.num}>34.32</strong>. ובפועל שולם{" "}
            <strong className={s.num}>32.97</strong>.{" "}
            <strong>התלוש הדפיס בעצמו את הפער.</strong>
          </p>
          <p className={s.pull}>
            אחוזי ההפרשה בתלוש הזה היו מצוינים, 20.83 אחוז, מעל מה
            שהחוק דורש. <strong>הבסיס היה חצי.</strong> וזה בדיוק מה
            שאף אחד לא בודק.
          </p>

          {/*
            CTA מוקדם. הסורק: "צריך לגלול הרבה עד הכפתור הראשון.
            להוסיף כפתור מיד אחרי בלוק הדוגמה, כשהכאב הכי חד".
            הוא גם העוגן של הסרגל הצף, ולכן הסרגל לא יכול להופיע
            בזמן שבלוק המספרים עדיין על המסך.
          */}
          <div style={{ marginTop: "2.4rem" }}>
            <Cta label="לבדוק כמה חסר לי" id="first-cta" />
          </div>
        </div>

        {/*
          4. הוכחות חברתיות, מנה ראשונה.
          מיד אחרי הדוגמה המוחשית, כשהגולש שואל "אבל האם זה קורה
          לאנשים אמיתיים". הסורק: לפזר ולא לרכז.
        */}
        <div className={`${s.block} ${s.hair}`}>
          <p className={s.eyebrow}>קרה ללקוחות שלנו</p>
          <h2 className={s.h2}>לא תיאוריה. כסף שנכנס לחשבון.</h2>
          <Results rows={RESULTS_EARLY} />
        </div>

        {/*
          4. הוכחות חברתיות.
          🚨 ריק בכוונה. אין במערכת אף המלצה ואין להמציא.
          ממתין לשלושת הלקוחות שנסגרו בספטמבר 2026.
        */}

        {/* 5. ההצעה */}
        <div className={`${s.block} ${s.hair}`}>
          <p className={s.eyebrow}>ההצעה</p>
          <h2 className={s.h2}>מה אתם מקבלים</h2>
          <div className={s.items}>
            {WHAT_YOU_GET.map((item, i) => {
              const gift = i === WHAT_YOU_GET.length - 1;
              return (
                <div
                  key={item.title}
                  className={`${s.item} ${gift ? s.itemGift : ""}`}
                >
                  {gift && <span className={s.itemTag}>במתנה</span>}
                  <h3 className={s.h3}>{item.title}</h3>
                  <p className={s.p} style={{ marginBottom: 0 }}>
                    {item.body}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* 8. אחריות */}
        <div className={s.blockTight}>
          <div className={s.promise}>
            <p className={s.eyebrow}>ההתחייבות שלי</p>
            <p className={s.p}>
              אני עושה עשרות תחשיבים כל חודש, כבר שנים, וכמעט תמיד
              מוצא חוסרים ששווים כסף.
            </p>
            <p className={s.promiseBig}>
              אם התחשיב לא ימצא לכם חוסרים בסכום גבוה ממה ששילמתם
              עליו, אני מחזיר לכם את הכסף. הכל.
            </p>
            <p className={s.p} style={{ marginBottom: 0 }}>
              אני יכול להתחייב לזה כי אני יודע מה יש שם.
            </p>
          </div>
        </div>

        {/* 6. הנעה לפעולה שמייצרת ודאות */}
        <div className={`${s.block} ${s.hair}`}>
          <h2 className={s.h2}>מה קורה אחרי שאתם לוחצים</h2>
          <div className={s.steps}>
            {[
              "בוחרים כמה שנים אתם עובדים שם. המחיר מתעדכן לפי זה.",
              "משלמים בכרטיס אשראי או בביט, בדף מאובטח בתקן PCI.",
              "מיד אחרי התשלום מעלים את המסמכים: תלושים, דוחות נוכחות ודוחות פנסיה. צילום מהטלפון מספיק.",
              "תוך שבעה ימי עסקים מקבלים את התחשיב הכתוב, ואת הגישה לקורס.",
            ].map((step, i) => (
              <div key={i} className={s.step}>
                <span className={s.stepNum}>{i + 1}</span>
                <span className={s.stepText}>{step}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "2.2rem" }}>
            <Cta label="לבחירת הוותק שלכם" />
          </div>
        </div>

        {/*
          4. הוכחות חברתיות, מנה שנייה: מסמכים מושחרים.
          אותם קבצים שכבר מוצגים ב-/bdika. מסמך רשמי מושחר עושה
          מה שטבלת מספרים לא עושה, כי אי אפשר להמציא אותו.
        */}
        <div className={`${s.block} ${s.hair}`}>
          <p className={s.eyebrow}>מסמכים, לא הבטחות</p>
          <h2 className={s.h2}>איך זה נראה כשזה נגמר</h2>
          <div className={s.docs}>
            {DOCS.map((d) => (
              <figure key={d.src} className={s.doc}>
                <img src={d.src} alt={d.alt} loading="lazy" />
                <figcaption className={s.docCap}>
                  <div className={`${s.docAmount} ${s.num}`}>{d.amount}</div>
                  <div className={s.docText}>{d.caption}</div>
                </figcaption>
              </figure>
            ))}
          </div>
          <p className={s.fineprint}>
            הפרטים המזהים הושחרו. כל תיק נבחן לגופו, ואין בתוצאה
            של תיק אחד כדי להבטיח תוצאה בתיק אחר.
          </p>
          <div style={{ marginTop: "1.6rem" }}>
            <Results rows={RESULTS_LATE} />
          </div>
        </div>

        {/* 7. סקרסיטי */}
        <div className={s.blockTight}>
          <div className={s.clock}>
            <p className={s.eyebrow}>למה דווקא עכשיו</p>
            <h2 className={s.h2} style={{ marginBottom: "1rem" }}>
              אפשר לחזור שבע שנים. לא יותר.
            </h2>
            <p className={s.p} style={{ marginBottom: 0 }}>
              כלומר{" "}
              <strong className={s.brass}>
                כל חודש שעובר מוחק לכם חודש
              </strong>{" "}
              מהקצה השני של החישוב. זה לא לחץ שיווקי, זו התיישנות,
              והיא רצה בין אם תבדקו ובין אם לא.
            </p>
          </div>
        </div>

        {/* 9. שאלות ותשובות */}
        <div className={`${s.block} ${s.hair}`}>
          <h2 className={s.h2}>שאלות שחוזרות</h2>
          <div className={s.faq}>
            {FAQ.map((item) => (
              <details key={item.q} className={s.q}>
                <summary className={s.qHead}>{item.q}</summary>
                <p className={s.qBody}>{item.a}</p>
              </details>
            ))}
          </div>
        </div>

        {/* 10. הבחירה */}
        <div className={`${s.block} ${s.hair}`}>
          <h2 className={s.h2}>יש לכם שלוש אפשרויות</h2>
          <div className={s.choices}>
            {CHOICES.map((c, i) => (
              <div
                key={i}
                className={`${s.choice} ${i === 2 ? s.choicePick : ""}`}
              >
                <span className={s.choiceNum}>{i + 1}. </span>
                {c}
              </div>
            ))}
          </div>
        </div>

        {/* 11. מסר אישי */}
        <div className={`${s.block} ${s.hair}`}>
          <div className={s.signoff}>
            <Image
              className={s.signoffPhoto}
              src="/ohad.png"
              alt='עו"ד אוהד טבת'
              width={64}
              height={64}
            />
            <div>
              <div className={s.signoffName}>עו&quot;ד אוהד טבת</div>
              <div className={s.signoffRole}>
                דיני עבודה, ובודק שכר מוסמך
                <br />
                מטעם משרד העבודה
              </div>
            </div>
          </div>
          <p className={s.p}>
            אני לא רק מוציא תחשיבים, אני גם תובע איתם בבתי הדין.
            אצל רוב מי שעושה את זה הדוח הוא סוף הדרך, ואצלי הוא
            ההתחלה שלה. <strong>בשנה האחרונה השגנו ללקוחות שלנו
            למעלה מ-6 מיליון ש&quot;ח</strong> שהמעסיקים החסירו מהם.
          </p>
          <p className={s.p}>
            אני אומר מראש שלא כל מקרה מתאים, וגם כשזה עולה לי
            בעסקה. אבל בלי לבדוק אי אפשר לדעת, ובינתיים השעון רץ.
          </p>
          <div style={{ marginTop: "2rem" }}>
            <Cta label="לבדוק כמה חסר לי" />
          </div>
        </div>

        <div className={s.foot}>
          התשלום מאובטח בתקן PCI. כרטיס אשראי או ביט.
          <br />
          הכל חסוי.
        </div>
      </div>

      <StickyCta />
    </div>
  );
}
