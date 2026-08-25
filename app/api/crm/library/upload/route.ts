import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase/service'

export const maxDuration = 300
export const runtime = 'nodejs'

const openai   = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const CHUNK_SIZE    = 800   // tokens (approx chars / 4)
const CHUNK_OVERLAP = 150

/* ── helpers ── */

function chunkText(text: string): string[] {
  const charSize    = CHUNK_SIZE    * 4
  const charOverlap = CHUNK_OVERLAP * 4
  const chunks: string[] = []
  let start = 0
  while (start < text.length) {
    const end = Math.min(start + charSize, text.length)
    const chunk = text.slice(start, end).trim()
    if (chunk.length > 50) chunks.push(chunk)
    start += charSize - charOverlap
  }
  return chunks
}

async function extractText(buffer: Buffer, fileType: string, filename: string): Promise<string> {
  if (fileType === 'pdf') {
    // ייבוא ישיר מהספרייה הפנימית, עוקף את קובץ הטסט שלא קיים בסביבת Vercel
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse/lib/pdf-parse.js') as (buf: Buffer) => Promise<{ text: string }>
    const data = await pdfParse(buffer)
    return data.text || ''
  }

  if (fileType === 'docx') {
    const mammoth = await import('mammoth')
    const result  = await mammoth.extractRawText({ buffer })
    return result.value || ''
  }

  if (fileType === 'xlsx') {
    const XLSX = await import('xlsx')
    const wb   = XLSX.read(buffer, { type: 'buffer' })
    return wb.SheetNames
      .map(name => {
        const ws = wb.Sheets[name]
        return `גיליון: ${name}\n${XLSX.utils.sheet_to_csv(ws)}`
      })
      .join('\n\n')
  }

  if (fileType === 'image') {
    // Use Claude Vision to extract text from image
    const base64 = buffer.toString('base64')
    const ext     = filename.split('.').pop()?.toLowerCase() ?? 'jpeg'
    const mime    = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mime as 'image/jpeg', data: base64 },
          },
          {
            type: 'text',
            text: 'חלץ את כל הטקסט מהתמונה הזו. החזר רק את הטקסט, ללא הסברים. אם אין טקסט, החזר מחרוזת ריקה.',
          },
        ],
      }],
    })
    return (response.content[0] as { type: string; text: string }).text || ''
  }

  if (fileType === 'txt') {
    return buffer.toString('utf-8')
  }

  return ''
}

async function embedChunks(chunks: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: chunks,
  })
  return response.data.map(d => d.embedding)
}

/* ── main route ── */

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file      = formData.get('file') as File | null
    const tagsRaw   = formData.get('tags') as string | null

    if (!file) {
      return NextResponse.json({ error: 'קובץ חסר' }, { status: 400 })
    }

    const tags: string[] = tagsRaw ? JSON.parse(tagsRaw) : []

    // Detect file type
    const name = file.name.toLowerCase()
    let fileType: string
    if (name.endsWith('.pdf'))                          fileType = 'pdf'
    else if (name.endsWith('.docx') || name.endsWith('.doc')) fileType = 'docx'
    else if (name.endsWith('.xlsx') || name.endsWith('.xls')) fileType = 'xlsx'
    else if (name.endsWith('.txt'))                     fileType = 'txt'
    else if (/\.(jpg|jpeg|png|webp|gif)$/.test(name))  fileType = 'image'
    else return NextResponse.json({ error: 'סוג קובץ לא נתמך' }, { status: 400 })

    const supabase  = createServiceClient()
    const arrayBuf  = await file.arrayBuffer()
    const buffer    = Buffer.from(arrayBuf)

    // 1. Create document record
    const { data: doc, error: docErr } = await supabase
      .from('document_library')
      .insert({
        filename:  file.name,
        file_type: fileType,
        file_size: buffer.length,
        tags,
        status:    'processing',
      })
      .select('id')
      .single()

    if (docErr || !doc) {
      return NextResponse.json({ error: 'שגיאה ביצירת רשומה' }, { status: 500 })
    }

    const docId = doc.id

    // 2. Extract text
    let text = ''
    try {
      text = await extractText(buffer, fileType, file.name)
    } catch (e) {
      await supabase.from('document_library').update({
        status: 'error',
        error_msg: `חילוץ טקסט נכשל: ${e instanceof Error ? e.message : String(e)}`,
      }).eq('id', docId)
      return NextResponse.json({ error: 'חילוץ טקסט נכשל' }, { status: 500 })
    }

    if (!text.trim()) {
      await supabase.from('document_library').update({
        status: 'error',
        error_msg: 'לא נמצא טקסט בקובץ',
      }).eq('id', docId)
      return NextResponse.json({ error: 'לא נמצא טקסט בקובץ' }, { status: 422 })
    }

    // 3. Chunk
    const chunks = chunkText(text)

    // 4. Embed (batch of 100 max for OpenAI)
    const allEmbeddings: number[][] = []
    for (let i = 0; i < chunks.length; i += 100) {
      const batch = chunks.slice(i, i + 100)
      const embs  = await embedChunks(batch)
      allEmbeddings.push(...embs)
    }

    // 5. Store chunks
    const rows = chunks.map((content, idx) => ({
      document_id:  docId,
      content,
      embedding:    `[${allEmbeddings[idx].join(',')}]`,
      chunk_index:  idx,
    }))

    // Insert in batches of 50
    for (let i = 0; i < rows.length; i += 50) {
      const { error: chunkErr } = await supabase
        .from('document_chunks')
        .insert(rows.slice(i, i + 50))
      if (chunkErr) throw chunkErr
    }

    // 6. Mark as ready
    await supabase.from('document_library').update({
      status:      'ready',
      chunk_count: chunks.length,
    }).eq('id', docId)

    return NextResponse.json({
      success: true,
      documentId: docId,
      chunks: chunks.length,
      filename: file.name,
    })

  } catch (err) {
    console.error('[library/upload] error:', err)
    return NextResponse.json({ error: 'שגיאה בשרת' }, { status: 500 })
  }
}
