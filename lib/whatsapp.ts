/**
 * Green API — WhatsApp client
 * Sends messages via Green API (instance 7105435035)
 */

const GREEN_INSTANCE = process.env.GREEN_API_INSTANCE!
const GREEN_TOKEN = process.env.GREEN_API_TOKEN!
const BASE_URL = () => `https://api.greenapi.com/waInstance${GREEN_INSTANCE}`

export async function sendWhatsApp(phone: string, message: string): Promise<boolean> {
  if (!GREEN_INSTANCE || !GREEN_TOKEN) {
    console.warn('[WhatsApp] Green API not configured')
    return false
  }
  try {
    const chatId = phone.includes('@') ? phone : `${phone}@c.us`
    const res = await fetch(`${BASE_URL()}/sendMessage/${GREEN_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId, message }),
    })
    return res.ok
  } catch (e) {
    console.error('[WhatsApp] Send error:', e)
    return false
  }
}

/** Send a video by URL (Green API downloads and forwards it) */
export async function sendWhatsAppVideo(phone: string, videoUrl: string, caption?: string): Promise<boolean> {
  if (!GREEN_INSTANCE || !GREEN_TOKEN) {
    console.warn('[WhatsApp] Green API not configured')
    return false
  }
  try {
    const chatId = phone.includes('@') ? phone : `${phone}@c.us`
    const res = await fetch(`${BASE_URL()}/sendFileByUrl/${GREEN_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId, urlFile: videoUrl, fileName: 'ohad.mp4', caption: caption || '' }),
    })
    return res.ok
  } catch (e) {
    console.error('[WhatsApp] Send video error:', e)
    return false
  }
}

/** Set the incoming messages webhook URL in Green API */
export async function setIncomingWebhook(webhookUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL()}/SetSettings/${GREEN_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webhookUrl }),
    })
    return res.ok
  } catch {
    return false
  }
}
