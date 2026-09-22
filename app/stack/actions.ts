"use server";

/**
 * Server Action של עמוד הסטאק, לא route חדש ב-api/.
 * אותו טעם כמו app/pension/actions.ts: פונקציה אחת בתוך הדף, כדי לא
 * לאכול עוד serverless function מתוך התקרה של 12.
 *
 * החשוב כאן: product_line נפרד. זה הקהל השני של האינסטגרם, עורכי דין
 * ובעלי עסקים, והם לא אמורים להתערבב עם לידים של דיני עבודה במסך
 * המכירות. הפנייה היא על כלים ואוטומציה, לא בקשה לייעוץ משפטי.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { normalizePhone } from "@/lib/base44";
import { sendWhatsApp } from "@/lib/whatsapp";

const OHAD_WA = "972542274497";

// לא מיוצא בכוונה: קובץ "use server" מרשה לייצא רק פונקציות async,
// וייצוא של קבוע מפיל את כל המודול עם שגיאת קומפילציה.
const STACK_PRODUCT_LINE = "AI ואוטומציה";

export async function submitStackLead(
  fullName: string,
  phone: string,
  role: string,
  painPoint: string
): Promise<{ ok: boolean; error?: string }> {
  const phoneNorm = normalizePhone(phone.trim());
  if (!phoneNorm || phoneNorm.length < 11) {
    return { ok: false, error: "מספר טלפון לא תקין" };
  }

  const name = fullName.trim() || "לא צוין";
  const pain = painPoint.trim().slice(0, 500);
  const now = new Date().toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" });

  // עורך דין עצמאי או בעלים של משרד הוא הקהל של PayrollAI, ולכן ניקוד
  // גבוה יותר. מתמחה בתחילת דרך הוא קהל תוכן מצוין אבל לא קונה היום.
  const isBuyer =
    role.includes("עצמאי") || role.includes("שותף") || role.includes("בעלים");

  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from("leads").insert({
      full_name: name,
      phone: phoneNorm,
      source: "stack_guide",
      notes: `עמוד הסטאק. תפקיד: ${role}. תקיעה: ${pain}`,
      product_line: STACK_PRODUCT_LINE,
      lead_score: isBuyer ? 70 : 40,
      status: "חדש",
      is_viewed: false,
      // הרשימות ב-CRM ממוינות לפי created_at כברירת מחדל, וליד בלי
      // הערך הזה פשוט לא מופיע. נכשל בשקט, אז נשלח מפורשות.
      created_at: new Date().toISOString(),
      // בלי פולואפ אוטומטי: אלה לא לידים משפטיים, והרובוט של דיני
      // העבודה לא אמור לרדוף אחריהם עם הודעות על תלושים.
      followup_stage: 0,
      followup_next_at: null,
    });
    if (error) {
      console.error("[stack] Supabase insert failed:", error);
      return { ok: false, error: "שגיאה בשמירה, נסו שוב" };
    }
  } catch (e) {
    console.error("[stack] Supabase insert exception:", e);
    return { ok: false, error: "שגיאה בשמירה, נסו שוב" };
  }

  try {
    await sendWhatsApp(
      OHAD_WA,
      [
        "🤖 *פנייה חדשה מעמוד הסטאק*",
        "",
        `👤 שם: ${name}`,
        `📞 טלפון: ${phone.trim()}`,
        `💼 תפקיד: ${role}`,
        `🔧 תקיעה: ${pain}`,
        `🕐 ${now}`,
      ].join("\n")
    );
  } catch (e) {
    console.error("[stack] WhatsApp notify failed:", e);
  }

  return { ok: true };
}
