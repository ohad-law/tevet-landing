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

מילות המפתח היחידות שהבוט מכיר הן "תלוש" ו"פנסיה". אסור לך להמציא
מילת מפתח אחרת, גם אם היא מתאימה יותר לנושא: מי שיגיב במילה שלא קיימת
יקבל שתיקה. בחר את הקרובה מבין השתיים, ואם הנושא לא מתאים לאף אחת
מהן, כתוב קריאה לפעולה בלי מילת מפתח כלל (למשל לשמור את הסרטון או
לכתוב שאלה בתגובות).

החזר את התסריט דרך הכלי submit_reel_draft בלבד.`;

/**
 * הפלט נמסר דרך כלי ולא כטקסט חופשי. הסיבה מעשית: גרשיים בעברית
 * ("עו"ד") שברו את ה-JSON כשביקשנו טקסט. דרך הכלי ה-SDK מחזיר אובייקט
 * תקין תמיד, ואין מה לפרסר ידנית.
 */
const DRAFT_TOOL: Anthropic.Tool = {
  name: "submit_reel_draft",
  description: "מוסר את תסריט הריל המוגמר",
  input_schema: {
    type: "object",
    properties: {
      hook: { type: "string", description: "שלוש השניות הראשונות" },
      hook_alternatives: {
        type: "array", items: { type: "string" },
        description: "שתי חלופות להוק, לא יותר",
      },
      beats: {
        type: "array",
        items: {
          type: "object",
          properties: {
            from_sec: { type: "number" },
            to_sec: { type: "number" },
            say: { type: "string", description: "מה נאמר בקול" },
            show: { type: "string", description: "מה רואים על המסך" },
          },
          required: ["from_sec", "to_sec", "say", "show"],
        },
      },
      shooting_notes: { type: "string" },
      editing_notes: { type: "string" },
      captions: {
        type: "object",
        properties: {
          instagram: { type: "string" },
          tiktok: { type: "string" },
        },
        required: ["instagram", "tiktok"],
      },
    },
    required: ["hook", "hook_alternatives", "beats", "shooting_notes", "editing_notes", "captions"],
  },
};

type ReelDraft = {
  hook: string;
  hook_alternatives: string[];
  beats: Array<{ from_sec: number; to_sec: number; say: string; show: string }>;
  shooting_notes: string;
  editing_notes: string;
  captions: { instagram: string; tiktok: string };
};


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
      max_tokens: 4000,
      system: SYSTEM,
      tools: [DRAFT_TOOL],
      tool_choice: { type: "tool", name: "submit_reel_draft" },
      messages: [{ role: "user", content: userPrompt }],
    });

    const toolUse = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );
    if (!toolUse) throw new Error("המודל לא החזיר תסריט");

    const draft = toolUse.input as ReelDraft;

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
