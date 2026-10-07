// Molas da casa (apple-design): resposta e amortecimento no lugar de duração fixa.
// Padrão criticamente amortecido; "viva" tem um pouco de ressalto e fica reservada
// para movimentos que vêm de um gesto ou de uma chegada.

export const MOLA = { type: 'spring', bounce: 0, duration: 0.45 } as const
export const MOLA_RAPIDA = { type: 'spring', bounce: 0, duration: 0.3 } as const
export const MOLA_PAINEL = { type: 'spring', bounce: 0, duration: 0.6 } as const
export const MOLA_VIVA = { type: 'spring', bounce: 0.22, duration: 0.5 } as const

/** Curvas do catálogo Krivvo, para animações com duração (traços, varreduras). */
export const CURVA_MOLA = [0.32, 0.72, 0, 1] as const
export const CURVA_SAIDA = [0.22, 1, 0.36, 1] as const
export const CURVA_FIO = [0.55, 0, 0.25, 1] as const

/** Projeção de impulso da Apple: onde o gesto pararia sozinho. */
export function projetar(velocidade: number, desaceleracao = 0.998): number {
  return ((velocidade / 1000) * desaceleracao) / (1 - desaceleracao)
}

/** Resistência elástica além do limite. */
export function elastico(excesso: number, dimensao: number, constante = 0.55): number {
  return (excesso * dimensao * constante) / (dimensao + constante * Math.abs(excesso))
}
