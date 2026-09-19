import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * מייצר טיוטת תוכן מתוך נושא אחד. שני סוגים: ריל וסטורי.
 *
 * הנתיב נשאר reel-draft מסיבה היסטורית (הריל נבנה ראשון) ומשרת גם
 * סטוריז דרך השדה kind, כדי לא לשבור את הטאב שכבר חי בפרודקשן.
 *
 * נקרא מ-tevet-crm שהיא אפליקציה נפרדת, ולכן CORS. המפתח של Anthropic
 * לא יכול לשבת בצד לקוח ולכן היצירה רצה כאן.
 *
 * הפלט נמסר דרך כלי ולא כטקסט: גרשיים בעברית שברו JSON בפרודקשן.
 */

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return NextResponse.json(null, { headers: CORS_HEADERS });
}

/** הכללים שחלים על כל סוג תוכן. הקול של אוהד, לא של קופירייטר. */
const VOICE = `אתה כותב תוכן עבור עורך הדין אוהד טבת, עורך דין לדיני
עבודה ובודק שכר מוסמך בישראל. אתה כותב בקול שלו.

מי הקהל: עובדים שכירים בישראל שחושדים שמגיע להם כסף שלא קיבלו.
פיצויים, פנסיה, שעות נוספות, דמי הבראה, דמי חגים. לא מעסיקים.

כללי כתיבה מחייבים:
- פנייה לצופה תמיד בלשון רבים. "אתם", "שלכם", "תבדקו". לעולם לא
  "אתה", "שלך", "תבדוק".
- אסור מקף ארוך ומקף בינוני. רק מקף רגיל.
- אסור לציין שכר טרחה, מחיר, סכום שהלקוח משלם, "ללא עלות" או "חינם".
  אסור לפי כללי הפרסומת של לשכת עורכי הדין.
- אסור להבטיח תוצאה, ואסור להאשים מעסיקים בגניבה.
- אסור להמציא מספרים. מותר להשתמש רק במספרים שאוהד נתן לך בנושא. אם
  צריך מספר שאין לך, כתוב אותו כסוגריים מרובעים למילוי, למשל
  [בסיס הפנסיה], ואל תכתוב מספר שנראה אמיתי. אותו כלל לאחוזים.

מילות המפתח היחידות שהבוט באינסטגרם מכיר הן "תלוש" ו"פנסיה". אסור
להמציא מילת מפתח אחרת: מי שיגיב במילה שלא קיימת יקבל שתיקה. אם הנושא
לא מתאים לאף אחת מהן, אל תבקש תגובה בכלל.`;

const REEL_SYSTEM = `${VOICE}

אתה כותב עכשיו תסריט לריל.

הפורמט שמנצח אצלו בפועל, וזו ברירת המחדל: תלוש שכר על המסך כרקע קבוע
לאורך כל הסרטון, עם הדגשות זהב על המספרים. הריל הזה הביא לו 5,600
צפיות והרבה פניות.

- ההוק הוא שלוש השניות הראשונות ומכריע הכל. שלושת הכללים: לחשוף משהו
  מיד, לחשוף מהר, ולהציג סיכון מול תגמול.
- אורך: בנתונים שלו האורך לא מנבא הצלחה, ויש לו שוברי קופות של 50
  ו-60 שניות. תכוון ל-20 עד 45 שניות, ואל תקצר רעיון טוב בכוח.
- כל פעימה היא טווח שניות, מה נאמר בקול, ומה רואים על המסך.
- הכיתוב לאינסטגרם יכול לבקש תגובה במילת מפתח. בטיקטוק אין אוטומציה
  של הודעה פרטית ולכן שם מפנים לקישור בביו בלבד.

החזר דרך הכלי submit_reel_draft.`;

const STORY_SYSTEM = `${VOICE}

אתה כותב עכשיו רצף סטוריז ליום אחד.

סטורי הוא לא ריל קצר. הכללים שונים לגמרי:
- צופים בו שנייה או שתיים, הרבה פעמים בלי קול. הטקסט על המסך הוא
  העיקר, והוא חייב להיות קצר מאוד. עד עשר מילים במסגרת, בשורות של עד
  ארבע מילים.
- הוא אישי ולא מופק. צילום מהטלפון, לא סטודיו. זה הערוץ שבו אוהד
  נראה אנושי ולא ממותג.
- רצף של שלוש עד חמש מסגרות, עם קשת: מסגרת שעוצרת את הגלילה, מסגרת
  או שתיים שנותנות את התוכן, ומסגרת אחרונה עם קריאה לפעולה.
- לכל מסגרת יש סטיקר: none, poll (סקר עם שתי אפשרויות), question
  (שאלה פתוחה), link (קישור), quiz.
- סקר או שאלה במסגרת הראשונה או השנייה מעלים דרמטית את המשך הצפייה,
  כי הם דורשים נגיעה במסך.

הכי חשוב: כשמישהו **מגיב** לסטורי, נפתח חלון של 24 שעות שבו הבוט
יכול לשלוח לו הודעה פרטית. לכן קריאה לפעולה שמבקשת תגובה שווה יותר
מקישור. במסגרת האחרונה תבחר: או link לקישור המדריך, או reply שמבקש
לכתוב מילת מפתח קיימת.

החזר דרך הכלי submit_story_draft.`;

const WEEK_SYSTEM = `${VOICE}

אתה בונה תוכנית תוכן לשבוע אחד.

אוהד מצלם הכל בישיבה אחת, ולכן שני הרילים של השבוע צריכים להיות ניתנים
לצילום ברצף, באותה חולצה ובאותו רקע. אל תציע רעיון שדורש יציאה למקום
אחר.

העומס השבועי הנכון עבורו:
- שני רילים. יוצאים גם לאינסטגרם וגם לטיקטוק.
- קרוסלה אחת. אינסטגרם בלבד.
- שלושה רצפי סטוריז. אינסטגרם בלבד. זה הערוץ שהוא הכי מזניח והוא הכי
  זול לייצור.

ההבדל בין הפלטפורמות, וזה קריטי:
- באינסטגרם יש בוט שמגיב לתגובות ושולח מדריך בהודעה פרטית, ולכן
  הקריאה לפעולה שם היא מילת מפתח.
- בטיקטוק אין אוטומציה כזאת בכלל. שם הקריאה לפעולה היא תמיד הקישור
  בביו, ואסור להבטיח הודעה פרטית.

מה שהוכח בנתונים שלו עצמו, נמדד 18/09/2026:

בטיקטוק השיאים שלו הם "השכר המבוטח" (166,000 צפיות) ו"הבוס קורא לזה
שכר גלובלי, בית הדין קורא לזה לא חוקי" (111,000). השני הוא **תבנית
ניגוד** בין מה שהמעסיק קורא לדבר לבין מה שהחוק קורא לו, וזו התבנית
הכי חזקה שלו. תשתמש בה.

באינסטגרם הפוסט היחיד שייצר התנהגות אמיתית הוא **סדרה ממוספרת**:
"פרק 1 בסדרה: איך לקרוא את תלוש השכר שלכם" עשה 54 שמירות מול ממוצע
של 4. פי 13. לכן לפחות פריט אחד בשבוע צריך להיות פרק בסדרה ממוספרת.

נושאים שהוכחו בעברית אצל מתחרים, מיליון צפיות ומעלה בטיקטוק: שימוע
לפני פיטורים, ההבדל בין התפטרות לפיטורים, מלכודת השעות הנוספות,
בונוסים ודמי אבטלה, ויחסי מעביד ועובד סביב המשכורת.

הזווית תמיד שלו: מה שרואים בתלוש עצמו, שורה מול שורה.

הערה על אורך: בנתונים שלו האורך לא מנבא הצלחה. יש שוברי קופות של 50
ו-60 שניות. אל תקצר רעיון טוב רק כדי לעמוד ביעד שניות.

לכל פריט תן נושא ממוקד והוק אחד. אל תכתוב תסריט מלא, זה יקרה בשלב הבא.

החזר דרך הכלי submit_week_plan.`;

const WEEK_TOOL: Anthropic.Tool = {
  name: "submit_week_plan",
  description: "מוסר תוכנית תוכן לשבוע",
  input_schema: {
    type: "object",
    properties: {
      theme: { type: "string", description: "החוט המקשר של השבוע, משפט אחד" },
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            format: { type: "string", enum: ["reel", "carousel", "story"] },
            platforms: {
              type: "array",
              items: { type: "string", enum: ["instagram", "tiktok"] },
            },
            day: {
              type: "string",
              enum: ["ראשון", "שני", "שלישי", "רביעי", "חמישי"],
            },
            topic: { type: "string", description: "הנושא הממוקד" },
            hook: { type: "string", description: "ההוק המוצע" },
            why: { type: "string", description: "למה זה אמור לעבוד, משפט אחד" },
          },
          required: ["format", "platforms", "day", "topic", "hook", "why"],
        },
      },
    },
    required: ["theme", "items"],
  },
};

const CAROUSEL_SYSTEM = `${VOICE}

אתה כותב עכשיו קרוסלה לאינסטגרם.

- שקופית ראשונה היא ההוק ומכריעה אם גוללים בכלל.
- שקופיות תוכן: משפט אחד, עד שתים עשרה מילים. קוראים אותן בגלילה
  מהירה, והשקופית מרונדרת לתמונה, אז טקסט ארוך נדחס ונהיה קטן.
- שש עד תשע שקופיות בסך הכל, כולל ההוק והקריאה לפעולה.
- השקופית האחרונה היא הקריאה לפעולה.
- קרוסלה מצליחה נמדדת בשמירות, לא בלייקים. תן לצופה סיבה לשמור: רשימה
  לבדיקה, סדר פעולות, מספרים לזכור.

אסור להשאיר מציין מקום בסוגריים מרובעים, למשל [שיעור ההפקדה]. השקופית
מרונדרת לתמונה כמו שהיא, והסוגריים נצרבים לתוכה. אם אינך בטוח במספר,
נסח את המשפט בלי המספר.

החזר דרך הכלי submit_carousel_draft.`;

const CAROUSEL_TOOL: Anthropic.Tool = {
  name: "submit_carousel_draft",
  description: "מוסר את הקרוסלה המוגמרת",
  input_schema: {
    type: "object",
    properties: {
      slides: {
        type: "array",
        description: "שש עד תשע שקופיות",
        items: {
          type: "object",
          properties: {
            kind: { type: "string", enum: ["hook", "body", "cta"] },
            text: { type: "string" },
          },
          required: ["kind", "text"],
        },
      },
      caption: { type: "string", description: "הכיתוב לפוסט באינסטגרם" },
    },
    required: ["slides", "caption"],
  },
};

const REEL_TOOL: Anthropic.Tool = {
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

const STORY_TOOL: Anthropic.Tool = {
  name: "submit_story_draft",
  description: "מוסר את רצף הסטוריז המוגמר",
  input_schema: {
    type: "object",
    properties: {
      frames: {
        type: "array",
        description: "שלוש עד חמש מסגרות",
        items: {
          type: "object",
          properties: {
            text: { type: "string", description: "הטקסט על המסך, קצר מאוד" },
            visual: { type: "string", description: "מה מצלמים או מה רואים" },
            sticker: {
              type: "string",
              enum: ["none", "poll", "question", "link", "quiz"],
            },
            sticker_config: {
              type: "string",
              description: "תוכן הסטיקר, למשל שתי אפשרויות הסקר או נוסח השאלה",
            },
          },
          required: ["text", "visual", "sticker", "sticker_config"],
        },
      },
      cta_kind: { type: "string", enum: ["link", "reply"] },
      trigger_keyword: {
        type: "string",
        description: "מילת המפתח לתגובה, רק אם cta_kind הוא reply. אחרת ריק",
      },
      shooting_notes: { type: "string", description: "מה צריך כדי לצלם את הרצף" },
    },
    required: ["frames", "cta_kind", "trigger_keyword", "shooting_notes"],
  },
};

export async function POST(request: NextRequest) {
  try {
    const { topic, angle, kind = "reel", revision_note, current } =
      (await request.json()) as {
        topic?: string;
        angle?: string;
        kind?: "reel" | "story" | "carousel" | "week";
        /** מה אוהד ביקש לשנות בגרסה הקיימת, בעברית חופשית */
        revision_note?: string;
        /** הטיוטה הקיימת, כדי שהתיקון ישמור על מה שכבר טוב */
        current?: Record<string, unknown>;
      };

    /**
     * תוכנית שבועית לא צריכה נושא, היא מציעה את הנושאים בעצמה,
     * ותיקון לפי הערה לא צריך נושא כי הטיוטה הקיימת כבר בידיים.
     */
    if (kind !== "week" && !topic?.trim() && !revision_note?.trim()) {
      return NextResponse.json(
        { error: "חסר נושא" },
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

    const BY_KIND = {
      reel: { system: REEL_SYSTEM, tool: REEL_TOOL, ask: "כתוב תסריט ריל שלם לפי הכללים. שתי חלופות להוק, ולא יותר." },
      story: { system: STORY_SYSTEM, tool: STORY_TOOL, ask: "בנה רצף סטוריז ליום אחד לפי הכללים." },
      carousel: { system: CAROUSEL_SYSTEM, tool: CAROUSEL_TOOL, ask: "כתוב קרוסלה שלמה לפי הכללים." },
      week: { system: WEEK_SYSTEM, tool: WEEK_TOOL, ask: "בנה תוכנית תוכן לשבוע הקרוב לפי הכללים." },
    } as const;

    const cfg = BY_KIND[kind] || BY_KIND.reel;

    /**
     * תיקון לפי הערה, במקום כתיבה מאפס.
     *
     * כשאוהד כותב "השקף השלישי משעמם, תחליף אותו" הוא לא מבקש
     * תוכן חדש. הוא מבקש את אותו תוכן עם תיקון אחד. לכן הטיוטה
     * הקיימת נמסרת למודל, והבקשה המפורשת היא לשנות רק את מה
     * שההערה נוגעת בו.
     */
    const isRevision = Boolean(revision_note?.trim() && current);
    const NL = "\n";

    const userPrompt = isRevision
      ? [
          topic?.trim() ? `הנושא: ${topic.trim()}` : "",
          "זו הטיוטה הקיימת:",
          JSON.stringify(current, null, 1),
          `ההערה של אוהד: ${revision_note!.trim()}`,
          "תקן את הטיוטה לפי ההערה בלבד. כל מה שההערה לא נוגעת בו",
          "נשאר בדיוק כמו שהוא, מילה במילה. החזר את הטיוטה המלאה",
          "אחרי התיקון, לא רק את החלק ששונה.",
        ].filter(Boolean).join(NL)
      : [
          topic?.trim() ? `הנושא: ${topic.trim()}` : "",
          angle?.trim() ? `הזווית שאוהד רוצה: ${angle.trim()}` : "",
          cfg.ask,
        ].filter(Boolean).join(NL);

    const response = await anthropic.messages.create({
      model: "claude-opus-5",
      max_tokens: 4000,
      system: cfg.system,
      tools: [cfg.tool],
      tool_choice: { type: "tool", name: cfg.tool.name },
      messages: [{ role: "user", content: userPrompt }],
    });

    const toolUse = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );
    if (!toolUse) throw new Error("המודל לא החזיר טיוטה");

    const draft = toolUse.input as Record<string, unknown>;

    const REQUIRED_ARRAY = { reel: "beats", story: "frames", carousel: "slides", week: "items" } as const;
    const key = REQUIRED_ARRAY[kind] || "beats";
    const arr = draft[key];
    if (!Array.isArray(arr) || arr.length === 0) throw new Error("הטיוטה חזרה חסרה");

    return NextResponse.json({ draft }, { headers: CORS_HEADERS });
  } catch (error) {
    const message = error instanceof Error ? error.message : "שגיאה לא ידועה";
    console.error("[content-draft]", message);
    return NextResponse.json(
      { error: `יצירת הטיוטה נכשלה: ${message}` },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
