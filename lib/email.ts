import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL || 'EcomPilot Elite <noreply@ecompilotelite.com>'

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string | string[]
  subject: string
  html: string
  text?: string
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('[sendEmail] RESEND_API_KEY not set')
      return { success: false, error: 'Email service not configured' }
    }
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
    })
    if (error) {
      console.error('[sendEmail] Resend error:', error)
      return { success: false, error: (error as { message?: string }).message || String(error) }
    }
    return { success: true, id: data?.id }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[sendEmail] Exception:', message)
    return { success: false, error: message }
  }
}

export async function sendWelcomeEmail(userEmail: string, userName?: string) {
  return sendEmail({
    to: userEmail,
    subject: 'Bienvenue sur EcomPilot Elite',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px">
        <h1 style="color:#0f172a;font-size:22px;font-weight:700;margin:0 0 16px">
          Bienvenue sur EcomPilot Elite${userName ? ', ' + userName : ''} !
        </h1>
        <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 20px">
          Votre compte est maintenant actif. Connectez votre boutique Shopify pour commencer à optimiser votre catalogue.
        </p>
        <a href="https://www.ecompilotelite.com/dashboard/shops"
          style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">
          Accéder au tableau de bord
        </a>
      </div>
    `,
  })
}
