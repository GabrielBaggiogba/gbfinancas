// Funções puras de dinheiro. Tudo em centavos inteiros; nada de Intl, para que
// servidor e cliente produzam exatamente o mesmo texto.

export const MAX_CENTAVOS = 9_999_999_999

function comMilhar(inteiro: number): string {
  return String(inteiro).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/** 123456 -> "1.234,56" */
export function formatarCentavos(c: number): string {
  const abs = Math.abs(Math.trunc(c))
  const reais = Math.floor(abs / 100)
  const cents = abs % 100
  return `${comMilhar(reais)},${String(cents).padStart(2, '0')}`
}

/** 123456 -> "R$ 1.234,56"; negativo -> "− R$ 1.234,56" (U+2212) */
export function formatarReais(c: number): string {
  const base = `R$ ${formatarCentavos(c)}`
  return c < 0 ? `− ${base}` : base
}

/** Máscara de centavos: só dígitos, no máximo 10. */
export function digitosParaCentavos(texto: string): number {
  const digitos = texto.replace(/\D/g, '').slice(0, 10)
  return digitos === '' ? 0 : Number(digitos)
}

/** Interpreta texto colado. Devolve centavos ou null se não der para entender. */
export function interpretarMoeda(texto: string): number | null {
  const limpo = texto.replace(/R\$/gi, '').replace(/\s+/g, '')
  if (limpo === '' || /[^0-9.,]/.test(limpo)) return null

  const temPonto = limpo.includes('.')
  const temVirgula = limpo.includes(',')
  let inteiro = limpo
  let decimal = ''

  if (temPonto && temVirgula) {
    const sep = limpo.lastIndexOf(',') > limpo.lastIndexOf('.') ? ',' : '.'
    const outro = sep === ',' ? '.' : ','
    const i = limpo.lastIndexOf(sep)
    inteiro = limpo.slice(0, i).split(outro).join('')
    decimal = limpo.slice(i + 1)
    if (inteiro.includes(sep)) return null
  } else if (temVirgula) {
    const partes = limpo.split(',')
    const ultimo = partes[partes.length - 1]
    if (partes.length === 2 && ultimo.length >= 1 && ultimo.length <= 2) {
      inteiro = partes[0]
      decimal = ultimo
    } else {
      inteiro = partes.join('')
    }
  } else if (temPonto) {
    const partes = limpo.split('.')
    const ultimo = partes[partes.length - 1]
    if (partes.length === 2 && ultimo.length >= 1 && ultimo.length <= 2) {
      inteiro = partes[0]
      decimal = ultimo
    } else {
      inteiro = partes.join('')
    }
  }

  if (!/^\d*$/.test(inteiro) || !/^\d*$/.test(decimal)) return null
  if (inteiro === '' && decimal === '') return null
  const valor = Number(`${inteiro || '0'}.${decimal || '0'}`)
  if (!Number.isFinite(valor)) return null
  const centavos = Math.round(valor * 100)
  return centavos > MAX_CENTAVOS ? null : centavos
}

export function reaisParaCentavos(v: number | string): number {
  return Math.round(Number(v) * 100)
}

export function centavosParaReais(c: number): number {
  return c / 100
}
