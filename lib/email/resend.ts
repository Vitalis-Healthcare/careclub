// Sends the membership agreement email through Resend's REST API using plain
// fetch (no SDK dependency). Degrades gracefully: when RESEND_API_KEY is not
// configured, the caller receives { sent: false, configured: false } and the
// UI offers the signing link for manual delivery instead.

const FROM = 'Vitalis Care Club <careclub@vitalishealthcare.com>'

export async function sendAgreementEmail({
  to,
  memberName,
  signUrl,
  appUrl,
}: {
  to: string
  memberName: string
  signUrl: string
  appUrl: string
}): Promise<{ sent: boolean; configured: boolean; error: string | null }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return { sent: false, configured: false, error: null }
  }

  const html = `
<div style="margin:0;padding:32px 16px;background:#F5F2EA;font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:560px;margin:0 auto;background:#FDFCF8;border:1px solid #E2DDCE;border-radius:14px;padding:40px 40px 32px;">
    <img src="${appUrl}/vitalis-mark.png" alt="Vitalis HealthCare" width="72" style="display:block;margin:0 auto 20px;" />
    <p style="text-align:center;font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:#5E9420;font-weight:bold;margin:0 0 6px;">Vitalis Care Club</p>
    <h1 style="text-align:center;font-size:26px;font-weight:600;color:#1D2A22;margin:0 0 24px;">Your Membership Agreement</h1>
    <p style="font-size:15px;line-height:1.65;color:#1D2A22;margin:0 0 16px;">Dear ${memberName},</p>
    <p style="font-size:15px;line-height:1.65;color:#1D2A22;margin:0 0 16px;">Welcome to the Care Club. Your membership agreement is ready for your review and signature. It sets out your membership, your visits, and your rights as a Vitalis home care client.</p>
    <p style="font-size:15px;line-height:1.65;color:#1D2A22;margin:0 0 28px;">Reading and signing takes just a few minutes, on any phone or computer.</p>
    <div style="text-align:center;margin:0 0 28px;">
      <a href="${signUrl}" style="display:inline-block;background:#5E9420;color:#FFFFFF;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;text-decoration:none;padding:14px 34px;border-radius:8px;">Review &amp; sign your agreement</a>
    </div>
    <p style="font-size:13px;line-height:1.6;color:#64705F;margin:0 0 6px;">If the button does not open, copy this link into your browser:</p>
    <p style="font-size:12px;line-height:1.6;color:#64705F;word-break:break-all;margin:0 0 24px;">${signUrl}</p>
    <p style="font-size:13px;line-height:1.6;color:#64705F;border-top:1px solid #EBE7DA;padding-top:18px;margin:0;">Vitalis Healthcare, LLC · 8757 Georgia Avenue, Suite 440, Silver Spring, MD 20910 · 240.716.6874</p>
  </div>
</div>`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: [to],
        subject: 'Your Care Club Membership Agreement',
        html,
      }),
    })
    if (!res.ok) {
      return { sent: false, configured: true, error: 'The email service declined the send. Share the signing link manually.' }
    }
    return { sent: true, configured: true, error: null }
  } catch {
    return { sent: false, configured: true, error: 'Could not reach the email service. Share the signing link manually.' }
  }
}
