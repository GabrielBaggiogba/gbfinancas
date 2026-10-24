import 'server-only'

// E-mail pela Resend (resend.com). Variáveis: RESEND_API_KEY e GBF_EMAIL_REMETENTE,
// por exemplo "GBFinanças <avisos@seudominio.com>" (o domínio precisa estar verificado na Resend).

export function emailAtivo(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.GBF_EMAIL_REMETENTE?.trim())
}

export async function enviarEmail(para: string, assunto: string, texto: string, html: string) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.GBF_EMAIL_REMETENTE,
      to: [para],
      subject: assunto,
      text: texto,
      html,
    }),
    signal: AbortSignal.timeout(10_000),
  })
  if (!r.ok) console.error('[email]', r.status, (await r.text()).slice(0, 300))
  return r.ok
}
