// Leitor mínimo de RSS 2.0 e Atom, sem dependências. Devolve só o que a tela usa:
// título, resumo curto em texto puro, link, imagem, data e categorias.

export type ItemDeFeed = {
  titulo: string
  link: string
  resumo: string
  imagem: string | null
  publicado_em: string | null
  categorias: string[]
}

const ENTIDADES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  hellip: '…',
  ndash: '–',
  mdash: '—',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  laquo: '«',
  raquo: '»',
}

export function decodificar(texto: string): string {
  return texto.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (tudo, nome: string) => {
    if (nome[0] === '#') {
      const codigo =
        nome[1].toLowerCase() === 'x' ? parseInt(nome.slice(2), 16) : Number(nome.slice(1))
      return Number.isFinite(codigo) && codigo > 0 && codigo < 0x110000
        ? String.fromCodePoint(codigo)
        : ''
    }
    return ENTIDADES[nome.toLowerCase()] ?? tudo
  })
}

/** Conteúdo cru da primeira ocorrência da tag (CDATA desembrulhado). */
function tag(bloco: string, nome: string): string {
  const m = new RegExp(`<${nome}(?:\\s[^>]*)?>([\\s\\S]*?)</${nome}>`, 'i').exec(bloco)
  if (!m) return ''
  return m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim()
}

function todas(bloco: string, nome: string): string[] {
  const re = new RegExp(`<${nome}(?:\\s[^>]*)?>([\\s\\S]*?)</${nome}>`, 'gi')
  const lista: string[] = []
  for (let m = re.exec(bloco); m; m = re.exec(bloco))
    lista.push(m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim())
  return lista
}

function atributo(bloco: string, nomeDaTag: string, attr: string): string[] {
  const re = new RegExp(`<${nomeDaTag}\\s[^>]*?${attr}\\s*=\\s*["']([^"']+)["'][^>]*>`, 'gi')
  const lista: string[] = []
  for (let m = re.exec(bloco); m; m = re.exec(bloco)) lista.push(m[1])
  return lista
}

/** HTML -> texto puro em uma linha. */
export function textoPuro(html: string): string {
  const semTags = decodificar(html)
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
  return decodificar(semTags).replace(/\s+/g, ' ').trim()
}

export function encurtar(texto: string, limite = 220): string {
  if (texto.length <= limite) return texto
  const corte = texto.slice(0, limite)
  const espaco = corte.lastIndexOf(' ')
  return `${corte.slice(0, espaco > limite * 0.6 ? espaco : limite).replace(/[\s,.;:–—-]+$/, '')}…`
}

function urlSegura(valor: string, base?: string): string | null {
  try {
    const url = new URL(decodificar(valor.trim()), base)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null
  } catch {
    return null
  }
}

/** Datas sem fuso (como as do feed da Exame) são tratadas como horário de Brasília. */
export function interpretarDataDoFeed(valor: string): string | null {
  const t = valor.trim()
  if (!t) return null
  const semFuso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?$/.test(t)
  const ms = Date.parse(semFuso ? `${t}-03:00` : t)
  return Number.isNaN(ms) ? null : new Date(ms).toISOString()
}

const EH_IMAGEM = /\.(jpe?g|png|webp|gif|avif)(\?|$)/i

function acharImagem(bloco: string, html: string, base: string): string | null {
  const anexoDeImagem = /<enclosure\s[^>]*type\s*=\s*["']image\//i.test(bloco)
  // Tags que só existem para a imagem de capa valem mesmo sem extensão no endereço.
  const diretas = [
    ...atributo(bloco, 'media:thumbnail', 'url'),
    tag(bloco, 'mediaurl'),
    tag(bloco, 'imagem-destaque'),
    ...(anexoDeImagem ? atributo(bloco, 'enclosure', 'url') : []),
  ]
  const porExtensao = [
    ...atributo(bloco, 'media:content', 'url'),
    ...atributo(bloco, 'enclosure', 'url'),
    ...atributo(decodificar(html), 'img', 'src'),
  ].filter((u) => EH_IMAGEM.test(u))
  for (const c of [...diretas, ...porExtensao]) {
    if (!c) continue
    const url = urlSegura(c, base)
    if (url && url.startsWith('https://')) return url
  }
  return null
}

export function lerFeed(xml: string, base: string): ItemDeFeed[] {
  const atom = !/<item[\s>]/i.test(xml) && /<entry[\s>]/i.test(xml)
  const blocos = xml.match(atom ? /<entry[\s>][\s\S]*?<\/entry>/gi : /<item[\s>][\s\S]*?<\/item>/gi)
  if (!blocos) return []
  const itens: ItemDeFeed[] = []
  for (const bloco of blocos) {
    const titulo = textoPuro(tag(bloco, 'title'))
    const bruto = atom
      ? (atributo(bloco, 'link', 'href')[0] ?? '')
      : tag(bloco, 'link') || tag(bloco, 'guid')
    const link = urlSegura(bruto, base)
    if (!titulo || !link) continue
    const descricao = tag(bloco, atom ? 'summary' : 'description')
    const completo = tag(bloco, atom ? 'content' : 'content:encoded')
    const resumo = textoPuro(descricao) || textoPuro(completo)
    itens.push({
      titulo,
      link,
      // Só um trecho: a matéria inteira fica no site de origem.
      resumo: resumo === titulo ? '' : encurtar(resumo),
      imagem: acharImagem(bloco, `${descricao} ${completo}`, base),
      publicado_em: interpretarDataDoFeed(
        atom
          ? tag(bloco, 'published') || tag(bloco, 'updated')
          : tag(bloco, 'pubDate') || tag(bloco, 'dc:date'),
      ),
      categorias: atom
        ? atributo(bloco, 'category', 'term').map(decodificar)
        : todas(bloco, 'category').map(textoPuro),
    })
  }
  return itens
}
