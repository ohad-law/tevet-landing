import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

const GREEN_API_INSTANCE = process.env.GREEN_API_INSTANCE_ID ?? "7105435035";
const GREEN_API_TOKEN = process.env.GREEN_API_TOKEN ?? "25e05f98851f4262b11be4110f31a462306a88d0d7dd490695";
const GREEN_API_HOST = `https://${GREEN_API_INSTANCE.slice(0, 4)}.api.greenapi.com`;
const OHAD_WHATSAPP = process.env.OHAD_WHATSAPP_NUMBER ?? process.env.OHAD_WHATSAPP ?? "972542274497";

const OHAD_EMAIL = "ohad@tevet-law.com";

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

async function sendWhatsApp(name: string, phone: string, years: string, situation: string) {
  if (!OHAD_WHATSAPP) return;
  const chatId = OHAD_WHATSAPP.replace(/\D/g, "") + "@c.us";
  const message =
    `📋 *ליד חדש — בדיקת תלוש שכר*\n\n` +
    `👤 שם: ${name}\n` +
    `📞 טלפון: ${phone}\n` +
    `📅 שנות עבודה: ${years}\n` +
    `💼 סיטואציה: ${situation || "לא צוין"}`;

  const url = `${GREEN_API_HOST}/waInstance${GREEN_API_INSTANCE}/sendMessage/${GREEN_API_TOKEN}`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId, message }),
  });
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
    if (fileEntries.length === 0) {
      return NextResponse.json({ error: "נא להעלות לפחות תלוש אחד" }, { status: 400 });
    }

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
          </table>
          <p style="margin-top:20px;color:#888;font-size:13px;">הגיע דרך דף הנחיתה · ${new Date().toLocaleString("he-IL")}</p>
        </div>
      `,
      attachments,
    });

    await sendWhatsApp(name, phone, years, situation).catch(() => null);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("submit error:", err);
    return NextResponse.json({ error: "שגיאה פנימית" }, { status: 500 });
  }
}
