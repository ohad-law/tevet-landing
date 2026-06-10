/**
 * BASE44 CRM client
 * App: Legal Flow CRM (68dafceada48410b1d774f3f)
 */

const BASE44_API = 'https://app.base44.com/api'
const BASE44_APP_ID = process.env.BASE44_APP_ID!
const BASE44_API_KEY = process.env.BASE44_API_KEY!

export interface Base44Lead {
  full_name: string
  phone: string
  email?: string
  source?: string
  source_other?: string
  campaign_name?: string
  landing_page?: string
  status?: string
  notes?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  first_contact_date?: string
  is_viewed?: boolean
  lead_score?: number
}

export async function createBase44Lead(lead: Base44Lead): Promise<string | null> {
  try {
    const res = await fetch(`${BASE44_API}/apps/${BASE44_APP_ID}/entities/Lead`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api_key': BASE44_API_KEY,
      },
      body: JSON.stringify(lead),
    })
    if (!res.ok) {
      const err = await res.text()
      console.error('[BASE44] Create lead error:', err)
      return null
    }
    const data = await res.json()
    return data.id ?? null
  } catch (e) {
    console.error('[BASE44] Exception:', e)
    return null
  }
}

export async function findBase44LeadByPhone(phone: string): Promise<Base44Lead & { id: string } | null> {
  try {
    const normalized = normalizePhone(phone)
    const res = await fetch(
      `${BASE44_API}/apps/${BASE44_APP_ID}/entities/Lead?filters=phone%3D${encodeURIComponent(normalized)}&limit=1`,
      {
        headers: { 'api_key': BASE44_API_KEY },
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data?.[0] ?? null
  } catch {
    return null
  }
}

export async function updateBase44Lead(id: string, update: Partial<Base44Lead>): Promise<boolean> {
  try {
    const res = await fetch(`${BASE44_API}/apps/${BASE44_APP_ID}/entities/Lead/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'api_key': BASE44_API_KEY,
      },
      body: JSON.stringify(update),
    })
    return res.ok
  } catch {
    return false
  }
}

/** Normalize Israeli phone → 97250XXXXXXX (no +, no dashes) */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('972')) return digits
  if (digits.startsWith('0')) return '972' + digits.slice(1)
  if (digits.length === 9) return '972' + digits // 50XXXXXXX
  return digits
}
