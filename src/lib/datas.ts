// Datas como texto AAAA-MM-DD, sempre no fuso de São Paulo. Sem Intl nos rótulos,
// por causa da hidratação.

export const FUSO = 'America/Sao_Paulo'

const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const DIAS_LONGOS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
const MESES_CURTOS = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
]
const MESES_LONGOS = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]

export function hojeEmSaoPaulo(agora: Date = new Date()): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(agora)
  const pegar = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? ''
  return `${pegar('year')}-${pegar('month')}-${pegar('day')}`
}

function paraUtc(iso: string): number {
  const [a, m, d] = iso.split('-').map(Number)
  return Date.UTC(a, m - 1, d)
}

export function dataValida(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false
  return new Date(paraUtc(iso)).toISOString().slice(0, 10) === iso
}

export function somarDias(iso: string, n: number): string {
  return new Date(paraUtc(iso) + n * 86_400_000).toISOString().slice(0, 10)
}

export function inicioDaJanela(hoje: string): string {
  return somarDias(hoje, -29)
}

/** Decrescente e inclusivo: de `ate` para trás até `de`. */
export function listarDias(de: string, ate: string): string[] {
  const dias: string[] = []
  for (let d = ate; d >= de; d = somarDias(d, -1)) dias.push(d)
  return dias
}

function diaDaSemana(iso: string): number {
  return new Date(paraUtc(iso)).getUTCDay()
}

export function rotuloCurto(iso: string, hoje: string): string {
  if (iso === hoje) return 'Hoje'
  if (iso === somarDias(hoje, -1)) return 'Ontem'
  const dia = Number(iso.slice(8, 10))
  const mes = Number(iso.slice(5, 7)) - 1
  return `${DIAS_CURTOS[diaDaSemana(iso)]}, ${dia} ${MESES_CURTOS[mes]}`
}

export function rotuloLongo(iso: string): string {
  const dia = Number(iso.slice(8, 10))
  const mes = Number(iso.slice(5, 7)) - 1
  return `${DIAS_LONGOS[diaDaSemana(iso)]}, ${dia} de ${MESES_LONGOS[mes]}`
}
