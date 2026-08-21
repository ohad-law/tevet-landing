"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { ITEMS, STATS, VERIFIED_ON } from "./data";
import s from "./checklist.module.css";

/**
 * הצ'קליסט האינטראקטיבי.
 *
 * הרעיון: הגולש מסמן בעצמו מה חסר לו. הוא לא מקבל מאיתנו מסקנה,
 * הוא מגיע אליה. מי שמסמן שלושה חוסרים ומעלה כבר לא צריך שנשכנע
 * אותו, ולכן רק אז נפתחת הפנייה לוואטסאפ.
 *
 * העיצוב יושב ב-checklist.module.css ולא במחלקות טיילווינד, ראה
 * את ההסבר בראש הקובץ הזה.
 */

const WHATSAPP = "972515937329";

/** בידוד כיווני למספר בתוך משפט עברי, שלא יתעופף לצד השני. */
function N({ children }: { children: React.ReactNode }) {
  return (
    <span dir="ltr" style={{ unicodeBidi: "isolate" }}>
      {children}
    </span>
  );
}

function track(event: string, payload?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const w = window as unknown as {
    fbq?: (...a: unknown[]) => void;
    ttq?: { track: (...a: unknown[]) => void };
  };
  try {
    w.fbq?.("track", event, payload);
    w.ttq?.track(event, payload);
  } catch {
    /* פיקסל חסום בדפדפן של הגולש. לא שובר את הדף. */
  }
}

export default function Checklist() {
  const [missing, setMissing] = useState<Record<number, boolean>>({});
  const [open, setOpen] = useState<number | null>(1);

  const count = useMemo(
    () => Object.values(missing).filter(Boolean).length,
    [missing]
  );

  function toggle(n: number) {
    setMissing((prev) => {
      const next = { ...prev, [n]: !prev[n] };
      const total = Object.values(next).filter(Boolean).length;
      // האירוע נשלח פעם אחת בלבד, ברגע שהגולש חוצה את הסף
      if (total === 3 && Object.values(prev).filter(Boolean).length < 3) {
        track("Lead", { content_name: "checklist_3_missing" });
      }
      return next;
    });
  }

  const waText = encodeURIComponent(
    count >= 3
      ? `היי, עברתי על הצ'קליסט באתר וסימנתי ${count} רכיבים שחסרים לי בתלוש. אשמח לבדוק מה זה שווה.`
      : "היי, עברתי על הצ'קליסט באתר ויש לי שאלה על התלוש שלי."
  );

  return (
    <div className={s.page}>
      <div className={s.top}>
        <div className={s.topInner}>
          <a href="/" className={s.logo} aria-label="משרד עורכי דין טבת">
            <Image
              src="/tevet-logo.png"
              alt="טבת משרד עורכי דין"
              width={888}
              height={274}
              priority
            />
          </a>
          <a href="/" className={s.backLink}>
            לאתר המשרד
          </a>
        </div>
        {/* מתמלא ככל שהגולש מסמן. נותן תחושת התקדמות. */}
        <div
          className={s.progress}
          style={{ width: `${(count / ITEMS.length) * 100}%` }}
        />
      </div>

      <main className={s.wrap}>
        {/* ── פתיחה ── */}
        <div className={s.intro}>
          <div className={s.eyebrow}>בדיקה עצמית · שתי דקות</div>

          <h1 className={s.h1}>
            <N>5</N> הרכיבים
            <br />
            שהכי חסרים
            <br />
            <em>בתלוש שכר</em>
          </h1>

          <p className={s.lead}>
            הוצאתי את זה מתוך התיקים שעברו אצלי במשרד. אלה חמשת
            הדברים שחוזרים הכי הרבה, ואת רובם אפשר לזהות לבד תוך
            שתי דקות מול התלוש.
          </p>

          <div className={s.stats}>
            <div className={s.stat}>
              <div className={s.statNum}>
                <N>{STATS.cases}</N>
              </div>
              <div className={s.statLabel}>
                תיקים
                <br />
                שנבדקו
              </div>
            </div>
            <div className={s.stat}>
              <div className={s.statNum}>
                <N>{STATS.medianMissing}</N>
              </div>
              <div className={s.statLabel}>
                רכיבים חסרים
                <br />
                בחציון התיקים
              </div>
            </div>
            <div className={s.stat}>
              <div className={s.statNum}>
                <N>{STATS.threeOrMore}%</N>
              </div>
              <div className={s.statLabel}>
                מהתיקים עם
                <br />
                שלושה ומעלה
              </div>
            </div>
          </div>

          <p className={s.caveat}>
            אלה תיקים של אנשים שכבר חשדו ופנו לעורך דין, ולכן זו לא
            תמונה של המשק כולו. עדיין, זה מה שכדאי לבדוק.
          </p>

          <div className={s.news}>
            <div className={s.newsTitle}>עדכון מהשבוע</div>
            <p className={s.newsBody}>
              ב־<N>18/08/2026</N> פורסם צו הרחבה חדש שמעלה את יום
              ההבראה במגזר הפרטי מ־<N>418</N> ל־<N>451.50</N> שקל.
              מי שקיבל השנה לפי התעריף הישן זכאי להפרש. זה הרכיב
              הראשון ברשימה, ובדיוק עכשיו שווה לבדוק אותו.
            </p>
          </div>
        </div>

        {/* ── הרשימה ── */}
        <div className={s.listHead}>
          <div className={s.listTitle}>הרשימה</div>
          <div className={s.listCount}>
            סימנת <b><N>{count}</N></b> מתוך <N>{ITEMS.length}</N>
          </div>
        </div>

        <p className={s.howto}>
          תפתח את התלוש האחרון שלך. על כל רכיב, תלחץ, תקרא מה
          מחפשים, ותסמן אם לא מצאת אותו.
        </p>

        <div className={s.list}>
          {ITEMS.map((it) => {
            const isOpen = open === it.n;
            const isMissing = !!missing[it.n];
            return (
              <div
                key={it.n}
                className={`${s.item} ${isMissing ? s.marked : ""}`}
              >
                <button
                  className={s.head}
                  onClick={() => setOpen(isOpen ? null : it.n)}
                  aria-expanded={isOpen}
                >
                  <span className={s.num}>
                    <N>{it.n}</N>
                  </span>

                  <span className={s.headText}>
                    <span className={s.itemTitle}>{it.title}</span>
                    <span className={s.freqRow}>
                      <span className={s.freqBar}>
                        <span
                          className={s.freqFill}
                          style={{ width: `${it.freq}%` }}
                        />
                      </span>
                      <span className={s.freqText}>
                        חסר ב־<N>{it.freq}%</N> מהתיקים
                      </span>
                    </span>
                  </span>

                  <span className={`${s.chev} ${isOpen ? s.chevOpen : ""}`}>
                    ⌄
                  </span>
                </button>

                {isOpen && (
                  <div className={s.body}>
                    <div className={s.blockLabel}>מה מחפשים בתלוש</div>
                    <p className={s.blockText}>{it.look}</p>

                    <div className={s.blockLabel}>הסימן שמשהו לא בסדר</div>
                    <p className={s.blockText}>{it.flag}</p>

                    <div className={s.fact}>
                      <p className={s.factText}>{it.fact}</p>
                      <p className={s.factSource}>מקור: {it.source}</p>
                    </div>

                    <button
                      className={`${s.mark} ${isMissing ? s.markOn : ""}`}
                      onClick={() => toggle(it.n)}
                    >
                      {isMissing ? "✓ סימנת שזה חסר לך" : "לא מצאתי את זה בתלוש"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── תוצאה ── */}
        <div className={s.result}>
          {count === 0 && (
            <p className={s.resultHint}>
              סמן את מה שחסר לך, ותקבל כאן את המשמעות.
            </p>
          )}

          {count > 0 && count < 3 && (
            <div className={s.resultSoft}>
              סימנת <N>{count}</N>. זה כבר לא אפס, אבל זה גם לא תמיד
              שווה תביעה. שים לב במיוחד לפנסיה: גם כשהשורה קיימת,
              האחוזים או השכר שעליו היא מחושבת יכולים להיות נמוכים
              מהמינימום, וזה החוסר שהכי קל לפספס.
            </div>
          )}

          {count >= 3 && (
            <div className={s.resultHot}>
              <div className={s.hotLabel}>
                <span className={s.hotBig}>
                  <N>
                    {count}/{ITEMS.length}
                  </N>
                </span>
                <span>סימנת</span>
              </div>
              <p className={s.hotBody}>
                זה בדיוק המצב שחזר ב־<N>{STATS.threeOrMore}%</N> מהתיקים
                שנבדקו במשרד. מכאן הדבר היחיד שקובע הוא כמה זמן עבדת
                ומה בדיוק כתוב בתלושים, ואת זה כבר צריך לראות בעיניים.
              </p>
              <a
                className={s.cta}
                href={`https://wa.me/${WHATSAPP}?text=${waText}`}
                target="_blank"
                rel="noopener"
                onClick={() => track("Contact", { missing_count: count })}
              >
                לשלוח לאוהד את מה שסימנתי
              </a>
              <p className={s.ctaNote}>
                נפתחת שיחת וואטסאפ עם המשרד, עם מה שסימנת כאן.
                בלי עלות ובלי התחייבות.
              </p>
            </div>
          )}
        </div>

        {/* ── מי עומד מאחורי זה ──
            יושב אחרי הצ'קליסט ולא לפניו. מישהו שנחת מטיקטוק לא
            יודע מי אוהד, אבל אם נפתח בזה זה פיץ' ולא כלי. */}
        <div className={s.who}>
          <div className={s.whoPhoto}>
            <Image
              src="/ohad.png"
              alt="עו״ד אוהד טבת"
              width={467}
              height={702}
            />
          </div>
          <div className={s.whoBody}>
            <div className={s.whoName}>אוהד טבת</div>
            <div className={s.whoRole}>
              מי שכתב את הרשימה הזאת
            </div>
            <ul className={s.creds}>
              <li><span>עורך דין לדיני עבודה</span></li>
              <li><span>בודק שכר מוסמך מטעם משרד העבודה</span></li>
              <li>
                <span>
                  היה בעצמו מעסיק של יותר מ־<N>50</N> עובדים
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className={s.foot}>
          <p>
            הדף הזה הוא מידע כללי ולא ייעוץ משפטי. כל מקרה נבדק
            לגופו. הנתונים הרגולטוריים אומתו ב־<N>{VERIFIED_ON}</N> מול
            נוסח החוק וצווי ההרחבה.
          </p>
        </div>
      </main>
    </div>
  );
}
