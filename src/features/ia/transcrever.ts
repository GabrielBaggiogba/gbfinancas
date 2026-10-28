import 'server-only'

// Transcrição de áudio por uma API compatível com a da OpenAI (/audio/transcriptions).
// Por padrão usa a Groq (Whisper, rápido e barato); dá para apontar para a OpenAI pela URL.
const URL_PADRAO = 'https://api.groq.com/openai/v1'
const MODELO_PADRAO = 'whisper-large-v3-turbo'
export const LIMITE_AUDIO = 4 * 1024 * 1024

export const TIPOS_DE_AUDIO = [
  'audio/ogg',
  'audio/opus',
  'audio/mpeg',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/aac',
  'audio/amr',
  'audio/wav',
  'audio/webm',
] as const

export const transcricaoAtiva = () => Boolean(process.env.GBF_TRANSCRICAO_KEY)

const EXTENSAO: Record<string, string> = {
  'audio/ogg': 'ogg',
  'audio/opus': 'ogg',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/m4a': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/aac': 'm4a',
  'audio/amr': 'amr',
  'audio/wav': 'wav',
  'audio/webm': 'webm',
}

export class ErroDeTranscricao extends Error {}

/** Devolve o texto falado no áudio (em português). */
export async function transcrever(audio: { tipo: string; base64: string }): Promise<string> {
  if (!transcricaoAtiva())
    throw new ErroDeTranscricao('A leitura de áudio está desligada no momento.')
  const tipo = audio.tipo.split(';')[0]
  if (!(tipo in EXTENSAO)) throw new ErroDeTranscricao('Formato de áudio não suportado.')
  const bytes = Buffer.from(audio.base64, 'base64')
  if (!bytes.length || bytes.length > LIMITE_AUDIO)
    throw new ErroDeTranscricao('O áudio precisa ter até 4 MB (uns 3 minutos).')

  const corpo = new FormData()
  corpo.append('file', new Blob([bytes], { type: tipo }), `audio.${EXTENSAO[tipo]}`)
  corpo.append('model', process.env.GBF_TRANSCRICAO_MODELO || MODELO_PADRAO)
  corpo.append('language', 'pt')
  corpo.append('response_format', 'json')

  const base = (process.env.GBF_TRANSCRICAO_URL || URL_PADRAO).replace(/\/+$/, '')
  const r = await fetch(`${base}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.GBF_TRANSCRICAO_KEY}` },
    body: corpo,
    signal: AbortSignal.timeout(30_000),
  }).catch(() => null)
  if (!r?.ok) {
    console.error('transcrição falhou', r?.status, await r?.text().catch(() => ''))
    throw new ErroDeTranscricao('Não consegui ouvir o áudio agora. Tente de novo.')
  }
  const { text } = (await r.json()) as { text?: string }
  const fala = (text ?? '').trim()
  if (!fala) throw new ErroDeTranscricao('Não entendi nada no áudio. Fale mais perto do microfone.')
  return fala
}
