import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * מפרסם נכס תוכן מאושר לאינסטגרם.
 *
 * נקרא מ-tevet-crm שהיא אפליקציה נפרדת, ולכן CORS. הטוקן יושב
 * ב-social_tokens שנגישה ל-service role בלבד, ולכן הפרסום חייב
 * לרוץ כאן ולא בדפדפן.
 *
 * ההופעה בפועל נרשמת ב-viral_schedule, הטבלה שנבנתה בדיוק לזה:
 * שורה אחת היא הופעה אחת של נכס אחד בפלטפורמה אחת. הקישור
 * והמזהה של הפוסט נשמרים שם.
 *
 * 🚨 מניעת כפילות, הכי חשוב כאן. פעמיים בעבר קריאת פרסום חזרה
 * בפסק זמן, הפוסט בכל זאת עלה, והניסיון החוזר יצר פוסט שני.
 * שתי הגנות:
 *   1. אם כבר קיימת שורת פרסום מוצלחת לנכס, מחזירים את הקישור
 *      הקיים ולא מפרסמים שוב.
 *   2. הנכס ננעל בעדכון מותנה שמצליח רק פעם אחת. שתי לחיצות
 *      במקביל, רק אחת נכנסת.
 */

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return NextResponse.json(null, { headers: CORS_HEADERS });
}

const GRAPH = "https://graph.facebook.com/v21.0";

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status, headers: CORS_HEADERS });
}

async function graph(path: string, body: Record<string, string>) {
  const res = await fetch(`${GRAPH}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) {
    throw new Error(json?.error?.message || `הקריאה ל-${path} נכשלה`);
  }
  return json as { id: string };
}

/**
 * קונטיינר מוכן לפרסום רק אחרי שפייסבוק סיימה להוריד את התמונות.
 * פרסום מוקדם מדי נכשל, ולכן בודקים עד שהמצב הוא FINISHED.
 */
async function waitReady(containerId: string, token: string, tries = 20) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(
      `${GRAPH}/${containerId}?fields=status_code,status&access_token=${encodeURIComponent(token)}`,
    );
    const json = await res.json().catch(() => ({}));
    if (json.status_code === "FINISHED") return;
    if (json.status_code === "ERROR") throw new Error(json.status || "הכנת הפוסט נכשלה");
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error("הכנת הפוסט לקחה יותר מדי זמן");
}

export async function POST(request: NextRequest) {
  try {
    const { assetId } = (await request.json()) as { assetId?: string };
    if (!assetId) return fail("חסר מזהה נכס");

    const supabase = createServiceClient();

    /** הגנה ראשונה: כבר פורסם */
    const { data: existing } = await supabase
      .from("viral_schedule")
      .select("published_url, status")
      .eq("asset_id", assetId)
      .eq("status", "published")
      .limit(1);

    if (existing?.length) {
      return NextResponse.json(
        { alreadyPublished: true, url: existing[0].published_url },
        { headers: CORS_HEADERS },
      );
    }

    const { data: asset } = await supabase
      .from("viral_assets")
      .select("id, format, status, caption, payload, media_url, media_urls")
      .eq("id", assetId)
      .single();

    if (!asset) return fail("הנכס לא נמצא", 404);

    /*
     * 🚨 גם approved וגם scheduled. נכס מגיע ל-scheduled רק דרך
     * המתזמן הלילי, והמתזמן לוקח אך ורק נכסים מאושרים, ולכן
     * scheduled פירושו "אושר וגם שובץ".
     *
     * ב-23.9 הקרוסלה לא עלתה בגלל זה בדיוק: אוהד אישר ותזמן,
     * המתזמן הלילי סימן אותה scheduled ב-02:00, ובשבע בבוקר
     * הנתיב הזה סירב לפרסם נכס שהוא עצמו אישר.
     */
    if (!["approved", "scheduled"].includes(asset.status)) {
      return fail("אפשר לפרסם רק נכס שאושר בלוח");
    }

    const media: string[] = asset.media_urls?.length
      ? asset.media_urls
      : [asset.media_url].filter(Boolean);
    if (!media.length) return fail("אין קבצים מרונדרים לנכס הזה");

    /**
     * ריל ותמונה עולים בשני מסלולים שונים לגמרי באינסטגרם.
     * הסיומת היא מה שקובע, כי היא מה שבאמת נמצא באחסון.
     */
    const video = media.find((u) => /\.(mp4|mov)(\?|$)/i.test(u));
    const images = media.filter((u) => !/\.(mp4|mov)(\?|$)/i.test(u));

    if (!video && !images.length) return fail("אין קבצים מרונדרים לנכס הזה");
    if (!video && images.length > 10) return fail("אינסטגרם מגבילה קרוסלה לעשר תמונות");

    const payload = (asset.payload || {}) as Record<string, unknown>;
    const caption =
      (payload.caption as string) ||
      ((payload.captions as Record<string, string>)?.instagram) ||
      asset.caption ||
      "";

    const { data: tokenRow } = await supabase
      .from("social_tokens")
      .select("access_token, account_id")
      .eq("platform", "instagram")
      .single();

    if (!tokenRow?.access_token || !tokenRow.account_id) {
      return fail("אין חיבור פעיל לאינסטגרם", 409);
    }
    const token = tokenRow.access_token;
    const igId = tokenRow.account_id;

    /**
     * הגנה שנייה, הנעילה. scheduled הוא הסטטוס שאומר "בדרך לאוויר",
     * והתנאי על approved מבטיח שרק בקשה אחת תיכנס.
     */
    const { data: locked } = await supabase
      .from("viral_assets")
      .update({ status: "publishing", updated_at: new Date().toISOString() })
      .eq("id", assetId)
      .in("status", ["approved", "scheduled"])
      .select("id");

    if (!locked?.length) return fail("פרסום של הנכס הזה כבר רץ", 409);

    try {
      let creationId: string;

      if (video) {
        /*
         * ריל. אינסטגרם מורידה את הקובץ מהכתובת שלנו ומעבדת אותו,
         * ולכן ההמתנה כאן ארוכה יותר מזו של תמונה.
         */
        const c = await graph(`${igId}/media`, {
          media_type: "REELS",
          video_url: video,
          caption,
          access_token: token,
        });
        creationId = c.id;
      } else if (images.length === 1) {
        const c = await graph(`${igId}/media`, {
          image_url: images[0],
          caption,
          access_token: token,
        });
        creationId = c.id;
      } else {
        const children: string[] = [];
        for (const url of images) {
          const child = await graph(`${igId}/media`, {
            image_url: url,
            is_carousel_item: "true",
            access_token: token,
          });
          children.push(child.id);
        }
        const c = await graph(`${igId}/media`, {
          media_type: "CAROUSEL",
          children: children.join(","),
          caption,
          access_token: token,
        });
        creationId = c.id;
      }

      await waitReady(creationId, token, video ? 60 : 20);

      const published = await graph(`${igId}/media_publish`, {
        creation_id: creationId,
        access_token: token,
      });

      const permalinkRes = await fetch(
        `${GRAPH}/${published.id}?fields=permalink&access_token=${encodeURIComponent(token)}`,
      );
      const permalink = (await permalinkRes.json().catch(() => ({})))?.permalink || null;

      /*
       * 🚨 מעדכנים שורה קיימת, ורק אם אין כזו יוצרים חדשה.
       * הוספה עיוורת יצרה שתי שורות "פורסם" לאותו פוסט: אחת
       * מהשיבוץ המקורי ואחת מכאן. בלוח זה נראה כמו פרסום כפול.
       */
      const { data: pending } = await supabase
        .from("viral_schedule")
        .select("id")
        .eq("asset_id", assetId)
        .neq("status", "published")
        .order("scheduled_at")
        .limit(1);

      const done = {
        status: "published",
        external_id: published.id,
        published_url: permalink,
      };

      if (pending?.length) {
        await supabase.from("viral_schedule").update(done).eq("id", pending[0].id);
      } else {
        await supabase.from("viral_schedule").insert({
          asset_id: assetId,
          platform: "instagram",
          surface: "feed",
          scheduled_at: new Date().toISOString(),
          approved_by: "board",
          approved_at: new Date().toISOString(),
          ...done,
        });
      }

      await supabase.from("viral_assets")
        .update({ status: "published", updated_at: new Date().toISOString() })
        .eq("id", assetId);

      return NextResponse.json({ url: permalink, id: published.id }, { headers: CORS_HEADERS });
    } catch (e) {
      /**
       * נכשל באמצע. מחזירים ל-approved כדי שיהיה אפשר לנסות שוב,
       * אבל אומרים במפורש לבדוק קודם באינסטגרם: פסק זמן הוא לא
       * הוכחה שהפוסט לא עלה.
       */
      await supabase.from("viral_assets")
        .update({
          status: "approved",
          render_error: (e as Error).message,
          updated_at: new Date().toISOString(),
        })
        .eq("id", assetId);

      return fail(
        `${(e as Error).message}. לפני ניסיון נוסף תבדקו באינסטגרם שהפוסט לא עלה בכל זאת`,
        502,
      );
    }
  } catch (e) {
    return fail((e as Error).message || "הפרסום נכשל", 500);
  }
}
