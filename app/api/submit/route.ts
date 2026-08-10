import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import crypto from "crypto";
import { createServiceClient } from "@/lib/supabase/service";
import { scoreLead, buildLeadNotes } from "@/lib/leadScore";

const PAYSLIP_BUCKET = "lead-payslips";
/** תוקף הקישור לתלושים שנשלח לאוהד ונשמר ב-CRM */
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 365;

const GREEN_API_INSTANCE = process.env.GREEN_API_INSTANCE_ID ?? "7105435035";
const GREEN_API_TOKEN = process.env.GREEN_API_TOKEN ?? "25e05f98851f4262b11be4110f31a462306a88d0d7dd490695";
const GREEN_API_HOST = `https://${GREEN_API_INSTANCE.slice(0, 4)}.api.greenapi.com`;
const OHAD_WHATSAPP = "972542274497"; // hard-coded — אסור לשנות דרך env var למניעת דליפה

const OHAD_EMAIL = "ohad@tevet-law.com";

const META_PIXEL_ID = process.env.META_PIXEL_ID ?? "1395969088227775";
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN ?? process.env.META_ADS_ACCESS_TOKEN ?? "";

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

async function sendMetaCAPI(phone: string, name: string, sourceUrl: string) {
  if (!META_ACCESS_TOKEN) return;
  const nameParts = name.trim().split(/\s+/);
  const firstName = nameParts[0] ?? "";
  const lastName = nameParts.slice(1).join(" ") ?? "";
  const phoneNorm = phone.replace(/\D/g, "");

  const payload = {
    data: [
      {
        event_name: "Lead",
        event_time: Math.floor(Date.now() / 1000),
        action_source: "website",
        event_source_url: sourceUrl,
        user_data: {
          ph: [sha256(phoneNorm)],
          fn: firstName ? [sha256(firstName)] : undefined,
          ln: lastName ? [sha256(lastName)] : undefined,
        },
      },
    ],
    access_token: META_ACCESS_TOKEN,
  };

  await fetch(`https://graph.facebook.com/v21.0/${META_PIXEL_ID}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER ?? "",
      pass: process.env.SMTP_PASS ?? "",
    },
  });
}

async function sendWhatsApp(
  name: string,
  phone: string,
  years: string,
  situation: string,
  payslipUrls: string[] = []
) {
  if (!OHAD_WHATSAPP) return;
  const chatId = OHAD_WHATSAPP.replace(/\D/g, "") + "@c.us";
  const { score, tier } = scoreLead({ years, situation });
  const message =
    `📋 *ליד חדש — בדיקת תלוש שכר*\n\n` +
    `👤 שם: ${name}\n` +
    `📞 טלפון: ${phone}\n` +
    `📅 שנות עבודה: ${years}\n` +
    `💼 סיטואציה: ${situation || "לא צוין"}\n` +
    `⭐ דירוג: ${tier} (${score})\n` +
    (payslipUrls.length
      ? `📎 תלושים: ${payslipUrls.length}`
      : `⚠️ *ללא תלושים* — לבקש בשיחה`) +
    (payslipUrls[0] ? `\n${payslipUrls[0]}` : "");

  const url = `${GREEN_API_HOST}/waInstance${GREEN_API_INSTANCE}/sendMessage/${GREEN_API_TOKEN}`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId, message }),
  });
}

/**
 * שומר את הליד ב-Supabase ומעלה את התלושים לאחסון פרטי.
 * זה קורה לפני כל שליחת התראה — כדי שנפילה של מייל או וואטסאפ
 * לא תאבד ליד. זו בדיוק הסיבה שלידים מדף הנחיתה נעלמו בעבר.
 */
async function saveLead(params: {
  name: string;
  phone: string;
  years: string;
  situation: string;
  files: File[];
  referer: string;
}): Promise<{ id: string | null; payslipUrls: string[] }> {
  const supabase = createServiceClient();
  const { score } = scoreLead({ years: params.years, situation: params.situation });

  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      full_name: params.name,
      phone: params.phone,
      source: "דף נחיתה",
      campaign_name: "טבת | דף נחיתה | בדיקת תלושי שכר",
      status: "חדש",
      notes:
        buildLeadNotes({ years: params.years, situation: params.situation }) +
        (params.files.length === 0 ? " | ⚠️ ללא תלושים — לבקש בשיחה" : ""),
      lead_score: score,
      landing_page: params.referer,
      is_viewed: false,
    })
    .select("id")
    .single();

  if (error || !lead) {
    console.error("saveLead insert failed:", error);
    return { id: null, payslipUrls: [] };
  }

  const payslipUrls: string[] = [];
  const storedPaths: string[] = [];

  for (const [i, file] of params.files.entries()) {
    const safeName = file.name.replace(/[^\w.\-֐-׿]/g, "_");
    const path = `${lead.id}/${String(i + 1).padStart(2, "0")}_${safeName}`;
    const { error: upErr } = await supabase.storage
      .from(PAYSLIP_BUCKET)
      .upload(path, Buffer.from(await file.arrayBuffer()), {
        contentType: file.type || "application/octet-stream",
        upsert: true,
      });
    if (upErr) {
      console.error("payslip upload failed:", path, upErr);
      continue;
    }
    storedPaths.push(path);
    const { data: signed } = await supabase.storage
      .from(PAYSLIP_BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
    if (signed?.signedUrl) payslipUrls.push(signed.signedUrl);
  }

  if (storedPaths.length > 0) {
    await supabase
      .from("leads")
      .update({
        uploaded_files: storedPaths.map((p, i) => ({ path: p, url: payslipUrls[i] ?? null })),
        drive_link: payslipUrls[0] ?? null,
      })
      .eq("id", lead.id);
  }

  return { id: lead.id, payslipUrls };
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const name = (form.get("name") as string)?.trim() ?? "";
    const phone = (form.get("phone") as string)?.trim() ?? "";
    const years = (form.get("years") as string) ?? "";
    const situation = (form.get("situation") as string) ?? "";
    const fileEntries = form.getAll("files") as File[];

    if (!name || !phone) {
      return NextResponse.json({ error: "שם וטלפון חובה" }, { status: 400 });
    }
    if (years === "פחות משנה") {
      return NextResponse.json({ error: "לא מייצגים עובדים עם פחות משנה" }, { status: 400 });
    }
    // תלושים אינם חובה: הדפדפן הפנימי של טיקטוק חוסם העלאת קבצים,
    // ופנייה בלי תלושים היא עדיין ליד — רודפים אחרי התלושים בשיחה.

    const referer = req.headers.get("referer") ?? "https://tevet-landing.vercel.app";

    // שלב 1 — שמירה. חייב להצליח, וקורה לפני כל התראה.
    const { id: leadId, payslipUrls } = await saveLead({
      name,
      phone,
      years,
      situation,
      files: fileEntries,
      referer,
    });

    if (!leadId) {
      return NextResponse.json(
        { error: "שגיאה בשמירת הפנייה, נסו שוב" },
        { status: 500 }
      );
    }

    // שלב 2 — התראות. נכשלות בשקט, הליד כבר שמור.
    void notify({ name, phone, years, situation, fileEntries, payslipUrls, referer });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("submit error:", err);
    return NextResponse.json({ error: "שגיאה פנימית" }, { status: 500 });
  }
}

async function notify(p: {
  name: string;
  phone: string;
  years: string;
  situation: string;
  fileEntries: File[];
  payslipUrls: string[];
  referer: string;
}) {
  const { name, phone, years, situation, fileEntries, payslipUrls, referer } = p;
  try {
    const attachments = await Promise.all(
      fileEntries.map(async (file) => ({
        filename: file.name,
        content: Buffer.from(await file.arrayBuffer()),
        contentType: file.type,
      }))
    );

    const transport = createTransport();
    await transport.sendMail({
      from: `"דף נחיתה טבת" <${process.env.SMTP_USER}>`,
      to: OHAD_EMAIL,
      subject: `ליד חדש — ${name} — בדיקת תלוש שכר`,
      html: `
        <div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#c9a84c;border-bottom:2px solid #c9a84c;padding-bottom:10px;">ליד חדש — בדיקת תלוש שכר</h2>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px;font-weight:bold;color:#555;">שם:</td><td style="padding:8px;">${name}</td></tr>
            <tr style="background:#f9f9f9;"><td style="padding:8px;font-weight:bold;color:#555;">טלפון:</td><td style="padding:8px;"><a href="tel:${phone}">${phone}</a></td></tr>
            <tr><td style="padding:8px;font-weight:bold;color:#555;">שנות עבודה:</td><td style="padding:8px;">${years}</td></tr>
            <tr style="background:#f9f9f9;"><td style="padding:8px;font-weight:bold;color:#555;">סיטואציה:</td><td style="padding:8px;">${situation || "לא צוין"}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;color:#555;">מספר תלושים:</td><td style="padding:8px;">${fileEntries.length}</td></tr>
            <tr style="background:#f9f9f9;"><td style="padding:8px;font-weight:bold;color:#555;">דירוג:</td><td style="padding:8px;">${scoreLead({ years, situation }).tier} (${scoreLead({ years, situation }).score})</td></tr>
            ${payslipUrls.length ? `<tr><td style="padding:8px;font-weight:bold;color:#555;">תלושים ב-CRM:</td><td style="padding:8px;">${payslipUrls.map((u, i) => `<a href="${u}">תלוש ${i + 1}</a>`).join(" · ")}</td></tr>` : ""}
          </table>
          <p style="margin-top:20px;color:#888;font-size:13px;">הגיע דרך דף הנחיתה · ${new Date().toLocaleString("he-IL")}</p>
        </div>
      `,
      attachments,
    });

    await sendWhatsApp(name, phone, years, situation, payslipUrls).catch(() => null);
    await sendMetaCAPI(phone, name, referer).catch(() => null);
  } catch (err) {
    // הליד כבר שמור ב-CRM — כישלון התראה לא מאבד אותו
    console.error("notify failed (lead already saved):", err);
  }
}
