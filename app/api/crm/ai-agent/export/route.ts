import { NextRequest, NextResponse } from 'next/server'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  HeadingLevel,
  SectionType,
  convertInchesToTwip,
} from 'docx'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { text: string; title?: string }
    const { text, title } = body

    if (!text?.trim()) {
      return NextResponse.json({ error: 'אין תוכן לייצא' }, { status: 400 })
    }

    const lines = text.split('\n')
    const children: Paragraph[] = []

    // Title paragraph
    if (title) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: title,
              bold: true,
              size: 32,
              rightToLeft: true,
              font: 'David',
            }),
          ],
          alignment: AlignmentType.RIGHT,
          bidirectional: true,
          spacing: { after: 300 },
        })
      )
    }

    // Body lines
    for (const line of lines) {
      const trimmed = line.trim()

      // Section headings (=== ... ===)
      if (trimmed.startsWith('===') && trimmed.endsWith('===')) {
        const headingText = trimmed.replace(/^=+\s*/, '').replace(/\s*=+$/, '').trim()
        if (!headingText) {
          children.push(new Paragraph({ children: [] }))
          continue
        }
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: headingText,
                bold: true,
                size: 26,
                rightToLeft: true,
                font: 'David',
              }),
            ],
            alignment: AlignmentType.RIGHT,
            bidirectional: true,
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 240, after: 120 },
          })
        )
      } else if (trimmed === '' || trimmed === '─'.repeat(trimmed.length)) {
        // Empty line or divider
        children.push(new Paragraph({ children: [], spacing: { after: 80 } }))
      } else {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: line,
                size: 24,
                rightToLeft: true,
                font: 'David',
              }),
            ],
            alignment: AlignmentType.RIGHT,
            bidirectional: true,
            spacing: { after: 80 },
          })
        )
      }
    }

    const doc = new Document({
      styles: {
        default: {
          document: {
            run: { size: 24, font: 'David' },
          },
        },
      },
      sections: [
        {
          properties: {
            type: SectionType.CONTINUOUS,
            page: {
              margin: {
                top: convertInchesToTwip(1),
                right: convertInchesToTwip(1.2),
                bottom: convertInchesToTwip(1),
                left: convertInchesToTwip(1.2),
              },
            },
          },
          children,
        },
      ],
    })

    const buffer = await Packer.toBuffer(doc)
    const safeTitle = (title ?? 'מסמך_משפטי').replace(/[<>:"/\\|?*]/g, '_')

    // Convert Buffer to Uint8Array for NextResponse compatibility
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(safeTitle)}.docx`,
      },
    })
  } catch (error) {
    console.error('[ai-agent/export] error:', error)
    return NextResponse.json({ error: 'שגיאה ביצירת קובץ Word' }, { status: 500 })
  }
}
