/**
 * מה קורה אחרי שגמרו לקרוא.
 *
 * זה החלק שהיה חסר. המדריכים נגמרו באוויר: הקורא סיים שש
 * בדיקות מצוינות ולא היה לו לאן ללכת. בפועל כל מכונת התוכן
 * האורגני הביאה שני לידים, וזו הסיבה.
 *
 * 🚨 אין כאן מחיר ואין "ללא עלות". כלל 3(ב)(14) של לשכת עורכי
 * הדין אוסר על שניהם בפרסום, והמדריך הוא פרסום לכל דבר. המחיר
 * חי בדף המכירה עצמו, שם הוא חלק מהצעה ולא מפרסומת.
 *
 * הבלוק קבוע בקוד ולא נכתב מחדש לכל מדריך, משתי סיבות: כדי
 * שכל המדריכים ידברו באותו קול, וכדי שאוהד לא יצטרך לאשר
 * ניסוח משפטי חדש בכל פעם.
 */

const NAVY = "#14284a";
const GOLD = "#c9a227";

/** מה שנכנס לתחשיב. מקוצר מדף המכירה, בלי להמציא שום דבר חדש */
const INSIDE = [
  {
    title: "מסמך כתוב, שורה אחרי שורה",
    body: "עוברים על התלושים אחד אחד מול צווי ההרחבה והתעריפים של אותה שנה, ומראים מה לא חושב נכון וכמה זה שווה בשקלים.",
  },
  {
    title: "הצלבה מול דוח ההפקדות",
    body: "תלוש יכול להיראות תקין לחלוטין ועדיין להסתיר פער. רק ההצלבה בין מה שרשום למה שבאמת הופקד חושפת אותו.",
  },
  {
    title: "המלצה מפורשת מה לעשות",
    body: "מה שווה לעשות עם מה שנמצא ומה לא שווה את הזמן שלכם, גם כשהתשובה היא שאין כאן מספיק כדי לפעול.",
  },
];

export default function GuideCta({ slug }: { slug: string }) {
  /* הפרמטר נשאר בכתובת כדי שנדע איזה מדריך הביא את הקליק */
  const href = `/tlush-check?g=${encodeURIComponent(slug)}`;

  return (
    <section
      style={{
        background: NAVY,
        color: "#fff",
        borderRadius: 20,
        padding: "34px 28px 30px",
        marginTop: 40,
      }}
    >
      <p style={{
        color: GOLD, fontSize: 13, fontWeight: 700,
        letterSpacing: 0.4, margin: 0,
      }}>
        אחרי שבדקתם
      </p>

      <h2 style={{
        fontSize: 26, fontWeight: 800, lineHeight: 1.3,
        margin: "10px 0 0",
      }}>
        מצאתם משהו שנראה לכם לא נכון. מה עכשיו?
      </h2>

      <p style={{ fontSize: 16.5, lineHeight: 1.75, opacity: 0.9, marginTop: 14 }}>
        המדריך הזה מראה לכם איפה להסתכל. הוא לא יכול להגיד לכם כמה בדיוק חסר,
        כי לשם כך צריך לעבור על כל התלושים מול צווי ההרחבה והתעריפים שהשתנו
        בכל שנה. זה בדיוק מה שאנחנו עושים בתחשיב החוסרים.
      </p>

      <div style={{ marginTop: 22, display: "grid", gap: 14 }}>
        {INSIDE.map((item) => (
          <div key={item.title} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span style={{
              width: 7, height: 7, borderRadius: 4, background: GOLD,
              marginTop: 9, flex: "0 0 auto",
            }} />
            <div>
              <p style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{item.title}</p>
              <p style={{ fontSize: 15, lineHeight: 1.7, opacity: 0.82, margin: "3px 0 0" }}>
                {item.body}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/*
        ההתחייבות היא הטיעון החזק ביותר בדף המכירה, והיא גם היחיד
        שאפשר להביא לכאן בלי לנקוב במחיר.
      */}
      <div style={{
        marginTop: 24, padding: "16px 18px", borderRadius: 14,
        background: "rgba(255,255,255,0.07)",
        border: "1px solid rgba(201,162,39,0.35)",
      }}>
        <p style={{ fontSize: 15.5, lineHeight: 1.7, margin: 0 }}>
          <strong style={{ color: GOLD }}>ההתחייבות שלנו: </strong>
          אם התחשיב לא ימצא לכם חוסרים בסכום גבוה ממה ששילמתם עליו,
          אתם מקבלים את התשלום בחזרה. הסיכון הוא שלנו, לא שלכם.
        </p>
      </div>

      <a
        href={href}
        style={{
          display: "inline-block", marginTop: 26,
          background: GOLD, color: NAVY,
          fontSize: 17, fontWeight: 800,
          padding: "15px 30px", borderRadius: 999,
          textDecoration: "none",
        }}
      >
        לבדיקת התלושים שלכם
      </a>

      <p style={{ fontSize: 13, opacity: 0.6, marginTop: 14, marginBottom: 0 }}>
        עד שבעה ימי עסקים מרגע שהתלושים מגיעים אלינו.
      </p>
    </section>
  );
}
