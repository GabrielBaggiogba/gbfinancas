// Extrato OFX, o formato que os bancos exportam. Lê cada <STMTTRN>: data, valor (negativo é
// saída) e descrição. Serve tanto para OFX 1 (SGML, sem tags de fechamento) quanto 2 (XML).

import { dataValida } from './datas'
import type { LinhaImportada } from './csv'

const campo = (bloco: string, nome: string) =>
  new RegExp(`<${nome}>([^<\r\n]*)`, 'i').exec(bloco)?.[1]?.trim() ?? ''

export function pareceOfx(texto: string): boolean {
  return /OFXHEADER|<OFX>/i.test(texto.slice(0, 2000))
}

export function interpretarOfx(texto: string): { linhas: LinhaImportada[]; ignoradas: number } {
  const linhas: LinhaImportada[] = []
  let ignoradas = 0
  for (const [, bloco] of texto.matchAll(
    /<STMTTRN>([\s\S]*?)(?=<\/STMTTRN>|<STMTTRN>|<\/BANKTRANLIST>)/gi,
  )) {
    const d = campo(bloco, 'DTPOSTED')
    const data = d.length >= 8 ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : ''
    const bruto = campo(bloco, 'TRNAMT').replace(',', '.')
    const numero = Number(bruto)
    const valor = Math.round(Math.abs(numero) * 100)
    if (!dataValida(data) || !bruto || !Number.isFinite(numero) || valor === 0) {
      ignoradas++
      continue
    }
    const descricao = (campo(bloco, 'MEMO') || campo(bloco, 'NAME') || campo(bloco, 'PAYEE'))
      .replace(/\s+/g, ' ')
      .slice(0, 120)
    linhas.push({ data, descricao, valor, entrada: numero > 0 })
  }
  return { linhas, ignoradas }
}
