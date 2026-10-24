// Planos de assinatura. Preços em centavos; o anual custa 10 mensalidades (2 meses grátis).

export type PlanoId = 'essencial' | 'completo' | 'familia'
export type PlanoDoUsuario = PlanoId | 'fundador' | null

export type Plano = {
  id: PlanoId
  nome: string
  resumo: string
  mensal: number
  destaque?: boolean
  recursos: string[]
}

export const PLANOS: Plano[] = [
  {
    id: 'essencial',
    nome: 'Essencial',
    resumo: 'Para organizar a vida financeira sozinho.',
    mensal: 1990,
    recursos: [
      'Painel, lançamentos, relatórios e exportação',
      'Até 3 contas e 2 cartões de crédito',
      'Orçamentos com alertas e metas',
      'Contas recorrentes e fluxo de caixa',
      'Categorização automática com IA',
      'Pergunte ao Grão: assistente que responde sobre o seu dinheiro',
      'Importação de extrato OFX e CSV',
      'Lançar por foto de nota, PDF ou voz no app',
    ],
  },
  {
    id: 'completo',
    nome: 'Completo',
    resumo: 'Tudo no automático, direto do WhatsApp.',
    mensal: 2990,
    destaque: true,
    recursos: [
      'Tudo do Essencial',
      'Contas e cartões ilimitados',
      'Lançar pelo WhatsApp com texto, foto ou PDF',
      'Lembretes de contas no WhatsApp e por e-mail',
      'Open Finance: conecte seus bancos e os lançamentos entram sozinhos',
    ],
  },
  {
    id: 'familia',
    nome: 'Família',
    resumo: 'Finanças da casa, cada um no seu WhatsApp.',
    mensal: 4990,
    recursos: [
      'Tudo do Completo',
      'Gestão compartilhada com até 5 pessoas',
      'Cada pessoa lança pelo próprio WhatsApp',
      'Saiba quem lançou cada gasto',
      'Metas e orçamentos da família',
    ],
  },
]

export const anual = (p: Plano) => p.mensal * 10

/** Cobrança ainda não abriu: todo mundo usa tudo. Liga com GBF_COBRANCA_ATIVA=1. */
export function cobrancaAtiva(): boolean {
  return process.env.GBF_COBRANCA_ATIVA === '1'
}

export function acessoTotal(plano: PlanoDoUsuario, cobranca: boolean): boolean {
  return !cobranca || plano === 'fundador' || plano === 'familia'
}

export const NOME_DO_PLANO: Record<Exclude<PlanoDoUsuario, null>, string> = {
  fundador: 'Fundador',
  essencial: 'Essencial',
  completo: 'Completo',
  familia: 'Família',
}

// O que cada plano libera. Só vale com a cobrança ligada; antes disso, todos têm tudo.
export type Limites = {
  contas: number
  cartoes: number
  whatsapp: boolean
  lembretes: boolean
  openFinance: boolean
  familia: boolean
}
const TUDO: Limites = {
  contas: Infinity,
  cartoes: Infinity,
  whatsapp: true,
  lembretes: true,
  openFinance: true,
  familia: true,
}
const LIMITES: Record<Exclude<PlanoDoUsuario, null>, Limites> = {
  fundador: TUDO,
  familia: TUDO,
  completo: { ...TUDO, familia: false },
  essencial: {
    contas: 3,
    cartoes: 2,
    whatsapp: false,
    lembretes: false,
    openFinance: false,
    familia: false,
  },
}

/** Sem assinatura (com a cobrança ligada), valem os limites do Essencial. */
export function limitesDe(plano: PlanoDoUsuario, cobranca: boolean): Limites {
  if (!cobranca) return TUDO
  return LIMITES[plano ?? 'essencial']
}

export const PLANO_MINIMO: Record<Exclude<keyof Limites, 'contas' | 'cartoes'>, string> = {
  whatsapp: 'Completo',
  lembretes: 'Completo',
  openFinance: 'Completo',
  familia: 'Família',
}
