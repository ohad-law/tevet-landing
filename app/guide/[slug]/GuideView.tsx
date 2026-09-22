import GuideCta from "./GuideCta";

export type GuideItem = {
  title: string;
  look: string;
  flag: string;
  fact: string;
  source: string;
};

export type Guide = {
  slug: string;
  title: string;
  subtitle: string;
  intro: string;
  items: GuideItem[];
  cta_keyword?: string;
  cta_text?: string;
  status: "draft" | "live";
  verified_on?: string;
};

/**
 * העיצוב של המדריך.
 *
 * נייבי וזהב כמו בשאר הנכסים של המשרד, וסעיף לכל רכיב במבנה
 * הקבוע: מה לחפש, מה מעיד על בעיה, והעובדה עם המקור. המבנה הזה
 * הוא מה שהופך מדריך לכלי עבודה ולא לכתבה.
 *
 * העיצוב יושב בקוד ולא במסד בכוונה. אוהד עורך טקסט, לא פריסה,
 * וכך עריכה לא יכולה לשבור את הדף.
 */
export default function GuideView({ guide, isDraft }: { guide: Guide; isDraft: boolean }) {
  const NAVY = "#14284a";
  const GOLD = "#c9a227";
  const PAPER = "#f7f5f0";

  return (
    <main dir="rtl" style={{ background: PAPER, minHeight: "100vh", fontFamily: "Rubik, system-ui, sans-serif" }}>
      {isDraft && (
        <div style={{
          background: GOLD, color: NAVY, textAlign: "center",
          padding: "8px 16px", fontSize: 13, fontWeight: 700,
        }}>
          תצוגה מקדימה. המדריך עוד לא פורסם
        </div>
      )}

      <header style={{ background: NAVY, color: "#fff", padding: "56px 24px 48px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <h1 style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.25, margin: 0 }}>
            {guide.title}
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.6, opacity: 0.85, marginTop: 14 }}>
            {guide.subtitle}
          </p>
        </div>
      </header>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px 64px" }}>
        <p style={{ fontSize: 17, lineHeight: 1.75, color: "#333", marginTop: 0 }}>
          {guide.intro}
        </p>

        <ol style={{ listStyle: "none", padding: 0, margin: "36px 0 0" }}>
          {guide.items.map((item, i) => (
            <li
              key={i}
              style={{
                background: "#fff", borderRadius: 16, padding: "24px 24px 20px",
                marginBottom: 16, border: "1px solid #e8e4dc",
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                <span style={{
                  color: GOLD, fontSize: 28, fontWeight: 800, lineHeight: 1,
                  fontVariantNumeric: "tabular-nums",
                }}>
                  {i + 1}
                </span>
                <h2 style={{ fontSize: 21, fontWeight: 800, color: NAVY, margin: 0 }}>
                  {item.title}
                </h2>
              </div>

              <Row label="מה לחפש" text={item.look} />
              <Row label="מה מעיד על בעיה" text={item.flag} accent={GOLD} />
              <Row label="מה אומר החוק" text={item.fact} />

              <p style={{
                fontSize: 12, color: "#8a8578", marginTop: 14, marginBottom: 0,
                paddingTop: 12, borderTop: "1px solid #f0ece4",
              }}>
                {item.source}
              </p>
            </li>
          ))}
        </ol>

        {guide.cta_text && (
          <section style={{
            background: "#fff", border: "1px solid #e8e4dc", borderRadius: 16,
            padding: "22px 24px", marginTop: 32,
          }}>
            <p style={{ fontSize: 17, lineHeight: 1.7, margin: 0, color: "#2b2b2b" }}>
              {guide.cta_text}
            </p>
          </section>
        )}

        {/*
          הצעד שהופך קורא ללקוח. קבוע בכל מדריך, כי מדריך שנגמר
          בלי המשך הוא בדיוק מה שהביא שני לידים בחודשיים.
        */}
        <GuideCta slug={guide.slug} />

        <footer style={{ marginTop: 32, fontSize: 12, color: "#8a8578", lineHeight: 1.7 }}>
          <p style={{ margin: 0 }}>
            אוהד טבת, עורך דין לדיני עבודה ובודק שכר מוסמך.
          </p>
          <p style={{ margin: "4px 0 0" }}>
            האמור במדריך הוא מידע כללי ואינו מהווה ייעוץ משפטי או תחליף לבדיקה פרטנית.
          </p>
          {guide.verified_on && (
            <p style={{ margin: "4px 0 0" }}>אומת בתאריך {guide.verified_on}</p>
          )}
        </footer>
      </div>
    </main>
  );
}

function Row({ label, text, accent }: { label: string; text: string; accent?: string }) {
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{
        fontSize: 12, fontWeight: 700, letterSpacing: 0.3,
        color: accent || "#8a8578", marginBottom: 4,
      }}>
        {label}
      </div>
      <p style={{ fontSize: 16, lineHeight: 1.7, color: "#2b2b2b", margin: 0 }}>{text}</p>
    </div>
  );
}
