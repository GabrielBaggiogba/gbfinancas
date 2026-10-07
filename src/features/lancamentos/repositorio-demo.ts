import 'server-only'
import { cookies } from 'next/headers'
import type { RepositorioLancamentos } from './repositorio'
import type { Lancamento } from './tipos'

// Modo demonstração: tudo num cookie do navegador, sem tocar no Supabase.
// Formato: AAAA-MM-DD_receitaCentavos_despesaCentavos, itens separados por ponto.
const COOKIE = 'gbf_demo_dados'
const ITEM = /^(\d{4}-\d{2}-\d{2})_(\d{1,10})_(\d{1,10})$/
const MAX_ITENS = 60

function esperar(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

// Ganchos de verificação, lidos só aqui.
async function atrasar() {
  const ms = Number(process.env.GBF_DEMO_ATRASO_MS ?? 0)
  if (ms > 0) await esperar(ms)
}

function ler(): Lancamento[] {
  const bruto = cookies().get(COOKIE)?.value ?? ''
  const itens: Lancamento[] = []
  for (const texto of bruto.split('.')) {
    const m = ITEM.exec(texto)
    if (m) itens.push({ data: m[1], receitaCentavos: Number(m[2]), despesaCentavos: Number(m[3]) })
  }
  return itens
}

export function repositorioDemo(): RepositorioLancamentos {
  return {
    async listarPeriodo(inicio, fim) {
      await atrasar()
      if (process.env.GBF_DEMO_FALHA === 'listar') throw new Error('Falha simulada ao listar.')
      return ler()
        .filter((l) => l.data >= inicio && l.data <= fim)
        .sort((a, b) => (a.data < b.data ? 1 : -1))
    },

    async salvar(_usuarioId, l) {
      await atrasar()
      if (process.env.GBF_DEMO_FALHA === 'salvar') throw new Error('Falha simulada ao salvar.')
      const lista = ler().filter((x) => x.data !== l.data)
      lista.push(l)
      lista.sort((a, b) => (a.data < b.data ? 1 : -1))
      const valor = lista
        .slice(0, MAX_ITENS)
        .map((x) => `${x.data}_${x.receitaCentavos}_${x.despesaCentavos}`)
        .join('.')
      cookies().set(COOKIE, valor, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 400,
      })
      return l
    },
  }
}
