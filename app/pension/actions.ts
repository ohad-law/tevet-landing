"use server";

/**
 * Server Action של מדריך בדיקת הפקדות הפנסיה, לא route חדש ב-api/.
 * אותו טעם כמו app/tlush/actions.ts: פונקציה אחת בתוך הדף, לא עוד
 * serverless function נפרדת.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { normalizePhone } from "@/lib/base44";
import { sendWhatsApp } from "@/lib/whatsapp";

const OHAD_WA = "972542274497";

export async function submitPensionLead(
  fullName: string,
  phone: string,
  foundGap: string
): Promise<{ ok: boolean; error?: string }> {
  const phoneNorm = normalizePhone(phone.trim());
  if (!phoneNorm || phoneNorm.length < 11) {
    return { ok: false, error: "מספר טלפון לא תקין" };
  }

  const name = fullName.trim() || "לא צוין";
  const now = new Date().toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" });

  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from("leads").insert({
      full_name: name,
      phone: phoneNorm,
      source: "pension_guide",
      notes: `מדריך בדיקת פנסיה. ${foundGap}`,
      product_line: "דיני עבודה",
      lead_score: foundGap.includes("כן") ? 80 : 50,
      status: "חדש",
      is_viewed: false,
      followup_stage: 0,
      followup_next_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
    if (error) {
      console.error("[pension] Supabase insert failed:", error);
      return { ok: false, error: "שגיאה בשמירה, נסו שוב" };
    }
  } catch (e) {
    console.error("[pension] Supabase insert exception:", e);
    return { ok: false, error: "שגיאה בשמירה, נסו שוב" };
  }

  try {
    await sendWhatsApp(
      OHAD_WA,
      [
        "🟡 *ליד חדש ממדריך הפנסיה*",
        "",
        `👤 שם: ${name}`,
        `📞 טלפון: ${phone.trim()}`,
        `🔍 ${foundGap}`,
        `🕐 ${now}`,
      ].join("\n")
    );
  } catch (e) {
    console.error("[pension] WhatsApp notify failed:", e);
  }

  return { ok: true };
}
