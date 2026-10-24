import { createHmac } from 'node:crypto'
import { afterEach, describe, expect, it } from 'vitest'
import { assinaturaValida } from './api'

const assinar = (corpo: string, segredo: string) =>
  'sha256=' + createHmac('sha256', segredo).update(corpo).digest('hex')

describe('assinaturaValida', () => {
  afterEach(() => {
    delete process.env.WHATSAPP_APP_SECRET
  })

  it('aceita só o corpo assinado com o segredo do app', () => {
    process.env.WHATSAPP_APP_SECRET = 'segredo'
    const corpo = '{"entry":[]}'
    expect(assinaturaValida(corpo, assinar(corpo, 'segredo'))).toBe(true)
    expect(assinaturaValida(corpo + ' ', assinar(corpo, 'segredo'))).toBe(false)
    expect(assinaturaValida(corpo, assinar(corpo, 'outro'))).toBe(false)
    expect(assinaturaValida(corpo, null)).toBe(false)
    expect(assinaturaValida(corpo, 'sha256=abc')).toBe(false)
  })

  it('recusa tudo quando o segredo não está configurado', () => {
    const corpo = '{}'
    expect(assinaturaValida(corpo, assinar(corpo, ''))).toBe(false)
  })
})
