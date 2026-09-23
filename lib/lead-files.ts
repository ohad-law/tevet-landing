/**
 * עזרי אחסון לקבצים שלידים שולחים בוואטסאפ (בעיקר תלושי שכר).
 *
 * חולץ לכאן 23/09/2026 כשנוסף צינור וואטסאפ שני (טוויליו).
 * שני הצינורות מורידים את הקובץ אחרת, אבל שם הקובץ וההצמדה לליד
 * חייבים להתנהג בדיוק אותו דבר, ולכן הם יושבים במקום אחד.
 */
import { createServiceClient } from '@/lib/supabase/service'

export const PAYSLIP_BUCKET = 'lead-payslips'
export const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 365
export const MAX_FILE_BYTES = 20 * 1024 * 1024 // מעבר לזה לא מורידים, כדי לא להפיל את הפונקציה

type Supa = ReturnType<typeof createServiceClient>
export type LeadTable = 'leads' | 'leads_talush'

/**
 * מנקה שם קובץ לשם שאחסון סופאבייס מקבל.
 *
 * 🚨 אסור להשאיר עברית בנתיב. סופאבייס מחזיר InvalidKey ומסרב לשמור,
 * ואומת בפועל 29/08/2026. השם המקורי נשמר בגוף ההודעה, ולכן
 * שום מידע לא הולך לאיבוד כשהאותיות מוחלפות כאן.
 */
export function safeStorageName(name: string): string {
  const ext = (name.match(/\.[A-Za-z0-9]{1,8}$/) || [''])[0]
  const base = name
    .slice(0, name.length - ext.length)
    .replace(/[^A-Za-z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 60)
  return (base || 'file') + ext.toLowerCase()
}

/**
 * שומר קובץ שכבר הורד באחסון הפרטי ומחזיר נתיב וקישור חתום.
 * מחזיר null אם ההעלאה נכשלה, כדי שהקורא יוכל להמשיך בלי הקובץ.
 */
export async function storeLeadFile(
  supabase: Supa,
  folder: string,
  buf: Buffer,
  fileName: string,
  mime: string,
  logPrefix: string
): Promise<{ path: string; url: string | null } | null> {
  if (buf.byteLength > MAX_FILE_BYTES) {
    console.warn(`${logPrefix} קובץ גדול מדי, לא נשמר:`, buf.byteLength)
    return null
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const path = `${folder}/wa_${stamp}_${safeStorageName(fileName)}`

  const { error } = await supabase.storage
    .from(PAYSLIP_BUCKET)
    .upload(path, buf, { contentType: mime, upsert: true })
  if (error) {
    console.error(`${logPrefix} העלאת הקובץ נכשלה:`, error)
    return null
  }

  const { data: signed } = await supabase.storage
    .from(PAYSLIP_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)

  return { path, url: signed?.signedUrl ?? null }
}

/** מצרף קובץ שהגיע בוואטסאפ לרשימת הקבצים של הליד */
export async function attachToLead(
  supabase: Supa,
  table: LeadTable,
  leadId: string,
  existing: unknown,
  stored: { path: string; url: string | null }
) {
  const current = Array.isArray(existing) ? existing : []
  await supabase
    .from(table)
    .update({
      uploaded_files: [...current, { path: stored.path, url: stored.url, source: 'וואטסאפ' }],
      payslips_received_at: new Date().toISOString(),
    })
    .eq('id', leadId)
}
