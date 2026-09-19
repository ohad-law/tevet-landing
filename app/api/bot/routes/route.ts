import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

/**
 * מוסר לבוט באינסטגרם את מסלולי מילות המפתח.
 *
 * למה דרך נקודת קצה ולא חיבור ישיר למסד: כדי לא להניח את מפתח
 * השירות על שרת הבוט. המפתח הזה פותח את כל בסיס הנתונים, וכבר
 * הייתה דליפה אחת. כאן הוא נשאר בצד השרת בלבד, והבוט מקבל רק
 * את מה שהוא צריך, מאחורי סוד משותף.
 *
 * מקור האמת הוא system_settings.bot_routes, אותה שורה שמסך
 * השליטה ב-CRM עורך.
 */

export async function GET(request: NextRequest) {
  const secret = process.env.BOT_ROUTES_SECRET;

  /**
   * בלי סוד מוגדר בשרת הנתיב סגור לגמרי. עדיף שהבוט ייפול חזרה
   * לקובץ המקומי מאשר שנוסחי ההודעות יהיו פתוחים לכל העולם.
   */
  if (!secret) {
    return NextResponse.json({ error: "הנתיב לא מוגדר" }, { status: 503 });
  }
  if (request.headers.get("x-bot-secret") !== secret) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "bot_routes")
      .maybeSingle();

    if (error) throw new Error(error.message);

    const raw = data?.setting_value;
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    const routes = Array.isArray(parsed?.routes) ? parsed.routes : [];

    if (!routes.length) {
      return NextResponse.json({ error: "אין מסלולים שמורים" }, { status: 404 });
    }

    return NextResponse.json(
      { routes },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
