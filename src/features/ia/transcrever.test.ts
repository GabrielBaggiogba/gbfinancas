import { afterEach, describe, expect, it, vi } from 'vitest'
import { ErroDeTranscricao, transcrever } from './transcrever'

const audio = { tipo: 'audio/ogg; codecs=opus', base64: Buffer.from('oi').toString('base64') }

describe('transcrever', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('fica desligada sem chave', async () => {
    vi.stubEnv('GBF_TRANSCRICAO_KEY', '')
    await expect(transcrever(audio)).rejects.toBeInstanceOf(ErroDeTranscricao)
  })

  it('manda o arquivo em português e devolve o texto', async () => {
    vi.stubEnv('GBF_TRANSCRICAO_KEY', 'teste')
    const chamada = vi.fn(async (_url: string, _init: RequestInit) =>
      Response.json({ text: ' gastei 45 no mercado ontem ' }),
    )
    vi.stubGlobal('fetch', chamada)
    expect(await transcrever(audio)).toBe('gastei 45 no mercado ontem')
    const [url, init] = chamada.mock.calls[0]
    expect(url).toBe('https://api.groq.com/openai/v1/audio/transcriptions')
    const corpo = init.body as FormData
    expect(corpo.get('language')).toBe('pt')
    expect((corpo.get('file') as File).name).toBe('audio.ogg')
  })

  it('recusa formato que não é áudio', async () => {
    vi.stubEnv('GBF_TRANSCRICAO_KEY', 'teste')
    await expect(transcrever({ tipo: 'image/png', base64: 'AA==' })).rejects.toThrow('Formato')
  })
})
