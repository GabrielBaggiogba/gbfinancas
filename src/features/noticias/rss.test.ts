import { describe, expect, it } from 'vitest'
import { encurtar, interpretarDataDoFeed, lerFeed, textoPuro } from './rss'
import { classificar } from './temas'

const RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/">
<channel><title>Portal</title>
<item>
  <title><![CDATA[Ibovespa sobe 1,2% &amp; dólar cai]]></title>
  <link>https://exemplo.com/a?x=1&amp;y=2</link>
  <pubDate>Tue, 06 Oct 2026 22:23:11 +0000</pubDate>
  <category><![CDATA[Mercados]]></category><category>Ações</category>
  <description><![CDATA[<p>O índice <strong>fechou</strong> em alta&nbsp;hoje.</p><script>alert(1)</script>]]></description>
  <content:encoded><![CDATA[<figure><img src="https://cdn.exemplo.com/foto.jpg?w=800" alt=""></figure><p>Texto longo.</p>]]></content:encoded>
</item>
<item>
  <title>Selic: Copom mantém juros</title>
  <link>https://exemplo.com/b</link>
  <pubDate>2026-10-07T09:43:15</pubDate>
  <enclosure url="https://cdn.exemplo.com/capa" type="image/jpeg" length="1"/>
  <description>Decis&#227;o un&#xE2;nime.</description>
</item>
<item>
  <title>Vídeo do dia</title>
  <link>javascript:alert(1)</link>
  <description>não deve entrar</description>
</item>
<item>
  <title>Só com imagem de destaque</title>
  <link>/relativo/c</link>
  <imagem-destaque>https://cdn.exemplo.com/destaque.png</imagem-destaque>
  <media:content url="https://cdn.exemplo.com/video.mp4" type="video/mp4"/>
</item>
</channel></rss>`

const ATOM = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom"><title>BC</title>
<entry>
  <title type="html">BC divulga indicadores</title>
  <link rel="alternate" href="https://www.bcb.gov.br/detalhenoticia/1/nota"/>
  <updated>2026-10-06T15:00:00-03:00</updated>
  <summary type="html">&lt;p&gt;Novo relatório mensal.&lt;/p&gt;</summary>
  <category term="Notas"/>
</entry>
</feed>`

describe('lerFeed', () => {
  const itens = lerFeed(RSS, 'https://exemplo.com/feed/')

  it('lê título, link, resumo em texto puro, imagem, data e categorias', () => {
    expect(itens[0]).toEqual({
      titulo: 'Ibovespa sobe 1,2% & dólar cai',
      link: 'https://exemplo.com/a?x=1&y=2',
      resumo: 'O índice fechou em alta hoje.',
      imagem: 'https://cdn.exemplo.com/foto.jpg?w=800',
      publicado_em: '2026-10-06T22:23:11.000Z',
      categorias: ['Mercados', 'Ações'],
    })
  })

  it('aceita anexo de imagem sem extensão, entidades numéricas e data sem fuso', () => {
    expect(itens[1].imagem).toBe('https://cdn.exemplo.com/capa')
    expect(itens[1].resumo).toBe('Decisão unânime.')
    expect(itens[1].publicado_em).toBe('2026-10-07T12:43:15.000Z')
  })

  it('descarta link que não é http e resolve link relativo', () => {
    expect(itens).toHaveLength(3)
    expect(itens[2].link).toBe('https://exemplo.com/relativo/c')
    expect(itens[2].imagem).toBe('https://cdn.exemplo.com/destaque.png')
    expect(itens[2].publicado_em).toBeNull()
  })

  it('lê Atom', () => {
    expect(lerFeed(ATOM, 'https://www.bcb.gov.br/')).toEqual([
      {
        titulo: 'BC divulga indicadores',
        link: 'https://www.bcb.gov.br/detalhenoticia/1/nota',
        resumo: 'Novo relatório mensal.',
        imagem: null,
        publicado_em: '2026-10-06T18:00:00.000Z',
        categorias: ['Notas'],
      },
    ])
  })

  it('devolve lista vazia para conteúdo que não é feed', () => {
    expect(lerFeed('<html><body>bloqueado</body></html>', 'https://exemplo.com')).toEqual([])
  })
})

describe('texto e datas', () => {
  it('tira tags e scripts', () => {
    expect(textoPuro('<p>Oi <b>mundo</b></p><style>p{}</style>')).toBe('Oi mundo')
  })
  it('encurta em limite de palavra', () => {
    const t = encurtar('palavra '.repeat(60).trim(), 50)
    expect(t.length).toBeLessThanOrEqual(51)
    expect(t.endsWith('…')).toBe(true)
  })
  it('rejeita data inválida', () => {
    expect(interpretarDataDoFeed('ontem')).toBeNull()
  })
})

describe('classificar', () => {
  it.each([
    ['Bitcoin renova máxima', [], 'cripto'],
    ['Como declarar o Imposto de Renda', [], 'financas-pessoais'],
    ['PETR4 dispara após balanço', [], 'investimentos'],
    ['TGAR11 sobe', ['FIIs'], 'investimentos'],
    ['Copom mantém Selic', [], 'economia'],
    ['Startup capta R$ 10 milhões', [], 'negocios'],
    ['Filme estreia na sexta', ['Pop'], 'geral'],
  ] as const)('%s -> %s', (titulo, categorias, tema) => {
    expect(classificar(titulo, [...categorias])).toBe(tema)
  })
})
