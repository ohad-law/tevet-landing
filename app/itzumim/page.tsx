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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className={s.topLogo}
          src="/tevet-logo.png"
          alt="טבת משרד עורכי דין"
          width={888}
          height={274}
        />
        <a className={s.topCta} href="#form">לבדיקת העיצום</a>
      </div>

      {/* ── HERO ── */}
      <div className={s.hero}>
        <div className={s.heroGrid}>
          <div className={s.heroText}>
            <span className={s.eyebrow}>למעסיקים ולבעלי עסקים</span>
            <h1 className={s.h1}>
              קיבלת עיצום כספי<br />ממשרד העבודה?<br />
              <em>יש לך 30 יום.</em>
            </h1>
            <p className={s.sub}>
              ובלי אישור של בודק שכר מוסמך, הממונה{" "}
              <strong>לא מוריד את הסכום בשקל.</strong>
            </p>

            {/* הליד. לא מוכר כלום, רק מזדהה ומבטיח שהפתרון כאן. */}
            <div className={s.lede}>
              <p>
                אתה קורא את המכתב שוב, מחפש איפה הם טעו. מנהלת החשבונות אומרת שהיא תבדוק
                ותחזור אליך. ובראש כבר רץ החישוב האמיתי: כמה יעלה להילחם בזה, מול כמה
                יעלה פשוט לשלם ולסגור את הפרק.
              </p>
              <p>
                <strong>רוב המעסיקים שמגיעים אליי ישבו בדיוק שם.</strong> ורובם שילמו
                בסוף הרבה פחות ממה שהיה כתוב במכתב, חלקם לא שילמו כלום.
              </p>
            </div>

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

      {/* ── פס דחיפות. הדחיפות חייבת להיות גבוה בדף ולא באמצע ── */}
      <div className={s.urgentStrip}>
        <div className={s.urgentInner}>
          <span className={s.urgentItem}>
            <span className={`${s.urgentNum} ${s.num}`}>30</span>
            <span className={s.urgentLabel}>יום להגיב על כוונת חיוב</span>
          </span>
          <span className={s.urgentItem}>
            <span className={`${s.urgentNum} ${s.num}`}>28</span>
            <span className={s.urgentLabel}>יום להגיש ערר</span>
          </span>
          <span className={s.urgentItem}>
            <span className={`${s.urgentNum} ${s.num}`}>45</span>
            <span className={s.urgentLabel}>יום לערער לבית הדין</span>
          </span>
          <span className={s.urgentItem}>
            <span className={s.urgentLabel}>לוועדת הערר <strong>אין סמכות</strong> להאריך</span>
          </span>
        </div>
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

      {/* ── הסיפור. מתחיל בדרמה ולא בכרונולוגיה ── */}
      <div className={s.block}>
        <div className={s.inner}>
          <div className={s.kicker}>תיק אמיתי</div>
          <div className={`${s.storyOpen} ${s.num}`}>800,000 ש&quot;ח.</div>
          <h2 className={s.h2}>
            זה מה שהופיע במכתב.<br />
            <em>בגלל 20 שקל בחודש.</em>
          </h2>
          <div className={s.rule} />

          <div className={s.storyBody}>
            <p>
              בעל עסק הגיע אליי עם מכתב ממשרד העבודה. הסכום בסוף העמוד היה 800 אלף שקל.
              הוא ישב מולי ואמר לי שהוא לא מבין מה הוא עשה.
            </p>
            <p>
              מה שהוא עשה זה שבמשך ארבעה חודשים הוא הפקיד לעובד לפנסיה{" "}
              <strong>230 שקל במקום 250</strong>. הפרש של 20 שקל בחודש.{" "}
              <strong>80 שקל בסך הכל.</strong>
            </p>
            <p>
              זה נשמע כמו טעות במערכת. זה לא. ככה עובד חוק להגברת האכיפה: העיצום נקבע
              לפי סוג ההפרה ומספר העובדים, ולא לפי הסכום שחסר.{" "}
              <em>הפרה קטנה בעסק גדול מייצרת מספר עצום.</em>
            </p>
            <p>
              נכנסנו למסלול של מדיניות האכיפה המקלה. תיקנו את ההפרה לכל העובדים ולכל
              התקופה, הגשתי אישור בודק שכר על התיקון, וצירפנו הצהרת מנהלים עם הפעולות
              שהעסק עשה כדי שזה לא יקרה שוב.
            </p>
          </div>

          <p className={s.storyPunch}>
            העיצום בוטל במלואו. אוהד מספר על התיק הזה בסרטון שבראש הדף.
          </p>

          <p className={s.srcNote}>
            כל תיק נבחן לגופו, ותוצאה בתיק אחד אינה מבטיחה תוצאה בתיק אחר.
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

      {/* ── ההצעה. מה הוא מקבל בפועל, מנוסח כתועלת ולא כפיצ'ר ── */}
      <div className={s.block}>
        <div className={s.inner}>
          <div className={s.kicker}>מה נכנס לטיפול</div>
          <h2 className={s.h2}>
            לא ייעוץ. <em>תיק שמטופל מההתחלה ועד הסוף.</em>
          </h2>
          <div className={s.rule} />
          <p className={s.lead}>
            הליך העיצומים אינו מכתב אחד ששולחים. הוא רצף של מסמכים, מועדים והחלטות, וכל
            חוליה שחסרה בו מפילה את כולו.
          </p>

          <div className={s.offer}>
            <div className={s.offerItem}>
              <span className={s.offerCheck} aria-hidden="true">✓</span>
              <div>
                <div className={s.offerTitle}>קריאה של התיק, לא רק של המכתב</div>
                <p className={s.offerBody}>
                  מה בדיוק נטען נגדך, על כמה עובדים, לאיזו תקופה, ואיפה המפקח הסיק מסקנה
                  שאפשר לתקוף.
                </p>
              </div>
            </div>

            <div className={s.offerItem}>
              <span className={s.offerCheck} aria-hidden="true">✓</span>
              <div>
                <div className={s.offerTitle}>איתור עילות ההפחתה שרלוונטיות לך</div>
                <p className={s.offerBody}>
                  היעדר הפרות בחמש השנים האחרונות, פעולות שנקטת למניעה, גודל העסק והמחזור.
                  כל עילה שלא נטענת היא כסף שנשאר על השולחן.
                </p>
              </div>
            </div>

            <div className={`${s.offerItem} ${s.offerKey}`}>
              <span className={s.offerCheck} aria-hidden="true">✓</span>
              <div>
                <div className={s.offerTitle}>אישור בודק שכר מוסמך</div>
                <p className={s.offerBody}>
                  <strong>המסמך שבלעדיו הממונה לא מפחית את הסכום.</strong> אני מפיק אותו
                  בעצמי, ולא שולח אותך לגורם חיצוני שרואה את התיק בפעם הראשונה.
                </p>
              </div>
            </div>

            <div className={s.offerItem}>
              <span className={s.offerCheck} aria-hidden="true">✓</span>
              <div>
                <div className={s.offerTitle}>הצהרת מעסיק ותיקון ההפרה</div>
                <p className={s.offerBody}>
                  התיקון חייב לחול על <strong>כל העובדים ולכל התקופה</strong>, לא רק על מי
                  שנבדק. זו הטעות שמפילה בקשות הפחתה.
                </p>
              </div>
            </div>

            <div className={s.offerItem}>
              <span className={s.offerCheck} aria-hidden="true">✓</span>
              <div>
                <div className={s.offerTitle}>ליווי בחקירה ובשימוע</div>
                <p className={s.offerBody}>
                  &quot;מתן גרסה&quot; היא חקירה לכל דבר, ומה שנאמר בה נכנס לתיק. לא מגיעים
                  אליה לבד.
                </p>
              </div>
            </div>

            <div className={s.offerItem}>
              <span className={s.offerCheck} aria-hidden="true">✓</span>
              <div>
                <div className={s.offerTitle}>מניעת הביקורת הבאה</div>
                <p className={s.offerBody}>
                  משרד העבודה חוזר. מעסיק שנמצא שב על אותה הפרה חשוף לעיצום נוסף, ולכן
                  הטיפול נגמר בנהלים ולא במכתב.
                </p>
              </div>
            </div>
          </div>

          <p className={s.inlineProof}>
            <strong>מקרה מהתיקים:</strong> חמישה תיקי חקירה נפתחו נגד מעסיק אחד אחרי
            ביקורת. שלושה הסתיימו בהתראה מינהלית, שניים נסגרו ללא ממצאים, ולא הוטל עיצום
            כספי כלל. המכתב המקורי מופיע בהמשך הדף.
          </p>
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

      {/* ── הנעה שמייצרת ודאות. מה קורה *אחרי* הלחיצה, שלב אחר שלב ── */}
      <div className={s.block}>
        <div className={s.inner}>
          <div className={s.kicker}>מה קורה אחרי שאתה משאיר פרטים</div>
          <h2 className={s.h2}>
            בלי הפתעות. <em>אתה יודע מראש כל שלב.</em>
          </h2>
          <div className={s.rule} />

          <div className={s.steps}>
            <div className={s.step}>
              <div className={s.stepNum}>1</div>
              <div className={s.stepTitle}>אתה שולח את המכתב</div>
              <p className={s.stepBody}>
                חמישה שדות וצילום של המכתב ממשרד העבודה. בתוכו נמצאים ההפרה, הסכום
                והמועד, וזה כל מה שצריך כדי לדעת איפה אתה עומד.
              </p>
            </div>
            <div className={s.step}>
              <div className={s.stepNum}>2</div>
              <div className={s.stepTitle}>אני חוזר אליך עם שלוש תשובות</div>
              <p className={s.stepBody}>
                באיזה שלב בהליך אתה, כמה ימים באמת נשארו לך, ואילו עילות הפחתה רלוונטיות
                לתיק שלך. לא הערכה כללית, אלא לפי מה שכתוב במכתב שלך.
              </p>
              <span className={s.stepBadge}>מי שהמועד שלו רץ מקבל מענה באותו יום</span>
            </div>
            <div className={s.step}>
              <div className={s.stepNum}>3</div>
              <div className={s.stepTitle}>אתה מחליט, אחרי שאתה יודע הכל</div>
              <p className={s.stepBody}>
                אם יש מה לעשות, תקבל את התהליך המלא ואת שכר הטרחה במספר אחד ברור,{" "}
                <strong>לפני</strong> שאתה מתחייב למשהו.
              </p>
            </div>
          </div>

          {/* ── ההתחייבות ── */}
          <div className={s.guarantee}>
            <div className={s.guaranteeTitle}>
              אם אין מה לעשות בתיק שלך, אני אגיד לך את זה ולא אקח אותו.
            </div>
            <p className={s.guaranteeBody}>
              אף עורך דין לא יכול להבטיח לך תוצאה מול הממונה, ומי שמבטיח, תברח ממנו.
              מה שאני כן מתחייב אליו: <strong>לא לקחת תיק רק כדי לקחת תיק.</strong> יש
              מצבים שבהם המועד עבר, או שההפרה ברורה ואין עילת הפחתה שמצדיקה את העלות. אם
              זה המצב שלך, תשמע את זה ממני כבר בשיחה הראשונה, בלי שתתחייב לכלום.
            </p>
            <p className={s.guaranteeBody} style={{ marginTop: "0.8rem" }}>
              עדיף לי מעסיק שיחזור אליי בעוד שנתיים עם תיק אמיתי, מאשר תשלום על תיק שידעתי
              מראש שאין בו סיכוי.
            </p>
            <div className={s.guaranteeSign}>אוהד טבת, עו&quot;ד ובודק שכר מוסמך</div>
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

      {/* ── הבחירה. ממסגר את ההחלטה במקום לבקש אותה ── */}
      <div className={s.block}>
        <div className={s.inner}>
          <div className={s.kicker}>שלוש אפשרויות</div>
          <h2 className={s.h2}>
            מכאן יש בדיוק שלוש דרכים, <em>ואחת מהן נסגרת בעוד כמה ימים.</em>
          </h2>
          <div className={s.rule} />

          <div className={s.choice}>
            <div className={s.choiceItem}>
              <div className={s.choiceNum}>אפשרות ראשונה</div>
              <div className={s.choiceTitle}>לשלם ולסגור את זה</div>
              <p className={s.choiceBody}>
                מה שעושים שמונה מכל עשרה מעסיקים. הכסף יוצא, התיק נסגר, והביקורת הבאה
                מגיעה בעוד שנה או שנתיים לאותו עסק בדיוק.
              </p>
            </div>
            <div className={s.choiceItem}>
              <div className={s.choiceNum}>אפשרות שנייה</div>
              <div className={s.choiceTitle}>לטפל בזה לבד</div>
              <p className={s.choiceBody}>
                אפשר. צריך ללמוד את תקנות ההפחתה, לדעת אילו עילות לטעון, לעמוד במועד,
                ולהשיג אישור בודק שכר מוסמך. הכל בתוך 30 יום, במקביל לניהול העסק.
              </p>
            </div>
            <div className={`${s.choiceItem} ${s.choicePick}`}>
              <div className={s.choiceNum}>אפשרות שלישית</div>
              <div className={s.choiceTitle}>לשלוח את המכתב ולדעת איפה אתה עומד</div>
              <p className={s.choiceBody}>
                חמש דקות. אחריהן תדע כמה זמן נשאר, מה אפשר לטעון, וכמה זה עולה. ואם אין מה
                לעשות, תשמע גם את זה.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── מסר אישי, למי שגלל עד הסוף ── */}
      <div className={s.personal}>
        <div className={s.personalInner}>
          <div className={s.kicker}>אישית</div>
          <div className={s.personalBody}>
            <p>
              הייתי מעסיק של יותר מ-50 עובדים לפני שהייתי עורך הדין שמייצג מעסיקים. אני
              יודע איך זה נראה מבפנים: אף אחד לא קם בבוקר ומחליט לקזז לעובד פנסיה. יש
              מנהלת חשבונות עמוסה, יש מסלקה שהחזירה שגיאה, ויש חודש שבו לא הספיקו לבדוק.
            </p>
            <p>
              <strong>משרד העבודה לא מודד כוונה, הוא מודד תוצאה.</strong> ובגלל שהעיצום
              נקבע לפי סוג ההפרה ומספר העובדים ולא לפי הסכום שחסר, פער של 20 שקל הופך
              למכתב על 800 אלף. ראיתי את זה קורה, וראיתי גם שאפשר להפוך את זה.
            </p>
            <p>
              אם אתה מחזיק עכשיו מכתב כזה ביד, שלח לי אותו. אני אקרא אותו בעצמי, לא מזכירה
              ולא מתמחה, ואגיד לך את האמת על מה שעומד בפניך. גם אם האמת היא שאין לי מה
              להציע לך.
            </p>
          </div>
          <div className={s.personalName}>אוהד טבת</div>
          <p className={s.personalRole}>
            עו&quot;ד לדיני עבודה · בודק שכר מוסמך מטעם משרד העבודה
          </p>
        </div>
      </div>

      {/* ── סיום ── */}
      <div className={s.finalWrap}>
        <div className={s.finalInner}>
          <div className={s.kicker} style={{ textAlign: "center" }}>לפני שאתה משלם</div>
          <h2 className={s.h2}>
            השעון רץ מהיום שהמכתב נמסר,<br />
            <em>לא מהיום שפתחת אותו.</em>
          </h2>
          <p className={s.lead} style={{ margin: "0 auto 1.5rem" }}>
            שלח את המכתב ואת הפרטים, ותדע באיזה שלב אתה, כמה זמן נשאר, ומה אפשר לעשות.
            ללא התחייבות.
          </p>
          <a
            className={s.topCta}
            href="#form"
            style={{ display: "inline-block", padding: "0.9rem 2.2rem", fontSize: "1rem" }}
          >
            לבדיקה ראשונית של העיצום
          </a>
        </div>
      </div>

      {/* ── פוטר ── */}
      <div className={s.footer}>
        <div className={s.footerInner}>
          <div className={s.footerGrid}>
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className={s.footerLogo}
                src="/tevet-logo.png"
                alt="טבת משרד עורכי דין"
                width={888}
                height={274}
                loading="lazy"
              />
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
