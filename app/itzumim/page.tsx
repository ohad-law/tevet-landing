import type { Metadata } from "next";
import Link from "next/link";
import ItzumimForm from "./ItzumimForm";
import s from "./itzumim.module.css";

/**
 * דף הנחיתה לעיצומים כספיים ממשרד העבודה.
 *
 * הקהל כאן הוא מעסיק, לא עובד, ולכן זה לא וריאציה של דף התלושים.
 * מה שמניע את הדף הוא עובדה רגולטורית אחת שאומתה מול gov.il
 * ב-30/08/2026: הממונה על העיצומים לא מפחית את הסכום בלי אישור
 * של בודק שכר מוסמך. אוהד הוא גם עורך הדין וגם בודק השכר, וזה
 * ההבדל היחיד שבאמת מבדל אותו מול תשעה משרדים שכותבים על הנושא.
 *
 * כל מספר בדף מגיע מאחד משלושה מקורות בלבד:
 * 1. gov.il, דף השירות ודף הערר (מועדים, תנאים, שיעור הפחתה)
 * 2. מאגר העיצומים הפומבי של משרד העבודה (הסטטיסטיקה)
 * 3. אוהד עצמו, בסרטון שהוא צילם (תיק 800 אלף)
 *
 * 🚨 אין בדף את המילים "חינם" או "ללא עלות". ראה
 * rule_campaign_operating_standard.
 */

const TITLE = "קיבלת עיצום כספי ממשרד העבודה?";
const DESC =
  "הממונה על העיצומים לא מפחית את הסכום בלי אישור בודק שכר מוסמך. " +
  'אוהד טבת הוא גם עו"ד לדיני עבודה וגם בודק שכר מוסמך. בדיקה ראשונית של העיצום שקיבלת.';

export const metadata: Metadata = {
  title: `${TITLE} | אוהד טבת עו"ד`,
  description: DESC,
  openGraph: { title: TITLE, description: DESC, locale: "he_IL", type: "website" },
  alternates: { canonical: "/itzumim" },
};

const OHAD_PHOTO =
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692364cc62edd448d4415194/33ca10aa6_image.png";

const GOV_REDUCTION =
  "https://www.gov.il/he/service/reduction-of-work-rights-monetary-penalties";
const GOV_APPEAL =
  "https://www.gov.il/he/service/work-rights-monetary-penalties-appeals";
const GOV_DB =
  "https://www.gov.il/he/departments/dynamiccollectors/employers_financial_sanctions";

/** המועדים בהליך. כולם מ-gov.il, אומתו 30/08/2026. */
const CLOCK = [
  {
    days: "30",
    when: "הודעה על כוונת חיוב",
    what:
      "השלב שבו אפשר להשפיע הכי הרבה. כאן מגישים את הטענות ואת הבקשה להפחתה, בצירוף אישור בודק שכר והצהרת מעסיק.",
  },
  {
    days: "28",
    when: "דרישת תשלום או החלטת ממונה",
    what:
      "מכאן והלאה המסלול הוא ערר לוועדת הערר. לוועדה אין סמכות להאריך את המועד, למעט מקרים חריגים שבהם הממונה הסכים.",
  },
  {
    days: "45",
    when: "החלטת ועדת הערר",
    what:
      "מי שרואה את עצמו נפגע מהחלטת הוועדה יכול לערער לבית הדין האזורי לעבודה.",
  },
];

const CASES = [
  {
    from: "עיצום שהוטל",
    amount: "800,000 ₪",
    to: "התוצאה",
    result: "בוטל",
    why:
      "ההפרה: במשך ארבעה חודשים הופקדו 230 ש\"ח לפנסיה במקום 250. אוהד מספר על התיק בסרטון שלמעלה.",
  },
  {
    from: "עיצום שהוטל",
    amount: "330,000 ₪",
    to: "שולם בפועל",
    result: "18,000 ₪",
    why: "הפחתה של יותר מ-94% מהסכום המקורי.",
  },
  {
    from: "עיצום שהוטל",
    amount: "80,000 ₪",
    to: "התוצאה",
    result: "בוטל",
    why: "בעל העסק כבר עמד לשלם.",
  },
];

/*
 * מכתב תוצאות חקירה אמיתי מתיק במשרד, 25/12/2025.
 * הפרטים המזהים הושחרו והתמונה שוטחה מחדש.
 *
 * למה המסמך הזה חזק: הוא מראה את הצד השני של אותו מטבע. הסרטון
 * מספר על ביטול עיצום *אחרי* שהוטל. המכתב הזה מראה תיק שבו
 * חמישה תיקי חקירה נסגרו *בלי* שהוטל עיצום כספי בכלל.
 */
const FINDINGS = [
  { law: "צו הרחבה לפנסיה חובה", outcome: "התראה מינהלית", clear: false },
  { law: "חוק הגנת השכר, סעיף 25א, אי העברת סכומים שנוכו", outcome: "התראה מינהלית", clear: false },
  { law: "חוק למניעת הטרדה מינית, אי פרסום תקנון", outcome: "סגירה ללא ממצאים", clear: true },
  { law: "חוק הגנת השכר, סעיף 25ב, הלנת שכר", outcome: "התראה מינהלית", clear: false },
  { law: "סעיף 14 לחוק להגברת האכיפה", outcome: "סגירה ללא ממצאים", clear: true },
];

const FAQ = [
  {
    q: "למה בכלל להתנגד? זה לא סתם מעכב את זה?",
    a: (
      <>
        לפי המאגר הפומבי של משרד העבודה, <strong>שמונה מכל עשרה מעסיקים שקיבלו עיצום לא
        הגישו ערר בכלל</strong>. מתוך העררים שהוכרעו, כמחצית הסתיימו בהפחתה, וחלקם הופחתו
        עד אפס. ועדת הערר מוסמכת גם לבטל את דרישת התשלום לגמרי. אם כבר שילמת והעיצום בוטל
        או הופחת, הכסף מוחזר בתוספת הפרשי הצמדה וריבית.
      </>
    ),
  },
  {
    q: "רואה החשבון שלי לא יכול לטפל בזה?",
    a: (
      <>
        לא לצורך ההפחתה. משרד העבודה דורש <strong>אישור של בודק שכר</strong>, וזו הסמכה
        ייעודית מטעם המשרד שרואה חשבון רגיל אינו מחזיק. בפנקס בודקי השכר המוסמכים רשומים
        כ-1,959 בעלי הסמכה, ורק מעטים מהם גם עורכי דין לדיני עבודה.
      </>
    ),
  },
  {
    q: "כמה אפשר להפחית?",
    a: (
      <>
        בבקשה להפחתה לפי תקנות הפחתת העיצום, <strong>שיעור ההפחתה המצטבר לא יעלה על 50%</strong>{" "} מסכום
        העיצום הקבוע לאותה הפרה. בנוסף יש תקרה לפי מחזור העסקאות: מחזור עד 10 מיליון ש&quot;ח,
        העיצום לא יעלה על 2.5% מהמחזור. מעל 10 מיליון, לא יעלה על 4.5%. במסלול הערר הסמכות
        רחבה יותר, ושם הוועדה יכולה גם לבטל את דרישת התשלום.
      </>
    ),
  },
  {
    q: "מה קורה בשלב הזה של החקירה או מתן הגרסה?",
    a: (
      <>
        זו חקירה לכל דבר, גם אם היא נקראת &quot;מתן גרסה&quot;. מה שנאמר בה מגיע לתיק ומשפיע על
        ההחלטה. <strong>זה השלב שבו הכי חשוב לא להגיע לבד</strong>, וזה גם השלב שבו הכי קל
        למנוע את העיצום לפני שהוטל.
      </>
    ),
  },
  {
    q: "כבר עברה לי ביקורת פעם אחת. זה נגמר?",
    a: (
      <>
        לא בהכרח. משרד העבודה חוזר לביקורת, ומעסיק שנמצא שב על אותן הפרות חשוף לעיצום נוסף.
        בדיוק בגלל זה חלק מהטיפול הוא הצגת פעולות למניעת הישנות ההפרה, וזה גם אחד התנאים
        לקבלת ההפחתה.
      </>
    ),
  },
  {
    q: "מה זה עולה?",
    a: (
      <>
        הבדיקה הראשונית היא ללא התחייבות. אחריה תדע באיזה שלב אתה, מה עוד פתוח, ומה שכר
        הטרחה לטיפול בתיק שלך לפני שאתה מחליט משהו.
      </>
    ),
  },
  {
    q: "מה קורה עם המסמכים שאני שולח?",
    a: (
      <>
        הם משמשים <strong>אך ורק לבחינת העיצום</strong>. נשמרים באחסון פרטי ומוצפן, לא מועברים
        לאף גורם, ונמחקים לבקשתך בכל שלב, בהתאם לתיקון 13 לחוק הגנת הפרטיות. לפניות:{" "}
        <a href="mailto:ohad@tevet-law.com">ohad@tevet-law.com</a>
      </>
    ),
  },
];

export default function Page() {
  return (
    <div className={s.page}>
      {/* ── סרגל עליון ── */}
      <div className={s.top}>
        <div className={s.topLogo}>
          TEVET
          <span>TEVET | LAW OFFICE | טבת משרד עורכי דין</span>
        </div>
        <a className={s.topCta} href="#form">לבדיקת העיצום</a>
      </div>

      {/* ── HERO ── */}
      <div className={s.hero}>
        <div className={s.heroGrid}>
          <div className={s.heroText}>
            <span className={s.eyebrow}>למעסיקים ולבעלי עסקים</span>
            <h1 className={s.h1}>
              קיבלת עיצום כספי<br />
              ממשרד העבודה?<br />
              <em>זה עוד לא סוף הסיפור.</em>
            </h1>
            <p className={s.sub}>
              הסכום שכתוב במכתב הוא נקודת פתיחה, לא גזר דין. אבל יש שעון,
              והוא מתחיל לרוץ ביום שהמכתב נמסר לך.
            </p>

            <div className={s.reg}>
              {/* המרכאות מגיעות מ-CSS ולא מהטקסט. מרכאה שנכתבת בתוך מחרוזת
                  עברית היא תו ניטרלי, ו-bidi מציב אותה בקצה הוויזואלי הלא נכון. */}
              <p className={s.regQuote}>
                ממונה עיצומים כספיים לא יפחית את סכום העיצום הכספי ללא אישורים אלה.
              </p>
              <p className={s.regSrc}>
                האישורים הם הצהרת מעסיק <strong>ואישור של בודק שכר</strong>. כלומר בלי בודק
                שכר מוסמך, אין הפחתה.{" "}
                <a href={GOV_REDUCTION} target="_blank" rel="noopener noreferrer">
                  משרד העבודה, דף השירות הרשמי
                </a>
              </p>
            </div>

          </div>

          <div className={s.heroVideo}>
            <div className={s.videoWrap}>
              <video
                className={s.video}
                controls
                playsInline
                preload="none"
                poster="/itzumim/ohad-800k.jpg"
              >
                <source src="/itzumim/ohad-800k.mp4" type="video/mp4" />
              </video>
            </div>
            <p className={s.videoCap}>
              עו&quot;ד אוהד טבת על תיק שבו הוטל עיצום של{" "}
              <strong>800,000 ש&quot;ח</strong>{" "} בגלל הפרש של 20 ש&quot;ח בהפקדה לפנסיה,
              והעיצום בוטל.
            </p>
          </div>

          <div className={s.heroForm}>
            <ItzumimForm />
          </div>
        </div>
      </div>

      {/* ── פס אמון ── */}
      <div className={s.trust}>
        <div className={s.trustItem}><span className={s.dot} />עו&quot;ד לדיני עבודה</div>
        <div className={s.trustItem}><span className={s.dot} />בודק שכר מוסמך מטעם משרד העבודה</div>
        <div className={s.trustItem}><span className={s.dot} />ניסיון כמעסיק של 50+ עובדים</div>
        <div className={s.trustItem}><span className={s.dot} />מייצג מעסיקים בכל הארץ</div>
      </div>

      {/* ── השעון ── */}
      <div className={s.block}>
        <div className={s.inner}>
          <div className={s.kicker}>המועדים בהליך</div>
          <h2 className={s.h2}>
            השעון התחיל לרוץ <em>ביום שהמכתב נמסר.</em>
          </h2>
          <div className={s.rule} />
          <p className={s.lead}>
            להליך העיצומים יש שלושה מועדים, וכל אחד מהם סוגר דלת אחרת.
            רוב המעסיקים לא יודעים באיזה שלב הם נמצאים, ולכן מפספסים את הראשון שבהם.
          </p>

          <div className={s.clock}>
            {CLOCK.map((c) => (
              <div key={c.when} className={s.stage}>
                <div className={`${s.stageDays} ${s.num}`}>
                  {c.days}<span className={s.stageDaysUnit}>יום</span>
                </div>
                <div className={s.stageWhen}>מרגע {c.when}</div>
                <p className={s.stageWhat}>{c.what}</p>
              </div>
            ))}
          </div>

          <p className={s.clockNote}>
            <strong>המועדים האלה קשיחים.</strong> לוועדת הערר אין סמכות להאריך את המועד
            להגשת ערר מעבר ל-28 ימים, אלא רק אם הממונה הסכים לכך בנסיבות חריגות. מועד ההגשה
            הוא מועד קבלת הערר במשרדי הוועדה, ולא מועד המשלוח בדואר.
          </p>
          <p className={s.srcNote}>
            מקור:{" "}
            <a href={GOV_APPEAL} target="_blank" rel="noopener noreferrer">
              משרד העבודה, הגשת ערר לוועדת הערר לעיצומים כספיים
            </a>{" "}
            ו
            <a href={GOV_REDUCTION} target="_blank" rel="noopener noreferrer">
              בקשה להפחתת גובה עיצום כספי
            </a>
            . נבדק 30/08/2026.
          </p>
        </div>
      </div>

      {/* ── הנתונים ── */}
      <div className={s.block}>
        <div className={s.inner}>
          <div className={s.kicker}>מה קורה בפועל</div>
          <h2 className={s.h2}>
            רוב המעסיקים <em>פשוט משלמים.</em>
          </h2>
          <div className={s.rule} />
          <p className={s.lead}>
            משרד העבודה מפרסם מאגר פומבי של העיצומים שהוטלו, כולל השאלה אם המעסיק הגיש ערר
            ומה עלה בגורלו. <strong>הנתונים שם מספרים סיפור ברור.</strong>
          </p>

          <div className={s.stats}>
            <div className={s.stat}>
              <div className={`${s.statNum} ${s.warn} ${s.num}`}>8 מתוך 10</div>
              <p className={s.statKey}>
                <strong>לא הגישו ערר בכלל.</strong> לא כי אין להם טענות, אלא כי לא ידעו
                שיש מה לעשות
              </p>
            </div>
            <div className={s.stat}>
              <div className={`${s.statNum} ${s.num}`}>כמחצית</div>
              <p className={s.statKey}>
                <strong>מהעררים שהוכרעו הסתיימו בהפחתה.</strong> חלק מהם הופחתו עד אפס
              </p>
            </div>
            <div className={s.stat}>
              <div className={`${s.statNum} ${s.num}`}>96,505 ₪</div>
              <p className={s.statKey}>
                <strong>העיצום הממוצע במאגר.</strong>{" "} החציון עומד על 35,740 ש&quot;ח
              </p>
            </div>
          </div>

          <p className={s.srcNote}>
            חושב מתוך 2,548 רשומות שנשלפו מ
            <a href={GOV_DB} target="_blank" rel="noopener noreferrer">
              מאגר העיצומים הכספיים של משרד העבודה
            </a>{" "}
            ב-30/08/2026. שיעור אי הגשת הערר חושב מתוך 736 הרשומות שבהן השדה מלא.
          </p>
        </div>
      </div>

      {/* ── למה אוהד ── */}
      <div className={s.block}>
        <div className={s.inner}>
          <div className={s.kicker}>למה דווקא כאן</div>
          <h2 className={s.h2}>
            הרגולציה דורשת שני בעלי מקצוע.<br />
            <em>אצלי זה אותו אדם.</em>
          </h2>
          <div className={s.rule} />

          <div className={s.whyGrid}>
            <div className={s.photoCard}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={s.photo} src={OHAD_PHOTO} alt="עו&quot;ד אוהד טבת" width={170} height={170} />
              <div className={s.photoName}>אוהד טבת</div>
              <p className={s.photoRole}>
                עו&quot;ד לדיני עבודה<br />בודק שכר מוסמך מטעם משרד העבודה
              </p>
            </div>

            <div className={s.creds}>
              <div className={s.cred}>
                <div className={s.credNum}>01</div>
                <div>
                  <div className={s.credTitle}>עורך דין לדיני עבודה</div>
                  <p className={s.credBody}>
                    בונה את הטיעון המשפטי מול הממונה ומול ועדת הערר, ומלווה בחקירה ובשימוע.
                  </p>
                </div>
              </div>
              <div className={s.cred}>
                <div className={s.credNum}>02</div>
                <div>
                  <div className={s.credTitle}>בודק שכר מוסמך</div>
                  <span className={s.tag}>הסמכה מטעם משרד העבודה</span>
                  <p className={s.credBody}>
                    זה האישור <strong>שבלעדיו הממונה לא מפחית את הסכום</strong>. משרד שאינו
                    מחזיק בהסמכה נדרש לשכור בודק שכר חיצוני, ולתאם בין שני גורמים שלא ראו
                    את התיק יחד.
                  </p>
                </div>
              </div>
              <div className={s.cred}>
                <div className={s.credNum}>03</div>
                <div>
                  <div className={s.credTitle}>היה מעסיק של 50+ עובדים</div>
                  <p className={s.credBody}>
                    מכיר את הצד שלך מבפנים. יודע איך נראית מחלקת שכר אמיתית, ואיפה הפער
                    נוצר בלי שאף אחד התכוון.
                  </p>
                </div>
              </div>
              <div className={s.cred}>
                <div className={s.credNum}>04</div>
                <div>
                  <div className={s.credTitle}>שני צדדים של אותו תלוש</div>
                  <p className={s.credBody}>
                    המשרד מייצג גם עובדים בתביעות שכר. אותו מסמך שמוכיח הפרה מול משרד
                    העבודה הוא זה שמייצר תביעה של עובד. <strong>זה מה שמאפשר לראות את
                    החשיפה המלאה שלך, לא רק את הקנס.</strong>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── תיקים ── */}
      <div className={s.block}>
        <div className={s.inner}>
          <div className={s.kicker}>תיקים שטופלו במשרד</div>
          <h2 className={s.h2}>
            מה שהיה כתוב במכתב, <em>ומה שולם בסוף.</em>
          </h2>
          <div className={s.rule} />

          <div className={s.cases}>
            {CASES.map((c) => (
              <div key={c.amount} className={s.case}>
                <div className={s.caseFrom}>{c.from}</div>
                <div className={`${s.caseAmount} ${s.num}`}>{c.amount}</div>
                <div className={s.caseArrow} aria-hidden="true">↓</div>
                <div className={s.caseTo}>{c.to}</div>
                <div className={`${s.caseResult} ${s.num}`}>{c.result}</div>
                <p className={s.caseWhy}>{c.why}</p>
              </div>
            ))}
          </div>
          <p className={s.srcNote}>
            כל תיק נבחן לגופו. תוצאה בתיק אחד אינה מבטיחה תוצאה בתיק אחר.
          </p>
        </div>
      </div>

      {/* ── מסמך אמיתי ── */}
      <div className={s.block}>
        <div className={s.inner}>
          <div className={s.kicker}>מקרה מהתיקים</div>
          <h2 className={s.h2}>
            חמישה תיקי חקירה נפתחו.<br />
            <em>אפס עיצום כספי הוטל.</em>
          </h2>
          <div className={s.rule} />
          <p className={s.lead}>
            זה מכתב תוצאות חקירה אמיתי ממשרד העבודה, מדצמבר 2025. אחרי ביקורת בעסק נפתחו
            חמישה תיקי חקירה נפרדים. <strong>אף אחד מהם לא הסתיים בעיצום כספי.</strong>
          </p>

          <div className={s.docGrid}>
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className={s.docImg}
                src="/itzumim/mikre-heker.jpg"
                alt="מכתב תוצאות חקירה ממשרד העבודה, פרטים מזהים הושחרו"
                width={1170}
                height={1520}
                loading="lazy"
              />
              <p className={s.docCap}>
                המכתב המקורי. שם החברה, מספרי התיקים ופרטי הקשר הושחרו.
              </p>
            </div>

            <div>
              <div className={s.docFindings}>
                {FINDINGS.map((f) => (
                  <div key={f.law} className={s.finding}>
                    <span className={s.findingLaw}>{f.law}</span>
                    <span className={`${s.pill} ${f.clear ? s.pillClear : s.pillWarn}`}>
                      {f.outcome}
                    </span>
                  </div>
                ))}
              </div>

              <div className={s.docVerdict}>
                <div className={`${s.docVerdictNum} ${s.num}`}>0 ₪</div>
                <p className={s.docVerdictText}>
                  <strong>שלוש התראות מינהליות ושתי סגירות ללא ממצאים.</strong> התראה
                  מינהלית אינה עיצום כספי, ואינה כרוכה בתשלום. שים לב שאחד התיקים הוא
                  סעיף 25א לחוק הגנת השכר, ההפרה הנפוצה ביותר בכל המאגר.
                </p>
              </div>

              <p className={s.srcNote}>
                כל תיק נבחן לגופו, ותוצאה בתיק אחד אינה מבטיחה תוצאה בתיק אחר. המסמך מוצג
                באישור הלקוח ולאחר השחרת כל הפרטים המזהים.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── איך זה עובד ── */}
      <div className={s.block}>
        <div className={s.inner}>
          <div className={s.kicker}>התהליך</div>
          <h2 className={s.h2}>
            שלושה שלבים, <em>מתחילים מהמכתב שקיבלת.</em>
          </h2>
          <div className={s.rule} />

          <div className={s.steps}>
            <div className={s.step}>
              <div className={s.stepNum}>1</div>
              <div className={s.stepTitle}>שולח את המכתב ואת הפרטים</div>
              <p className={s.stepBody}>
                המכתב ממשרד העבודה מכיל את ההפרה, הסכום והמועד. זה כל מה שצריך כדי לדעת
                מה עוד פתוח.
              </p>
            </div>
            <div className={s.step}>
              <div className={s.stepNum}>2</div>
              <div className={s.stepTitle}>אוהד בודק אישית ומחזיר תשובה</div>
              <p className={s.stepBody}>
                באיזה שלב אתה, כמה זמן נשאר, אילו עילות הפחתה רלוונטיות לך, ומה הסיכוי
                המעשי בתיק כזה.
              </p>
            </div>
            <div className={s.step}>
              <div className={s.stepNum}>3</div>
              <div className={s.stepTitle}>מחליט אם להתקדם</div>
              <p className={s.stepBody}>
                אם יש מה לעשות, תדע בדיוק מה התהליך ומה שכר הטרחה לפני שאתה מתחייב למשהו.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── שאלות ── */}
      <div className={s.block}>
        <div className={s.inner}>
          <div className={s.kicker}>שאלות נפוצות</div>
          <h2 className={s.h2}>
            מה שמעסיקים <em>שואלים אותי בשיחה הראשונה.</em>
          </h2>
          <div className={s.rule} />
          <div className={s.faqList}>
            {FAQ.map((f) => (
              <div key={f.q} className={s.faqItem}>
                <div className={s.faqQ}>{f.q}</div>
                <div className={s.faqA}>{f.a}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── סיום ── */}
      <div className={s.finalWrap}>
        <div className={s.finalInner}>
          <div className={s.kicker} style={{ textAlign: "center" }}>לפני שאתה משלם</div>
          <h2 className={s.h2}>
            שמונה מכל עשרה משלמים בלי לבדוק.<br />
            <em>אתה לא חייב להיות אחד מהם.</em>
          </h2>
          <p className={s.lead} style={{ margin: "0 auto 1.5rem" }}>
            שלח את המכתב שקיבלת ואת הפרטים, ותדע באיזה שלב אתה ומה עוד אפשר לעשות.
            ללא התחייבות.
          </p>
          <a className={s.topCta} href="#form" style={{ display: "inline-block", padding: "0.9rem 2.2rem", fontSize: "1rem" }}>
            לבדיקה ראשונית של העיצום
          </a>
        </div>
      </div>

      {/* ── פוטר ── */}
      <div className={s.footer}>
        <div className={s.footerInner}>
          <div className={s.footerGrid}>
            <div>
              <div className={s.footerLogo}>TEVET</div>
              <div className={s.footerSub}>TEVET | LAW OFFICE | טבת משרד עורכי דין</div>
              <p className={s.footerInfo}>
                אוהד טבת, עו&quot;ד ובודק שכר מוסמך<br />
                בסר 3, בני ברק<br />
                מייצג בכל הארץ<br />
                <a href="mailto:ohad@tevet-law.com">ohad@tevet-law.com</a>
              </p>
            </div>
            <div className={s.footerCol}>
              <h4>מידע משפטי</h4>
              <Link href="/terms">תנאי שימוש</Link>
              <Link href="/privacy">מדיניות פרטיות</Link>
            </div>
            <div className={s.footerCol}>
              <h4>מקורות רשמיים</h4>
              <a href={GOV_REDUCTION} target="_blank" rel="noopener noreferrer">בקשה להפחתת עיצום</a>
              <a href={GOV_APPEAL} target="_blank" rel="noopener noreferrer">הגשת ערר</a>
              <a href={GOV_DB} target="_blank" rel="noopener noreferrer">מאגר העיצומים</a>
            </div>
          </div>
          <p className={s.footerBottom}>
            האתר אינו מהווה ייעוץ משפטי ואינו תחליף לבחינת התיק הספציפי שלך. כל תיק נבחן
            לגופו.<br />
            המידע והמסמכים נאספים ומעובדים בהתאם לתיקון 13 לחוק הגנת הפרטיות,
            התשמ&quot;א-1981. לבקשת מחיקת מידע:{" "}
            <a href="mailto:ohad@tevet-law.com">ohad@tevet-law.com</a>
            {" "}|{" "}© 2026 משרד עורכי דין טבת
          </p>
        </div>
      </div>
    </div>
  );
}
