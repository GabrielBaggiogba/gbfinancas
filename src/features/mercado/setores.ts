// Setores da brapi (em inglês, no padrão do TradingView) com nome em português.
const SETORES: Record<string, string> = {
  'Retail Trade': 'Varejo',
  'Energy Minerals': 'Petróleo e energia',
  'Health Services': 'Serviços de saúde',
  Utilities: 'Utilidade pública',
  Finance: 'Financeiro',
  'Consumer Services': 'Serviços ao consumidor',
  'Consumer Non-Durables': 'Bens de consumo',
  'Non-Energy Minerals': 'Mineração e siderurgia',
  'Commercial Services': 'Serviços comerciais',
  'Distribution Services': 'Distribuição',
  Transportation: 'Transporte',
  'Technology Services': 'Tecnologia',
  'Process Industries': 'Indústria de base',
  Communications: 'Comunicações',
  'Producer Manufacturing': 'Bens industriais',
  Miscellaneous: 'Diversos',
  'Electronic Technology': 'Eletrônicos',
  'Industrial Services': 'Serviços industriais',
  'Health Technology': 'Saúde e farmácia',
  'Consumer Durables': 'Bens duráveis',
}

export function nomeDoSetor(setor: string | null): string {
  if (!setor) return '—'
  return SETORES[setor] ?? setor
}
