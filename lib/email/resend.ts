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

// Renewal reminder (v0.1.7-c): sent 7 days and 1 day before the anniversary.
export async function sendRenewalReminderEmail({
  to,
  memberName,
  renewalDate,
  amountLabel,
  cardLabel,
}: {
  to: string
  memberName: string
  renewalDate: string
  amountLabel: string
  cardLabel: string
}): Promise<{ sent: boolean; configured: boolean; error: string | null }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return { sent: false, configured: false, error: null }
  }

  const html = `
<div style="margin:0;padding:32px 16px;background:#F5F2EA;font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:560px;margin:0 auto;background:#FDFCF8;border:1px solid #E2DDCE;border-radius:14px;padding:40px 40px 32px;">
    <p style="text-align:center;font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:#5E9420;font-weight:bold;margin:0 0 6px;">Vitalis Care Club</p>
    <h1 style="text-align:center;font-size:26px;font-weight:600;color:#1D2A22;margin:0 0 24px;">Your membership renews soon</h1>
    <p style="font-size:15px;line-height:1.65;color:#1D2A22;margin:0 0 16px;">Dear ${memberName},</p>
    <p style="font-size:15px;line-height:1.65;color:#1D2A22;margin:0 0 16px;">A friendly note that your Care Club membership renews on <b>${renewalDate}</b>. On that day, <b>${amountLabel}</b> will be charged to your saved card (${cardLabel}).</p>
    <p style="font-size:15px;line-height:1.65;color:#1D2A22;margin:0 0 28px;">There is nothing you need to do. If your card has changed or you have any questions about your membership, please call us and we will take care of it.</p>
    <p style="font-size:13px;line-height:1.6;color:#64705F;border-top:1px solid #EBE7DA;padding-top:18px;margin:0;">Vitalis Healthcare, LLC \u00b7 8757 Georgia Avenue, Suite 440, Silver Spring, MD 20910 \u00b7 240.716.6874</p>
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
        subject: `Your Care Club membership renews ${renewalDate}`,
        html,
      }),
    })
    if (!res.ok) {
      return { sent: false, configured: true, error: 'The email service declined the send.' }
    }
    return { sent: true, configured: true, error: null }
  } catch {
    return { sent: false, configured: true, error: 'Could not reach the email service.' }
  }
}


const LEAD_FOOTER = 'Vitalis Care Club \u00b7 8757 Georgia Avenue, Suite 440, Silver Spring, MD 20910 \u00b7 (240) 290-5143'

// Thank-you email to a person who requested an invitation on the public
// front page (v0.1.12). Design approved from the mock-up: champagne top
// line, save-our-number panel, three what-happens-next beats.
export async function sendLeadThankYouEmail({
  to,
  firstName,
}: {
  to: string
  firstName: string
}): Promise<{ sent: boolean; configured: boolean; error: string | null }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return { sent: false, configured: false, error: null }
  }

  const html = `
<div style="margin:0;padding:36px 16px 48px;background:#F5F2EA;">
  <div style="max-width:600px;margin:0 auto;">
    <div style="height:3px;background:#A8863F;border-radius:3px 3px 0 0;font-size:0;line-height:0;">&nbsp;</div>
    <div style="background:#FFFFFF;border:1px solid #E2DDCE;border-top:none;border-radius:0 0 18px 18px;padding:44px 44px 40px;">
      <p style="margin:0 0 34px;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:600;color:#2D5A1B;text-align:center;">Vitalis <span style="font-style:italic;color:#A8863F;font-weight:500;">Care Club</span></p>
      <h1 style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-size:32px;line-height:1.15;font-weight:500;color:#1D2A22;text-align:center;">Thank you \u2014 we have<br>your request.</h1>
      <p style="margin:0 auto 30px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:#64705F;text-align:center;max-width:440px;">Dear ${firstName}, your request for an invitation to the Care Club has reached us. A Vitalis care advisor will be calling you soon to talk through membership and arrange your home visit \u2014 where we will bring the full membership package to you.</p>
      <div style="background:#F5F2EA;border:1px solid #E2DDCE;border-left:3px solid #A8863F;border-radius:12px;padding:22px 26px;">
        <p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#A8863F;">So you recognize our call</p>
        <p style="margin:0 0 6px;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:600;color:#1D2A22;">(240) 290-5143</p>
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13.5px;line-height:1.6;color:#64705F;">Please save this number as <strong style="color:#1D2A22;">Vitalis Care Club</strong> \u2014 it is the dedicated line our Club team calls from, and the one to reach us on any time.</p>
      </div>
      <p style="margin:32px 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#5E9420;">What happens next</p>
      <p style="margin:0;padding:10px 0;border-top:1px solid #EBE7DA;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#64705F;"><strong style="color:#1D2A22;">A call from us.</strong> Your care advisor will introduce the Club and answer every question.</p>
      <p style="margin:0;padding:10px 0;border-top:1px solid #EBE7DA;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#64705F;"><strong style="color:#1D2A22;">A home visit.</strong> We come to you with the full membership package, brochures and all.</p>
      <p style="margin:0;padding:10px 0;border-top:1px solid #EBE7DA;border-bottom:1px solid #EBE7DA;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#64705F;"><strong style="color:#1D2A22;">Your decision, in your time.</strong> Requesting an invitation commits you to nothing \u2014 membership begins only if and when it feels right.</p>
      <p style="margin:30px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.65;color:#64705F;text-align:center;">Warmly,<br><span style="font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#1D2A22;">The Care Club team at Vitalis</span></p>
    </div>
    <p style="margin:26px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#A3AC9C;text-align:center;">${LEAD_FOOTER}<br><a href="mailto:careclub@vitalishealthcare.com" style="color:#64705F;">careclub@vitalishealthcare.com</a></p>
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
        subject: 'Thank you \u2014 your Care Club request is with us',
        html,
      }),
    })
    if (!res.ok) {
      return { sent: false, configured: true, error: 'The email service declined the send.' }
    }
    return { sent: true, configured: true, error: null }
  } catch {
    return { sent: false, configured: true, error: 'Could not reach the email service.' }
  }
}

// Internal notification to the Club team for every new lead (v0.1.12).
export async function sendLeadNotificationEmail({
  lead,
}: {
  lead: {
    name: string
    phone: string | null
    email: string | null
    area: string
    care_for: string | null
    care_recipient_name: string | null
    note: string | null
  }
}): Promise<{ sent: boolean; configured: boolean; error: string | null }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return { sent: false, configured: false, error: null }
  }

  const areaLabels: Record<string, string> = {
    silver_spring: 'Silver Spring',
    rockville_germantown: 'Rockville / Germantown',
    annapolis: 'Annapolis',
    baltimore_county: 'Baltimore County',
  }
  const careForLabels: Record<string, string> = {
    myself: 'Themselves',
    parent: 'A parent',
    spouse_partner: 'A spouse or partner',
    other: 'Someone else',
  }
  const areaLabel = areaLabels[lead.area] ?? lead.area
  const careForLabel = lead.care_for ? (careForLabels[lead.care_for] ?? lead.care_for) : 'Not stated'

  const row = (label: string, value: string) =>
    `<p style="margin:0;padding:8px 0;border-top:1px solid #EBE7DA;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#1D2A22;"><strong style="color:#64705F;font-weight:600;">${label}:</strong> ${value}</p>`

  const html = `
<div style="margin:0;padding:32px 16px;background:#F5F2EA;">
  <div style="max-width:560px;margin:0 auto;background:#FDFCF8;border:1px solid #E2DDCE;border-radius:14px;padding:36px 40px 30px;">
    <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:#5E9420;font-weight:bold;text-align:center;">Vitalis Care Club</p>
    <h1 style="margin:0 0 22px;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:600;color:#1D2A22;text-align:center;">New sign-up: ${lead.name}</h1>
    ${row('Area', areaLabel)}
    ${row('Phone', lead.phone ?? '\u2014')}
    ${row('Email', lead.email ?? '\u2014')}
    ${row('Care is for', careForLabel)}
    ${row('Their name', lead.care_recipient_name ?? '\u2014')}
    ${row('Note', lead.note ?? '\u2014')}
    <p style="margin:22px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#64705F;border-top:1px solid #EBE7DA;padding-top:16px;">Please call them from the Club line so the number matches the one they were told to save.</p>
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
        to: ['careclub@vitalishealthcare.com'],
        subject: `New Care Club sign-up: ${lead.name} (${areaLabel})`,
        html,
      }),
    })
    if (!res.ok) {
      return { sent: false, configured: true, error: 'The email service declined the send.' }
    }
    return { sent: true, configured: true, error: null }
  } catch {
    return { sent: false, configured: true, error: 'Could not reach the email service.' }
  }
}
