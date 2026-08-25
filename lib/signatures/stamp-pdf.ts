import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

export interface SignatureField {
  type: 'signature' | 'date' | 'initials' | 'full_name' | 'id_number'
  page: number   // 0-indexed
  x: number      // % מרוחב העמוד
  y: number      // % מגובה העמוד (0 = תחתית, 1 = ראש)
  w: number      // % רוחב השדה
  h: number      // % גובה השדה
}

export interface SignatureData {
  signerName: string
  signerIp:   string
  signerDevice: string
  signedAt:   Date
  fields:     SignatureField[]
  signatureImageBase64: string  // PNG base64
  idNumber?:  string            // ת"ז, אופציונלי
}

export async function stampPdf(
  originalPdfBytes: Uint8Array,
  data: SignatureData
): Promise<Uint8Array> {
  const pdfDoc  = await PDFDocument.load(originalPdfBytes)
  const pages   = pdfDoc.getPages()
  const font    = await pdfDoc.embedFont(StandardFonts.Helvetica)

  // הטמע תמונת חתימה
  let sigImage
  try {
    sigImage = await pdfDoc.embedPng(
      Buffer.from(data.signatureImageBase64.replace(/^data:image\/png;base64,/, ''), 'base64')
    )
  } catch {
    sigImage = null
  }

  for (const field of data.fields) {
    const page = pages[field.page]
    if (!page) continue

    const { width: pw, height: ph } = page.getSize()

    // המר אחוזים → נקודות PDF
    const x = field.x * pw
    const y = (1 - field.y - field.h) * ph   // pdf-lib: y=0 בתחתית
    const w = field.w * pw
    const h = field.h * ph

    if (field.type === 'signature' && sigImage) {
      // הטבע תמונת חתימה עם ריווח פנימי
      const pad = h * 0.08
      page.drawImage(sigImage, {
        x: x + pad,
        y: y + pad,
        width:  w - pad * 2,
        height: h - pad * 2,
      })
    } else if (field.type === 'date') {
      const dateStr = data.signedAt.toLocaleDateString('he-IL')
      const fontSize = Math.min(h * 0.55, 12)
      page.drawText(dateStr, {
        x: x + 4,
        y: y + (h - fontSize) / 2,
        size: fontSize,
        font,
        color: rgb(0.1, 0.1, 0.25),
      })
    } else if (field.type === 'initials') {
      const initials = data.signerName.split(' ').map(w => w[0]).join('.') + '.'
      const fontSize = Math.min(h * 0.55, 14)
      page.drawText(initials, {
        x: x + 4,
        y: y + (h - fontSize) / 2,
        size: fontSize,
        font,
        color: rgb(0.1, 0.1, 0.25),
      })
    } else if (field.type === 'full_name') {
      const fontSize = Math.min(h * 0.55, 12)
      page.drawText(data.signerName, {
        x: x + 4,
        y: y + (h - fontSize) / 2,
        size: fontSize,
        font,
        color: rgb(0.1, 0.1, 0.25),
      })
    } else if (field.type === 'id_number') {
      const idText = data.idNumber ?? ''
      const fontSize = Math.min(h * 0.55, 12)
      if (idText) {
        page.drawText(idText, {
          x: x + 4,
          y: y + (h - fontSize) / 2,
          size: fontSize,
          font,
          color: rgb(0.1, 0.1, 0.25),
        })
      }
    }

    // קו תחתי עדין תחת כל שדה
    page.drawLine({
      start: { x, y },
      end:   { x: x + w, y },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    })
  }

  // עמוד Audit Trail
  const auditPage = pdfDoc.addPage([595, 842])
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  let ay = 780

  auditPage.drawText('תעודת חתימה דיגיטלית', {
    x: 50, y: ay,
    size: 16, font: helveticaBold,
    color: rgb(0.06, 0.09, 0.24),
  })
  ay -= 20
  auditPage.drawLine({
    start: { x: 50, y: ay }, end: { x: 545, y: ay },
    thickness: 1, color: rgb(0.85, 0.85, 0.85),
  })
  ay -= 24

  const rows = [
    ['חותם', data.signerName],
    ['תאריך', data.signedAt.toLocaleString('he-IL')],
    ['כתובת IP', data.signerIp],
    ['מכשיר', data.signerDevice.slice(0, 60)],
  ]

  for (const [label, value] of rows) {
    auditPage.drawText(`${label}:`, {
      x: 50, y: ay, size: 10,
      font: helveticaBold, color: rgb(0.3, 0.3, 0.3),
    })
    auditPage.drawText(value, {
      x: 130, y: ay, size: 10,
      font, color: rgb(0.1, 0.1, 0.1),
    })
    ay -= 20
  }

  ay -= 12
  auditPage.drawText('מסמך זה נחתם באמצעות מערכת החתימה הדיגיטלית של משרד עו"ד אוהד טבת.', {
    x: 50, y: ay, size: 9,
    font, color: rgb(0.5, 0.5, 0.5),
  })

  return pdfDoc.save()
}
