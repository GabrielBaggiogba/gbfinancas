// Principais bancos do Brasil, para a tela de escolha. Com a Pluggy ligada, a lista real
// (com logos e ids) vem da API e esta serve só de ordem de destaque.
export type BancoDaLista = { id: number | null; nome: string; logo: string | null; cor: string }

export const BANCOS_PRINCIPAIS: BancoDaLista[] = [
  { id: null, nome: 'Nubank', logo: null, cor: '#820ad1' },
  { id: null, nome: 'Itaú', logo: null, cor: '#ec7000' },
  { id: null, nome: 'Bradesco', logo: null, cor: '#cc092f' },
  { id: null, nome: 'Banco do Brasil', logo: null, cor: '#f9dd16' },
  { id: null, nome: 'Caixa', logo: null, cor: '#005ca9' },
  { id: null, nome: 'Santander', logo: null, cor: '#ec0000' },
  { id: null, nome: 'Inter', logo: null, cor: '#ff7a00' },
  { id: null, nome: 'C6 Bank', logo: null, cor: '#242424' },
  { id: null, nome: 'Mercado Pago', logo: null, cor: '#00b1ea' },
  { id: null, nome: 'PicPay', logo: null, cor: '#21c25e' },
  { id: null, nome: 'BTG Pactual', logo: null, cor: '#0b2d58' },
  { id: null, nome: 'Sicoob', logo: null, cor: '#003641' },
  { id: null, nome: 'Sicredi', logo: null, cor: '#33820d' },
  { id: null, nome: 'Banrisul', logo: null, cor: '#0058a8' },
  { id: null, nome: 'Neon', logo: null, cor: '#00d1ff' },
  { id: null, nome: 'PagBank', logo: null, cor: '#1bb99a' },
]

const sem = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Posição de destaque: principais primeiro, na ordem acima; o resto em ordem alfabética. */
export function ordenarBancos(lista: BancoDaLista[]): BancoDaLista[] {
  const peso = (nome: string) => {
    const i = BANCOS_PRINCIPAIS.findIndex((b) => sem(nome).includes(sem(b.nome)))
    return i < 0 ? 999 : i
  }
  return [...lista].sort(
    (a, b) => peso(a.nome) - peso(b.nome) || a.nome.localeCompare(b.nome, 'pt-BR'),
  )
}

export const buscaBanco = (b: BancoDaLista, termo: string) =>
  sem(b.nome).includes(sem(termo.trim()))
