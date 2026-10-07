// CSV no padrão que o Excel em português abre direto: separador ";" e BOM UTF-8.

import { dataValida } from './datas'
import { interpretarMoeda } from './dinheiro'

const precisaDeAspas = /[";\n\r]/

export function paraCSV(linhas: (string | number)[][]): string {
  const corpo = linhas
    .map((linha) =>
      linha
        .map((celula) => {
          const texto = String(celula)
          return precisaDeAspas.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
        })
        .join(';'),
    )
    .join('\r\n')
  return `﻿${corpo}\r\n`
}

export function baixar(nome: string, conteudo: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }))
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Lê um CSV simples (aspas duplas, separador "," ou ";" detectado pela primeira linha). */
export function lerCSV(texto: string): string[][] {
  const limpo = texto.replace(/^﻿/, '')
  const primeira = limpo.split(/\r?\n/, 1)[0] ?? ''
  const sep = primeira.split(';').length >= primeira.split(',').length ? ';' : ','
  const linhas: string[][] = []
  let linha: string[] = []
  let campo = ''
  let aspas = false
  for (let i = 0; i < limpo.length; i++) {
    const c = limpo[i]
    if (aspas) {
      if (c === '"' && limpo[i + 1] === '"') {
        campo += '"'
        i++
      } else if (c === '"') aspas = false
      else campo += c
    } else if (c === '"') aspas = true
    else if (c === sep) {
      linha.push(campo)
      campo = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && limpo[i + 1] === '\n') i++
      linha.push(campo)
      campo = ''
      if (linha.some((x) => x.trim() !== '')) linhas.push(linha)
      linha = []
    } else campo += c
  }
  linha.push(campo)
  if (linha.some((x) => x.trim() !== '')) linhas.push(linha)
  return linhas
}

/** "31/12/2026", "31-12-2026" ou "2026-12-31" -> "2026-12-31" (ou null). */
export function interpretarData(texto: string): string | null {
  const t = texto.trim().slice(0, 10)
  let iso: string | null = null
  const br = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(t)
  if (br) iso = `${br[3]}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`
  else if (/^\d{4}-\d{2}-\d{2}$/.test(t)) iso = t
  return iso && dataValida(iso) ? iso : null
}

export type LinhaImportada = { data: string; descricao: string; valor: number; entrada: boolean }

const semAcento = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()

/**
 * Interpreta um extrato: procura as colunas de data, descrição e valor pelo cabeçalho
 * (ou assume as três primeiras). Valor negativo é saída; positivo é entrada. Uma coluna
 * "tipo" com "entrada"/"saída"/"receita"/"despesa" tem prioridade sobre o sinal.
 */
export function interpretarExtrato(texto: string): {
  linhas: LinhaImportada[]
  ignoradas: number
} {
  const tabela = lerCSV(texto)
  if (tabela.length === 0) return { linhas: [], ignoradas: 0 }
  const cab = tabela[0].map(semAcento)
  const achar = (...nomes: string[]) => cab.findIndex((c) => nomes.some((n) => c.includes(n)))
  let iData = achar('data', 'date')
  let iDesc = achar('descricao', 'historico', 'lancamento', 'description', 'memo', 'titulo')
  let iValor = achar('valor', 'amount', 'quantia')
  const iTipo = achar('tipo', 'type')
  const temCabecalho = iData >= 0 && iValor >= 0
  if (!temCabecalho) {
    iData = 0
    iDesc = 1
    iValor = 2
  }
  const linhas: LinhaImportada[] = []
  let ignoradas = 0
  for (const linha of tabela.slice(temCabecalho ? 1 : 0)) {
    const data = interpretarData(linha[iData] ?? '')
    const bruto = (linha[iValor] ?? '').trim()
    const negativo = /^\(.*\)$/.test(bruto) || /^[-−]/.test(bruto) || /[-−]$/.test(bruto)
    const valor = interpretarMoeda(bruto.replace(/[()\-−+]/g, ''))
    if (!data || valor === null || valor === 0) {
      ignoradas++
      continue
    }
    const tipo = iTipo >= 0 ? semAcento(linha[iTipo] ?? '') : ''
    const entrada = tipo
      ? /entrada|receita|credito|income/.test(tipo) && !/saida|despesa/.test(tipo)
      : !negativo
    linhas.push({
      data,
      descricao: (iDesc >= 0 ? (linha[iDesc] ?? '') : '').trim().slice(0, 120),
      valor,
      entrada,
    })
  }
  return { linhas, ignoradas }
}
