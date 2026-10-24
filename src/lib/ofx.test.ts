import { describe, expect, it } from 'vitest'
import { interpretarOfx, pareceOfx } from './ofx'

const SGML = `OFXHEADER:100
DATA:OFXSGML
<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261012000000[-3:BRT]
<TRNAMT>-187.40
<FITID>1
<MEMO>COMPRA CARTAO   SUPERMERCADO BOM
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20261005
<TRNAMT>6500,00
<NAME>SALARIO EMPRESA X
<STMTTRN>
<DTPOSTED>2026
<TRNAMT>10.00
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`

const XML = `<?xml version="1.0"?><?OFX OFXHEADER="200"?><OFX><BANKTRANLIST>
<STMTTRN><DTPOSTED>20261020</DTPOSTED><TRNAMT>-32.5</TRNAMT><MEMO>Almoço</MEMO></STMTTRN>
</BANKTRANLIST></OFX>`

describe('interpretarOfx', () => {
  it('lê OFX 1 (SGML): saídas negativas, entradas positivas, vírgula ou ponto', () => {
    expect(pareceOfx(SGML)).toBe(true)
    expect(interpretarOfx(SGML)).toEqual({
      linhas: [
        {
          data: '2026-10-12',
          descricao: 'COMPRA CARTAO SUPERMERCADO BOM',
          valor: 18740,
          entrada: false,
        },
        { data: '2026-10-05', descricao: 'SALARIO EMPRESA X', valor: 650000, entrada: true },
      ],
      ignoradas: 1,
    })
  })
  it('lê OFX 2 (XML)', () => {
    expect(interpretarOfx(XML).linhas).toEqual([
      { data: '2026-10-20', descricao: 'Almoço', valor: 3250, entrada: false },
    ])
  })
  it('não confunde CSV com OFX', () => {
    expect(pareceOfx('data;descricao;valor\n01/10/2026;Mercado;-10')).toBe(false)
  })
})
