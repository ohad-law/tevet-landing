import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { createReadStream } from "fs";

export const runtime = "nodejs";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return NextResponse.json(null, { headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  let tmpPath: string | null = null;

  try {
    const formData = await request.formData();
    const file = formData.get("audio") as File;
    const leadName = (formData.get("leadName") as string) || "לא ידוע";
    const leadSource = (formData.get("leadSource") as string) || "Meta Ads";

    if (!file) {
      return NextResponse.json({ error: "audio file required" }, { status: 400, headers: CORS_HEADERS });
    }

    // Save audio to temp file
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop() || "mp3";
    tmpPath = join(tmpdir(), `call_${Date.now()}.${ext}`);
    await writeFile(tmpPath, buffer);

    // 1, Transcribe with Whisper
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const transcription = await openai.audio.transcriptions.create({
      file: createReadStream(tmpPath) as unknown as File,
      model: "whisper-1",
      language: "he",
      response_format: "text",
    });
    const transcript = transcription as unknown as string;

    // 2, Analyze with Claude
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      messages: [
        {
          role: "user",
          content: `אתה עוזר למשרד עו"ד טבת (דיני עבודה) לנתח שיחות מכירה עם לידים.

ליד: ${leadName} | מקור: ${leadSource}

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
    if (!jsonMatch) throw new Error("Claude parse error");
    const analysis = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ transcript, ...analysis }, { headers: CORS_HEADERS });
  } catch (err) {
    console.error("transcribe-and-analyze error:", err);
    return NextResponse.json({ error: "Internal error", detail: String(err) }, { status: 500, headers: CORS_HEADERS });
  } finally {
    if (tmpPath) {
      unlink(tmpPath).catch(() => {});
    }
  }
}
