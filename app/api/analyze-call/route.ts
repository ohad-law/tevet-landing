import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

const ALLOWED_ORIGIN = "https://68dafceada48410b1d774f3f.base44.app";

export async function POST(request: NextRequest) {
  // CORS, allow BASE44 CRM
  const origin = request.headers.get("origin") || "";
  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": origin.includes("base44.app") ? origin : ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  try {
    const { transcript, leadName, leadSource } = await request.json();

    if (!transcript?.trim()) {
      return NextResponse.json({ error: "transcript required" }, { status: 400, headers });
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      messages: [
        {
          role: "user",
          content: `אתה עוזר למשרד עו"ד טבת (דיני עבודה) לנתח שיחות מכירה עם לידים.

ליד: ${leadName || "לא ידוע"} | מקור: ${leadSource || "Meta Ads"}

תמלול השיחה:
${transcript}

נתח את השיחה וענה בפורמט JSON בדיוק כך (ללא תוספות):
{
  "analysis": "ניתוח קצר של 3-4 משפטים: מה רצה הליד, מה עצר אותו, מה עבד טוב",
  "score": <מספר 1-10 לסיכוי סגירה>,
  "recommendation": "<לסגור|להמשיך|לשלוח חומר|לא רלוונטי>",
  "main_objection": "<מחיר|ספק|לא דחוף|לא ברור הצורך|אחר>",
  "next_action": "פעולה ספציפית אחת לעשות עכשיו"
}`,
        },
      ],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "parse error", raw }, { status: 500, headers });
    }

    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json(result, { headers });
  } catch (err) {
    console.error("analyze-call error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500, headers });
  }
}

export async function OPTIONS() {
  return NextResponse.json(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
