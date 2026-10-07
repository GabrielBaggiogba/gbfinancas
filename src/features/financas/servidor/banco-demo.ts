import 'server-only'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { hojeEmSaoPaulo } from '@/lib/datas'
import { DADOS_VAZIOS, type Dados, type Operacao, type Tabela } from '../tipos'
import { ErroDeBanco, type Banco } from './banco'
import { dadosDeExemplo } from './semente'

// Banco do modo demonstração: um arquivo JSON por e-mail, na pasta temporária da
// máquina. Só existe com GBF_MODO_DEMO=1 e sem Supabase configurado (ver lib/modo.ts);
// nunca roda em produção. Repete as regras de exclusão do banco real.

type Registro = Record<string, unknown> & { id: string }
type Memoria = Record<Tabela, Registro[]>

const PASTA = join(tmpdir(), 'gbfinancas-demo')
const EM_USO =
  'Este item ainda tem lançamentos ligados a ele. Arquive ou mova os lançamentos antes de excluir.'

function caminho(email: string) {
  return join(PASTA, `${createHash('sha256').update(email).digest('hex').slice(0, 24)}.json`)
}

function esperar() {
  const ms = Number(process.env.GBF_DEMO_ATRASO_MS ?? 0)
  return ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve()
}

export function bancoDemo(email: string): Banco {
  const arquivo = caminho(email)

  function ler(): Memoria {
    if (existsSync(arquivo)) return JSON.parse(readFileSync(arquivo, 'utf8')) as Memoria
    // E-mails começando com "vazio" abrem sem dados, para ver o primeiro uso.
    // Grava na primeira leitura: os ids do exemplo são sorteados, e a tela precisa
    // receber os mesmos que ficam no arquivo.
    const inicial = email.startsWith('vazio') ? DADOS_VAZIOS : dadosDeExemplo(hojeEmSaoPaulo())
    const memoria = JSON.parse(JSON.stringify(inicial)) as Memoria
    gravar(memoria)
    return memoria
  }

  function gravar(m: Memoria) {
    mkdirSync(PASTA, { recursive: true })
    writeFileSync(arquivo, JSON.stringify(m))
  }

  function excluir(m: Memoria, tabela: Tabela, ids: string[]) {
    const alvo = new Set(ids)
    const tem = (v: unknown) => typeof v === 'string' && alvo.has(v)
    if (
      tabela === 'contas' &&
      m.lancamentos.some((l) => tem(l.conta_id) || tem(l.conta_destino_id))
    )
      throw new ErroDeBanco(EM_USO)
    if (tabela === 'cartoes' && m.lancamentos.some((l) => tem(l.cartao_id)))
      throw new ErroDeBanco(EM_USO)
    const anular = (lista: Registro[], campo: string) =>
      lista.forEach((l) => {
        if (tem(l[campo])) l[campo] = null
      })
    if (tabela === 'contas') anular(m.recorrentes, 'conta_id')
    if (tabela === 'cartoes') anular(m.recorrentes, 'cartao_id')
    if (tabela === 'recorrentes') anular(m.lancamentos, 'recorrente_id')
    if (tabela === 'metas') m.aportes = m.aportes.filter((a) => !tem(a.meta_id))
    if (tabela === 'categorias') {
      m.categorias.filter((c) => tem(c.pai_id)).forEach((c) => alvo.add(c.id))
      anular(m.lancamentos, 'categoria_id')
      anular(m.recorrentes, 'categoria_id')
      m.orcamentos = m.orcamentos.filter((o) => !tem(o.categoria_id))
    }
    m[tabela] = m[tabela].filter((l) => !alvo.has(l.id))
  }

  return {
    async carregar() {
      await esperar()
      if (process.env.GBF_DEMO_FALHA === 'listar') throw new Error('Falha simulada ao listar.')
      return ler() as unknown as Dados
    },

    async aplicar(operacoes: Operacao[]) {
      await esperar()
      if (process.env.GBF_DEMO_FALHA === 'salvar')
        throw new ErroDeBanco('Não foi possível salvar. Tente de novo.')
      const m = ler()
      const agora = new Date().toISOString()
      for (const o of operacoes) {
        if (o.op === 'inserir') {
          for (const linha of o.linhas) {
            if (m[o.tabela].some((l) => l.id === linha.id))
              throw new ErroDeBanco('Já existe um item igual a este.')
            m[o.tabela].push({ created_at: agora, ...linha } as unknown as Registro)
          }
        } else if (o.op === 'atualizar') {
          const linha = m[o.tabela].find((l) => l.id === o.id)
          if (linha) Object.assign(linha, o.campos, { id: o.id })
        } else {
          excluir(m, o.tabela, o.ids)
        }
      }
      gravar(m)
    },

    async substituir(dados: Dados) {
      await esperar()
      gravar(JSON.parse(JSON.stringify(dados)) as Memoria)
    },
  }
}
