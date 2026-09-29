/**
 * POST /api/crm/whatsapp-reply
 * שולח תשובה בוואטסאפ מהמספר הרשמי 053-964-9422, לפי בקשה מה-CRM.
 *
 * למה זה נדרש: מי שקיבל הודעת החייאה קיבל אותה מהמספר הרשמי, והשיחה
 * שלו נמצאת שם. תשובה שתצא ממספר המשרד ב-051 תיפתח כשיחה חדשה
 * ותבלבל את הליד. לכן התשובה חייבת לצאת מאותו מספר.
 *
 * 🚨 בערוץ הרשמי אפשר לשלוח טקסט חופשי רק בתוך 24 שעות מההודעה
 * האחרונה של הליד. מחוץ לחלון מטא דוחה, והנתיב מחזיר הסבר ברור
 * במקום כישלון שקט.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendFreeform, twilioConfigured } from '@/lib/twilio-whatsapp'

function normalizePhone(raw: string): string | null {
  const p = String(raw || '').replace(/\D/g, '')
  const full = p.startsWith('0') ? '972' + p.slice(1) : p
  return /^9725\d{8}$/.test(full) ? full : null
}

export async function POST(req: NextRequest) {
  // 🚨 אימות מול המשתמש המחובר ל-CRM, לא מול סוד משותף.
  // סוד משותף היה נצרב בקוד הפומבי של האפליקציה, וכל מי שמוצא
  // אותו יכול לשלוח הודעות מהמספר הרשמי של המשרד.
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const auth = createServiceClient()
  const { data: userData, error: authError } = await auth.auth.getUser(token)
  if (authError || !userData?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (!twilioConfigured()) {
    return NextResponse.json({ error: 'twilio_not_configured' }, { status: 500 })
  }

  let payload: { phone?: string; body?: string }
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'bad_json' }, { status: 400 })
  }

  const phone = normalizePhone(payload.phone || '')
  const body = (payload.body || '').trim()
  if (!phone) return NextResponse.json({ error: 'bad_phone' }, { status: 400 })
  if (!body) return NextResponse.json({ error: 'empty_body' }, { status: 400 })
  if (body.length > 4000) return NextResponse.json({ error: 'too_long' }, { status: 400 })

  const res = await sendFreeform(phone, body)

  if (!res.ok) {
    // 63016 הוא חלון ההודעות שנסגר. מוסבר בעברית כדי שאוהד יבין
    // מהמסך למה ההודעה לא יצאה ולא יחשוב שהמערכת שבורה
    const closed = String(res.error || '').includes('63016')
    return NextResponse.json(
      {
        error: res.error,
        hint: closed
          ? 'עברו יותר מ-24 שעות מההודעה האחרונה של הליד. אפשר לענות רק בתבנית מאושרת.'
          : undefined,
      },
      { status: 422 }
    )
  }

  // נשמר בשיחה של הליד, כדי שהכרטיס ימשיך לשקף את מה שנאמר בפועל
  try {
    await auth.from('whatsapp_messages').insert({
      phone,
      direction: 'יוצאת',
      body,
      provider_message_id: res.sid || null,
      is_read: true,
    })
  } catch (e) {
    console.error('[whatsapp-reply] failed to store message:', e)
  }

  return NextResponse.json({ ok: true, sid: res.sid })
}
