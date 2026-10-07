// Regras financeiras puras: recebem os dados e devolvem números. Nenhuma depende
// do navegador, então rodam igual no servidor, no cliente e nos testes.

import {
  dataNoMes,
  diasEntre,
  fimDoMes,
  inicioDoMes,
  listarMeses,
  mesDe,
  somarDias,
  somarMeses,
  somarMesRef,
} from '@/lib/datas'
import { COR_NEUTRA } from './padroes'
import type {
  Cartao,
  Categoria,
  Dados,
  Frequencia,
  Lancamento,
  Meta,
  Orcamento,
  Recorrente,
} from './tipos'

// ---------- Contas e patrimônio ----------

/** Efeito de um lançamento no saldo de cada conta envolvida. */
function efeitos(l: Lancamento): [string, number][] {
  switch (l.tipo) {
    case 'receita':
      return l.conta_id ? [[l.conta_id, l.valor]] : []
    case 'despesa':
    case 'pagamento_fatura':
      return l.conta_id ? [[l.conta_id, -l.valor]] : []
    case 'transferencia':
      return [
        ...(l.conta_id ? ([[l.conta_id, -l.valor]] as [string, number][]) : []),
        ...(l.conta_destino_id ? ([[l.conta_destino_id, l.valor]] as [string, number][]) : []),
      ]
  }
}

/** Saldo de cada conta considerando lançamentos até `ate` (inclusive). */
export function saldosPorConta(dados: Dados, ate: string): Map<string, number> {
  const saldos = new Map(dados.contas.map((c) => [c.id, c.saldo_inicial]))
  for (const l of dados.lancamentos) {
    if (l.data > ate) continue
    for (const [conta, valor] of efeitos(l)) saldos.set(conta, (saldos.get(conta) ?? 0) + valor)
  }
  return saldos
}

/** Quanto se deve no cartão: compras menos pagamentos. Sem `ate`, inclui parcelas futuras. */
export function dividaDoCartao(cartaoId: string, lancamentos: Lancamento[], ate?: string): number {
  let total = 0
  for (const l of lancamentos) {
    if (l.cartao_id !== cartaoId || (ate !== undefined && l.data > ate)) continue
    if (l.tipo === 'despesa') total += l.valor
    else if (l.tipo === 'pagamento_fatura') total -= l.valor
  }
  return total
}

export function saldoDisponivel(dados: Dados, ate: string): number {
  const saldos = saldosPorConta(dados, ate)
  return dados.contas.reduce((s, c) => s + (c.arquivada ? 0 : (saldos.get(c.id) ?? 0)), 0)
}

/** Contas ativas menos o que já foi comprado no cartão e ainda não foi pago. */
export function patrimonio(dados: Dados, ate: string): number {
  const divida = dados.cartoes.reduce(
    (s, c) => s + Math.max(0, dividaDoCartao(c.id, dados.lancamentos, ate)),
    0,
  )
  return saldoDisponivel(dados, ate) - divida
}

// ---------- Mês ----------

export type Resumo = {
  entradas: number
  saidas: number
  saldo: number
  taxaEconomia: number | null
}

export function resumoDoPeriodo(dados: Dados, inicio: string, fim: string): Resumo {
  let entradas = 0
  let saidas = 0
  for (const l of dados.lancamentos) {
    if (l.data < inicio || l.data > fim) continue
    if (l.tipo === 'receita') entradas += l.valor
    else if (l.tipo === 'despesa') saidas += l.valor
  }
  return {
    entradas,
    saidas,
    saldo: entradas - saidas,
    taxaEconomia: entradas > 0 ? (entradas - saidas) / entradas : null,
  }
}

export function resumoDoMes(dados: Dados, ref: string): Resumo {
  return resumoDoPeriodo(dados, inicioDoMes(ref), fimDoMes(ref))
}

export function serieMensal(dados: Dados, refs: string[]) {
  return refs.map((ref) => ({ ref, ...resumoDoMes(dados, ref) }))
}

export type FatiaCategoria = {
  id: string | null
  nome: string
  cor: string
  icone: string
  total: number
}

/** Categoria raiz (as subcategorias somam na categoria-mãe). */
export function raizDaCategoria(id: string | null, categorias: Categoria[]): Categoria | null {
  if (!id) return null
  const c = categorias.find((x) => x.id === id)
  if (!c) return null
  return c.pai_id ? (categorias.find((x) => x.id === c.pai_id) ?? c) : c
}

export function gastosPorCategoria(
  dados: Dados,
  inicio: string,
  fim: string,
  tipo: 'despesa' | 'receita' = 'despesa',
): FatiaCategoria[] {
  const totais = new Map<string, FatiaCategoria>()
  for (const l of dados.lancamentos) {
    if (l.tipo !== tipo || l.data < inicio || l.data > fim) continue
    const raiz = raizDaCategoria(l.categoria_id, dados.categorias)
    const chave = raiz?.id ?? 'sem'
    const atual = totais.get(chave) ?? {
      id: raiz?.id ?? null,
      nome: raiz?.nome ?? 'Sem categoria',
      cor: raiz?.cor ?? COR_NEUTRA,
      icone: raiz?.icone ?? 'tag',
      total: 0,
    }
    atual.total += l.valor
    totais.set(chave, atual)
  }
  return [...totais.values()].sort((a, b) => b.total - a.total)
}

/** Junta as fatias menores em "Outras" para o gráfico não virar confete. */
export function agruparFatias(fatias: FatiaCategoria[], maximo = 6): FatiaCategoria[] {
  if (fatias.length <= maximo) return fatias
  const principais = fatias.slice(0, maximo - 1)
  const resto = fatias.slice(maximo - 1).reduce((s, f) => s + f.total, 0)
  return [...principais, { id: null, nome: 'Outras', cor: COR_NEUTRA, icone: 'tag', total: resto }]
}

export function evolucaoDoPatrimonio(dados: Dados, datas: string[]): number[] {
  return datas.map((d) => patrimonio(dados, d))
}

// ---------- Cartões e faturas ----------

/** Fatura ('AAAA-MM' do fechamento) em que uma compra feita em `data` cai. */
export function faturaDe(cartao: Cartao, data: string): string {
  const ref = mesDe(data)
  return Number(data.slice(8, 10)) > cartao.dia_fechamento ? somarMesRef(ref, 1) : ref
}

export function fechamentoDaFatura(cartao: Cartao, ref: string): string {
  return dataNoMes(ref, cartao.dia_fechamento)
}

export function vencimentoDaFatura(cartao: Cartao, ref: string): string {
  const mes = cartao.dia_vencimento > cartao.dia_fechamento ? ref : somarMesRef(ref, 1)
  return dataNoMes(mes, cartao.dia_vencimento)
}

export type StatusFatura = 'aberta' | 'futura' | 'fechada' | 'paga' | 'atrasada'

export type Fatura = {
  ref: string
  cartao_id: string
  total: number
  pago: number
  restante: number
  fechamento: string
  vencimento: string
  status: StatusFatura
  compras: Lancamento[]
}

export function faturasDoCartao(cartao: Cartao, lancamentos: Lancamento[], hoje: string): Fatura[] {
  const atual = faturaDe(cartao, hoje)
  const mapa = new Map<string, { total: number; pago: number; compras: Lancamento[] }>()
  const pegar = (ref: string) => {
    let f = mapa.get(ref)
    if (!f) mapa.set(ref, (f = { total: 0, pago: 0, compras: [] }))
    return f
  }
  pegar(atual)
  for (const l of lancamentos) {
    if (l.cartao_id !== cartao.id) continue
    if (l.tipo === 'despesa') {
      const f = pegar(faturaDe(cartao, l.data))
      f.total += l.valor
      f.compras.push(l)
    } else if (l.tipo === 'pagamento_fatura' && l.fatura_ref) {
      pegar(l.fatura_ref).pago += l.valor
    }
  }
  return [...mapa.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([ref, f]) => {
      const fechamento = fechamentoDaFatura(cartao, ref)
      const vencimento = vencimentoDaFatura(cartao, ref)
      const restante = Math.max(0, f.total - f.pago)
      let status: StatusFatura
      if (f.total > 0 && restante === 0) status = 'paga'
      else if (ref === atual) status = 'aberta'
      else if (ref > atual) status = 'futura'
      else if (restante === 0) status = 'paga'
      else status = vencimento < hoje ? 'atrasada' : 'fechada'
      f.compras.sort((a, b) => (a.data < b.data ? 1 : -1))
      return { ref, cartao_id: cartao.id, ...f, restante, fechamento, vencimento, status }
    })
}

/** Divide o valor em parcelas iguais; os centavos que sobram vão para as primeiras. */
export function dividirEmParcelas(total: number, parcelas: number): number[] {
  const base = Math.floor(total / parcelas)
  const sobra = total - base * parcelas
  return Array.from({ length: parcelas }, (_, i) => base + (i < sobra ? 1 : 0))
}

// ---------- Orçamentos ----------

export type NivelOrcamento = 'ok' | 'atencao' | 'alerta' | 'estourado'

export function nivelDoOrcamento(pct: number): NivelOrcamento {
  if (pct >= 1) return 'estourado'
  if (pct >= 0.9) return 'alerta'
  if (pct >= 0.7) return 'atencao'
  return 'ok'
}

export function gastoDoOrcamento(o: Orcamento, dados: Dados, ref: string): number {
  const inicio = inicioDoMes(ref)
  const fim = fimDoMes(ref)
  const ids = o.categoria_id
    ? new Set([
        o.categoria_id,
        ...dados.categorias.filter((c) => c.pai_id === o.categoria_id).map((c) => c.id),
      ])
    : null
  let usado = 0
  for (const l of dados.lancamentos) {
    if (l.tipo !== 'despesa' || l.data < inicio || l.data > fim) continue
    if (ids === null || (l.categoria_id !== null && ids.has(l.categoria_id))) usado += l.valor
  }
  return usado
}

export function usoDoOrcamento(o: Orcamento, dados: Dados, ref: string) {
  const usado = gastoDoOrcamento(o, dados, ref)
  const pct = o.valor > 0 ? usado / o.valor : 0
  return { usado, pct, restante: o.valor - usado, nivel: nivelDoOrcamento(pct) }
}

// ---------- Metas ----------

export function progressoDaMeta(meta: Meta, dados: Dados, hoje: string) {
  const acumulado = dados.aportes.reduce((s, a) => s + (a.meta_id === meta.id ? a.valor : 0), 0)
  const restante = Math.max(0, meta.valor_alvo - acumulado)
  const pct = meta.valor_alvo > 0 ? Math.min(1, Math.max(0, acumulado / meta.valor_alvo)) : 0
  let porMes: number | null = null
  if (meta.prazo && restante > 0 && meta.prazo > hoje) {
    const meses = Math.max(1, Math.ceil(diasEntre(hoje, meta.prazo) / 30))
    porMes = Math.ceil(restante / meses)
  }
  return { acumulado, restante, pct, porMes, concluida: restante === 0 }
}

// ---------- Recorrentes ----------

export function proximaData(data: string, frequencia: Frequencia): string {
  if (frequencia === 'semanal') return somarDias(data, 7)
  return somarMeses(data, frequencia === 'mensal' ? 1 : 12)
}

/** Datas em que o recorrente vence até `ate` (começando no próximo vencimento). */
export function ocorrencias(r: Recorrente, ate: string): string[] {
  const datas: string[] = []
  if (!r.ativo) return datas
  for (
    let d = r.proximo_vencimento;
    d <= ate && datas.length < 400;
    d = proximaData(d, r.frequencia)
  )
    datas.push(d)
  return datas
}

export type StatusRecorrente = 'pausado' | 'atrasado' | 'hoje' | 'pendente'

export function statusDoRecorrente(r: Recorrente, hoje: string): StatusRecorrente {
  if (!r.ativo) return 'pausado'
  if (r.proximo_vencimento < hoje) return 'atrasado'
  return r.proximo_vencimento === hoje ? 'hoje' : 'pendente'
}

// ---------- Vencimentos e projeção ----------

export type Vencimento = {
  chave: string
  origem: 'recorrente' | 'fatura'
  id: string
  titulo: string
  valor: number
  data: string
  entrada: boolean
  atrasado: boolean
  fatura_ref?: string
}

export function proximosVencimentos(dados: Dados, hoje: string, dias: number): Vencimento[] {
  const limite = somarDias(hoje, dias)
  const lista: Vencimento[] = []
  for (const r of dados.recorrentes) {
    if (!r.ativo || r.proximo_vencimento > limite) continue
    lista.push({
      chave: `r-${r.id}`,
      origem: 'recorrente',
      id: r.id,
      titulo: r.descricao,
      valor: r.valor,
      data: r.proximo_vencimento,
      entrada: r.tipo === 'receita',
      atrasado: r.proximo_vencimento < hoje,
    })
  }
  for (const c of dados.cartoes) {
    if (c.arquivado) continue
    for (const f of faturasDoCartao(c, dados.lancamentos, hoje)) {
      if (f.restante === 0 || f.vencimento > limite) continue
      if (f.status !== 'fechada' && f.status !== 'atrasada' && f.status !== 'aberta') continue
      lista.push({
        chave: `f-${c.id}-${f.ref}`,
        origem: 'fatura',
        id: c.id,
        titulo: `Fatura ${c.nome}`,
        valor: f.restante,
        data: f.vencimento,
        entrada: false,
        atrasado: f.status === 'atrasada',
        fatura_ref: f.ref,
      })
    }
  }
  return lista.sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0))
}

/** Saldo previsto das contas dia a dia: lançamentos futuros, recorrentes e faturas. */
export function fluxoFuturo(dados: Dados, hoje: string, dias: number) {
  const fim = somarDias(hoje, dias)
  const porDia = new Map<string, number>()
  const somar = (data: string, valor: number) => {
    const d = data <= hoje ? somarDias(hoje, 1) : data
    if (d <= fim) porDia.set(d, (porDia.get(d) ?? 0) + valor)
  }
  const ativas = new Set(dados.contas.filter((c) => !c.arquivada).map((c) => c.id))
  for (const l of dados.lancamentos) {
    if (l.data <= hoje || l.data > fim) continue
    for (const [conta, valor] of efeitos(l)) if (ativas.has(conta)) somar(l.data, valor)
  }
  for (const r of dados.recorrentes) {
    if (r.cartao_id) continue
    for (const d of ocorrencias(r, fim)) somar(d, r.tipo === 'receita' ? r.valor : -r.valor)
  }
  for (const c of dados.cartoes) {
    for (const f of faturasDoCartao(c, dados.lancamentos, hoje)) {
      if (f.restante > 0 && f.vencimento <= fim) somar(f.vencimento, -f.restante)
    }
  }
  let saldo = saldoDisponivel(dados, hoje)
  const pontos = [{ data: hoje, saldo }]
  for (let d = somarDias(hoje, 1); d <= fim; d = somarDias(d, 1)) {
    saldo += porDia.get(d) ?? 0
    pontos.push({ data: d, saldo })
  }
  return pontos
}

export function saldoProjetadoFimDoMes(dados: Dados, hoje: string): number {
  const dias = diasEntre(hoje, fimDoMes(mesDe(hoje)))
  const pontos = fluxoFuturo(dados, hoje, dias)
  return pontos[pontos.length - 1].saldo
}

// ---------- Relatórios ----------

export function maioresDespesas(dados: Dados, inicio: string, fim: string, n = 10): Lancamento[] {
  return dados.lancamentos
    .filter((l) => l.tipo === 'despesa' && l.data >= inicio && l.data <= fim)
    .sort((a, b) => b.valor - a.valor)
    .slice(0, n)
}

export type Variacao = FatiaCategoria & { anterior: number; diferenca: number; pct: number | null }

/** Compara os gastos por categoria de dois períodos (atual contra anterior). */
export function variacaoPorCategoria(
  dados: Dados,
  atual: [string, string],
  anterior: [string, string],
): Variacao[] {
  const a = gastosPorCategoria(dados, atual[0], atual[1])
  const b = gastosPorCategoria(dados, anterior[0], anterior[1])
  const chave = (f: FatiaCategoria) => f.id ?? 'sem'
  const antes = new Map(b.map((f) => [chave(f), f]))
  const todas = new Map(a.map((f) => [chave(f), f]))
  for (const f of b) if (!todas.has(chave(f))) todas.set(chave(f), { ...f, total: 0 })
  return [...todas.values()]
    .map((f) => {
      const anteriorTotal = antes.get(chave(f))?.total ?? 0
      const diferenca = f.total - anteriorTotal
      return {
        ...f,
        anterior: anteriorTotal,
        diferenca,
        pct: anteriorTotal > 0 ? diferenca / anteriorTotal : null,
      }
    })
    .sort((x, y) => y.diferenca - x.diferenca)
}

// ---------- Alertas e pequenos insights ----------

export type Insight = {
  id: string
  nivel: 'bom' | 'info' | 'atencao' | 'alerta'
  titulo: string
  detalhe: string
  href: string
}

const NORMALIZAR = /[^a-z0-9]+/g
const normalizar = (t: string) =>
  t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(NORMALIZAR, ' ').trim()

export function gerarInsights(
  dados: Dados,
  hoje: string,
  moeda: (centavos: number) => string,
): Insight[] {
  const lista: Insight[] = []
  const ref = mesDe(hoje)
  const anterior = somarMesRef(ref, -1)

  // Contas e faturas vencendo
  for (const v of proximosVencimentos(dados, hoje, 7)) {
    if (v.entrada) continue
    const dias = diasEntre(hoje, v.data)
    lista.push({
      id: `venc-${v.chave}`,
      nivel: v.atrasado ? 'alerta' : 'atencao',
      titulo: v.atrasado
        ? `${v.titulo} está atrasado`
        : `${v.titulo} vence ${dias === 0 ? 'hoje' : dias === 1 ? 'amanhã' : `em ${dias} dias`}`,
      detalhe: moeda(v.valor),
      href: v.origem === 'fatura' ? '/cartoes' : '/recorrentes',
    })
  }

  // Orçamentos perto do limite
  for (const o of dados.orcamentos) {
    const uso = usoDoOrcamento(o, dados, ref)
    if (uso.nivel === 'ok') continue
    const nome = o.categoria_id
      ? (dados.categorias.find((c) => c.id === o.categoria_id)?.nome ?? 'Categoria')
      : 'Orçamento geral'
    lista.push({
      id: `orc-${o.id}`,
      nivel: uso.nivel === 'atencao' ? 'atencao' : 'alerta',
      titulo:
        uso.nivel === 'estourado'
          ? `${nome} passou do limite`
          : `${nome} já usou ${Math.round(uso.pct * 100)}% do orçamento`,
      detalhe:
        uso.restante >= 0
          ? `Restam ${moeda(uso.restante)} neste mês.`
          : `${moeda(-uso.restante)} acima do limite.`,
      href: '/orcamentos',
    })
  }

  // Limite do cartão
  for (const c of dados.cartoes) {
    if (c.arquivado || c.limite === 0) continue
    const usado = Math.max(0, dividaDoCartao(c.id, dados.lancamentos))
    if (usado / c.limite >= 0.8) {
      lista.push({
        id: `lim-${c.id}`,
        nivel: 'alerta',
        titulo: `${c.nome} está com ${Math.round((usado / c.limite) * 100)}% do limite usado`,
        detalhe: `Disponível: ${moeda(Math.max(0, c.limite - usado))}.`,
        href: '/cartoes',
      })
    }
  }

  // Categorias que subiram em relação ao mês anterior (mesmo trecho do mês)
  const dia = hoje.slice(8, 10)
  const variacoes = variacaoPorCategoria(
    dados,
    [inicioDoMes(ref), hoje],
    [inicioDoMes(anterior), dataNoMes(anterior, Number(dia))],
  )
  for (const v of variacoes.slice(0, 2)) {
    if (v.id === null || v.pct === null || v.pct < 0.2 || v.diferenca < 5000) continue
    lista.push({
      id: `cat-${v.id}`,
      nivel: 'info',
      titulo: `Seu gasto com ${v.nome} aumentou ${Math.round(v.pct * 100)}%`,
      detalhe: `${moeda(v.total)} até agora, contra ${moeda(v.anterior)} no mesmo trecho do mês passado.`,
      href: '/relatorios',
    })
  }

  // Mês acima da média dos três anteriores
  const meses = listarMeses(anterior, 3).map((r) => resumoDoMes(dados, r).saidas)
  const comDados = meses.filter((m) => m > 0)
  const atual = resumoDoMes(dados, ref)
  if (comDados.length >= 2) {
    const media = comDados.reduce((s, m) => s + m, 0) / comDados.length
    if (atual.saidas > media * 1.1) {
      lista.push({
        id: 'mes-acima',
        nivel: 'atencao',
        titulo: 'Os gastos deste mês já passaram da sua média',
        detalhe: `${moeda(atual.saidas)} contra uma média de ${moeda(Math.round(media))} nos últimos meses.`,
        href: '/relatorios',
      })
    }
  }

  // Despesa muito acima do padrão da categoria (últimos 90 dias)
  const inicio90 = somarDias(hoje, -90)
  const porCategoria = new Map<string, number[]>()
  for (const l of dados.lancamentos) {
    if (l.tipo !== 'despesa' || !l.categoria_id || l.data < inicio90 || l.data > hoje) continue
    porCategoria.set(l.categoria_id, [...(porCategoria.get(l.categoria_id) ?? []), l.valor])
  }
  const recentes = dados.lancamentos
    .filter(
      (l) =>
        l.tipo === 'despesa' && l.categoria_id && l.data > somarDias(hoje, -7) && l.data <= hoje,
    )
    .sort((a, b) => b.valor - a.valor)
  for (const l of recentes.slice(0, 5)) {
    const valores = [...(porCategoria.get(l.categoria_id!) ?? [])].sort((a, b) => a - b)
    if (valores.length < 5) continue
    const mediana = valores[Math.floor(valores.length / 2)]
    if (l.valor >= mediana * 3 && l.valor >= 10000) {
      lista.push({
        id: `fora-${l.id}`,
        nivel: 'info',
        titulo: `${l.descricao || 'Uma despesa'} ficou bem acima do seu padrão`,
        detalhe: `${moeda(l.valor)}, cerca de ${Math.round(l.valor / mediana)} vezes o valor típico da categoria.`,
        href: '/lancamentos',
      })
      break
    }
  }

  // Despesa que se repete todo mês e ainda não é recorrente
  const repetidas = new Map<string, { meses: Set<string>; valor: number; nome: string }>()
  const inicio120 = somarDias(hoje, -120)
  for (const l of dados.lancamentos) {
    if (l.tipo !== 'despesa' || l.recorrente_id || l.parcela_total || !l.descricao) continue
    if (l.data < inicio120 || l.data > hoje) continue
    const chave = normalizar(l.descricao)
    if (chave.length < 3) continue
    const item = repetidas.get(chave) ?? {
      meses: new Set<string>(),
      valor: l.valor,
      nome: l.descricao,
    }
    if (Math.abs(item.valor - l.valor) <= item.valor * 0.15) item.meses.add(mesDe(l.data))
    repetidas.set(chave, item)
  }
  const cadastradas = new Set(dados.recorrentes.map((r) => normalizar(r.descricao)))
  for (const [chave, item] of repetidas) {
    if (item.meses.size >= 3 && !cadastradas.has(chave)) {
      lista.push({
        id: `rep-${chave}`,
        nivel: 'info',
        titulo: `${item.nome} parece uma despesa recorrente`,
        detalhe: `Apareceu em ${item.meses.size} meses seguidos. Cadastre em Recorrentes para entrar na previsão.`,
        href: '/recorrentes',
      })
      break
    }
  }

  // Taxa de economia boa
  if (atual.taxaEconomia !== null && atual.taxaEconomia >= 0.2 && Number(dia) >= 10) {
    lista.push({
      id: 'economia',
      nivel: 'bom',
      titulo: `Você guardou ${Math.round(atual.taxaEconomia * 100)}% do que entrou neste mês`,
      detalhe: `${moeda(atual.saldo)} de saldo positivo até agora.`,
      href: '/relatorios',
    })
  }

  const ordem = { alerta: 0, atencao: 1, info: 2, bom: 3 }
  return lista.sort((a, b) => ordem[a.nivel] - ordem[b.nivel])
}
