import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * מייצר טיוטת תסריט לריל מתוך נושא אחד.
 *
 * נקרא מטאב "רילס" ב-tevet-crm, שהוא אפליקציה נפרדת ולכן יש כאן CORS.
 * המפתח של Anthropic לא יכול לשבת בצד לקוח, ולכן היצירה רצה כאן.
 *
 * הפלט הוא JSON בלבד, במבנה שהמסך יודע לקרוא. אם המודל יחזיר משהו
 * אחר, הראוט נכשל בגלוי ולא מחזיר טיוטה חלקית שתיראה תקינה.
 */

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return NextResponse.json(null, { headers: CORS_HEADERS });
}

const SYSTEM = `אתה כותב תסריטים לרילים עבור עורך הדין אוהד טבת, עורך דין
לדיני עבודה ובודק שכר מוסמך בישראל. אתה כותב בקול שלו, לא בקול של
קופירייטר.

מי הקהל: עובדים שכירים בישראל שחושדים שמגיע להם כסף שלא קיבלו.
פיצויים, פנסיה, שעות נוספות, דמי הבראה. לא מעסיקים.

הפורמט שמנצח אצלו בפועל, וזו ברירת המחדל: תלוש שכר על המסך כרקע קבוע
לאורך כל הסרטון, עם הדגשות זהב על המספרים שמדברים עליהם. הריל הזה
הביא לו 5,600 צפיות והרבה פניות.

כללי כתיבה מחייבים:
- ההוק הוא שלוש השניות הראשונות ומכריע הכל. שלושת הכללים: לחשוף משהו
  מיד, לחשוף אותו מהר, ולהציג סיכון מול תגמול. לא שאלה כללית ולא
  הקדמה.
- פנייה לצופה תמיד בלשון רבים. "אתם", "שלכם", "תבדקו". לעולם לא "אתה",
  "שלך", "תבדוק".
- אסור מקף ארוך ומקף בינוני. רק מקף רגיל.
- אסור לציין שכר טרחה, מחיר, סכום שהלקוח משלם, "ללא עלות" או "חינם".
  זה אסור לפי כללי הפרסומת של לשכת עורכי הדין.
- אסור להבטיח תוצאה, ואסור להאשים מעסיקים בגניבה.
- מספרים קונקרטיים עדיפים על הכללות, אבל אסור לך להמציא אותם. מותר
  להשתמש רק במספרים שאוהד נתן לך בנושא או בזווית. אם אין לך מספר
  אמיתי ואתה צריך אחד, כתוב אותו כסוגריים מרובעים למילוי, למשל
  [ברוטו מהתלוש] או [בסיס הפנסיה], ואל תכתוב מספר שנראה אמיתי.
  אותו כלל חל על אחוזים, על שיעורי הפרשה ועל סכומי תביעות.
- אם אתה מסתמך על חישוב, כתוב אותו כך שאוהד יוכל לאמת אותו בשנייה.
- אורך כולל 15 עד 30 שניות. מעל זה הצפיות שלו צונחות פי שלושה.

מבנה התסריט: כל שורה היא פעימה עם טווח שניות, מה נאמר בקול, ומה רואים
על המסך באותו רגע.

הכיתובים לפוסט: באינסטגרם יש בוט שמגיב לתגובות ושולח מדריך בהודעה
פרטית, ולכן הקריאה לפעולה שם היא להגיב במילת מפתח. בטיקטוק אין אפשרות
כזאת, ולכן שם מפנים לקישור בביו ואסור להבטיח הודעה פרטית.

החזר JSON בלבד, בלי טקסט לפניו ואחריו, במבנה:
{
  "hook": "string",
  "hook_alternatives": ["string", "string"],
  "beats": [{ "from_sec": 0, "to_sec": 3, "say": "string", "show": "string" }],
  "shooting_notes": "string",
  "editing_notes": "string",
  "captions": { "instagram": "string", "tiktok": "string" }
}`;

type ReelDraft = {
  hook: string;
  hook_alternatives: string[];
  beats: Array<{ from_sec: number; to_sec: number; say: string; show: string }>;
  shooting_notes: string;
  editing_notes: string;
  captions: { instagram: string; tiktok: string };
};

function extractJson(text: string): ReelDraft {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("המודל לא החזיר JSON");
  return JSON.parse(text.slice(start, end + 1)) as ReelDraft;
}

export async function POST(request: NextRequest) {
  try {
    const { topic, angle } = (await request.json()) as { topic?: string; angle?: string };

    if (!topic?.trim()) {
      return NextResponse.json(
        { error: "חסר נושא לריל" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "חסר מפתח Anthropic בסביבת השרת" },
        { status: 500, headers: CORS_HEADERS },
      );
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const userPrompt = [
      `הנושא: ${topic.trim()}`,
      angle?.trim() ? `הזווית שאוהד רוצה: ${angle.trim()}` : "",
      "כתוב תסריט ריל שלם לפי הכללים. שתי חלופות להוק, ולא יותר.",
    ].filter(Boolean).join("\n");

    const response = await anthropic.messages.create({
      model: "claude-opus-5",
      max_tokens: 3000,
      system: SYSTEM,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    const draft = extractJson(text);

    if (!draft.hook || !Array.isArray(draft.beats) || draft.beats.length === 0) {
      throw new Error("הטיוטה חזרה חסרה");
    }

    return NextResponse.json({ draft }, { headers: CORS_HEADERS });
  } catch (error) {
    const message = error instanceof Error ? error.message : "שגיאה לא ידועה";
    console.error("[reel-draft]", message);
    return NextResponse.json(
      { error: `יצירת הטיוטה נכשלה: ${message}` },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
