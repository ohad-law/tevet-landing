"use server";

/**
 * Server Action של הצ'קליסט, לא route חדש ב-api/.
 *
 * למה לא app/api/tlush/route.ts: כל קובץ route חדש הוא עוד פונקציה
 * serverless בפריסה. Server Action רץ בתוך אותה פונקציה של הדף עצמו,
 * ואין לו סיבה טכנית להיות נפרד.
 *
 * זה מיועד למי שמסמן פחות משלושה חוסרים ולכן לא רואה את כפתור
 * הוואטסאפ החם. לפני זה, אין להם שום דרך להשאיר פרט אחד.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { normalizePhone } from "@/lib/base44";
import { sendWhatsApp } from "@/lib/whatsapp";

const OHAD_WA = "972542274497";

export async function submitChecklistLead(
  fullName: string,
  phone: string,
  missingLabels: string[]
): Promise<{ ok: boolean; error?: string }> {
  const phoneNorm = normalizePhone(phone.trim());
  if (!phoneNorm || phoneNorm.length < 11) {
    return { ok: false, error: "מספר טלפון לא תקין" };
  }

  const name = fullName.trim() || "לא צוין";
  const missingText = missingLabels.length
    ? missingLabels.join(", ")
    : "לא סימן/ה רכיב ספציפי";
  const now = new Date().toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" });

  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from("leads").insert({
      full_name: name,
      phone: phoneNorm,
      source: "tlush_checklist",
      notes: `הצ'קליסט באתר (פחות מ-3 חוסרים). סימן/ה: ${missingText}`,
      product_line: "דיני עבודה",
      lead_score: missingLabels.length >= 2 ? 70 : 50,
      status: "חדש",
      is_viewed: false,
      followup_stage: 0,
      followup_next_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
    if (error) {
      console.error("[tlush] Supabase insert failed:", error);
      return { ok: false, error: "שגיאה בשמירה, נסו שוב" };
    }
  } catch (e) {
    console.error("[tlush] Supabase insert exception:", e);
    return { ok: false, error: "שגיאה בשמירה, נסו שוב" };
  }

  try {
    await sendWhatsApp(
      OHAD_WA,
      [
        "🟡 *ליד חדש מהצ'קליסט (תלוש)*",
        "",
        `👤 שם: ${name}`,
        `📞 טלפון: ${phone.trim()}`,
        `☑️ סימן/ה: ${missingText}`,
        `🕐 ${now}`,
      ].join("\n")
    );
  } catch (e) {
    // הליד כבר נשמר. כשל בהתראה לא צריך להיראות ללקוח ככשל.
    console.error("[tlush] WhatsApp notify failed:", e);
  }

  return { ok: true };
}
