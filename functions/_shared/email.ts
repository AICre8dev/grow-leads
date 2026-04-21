// Resend email sender. Uses fetch directly to avoid SDK bundle size in Workers.

export interface SendEmailOpts {
  to: string;
  subject: string;
  html: string;
  from: string;
  replyTo?: string;
}

export async function sendEmail(apiKey: string, opts: SendEmailOpts) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: opts.from,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
      reply_to: opts.replyTo,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend failed: ${res.status} ${text}`);
  }
  return await res.json();
}

export function renderOutreachEmail(opts: {
  businessName: string;
  siteUrl: string;
  template: string;
}): { subject: string; html: string } {
  const vars: Record<string, string> = {
    business_name: opts.businessName,
    preview_url: opts.siteUrl,
  };
  const body = opts.template.replace(/\{\{(\w+)\}\}/g, (_m, k) => vars[k] || '');

  const subject = `A free website mockup for ${opts.businessName}`;

  const html = `<!doctype html>
<html><head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #0a0a0a; line-height: 1.55;">
  ${body
    .split('\n\n')
    .map((p) => `<p style="margin: 0 0 16px;">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('')}
  <p style="margin: 24px 0;">
    <a href="${opts.siteUrl}" style="display: inline-block; background: #0a0a0a; color: white; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 500;">View your preview site →</a>
  </p>
  <p style="margin-top: 32px; font-size: 12px; color: #6b7280;">
    This is a one-time preview. Reply to this email if you'd like to make it yours or are not interested — we'll remove you from our list.
  </p>
</body></html>`;

  return { subject, html };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
