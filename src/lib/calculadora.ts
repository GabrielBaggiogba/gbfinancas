// Calculadora de quatro operações, sem `eval`. Aceita vírgula ou ponto decimal, ponto de
// milhar ("1.500,00"), parênteses e porcentagem como nas calculadoras de bolso:
// "200 + 10%" soma 10% de 200; "200 × 10%" multiplica por 0,1.

type Valor = { v: number; pct: boolean }

function lerNumero(texto: string): number {
  if (texto.includes(',')) return Number(texto.replace(/\./g, '').replace(',', '.'))
  if (/^\d{1,3}(\.\d{3})+$/.test(texto)) return Number(texto.replace(/\./g, ''))
  return Number(texto)
}

/** Resultado da expressão, ou null se ela estiver incompleta ou inválida. */
export function calcular(expressao: string): number | null {
  const fichas = expressao
    .replace(/[x×]/gi, '*')
    .replace(/[÷:]/g, '/')
    .replace(/−/g, '-')
    .match(/\d[\d.]*(?:,\d+)?|[-+*/()%]|\S/g)
  if (!fichas) return null
  let i = 0

  function fator(): Valor {
    const f = fichas![i++]
    let v: number
    if (f === '-') return { v: -fator().v, pct: false }
    if (f === '(') {
      v = soma()
      if (fichas![i++] !== ')') throw new Error('parêntese')
    } else if (f !== undefined && /^\d/.test(f)) {
      v = lerNumero(f)
    } else throw new Error('ficha')
    if (fichas![i] === '%') {
      i++
      return { v, pct: true }
    }
    return { v, pct: false }
  }

  function produto(): Valor {
    let a = fator()
    while (fichas![i] === '*' || fichas![i] === '/') {
      const op = fichas![i++]
      const b = fator()
      const esq = a.pct ? a.v / 100 : a.v
      const dir = b.pct ? b.v / 100 : b.v
      a = { v: op === '*' ? esq * dir : esq / dir, pct: false }
    }
    return a
  }

  function soma(): number {
    const primeiro = produto()
    let total = primeiro.pct ? primeiro.v / 100 : primeiro.v
    while (fichas![i] === '+' || fichas![i] === '-') {
      const sinal = fichas![i++] === '+' ? 1 : -1
      const b = produto()
      total += sinal * (b.pct ? (total * b.v) / 100 : b.v)
    }
    return total
  }

  try {
    const total = soma()
    if (i !== fichas.length || !Number.isFinite(total)) return null
    // Tira a sujeira de ponto flutuante (0,1 + 0,2).
    return Number(total.toFixed(10))
  } catch {
    return null
  }
}

/** Número no formato que a própria calculadora lê de volta: vírgula decimal, sem milhar. */
export function formatarResultado(n: number): string {
  return String(n).replace('.', ',')
}
