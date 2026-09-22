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
- אסור להמציא מספרים. מותר להשתמש רק במספרים שאוהד נתן לך בנושא.
- אם צריך מספר שאין לך, נסח את המשפט בלי המספר. אסור בהחלט להשאיר
  מציין מקום בסוגריים מרובעים כמו [שיעור ההפקדה]: הטקסט הזה נצרב
  לתוך התמונה המעוצבת ועולה לאוויר כמו שהוא. "ההפרשות חושבו על בסיס
  נמוך מהשכר האמיתי" עדיף על "[אחוז] מהשכר". אותו כלל לאחוזים.

מילות המפתח היחידות שהבוט באינסטגרם מכיר הן "תלוש" ו"פנסיה". אסור
להמציא מילת מפתח אחרת: מי שיגיב במילה שלא קיימת יקבל שתיקה. אם הנושא
לא מתאים לאף אחת מהן, אל תבקש תגובה בכלל.

🚨 מבנה הכיתוב מתחת לפוסט, כלל מחייב:
- **עד ארבע מילים בשורה.** לא חמש. השורה נגמרת ויורדים שורה.
- **עד ארבע שורות בפסקה**, ואז שורה ריקה.
- כותבים ישר ככה, לא כותבים פסקה ואחר כך שוברים אותה. המבנה
  הקצר משנה את בחירת המילים עצמן, וזה כל העניין.
- כל שורה עומדת בפני עצמה. לא מפצלים משפט באמצע רק כדי לעמוד
  במכסה. אם משפט לא נכנס בארבע מילים, מנסחים אותו קצר יותר.

הכיתוב נקרא בטלפון תוך כדי גלילה. שורה ארוכה נקראת כפסקה
ומדלגים עליה. שורה קצרה נקראת כמכה.

דוגמה לכיתוב תקין:

רוב העובדים בודקים מספר אחד.
כמה נכנס לחשבון.

אבל התלוש הוא המסמך
שכולם מסתכלים עליו.
ביטוח לאומי, הבנק,
וקרן הפנסיה.

טעות בו לא נשארת
בתוך התלוש.`;

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

// ══════════ מנוע השכפול ══════════

/**
 * פוסט הליבה.
 *
 * זה הצומת של כל השיטה: מסר אחד נכתב פעם אחת כמו שצריך, וכל
 * שמונת הפורמטים נגזרים ממנו. בלי הצומת הזה כל פורמט ממציא
 * מחדש את המסר, והפיד נשמע כמו שמונה אנשים שונים.
 */
const CORE_SYSTEM = `${VOICE}

אתה מזקק עכשיו מסר גולמי לפוסט ליבה.

הקלט יכול להיות תמלול של הקלטה, פסקה שאוהד כתב, או רעיון בשורה
אחת. התפקיד שלך הוא למצוא בתוכו את הדבר האחד שכדאי להגיד, ולנסח
אותו בצורה שאפשר לגזור ממנה כל פורמט.

- ההוק הוא המשפט שעוצר גלילה. קונקרטי, לא כללי.
- הגוף הוא ההסבר: מה קורה בפועל, ולמה זה משנה כסף לעובד.
- נקודות המפתח הן העובדות שכל פורמט יכול לשאוב מהן. שלוש עד חמש.
- מילת המפתח לקריאה לפעולה חייבת להיות אחת מאלה: תלוש, פנסיה.
  אלה המילים היחידות שהבוט באינסטגרם יודע לענות להן.

החזר דרך הכלי submit_core_post.`;

const CORE_TOOL: Anthropic.Tool = {
  name: "submit_core_post",
  description: "מוסר את פוסט הליבה",
  input_schema: {
    type: "object",
    properties: {
      topic: { type: "string", description: "הנושא בשלוש עד שש מילים" },
      hook: { type: "string", description: "המשפט שעוצר גלילה" },
      body: { type: "string", description: "ההסבר המלא, שתיים עד ארבע פסקאות" },
      key_points: {
        type: "array",
        description: "שלוש עד חמש עובדות שאפשר לגזור מהן פורמטים",
        items: { type: "string" },
      },
      cta_keyword: { type: "string", enum: ["תלוש", "פנסיה"] },
      offer: { type: "string", description: "מה מקבל מי שמגיב" },
    },
    required: ["topic", "hook", "body", "key_points", "cta_keyword", "offer"],
  },
};

/**
 * הפורמטים הקצרים, כולם בקריאה אחת.
 *
 * כל אחד מהם הוא מסך אחד או שניים, ולכן אין סיבה לחמש קריאות
 * נפרדות. השדות כאן חייבים להתאים בדיוק למה שמנוע העיצוב קורא,
 * אחרת נוצרת תמונה עם המילה undefined עליה. זה כבר קרה.
 */
const SHORTS_SYSTEM = `${VOICE}

אתה גוזר עכשיו חמישה נכסים קצרים מאותו פוסט ליבה. כל אחד עומד
בפני עצמו, וכולם אומרים את אותו דבר בדרך אחרת.

- תמונה סטטית: משפט אחד חזק, עד שתים עשרה מילים, ומעליו קיקר
  של שתיים עד שלוש מילים.
- מם: שני חצאים בניגוד. החצי העליון הוא מה שהעובד רואה או חושב,
  והתחתון הוא מה שקורה באמת. לכל חצי תווית קצרה של שתיים עד שלוש
  מילים וטקסט של עד שמונה מילים.
- ציטוט: משפט אחד שאפשר לצטט, בגוף ראשון, כפי שאוהד היה אומר
  אותו ללקוח.
- בי-רול: הוק למסך וקריאה לפעולה קצרה.
- בי-רול עם טקסט: שלוש עד חמש שורות קצרות שנצרבות על הווידאו,
  שורה אחת לכל רעיון, וקריאה לפעולה.

אף אחד מהם לא מזכיר מחיר, שכר טרחה או המילה חינם.

החזר דרך הכלי submit_short_assets.`;

/**
 * סכימה שטוחה בכוונה.
 *
 * הגרסה הראשונה קיננה אובייקט לכל פורמט, ואחד השדות נקרא
 * static. השילוב הזה גרם למודל להחזיר פלט פגום שדלף לתוכו
 * תחביר פנימי. שדות שטוחים עם שמות מפורשים יציבים הרבה יותר,
 * וההרכבה למבנה שהתבניות מצפות לו נעשית כאן בשרת.
 */
const SHORTS_TOOL: Anthropic.Tool = {
  name: "submit_short_assets",
  description: "מוסר את הנכסים הקצרים",
  input_schema: {
    type: "object",
    properties: {
      image_kicker: { type: "string", description: "קיקר לתמונה, שתיים עד שלוש מילים" },
      image_text: { type: "string", description: "משפט התמונה, עד שתים עשרה מילים" },

      meme_top_label: { type: "string", description: "תווית החצי העליון, מה שרואים" },
      meme_top_text: { type: "string", description: "עד שמונה מילים" },
      meme_bottom_label: { type: "string", description: "תווית החצי התחתון, מה שבאמת" },
      meme_bottom_text: { type: "string", description: "עד שמונה מילים" },

      quote_text: { type: "string", description: "משפט אחד בגוף ראשון, כפי שאוהד אומר ללקוח" },

      broll_hook: { type: "string", description: "ההוק שנצרב על הווידאו" },
      broll_cta: { type: "string", description: "קריאה לפעולה קצרה" },

      broll_lines: {
        type: "array",
        description: "שלוש עד חמש שורות קצרות לצריבה על הווידאו",
        items: { type: "string" },
      },
      broll_text_cta: { type: "string", description: "קריאה לפעולה לגרסת הטקסט" },
    },
    required: [
      "image_kicker", "image_text",
      "meme_top_label", "meme_top_text", "meme_bottom_label", "meme_bottom_text",
      "quote_text", "broll_hook", "broll_cta", "broll_lines", "broll_text_cta",
    ],
  },
};

/**
 * מרכיב את השדות השטוחים למבנה שכל תבנית עיצוב קוראת בפועל.
 * זה המקום היחיד שמכיר את שני הצדדים, ולכן כאן מתוחזק החוזה.
 */
function assembleShorts(flat: Record<string, unknown>) {
  return {
    static: { kicker: flat.image_kicker, text: flat.image_text },
    meme: {
      top: { label: flat.meme_top_label, text: flat.meme_top_text },
      bottom: { label: flat.meme_bottom_label, text: flat.meme_bottom_text },
    },
    tweet_reel: { text: flat.quote_text, author: "עו\"ד אוהד טבת" },
    broll: { hook: flat.broll_hook, cta: flat.broll_cta },
    broll_text: { lines: flat.broll_lines, cta: flat.broll_text_cta },
  };
}

// ══════════ מדריכים ══════════

/**
 * המדריך הוא מה שהבוט שולח, ולכן הוא הרגע שבו עוקב הופך לליד.
 *
 * המבנה נלקח מהמדריך שכבר עובד: לכל רכיב אומרים מה לחפש בתלוש,
 * מה מעיד שמשהו לא בסדר, ומה העובדה עם המקור שלה.
 *
 * 🚨 מספרים ותעריפים לא נכתבים מתוך ידע המודל. זה דף פומבי של
 * עורך דין, ותעריף ישן שם הוא חשיפה מקצועית ולא רק טעות. כל
 * מספר שנדרש נרשם בנפרד ברשימת האימות, ואוהד מאמת אותו לפני
 * שהמדריך עולה.
 */
const GUIDE_SYSTEM = `${VOICE}

אתה כותב עכשיו מדריך שנשלח בהודעה פרטית למי שהגיב בתגובות.

המדריך הזה הוא הרגע שבו עוקב הופך לליד, ולכן הוא חייב לתת ערך
אמיתי שאפשר לפעול לפיו תוך חמש דקות, ולא להיות פרסומת.

המבנה שעובד, רכיב אחרי רכיב:
- **מה לחפש**: איפה בדיוק בתלוש או במסמך, בשפה של מי שלא קרא
  תלוש מימיו. לא מונחים מקצועיים.
- **מה מעיד על בעיה**: הסימן הקונקרטי שמשהו חסר או שגוי.
- **העובדה**: הכלל המשפטי, בניסוח שאפשר לסמוך עליו.
- **המקור**: שם החוק, צו ההרחבה או הפסיקה. שם מלא, לא קיצור.

ארבעה עד שישה רכיבים. לא יותר, כי מדריך ארוך לא נקרא.

🚨 אסור לכתוב תעריף, אחוז או סכום מתוך זיכרון. אם רכיב דורש
מספר, נסח את העובדה בלי המספר, ורשום את המספר הנדרש ברשימת
needs_verification עם שם המקור שצריך לבדוק מולו. אוהד מאמת ואז
משלים. עדיף מדריך בלי מספר מאשר מדריך עם מספר ישן.

החזר דרך הכלי submit_guide.`;

const GUIDE_TOOL: Anthropic.Tool = {
  name: "submit_guide",
  description: "מוסר את המדריך המוגמר",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "שם המדריך, עד שמונה מילים" },
      slug: {
        type: "string",
        description:
          "מזהה לכתובת באנגלית בלבד, אותיות קטנות ומקפים, שתיים עד ארבע מילים. " +
          "כתובת בעברית נשברת בשיתוף בוואטסאפ ובאינסטגרם. לדוגמה pension-vs-payslip",
      },
      subtitle: { type: "string", description: "מה מקבלים ממנו, משפט אחד" },
      intro: { type: "string", description: "פסקה אחת שמסבירה למה זה חשוב" },
      items: {
        type: "array",
        description: "ארבעה עד שישה רכיבים",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            look: { type: "string", description: "מה לחפש ואיפה" },
            flag: { type: "string", description: "מה מעיד על בעיה" },
            fact: { type: "string", description: "הכלל המשפטי, בלי מספרים שלא אומתו" },
            source: { type: "string", description: "שם החוק או צו ההרחבה, מלא" },
          },
          required: ["title", "look", "flag", "fact", "source"],
        },
      },
      needs_verification: {
        type: "array",
        description: "מספרים ותעריפים שאוהד צריך לאמת לפני פרסום",
        items: {
          type: "object",
          properties: {
            what: { type: "string", description: "איזה מספר חסר" },
            where: { type: "string", description: "באיזה רכיב" },
            source: { type: "string", description: "מול איזה מקור לאמת" },
          },
          required: ["what", "where", "source"],
        },
      },
      cta_keyword: { type: "string", enum: ["תלוש", "פנסיה"] },
      cta_text: { type: "string", description: "המשפט שמזמין לפנות, בלי אזכור מחיר" },
    },
    required: ["title", "slug", "subtitle", "intro", "items", "needs_verification", "cta_keyword", "cta_text"],
  },
};

/**
 * הצעות למדריכים חדשים.
 *
 * ההצעות נשענות על התוכן שאוהד כבר מפרסם, כי מדריך שממשיך נושא
 * שהקהל כבר הגיב אליו ממיר הרבה יותר טוב ממדריך על נושא חדש
 * שאיש לא ביקש.
 */
const GUIDE_IDEAS_SYSTEM = `${VOICE}

אתה מציע עכשיו מדריכים חדשים שאוהד יכול לשלוח בהודעה פרטית.

המדריך הוא מה שהופך עוקב לליד, ולכן ההצעה נמדדת בשאלה אחת: האם
מי שיקרא אותו יגלה שמגיע לו כסף, ויבין שהוא צריך עורך דין כדי
לקבל אותו.

הקלט הוא הנושאים שאוהד כבר מפרסם עליהם. הצעה טובה ממשיכה נושא
שהקהל כבר מגיב אליו, ולא פותחת נושא חדש שאיש לא ביקש.

לכל הצעה:
- שם המדריך
- למי הוא מדבר, סוג העובד או המצב
- מה הוא מגלה לקורא, בשורה אחת
- למה הוא מוביל לשיחת מכירה, ולא רק לידע

ארבע הצעות. שונות זו מזו, לא וריאציות על אותו נושא.

החזר דרך הכלי submit_guide_ideas.`;

const GUIDE_IDEAS_TOOL: Anthropic.Tool = {
  name: "submit_guide_ideas",
  description: "מוסר הצעות למדריכים",
  input_schema: {
    type: "object",
    properties: {
      ideas: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            audience: { type: "string" },
            reveals: { type: "string" },
            why_sells: { type: "string" },
          },
          required: ["title", "audience", "reveals", "why_sells"],
        },
      },
    },
    required: ["ideas"],
  },
};

export async function POST(request: NextRequest) {
  try {
    const { topic, angle, kind = "reel", revision_note, current } =
      (await request.json()) as {
        topic?: string;
        angle?: string;
        kind?: "reel" | "story" | "carousel" | "week" | "core" | "shorts"
          | "guide" | "guide_ideas";
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
      core: { system: CORE_SYSTEM, tool: CORE_TOOL, ask: "זקק את המסר הזה לפוסט ליבה." },
      shorts: { system: SHORTS_SYSTEM, tool: SHORTS_TOOL, ask: "גזור את חמשת הנכסים הקצרים מפוסט הליבה." },
      guide: { system: GUIDE_SYSTEM, tool: GUIDE_TOOL, ask: "כתוב את המדריך לפי הכללים." },
      guide_ideas: { system: GUIDE_IDEAS_SYSTEM, tool: GUIDE_IDEAS_TOOL, ask: "הצע ארבעה מדריכים חדשים." },
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

    const raw = toolUse.input as Record<string, unknown>;
    const draft = kind === "shorts" ? assembleShorts(raw) as Record<string, unknown> : raw;

    /**
     * core ו-shorts מחזירים אובייקט ולא מערך, ולכן הבדיקה
     * הזאת לא חלה עליהם.
     */
    const REQUIRED_ARRAY: Record<string, string> = {
      reel: "beats", story: "frames", carousel: "slides", week: "items",
    };
    const key = REQUIRED_ARRAY[kind];
    if (key) {
      const arr = draft[key];
      if (!Array.isArray(arr) || arr.length === 0) throw new Error("הטיוטה חזרה חסרה");
    }

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
