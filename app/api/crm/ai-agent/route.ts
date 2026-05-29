import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { createServiceClient } from '@/lib/supabase/service'

export const maxDuration = 300

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const openai    = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

/* ── RAG: מביא קטעים רלוונטיים מספריית הידע ── */
async function retrieveRelevantChunks(instruction: string, topK = 8): Promise<string> {
  try {
    const supabase = createServiceClient()

    // Embed the instruction
    const embRes = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: instruction,
    })
    const embedding = embRes.data[0].embedding

    // Search via pgvector function
    const { data, error } = await supabase.rpc('search_documents', {
      query_embedding: `[${embedding.join(',')}]`,
      match_count: topK,
      min_similarity: 0.3,
    })

    if (error || !data?.length) return ''

    const results = data as Array<{ filename: string; content: string; similarity: number }>
    const formatted = results
      .map((r, i) => `[${i + 1}] מתוך: ${r.filename} (התאמה: ${(r.similarity * 100).toFixed(0)}%)\n${r.content}`)
      .join('\n\n---\n\n')

    return `\n\n=== מסמכי ייחוס מספריית המשרד (${results.length} קטעים רלוונטיים) ===\n${formatted}\n=== סוף מסמכי ייחוס ===\n`
  } catch {
    return '' // RAG לא קריטי — ממשיך בלעדיו
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      caseId: string
      instruction: string
      pdfBase64?: string
    }

    const { caseId, instruction, pdfBase64 } = body

    if (!caseId || !instruction?.trim()) {
      return NextResponse.json({ error: 'חסרים פרטים: caseId ו-instruction נדרשים' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const [
      { data: caseData },
      { data: tasks },
      { data: hearings },
      { data: timeline },
    ] = await Promise.all([
      supabase.from('cases').select('*').eq('id', caseId).single(),
      supabase.from('tasks').select('*').eq('case_id', caseId).order('due_date', { ascending: true }),
      supabase.from('hearings').select('*').eq('case_id', caseId).order('date', { ascending: true }),
      supabase.from('case_timeline').select('*').eq('case_id', caseId).order('created_at', { ascending: true }),
    ])

    if (!caseData) {
      return NextResponse.json({ error: 'תיק לא נמצא' }, { status: 404 })
    }

    const { data: clientData } = await supabase
      .from('clients')
      .select('id, full_name, phone, email, id_number, address')
      .eq('id', (caseData as Record<string, unknown>).client_id as string ?? '')
      .maybeSingle()

    const caseContext = buildCaseContext(
      caseData as Record<string, unknown>,
      clientData as Record<string, unknown> | null,
      (tasks ?? []) as Record<string, unknown>[],
      (hearings ?? []) as Record<string, unknown>[],
      (timeline ?? []) as Record<string, unknown>[]
    )

    // RAG: מביא מסמכים רלוונטיים מספריית הידע
    const ragContext = await retrieveRelevantChunks(instruction)

    // Build user message content
    const userContent: Anthropic.ContentBlockParam[] = []

    if (pdfBase64) {
      userContent.push({
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: pdfBase64,
        },
      } as unknown as Anthropic.ContentBlockParam)
    }

    userContent.push({
      type: 'text',
      text: `${caseContext}${ragContext}\n\n${'─'.repeat(50)}\n\nהוראה: ${instruction}`,
    })

    // Stream the response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const claudeStream = anthropic.messages.stream({
            model: 'claude-opus-4-7',
            max_tokens: 8000,
            thinking: { type: 'adaptive' },
            system: `אתה סוכן משפטי מומחה, העובד בלעדית עבור משרד עו"ד אוהד טבת המתמחה בדיני עבודה בישראל.

תפקידך: לקבל נתוני תיק מלאים מה-CRM של המשרד, לקרוא מסמכי PDF שצורפו (אם יש), ולהשתמש במסמכי הייחוס מספריית המשרד (אם סופקו) — ולבצע את ההוראה המשפטית שניתנת לך.

כללי שימוש בספריית הייחוס:
- אם סופקו מסמכי ייחוס ("מסמכי ייחוס מספריית המשרד") — השתמש בהם כדוגמאות לסגנון, מבנה וניסוח
- אמץ את הסגנון הייחודי של המשרד כפי שבא לידי ביטוי במסמכים
- אל תעתיק מילה במילה — השתמש כהשראה ותבנית
- אם אין מסמכי ייחוס — כתוב על בסיס ידע משפטי כללי

כללי כתיבה:
- כתוב בעברית תקנית ורהוטה
- סגנון משפטי מקצועי, ממוקד ותמציתי
- הפלט מוכן לשימוש — ניסוח מלא, מוכן לעריכה סופית בלבד
- RTL, פסקאות ברורות, ללא פגמים לשוניים
- כאשר מצטט תאריכים או סכומים — השתמש בנתונים מה-CRM בדיוק`,
            messages: [{ role: 'user', content: userContent }],
          })

          for await (const chunk of claudeStream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              controller.enqueue(encoder.encode(chunk.delta.text))
            }
          }

          controller.close()
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'שגיאה לא ידועה'
          controller.enqueue(encoder.encode(`\n\n[שגיאה: ${msg}]`))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Accel-Buffering': 'no',
        'Cache-Control': 'no-cache, no-store',
        'Transfer-Encoding': 'chunked',
      },
    })
  } catch (error) {
    console.error('[ai-agent] error:', error)
    return NextResponse.json({ error: 'שגיאה בשרת' }, { status: 500 })
  }
}

function buildCaseContext(
  c: Record<string, unknown>,
  client: Record<string, unknown> | null,
  tasks: Record<string, unknown>[],
  hearings: Record<string, unknown>[],
  timeline: Record<string, unknown>[]
): string {
  const lines: string[] = []

  lines.push('=== נתוני תיק מ-CRM משרד טבת ===')
  lines.push(`שם תיק: ${c.case_name ?? '—'}`)
  lines.push(`מספר תיק: ${c.case_number ?? 'לא הוזן'}`)
  lines.push(`סטטוס נוכחי: ${c.status ?? '—'}`)
  lines.push(`סוג תיק: ${c.case_type ?? 'לא צוין'}`)
  if (c.value) lines.push(`ערך תביעה: ₪${Number(c.value).toLocaleString()}`)
  if (c.defendant_name) lines.push(`נתבע: ${c.defendant_name}`)
  if (c.net_hamishpat_number) lines.push(`מספר הליך בנט: ${c.net_hamishpat_number}`)
  if (c.open_date) lines.push(`תאריך פתיחה: ${c.open_date}`)
  if (c.target_close_date) lines.push(`יעד סיום: ${c.target_close_date}`)
  if (c.fee_amount) lines.push(`שכ"ט: ₪${Number(c.fee_amount).toLocaleString()} | סטטוס: ${c.fee_status ?? 'לא שולם'}`)
  if (c.case_description) lines.push(`\nתיאור התיק:\n${c.case_description}`)
  if (c.parties) lines.push(`\nצדדים:\n${c.parties}`)

  if (client) {
    lines.push('\n=== פרטי לקוח ===')
    lines.push(`שם מלא: ${client.full_name ?? '—'}`)
    if (client.id_number) lines.push(`ת.ז.: ${client.id_number}`)
    if (client.phone) lines.push(`טלפון: ${client.phone}`)
    if (client.email) lines.push(`אימייל: ${client.email}`)
    if (client.address) lines.push(`כתובת: ${client.address}`)
  }

  const upcomingHearings = (hearings ?? []).filter(h => {
    const d = h.date as string | undefined
    return d && d >= new Date().toISOString().split('T')[0]
  })
  if (upcomingHearings.length > 0) {
    lines.push('\n=== דיונים קרובים ===')
    upcomingHearings.forEach(h => {
      lines.push(`- ${h.date} | ${h.court ?? ''} | ${h.hearing_type ?? ''} | ${h.description ?? ''}`)
    })
  }

  const openTasks = (tasks ?? []).filter(t => t.status !== 'הושלמה')
  if (openTasks.length > 0) {
    lines.push('\n=== משימות פתוחות ===')
    openTasks.forEach(t => {
      const overdue = t.due_date && (t.due_date as string) < new Date().toISOString().split('T')[0]
      lines.push(`- ${t.title}${overdue ? ' [באיחור!]' : ''} | עד: ${t.due_date ?? 'ללא תאריך'} | עדיפות: ${t.priority ?? 'רגילה'}`)
    })
  }

  if (timeline && timeline.length > 0) {
    const recentEvents = timeline.slice(-15)
    lines.push('\n=== היסטוריית תיק (15 אחרונות) ===')
    recentEvents.forEach(e => {
      const date = typeof e.created_at === 'string' ? e.created_at.split('T')[0] : '—'
      lines.push(`- ${date} | ${e.action_type ?? ''}: ${e.description ?? ''}`)
    })
  }

  return lines.join('\n')
}
