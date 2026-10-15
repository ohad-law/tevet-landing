"use server";

/**
 * Server Action של עמוד המדריך /nevo, לא route חדש ב-api/.
 * אותו טעם כמו app/stack/actions.ts: פונקציה אחת בתוך הדף, כדי לא
 * לאכול עוד serverless function מתוך התקרה של 12.
 *
 * הליד נכנס עם product_line "AI ואוטומציה" ו-source "nevo_guide",
 * כך שהוא יושב בלשונית של קו עורכי הדין ב-CRM ולא מתערבב עם דיני
 * עבודה. בלי פולואפ אוטומטי: אלה לא לידים משפטיים.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { normalizePhone } from "@/lib/base44";
import { sendWhatsApp } from "@/lib/whatsapp";

const OHAD_WA = "972542274497";
const PRODUCT_LINE = "AI ואוטומציה";

export async function submitNevoLead(
  fullName: string,
  phone: string,
  role: string,
  topic: string
): Promise<{ ok: boolean; error?: string }> {
  const phoneNorm = normalizePhone(phone.trim());
  if (!phoneNorm || phoneNorm.length < 11) {
    return { ok: false, error: "מספר טלפון לא תקין" };
  }

  const name = fullName.trim() || "לא צוין";
  const what = topic.trim().slice(0, 500);
  const now = new Date().toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" });

  // עורך דין עצמאי או בעלים של משרד הוא הקונה הפוטנציאלי של הקמה.
  // מתמחה הוא קהל תוכן מצוין שלא קונה היום.
  const isBuyer =
    role.includes("עצמאי") || role.includes("שותף") || role.includes("בעלים");

  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from("leads").insert({
      full_name: name,
      phone: phoneNorm,
      source: "nevo_guide",
      notes: `מדריך נבו. תפקיד: ${role}. מה לבדוק ראשון: ${what}`,
      product_line: PRODUCT_LINE,
      lead_score: isBuyer ? 70 : 40,
      status: "חדש",
      is_viewed: false,
      // רשימות ה-CRM ממוינות לפי created_at, וליד בלי הערך הזה פשוט
      // לא מופיע. נכשל בשקט, ולכן נשלח במפורש.
      created_at: new Date().toISOString(),
      followup_stage: 0,
      followup_next_at: null,
    });
    if (error) {
      console.error("[nevo] Supabase insert failed:", error);
      return { ok: false, error: "שגיאה בשמירה, נסו שוב" };
    }
  } catch (e) {
    console.error("[nevo] Supabase insert exception:", e);
    return { ok: false, error: "שגיאה בשמירה, נסו שוב" };
  }

  try {
    await sendWhatsApp(
      OHAD_WA,
      [
        "⚖️ *פנייה חדשה ממדריך נבו*",
        "",
        `👤 שם: ${name}`,
        `📞 טלפון: ${phone.trim()}`,
        `💼 תפקיד: ${role}`,
        `🔎 מה לבדוק ראשון: ${what}`,
        `🕐 ${now}`,
      ].join("\n")
    );
  } catch (e) {
    console.error("[nevo] WhatsApp notify failed:", e);
  }

  return { ok: true };
}
