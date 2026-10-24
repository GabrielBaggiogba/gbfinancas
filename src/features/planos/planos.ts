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
      'Open Finance: contas sincronizadas (em breve)',
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
