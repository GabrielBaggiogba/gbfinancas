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

// ---------- Meses ('AAAA-MM') ----------

const dois = (n: number) => String(n).padStart(2, '0')

export function mesDe(iso: string): string {
  return iso.slice(0, 7)
}

export function diasNoMes(ref: string): number {
  const [a, m] = ref.split('-').map(Number)
  return new Date(Date.UTC(a, m, 0)).getUTCDate()
}

export function somarMesRef(ref: string, n: number): string {
  const [a, m] = ref.split('-').map(Number)
  const total = a * 12 + (m - 1) + n
  return `${Math.floor(total / 12)}-${dois((((total % 12) + 12) % 12) + 1)}`
}

/** Soma meses a uma data, segurando o dia no fim do mês quando preciso (31 jan + 1 = 28 fev). */
export function somarMeses(iso: string, n: number): string {
  const ref = somarMesRef(mesDe(iso), n)
  const dia = Math.min(Number(iso.slice(8, 10)), diasNoMes(ref))
  return `${ref}-${dois(dia)}`
}

export function inicioDoMes(ref: string): string {
  return `${ref}-01`
}

export function fimDoMes(ref: string): string {
  return `${ref}-${dois(diasNoMes(ref))}`
}

export function dataNoMes(ref: string, dia: number): string {
  return `${ref}-${dois(Math.min(dia, diasNoMes(ref)))}`
}

/** `quantidade` meses terminando em `ate`, do mais antigo para o mais novo. */
export function listarMeses(ate: string, quantidade: number): string[] {
  return Array.from({ length: quantidade }, (_, i) => somarMesRef(ate, i - quantidade + 1))
}

export function diasEntre(de: string, ate: string): number {
  return Math.round((paraUtc(ate) - paraUtc(de)) / 86_400_000)
}

/** Segunda = 0 ... domingo = 6 (semana começando na segunda). */
export function diaDaSemanaSeg(iso: string): number {
  return (diaDaSemana(iso) + 6) % 7
}

/** "outubro de 2026" */
export function rotuloMes(ref: string): string {
  const [a, m] = ref.split('-').map(Number)
  return `${MESES_LONGOS[m - 1]} de ${a}`
}

/** "out" ou "out/26" */
export function rotuloMesCurto(ref: string, comAno = false): string {
  const [a, m] = ref.split('-').map(Number)
  return comAno ? `${MESES_CURTOS[m - 1]}/${String(a).slice(2)}` : MESES_CURTOS[m - 1]
}

/** "06/10/2026" */
export function dataBR(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`
}

/** "6 out" ou "6 out 2025" quando o ano difere do atual. */
export function dataCurta(iso: string, hoje?: string): string {
  const dia = Number(iso.slice(8, 10))
  const mes = MESES_CURTOS[Number(iso.slice(5, 7)) - 1]
  const outroAno = hoje !== undefined && iso.slice(0, 4) !== hoje.slice(0, 4)
  return outroAno ? `${dia} ${mes} ${iso.slice(0, 4)}` : `${dia} ${mes}`
}

/** "hoje", "amanhã", "em 5 dias", "há 3 dias" */
export function distanciaEmDias(iso: string, hoje: string): string {
  const d = diasEntre(hoje, iso)
  if (d === 0) return 'hoje'
  if (d === 1) return 'amanhã'
  if (d === -1) return 'ontem'
  return d > 0 ? `em ${d} dias` : `há ${-d} dias`
}
