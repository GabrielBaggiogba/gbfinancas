import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { adminAtivo } from '@/lib/supabase/admin'

// WhatsApp Cloud API (Meta). Variáveis: WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, WHATSAPP_APP_SECRET,
// WHATSAPP_VERIFY_TOKEN, WHATSAPP_NUMERO (só dígitos, para o link wa.me) e, para lembretes,
// WHATSAPP_TEMPLATE_LEMBRETE (modelo aprovado com um parâmetro no corpo).

const GRAPH = 'https://graph.facebook.com/v21.0'

export function whatsappAtivo(): boolean {
  return Boolean(
    process.env.WHATSAPP_TOKEN?.trim() &&
    process.env.WHATSAPP_PHONE_ID?.trim() &&
    process.env.WHATSAPP_APP_SECRET?.trim() &&
    adminAtivo(),
  )
}

export const numeroDoBot = () => process.env.WHATSAPP_NUMERO?.replace(/\D/g, '') || null

/** Confere a assinatura X-Hub-Signature-256 do corpo bruto. */
export function assinaturaValida(corpo: string, assinatura: string | null): boolean {
  const segredo = process.env.WHATSAPP_APP_SECRET
  if (!segredo || !assinatura?.startsWith('sha256=')) return false
  const esperado = Buffer.from(createHmac('sha256', segredo).update(corpo).digest('hex'))
  const recebido = Buffer.from(assinatura.slice(7))
  return esperado.length === recebido.length && timingSafeEqual(esperado, recebido)
}

async function chamar(caminho: string, corpo: unknown) {
  const r = await fetch(`${GRAPH}/${process.env.WHATSAPP_PHONE_ID}/${caminho}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(corpo),
    signal: AbortSignal.timeout(10_000),
  })
  if (!r.ok) console.error('[whatsapp]', caminho, r.status, (await r.text()).slice(0, 300))
  return r.ok
}

export function enviarTexto(para: string, texto: string) {
  return chamar('messages', {
    messaging_product: 'whatsapp',
    to: para,
    type: 'text',
    text: { body: texto.slice(0, 4000) },
  })
}

/** Mensagem iniciada pelo app (fora da janela de 24 h): exige um modelo aprovado pela Meta. */
export function enviarModelo(para: string, parametro: string) {
  const modelo = process.env.WHATSAPP_TEMPLATE_LEMBRETE
  if (!modelo) return Promise.resolve(false)
  return chamar('messages', {
    messaging_product: 'whatsapp',
    to: para,
    type: 'template',
    template: {
      name: modelo,
      language: { code: 'pt_BR' },
      components: [
        { type: 'body', parameters: [{ type: 'text', text: parametro.slice(0, 1000) }] },
      ],
    },
  })
}

/** Baixa uma foto ou documento recebido. Até 4 MB. */
export async function baixarMidia(id: string): Promise<{ tipo: string; base64: string } | null> {
  const auth = { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` }
  const meta = await fetch(`${GRAPH}/${encodeURIComponent(id)}`, {
    headers: auth,
    signal: AbortSignal.timeout(10_000),
  })
  if (!meta.ok) return null
  const info = (await meta.json()) as { url?: string; mime_type?: string; file_size?: number }
  if (!info.url || (info.file_size ?? 0) > 4 * 1024 * 1024) return null
  // O token vai junto no download: só para endereços da própria Meta.
  const host = new URL(info.url).hostname
  if (!/(^|\.)(fbsbx\.com|whatsapp\.net|facebook\.com|fbcdn\.net)$/.test(host)) return null
  const arquivo = await fetch(info.url, { headers: auth, signal: AbortSignal.timeout(15_000) })
  if (!arquivo.ok) return null
  const bytes = Buffer.from(await arquivo.arrayBuffer())
  if (bytes.length > 4 * 1024 * 1024) return null
  return { tipo: (info.mime_type ?? '').split(';')[0], base64: bytes.toString('base64') }
}
