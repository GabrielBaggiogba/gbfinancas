'use client'

import { Landmark, Link2, PlayCircle, RefreshCw, Search, ShieldCheck, Unlink } from 'lucide-react'
import { motion } from 'motion/react'
import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import { useAvisar } from '@/components/app/Avisos'
import Folha from '@/components/app/Folha'
import { useConfirmar } from '@/components/app/Confirmar'
import { itemSurgir } from '@/components/motion/Surgir'
import { useDados } from '@/features/financas/store'
import { dataCurta } from '@/lib/datas'
import {
  atualizarConexao,
  criarTokenDeConexao,
  desconectar,
  listarBancos,
  registrarConexao,
} from './actions'
import DemonstracaoBanco, { SeloDoBanco } from './DemonstracaoBanco'
import { BANCOS_PRINCIPAIS, buscaBanco, type BancoDaLista } from './lista'
import type { ConexaoBancaria } from './servidor'

// A janela da Pluggy só existe no navegador.
const PluggyConnect = dynamic(() => import('react-pluggy-connect').then((m) => m.PluggyConnect), {
  ssr: false,
})

const STATUS: Record<ConexaoBancaria['status'], { rotulo: string; classe: string }> = {
  ok: { rotulo: 'Sincronizado', classe: 'selo-verde' },
  atualizando: { rotulo: 'Buscando dados', classe: 'selo-ouro' },
  reconectar: { rotulo: 'Precisa reconectar', classe: 'selo-aviso' },
  erro: { rotulo: 'Erro no banco', classe: 'selo-erro' },
}

/** Bancos conectados pelo Open Finance: os lançamentos chegam sozinhos. */
export default function ConexoesBancarias() {
  const { bancos, hoje, demo } = useDados()
  const avisar = useAvisar()
  const confirmar = useConfirmar()
  const [token, setToken] = useState<{ valor: string; item?: string } | null>(null)
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [escolhendo, setEscolhendo] = useState(false)
  const [lista, setLista] = useState<BancoDaLista[]>(BANCOS_PRINCIPAIS)
  const [termo, setTermo] = useState('')
  const [demonstrando, setDemonstrando] = useState<BancoDaLista | null>(null)
  const [conector, setConector] = useState<number | undefined>()
  const conexaoReal = !demo && bancos.ativo

  const titulo = (
    <h2 className="titulo-secao flex items-center gap-2">
      <Landmark size={18} aria-hidden="true" /> Bancos conectados
    </h2>
  )

  const falhou = (r: { ok: boolean; mensagem?: string } | null) => {
    if (r?.ok) return false
    avisar({ tipo: 'erro', texto: r?.mensagem ?? 'Sem conexão. Tente de novo.' })
    return true
  }

  const abrir = async (item?: string, banco?: number | null) => {
    setOcupado(item ?? 'nova')
    const r = await criarTokenDeConexao(item).catch(() => null)
    setOcupado(null)
    if (!falhou(r) && r?.ok) {
      setConector(banco ?? undefined)
      setToken({ valor: r.token, item })
    }
  }

  const abrirLista = () => {
    setEscolhendo(true)
    setTermo('')
    void listarBancos()
      .then((l) => l.length && setLista(l))
      .catch(() => undefined)
  }

  // Com a conexão ligada, o banco escolhido abre direto na janela segura; sem ela, a demonstração.
  const escolher = (b: BancoDaLista) => {
    setEscolhendo(false)
    if (conexaoReal) void abrir(undefined, b.id)
    else setDemonstrando(b)
  }
  const filtrados = lista.filter((b) => buscaBanco(b, termo))

  // "Conectar banco": com a conexão ligada, abre direto a janela segura do Open Finance, que
  // já tem a lista de todos os bancos; sem ela, a nossa lista leva à demonstração.
  const conectar = () => (conexaoReal ? void abrir() : abrirLista())

  // Atalhos (primeiros passos, cartões, ícone do app) chegam em /contas?conectar=1.
  const secao = useRef<HTMLElement>(null)
  const pedidoNaUrl = useRef(false)
  useEffect(() => {
    if (pedidoNaUrl.current) return
    const url = new URL(window.location.href)
    if (!url.searchParams.has('conectar')) return
    pedidoNaUrl.current = true
    url.searchParams.delete('conectar')
    window.history.replaceState(null, '', url.pathname + url.search)
    secao.current?.scrollIntoView({ block: 'center' })
    window.setTimeout(conectar, 0)
  })

  const concluir = async (itemId: string) => {
    setToken(null)
    const r = await registrarConexao(itemId).catch(() => null)
    if (falhou(r)) return
    avisar({ tipo: 'ok', texto: 'Banco conectado! Os lançamentos chegam em alguns minutos.' })
    window.setTimeout(() => window.location.reload(), 1200)
  }

  const atualizar = async (itemId: string) => {
    setOcupado(itemId)
    const r = await atualizarConexao(itemId).catch(() => null)
    setOcupado(null)
    if (falhou(r) || !r?.ok) return
    avisar({
      tipo: 'ok',
      texto: r.novos ? `${r.novos} lançamentos novos` : 'Tudo em dia, nenhum lançamento novo',
    })
    if (r.novos) window.setTimeout(() => window.location.reload(), 900)
  }

  const remover = async (c: ConexaoBancaria) => {
    const ok = await confirmar({
      titulo: `Desconectar ${c.instituicao || 'o banco'}?`,
      texto:
        'O GBFinanças deixa de receber os lançamentos desse banco e a autorização é revogada. O que já foi importado continua no app.',
      acao: 'Desconectar',
      perigo: true,
    })
    if (!ok) return
    if (!falhou(await desconectar(c.item_id).catch(() => null))) window.location.reload()
  }

  return (
    <motion.section
      ref={secao}
      id="conectar-banco"
      variants={itemSurgir}
      className="cartao scroll-mt-24 p-[var(--pad)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        {titulo}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="b b-suave"
            onClick={() => setDemonstrando(lista[0] ?? BANCOS_PRINCIPAIS[0])}
          >
            <PlayCircle size={17} aria-hidden="true" /> Ver como funciona
          </button>
          <button
            type="button"
            className="b b-primario"
            disabled={ocupado !== null}
            onClick={conectar}
          >
            <Link2 size={17} aria-hidden="true" /> Conectar banco
          </button>
        </div>
      </div>
      <ol className="mt-3 grid gap-2 sm:grid-cols-3">
        {[
          ['Escolha o banco', 'Nubank, Itaú, Bradesco, Caixa, Inter e outros.'],
          [
            'Autorize no app dele',
            'Você entra no seu banco, como sempre. Sua senha não passa aqui.',
          ],
          ['Pronto', 'Contas, cartões e transações chegam sozinhos, todo dia.'],
        ].map(([t, d], i) => (
          <li key={t} className="flex gap-2.5 rounded-2xl bg-painel2 px-3 py-2.5">
            <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-menta text-[.8125rem] font-[700] text-tinta">
              {i + 1}
            </span>
            <span className="text-[.875rem]">
              <b className="font-[650]">{t}</b>
              <span className="block text-t2">{d}</span>
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-3 flex items-start gap-2 text-[.875rem] text-t2">
        <ShieldCheck size={17} aria-hidden="true" className="mt-0.5 flex-none text-menta" />
        Pelo Open Finance, regulado pelo Banco Central. O GBFinanças só consegue ler (nunca
        movimentar) e você pode desconectar quando quiser.
      </p>
      {!conexaoReal && (
        <p className="mt-3 rounded-2xl bg-painel2 px-4 py-3 text-[.875rem] text-t2">
          {demo
            ? 'No modo demonstração a conexão é só ilustrativa.'
            : 'A conexão automática com os bancos ainda não está ligada neste site. Enquanto isso, veja a demonstração ou importe o extrato (OFX/CSV) em Configurações.'}
        </p>
      )}

      {bancos.conexoes.length > 0 && (
        <ul className="mt-4 grid gap-2">
          {bancos.conexoes.map((c) => {
            const s = STATUS[c.status]
            return (
              <li
                key={c.item_id}
                className="flex flex-wrap items-center gap-3 rounded-2xl bg-painel2 px-3 py-2.5"
              >
                {c.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.logo}
                    alt=""
                    className="h-9 w-9 flex-none rounded-xl bg-white object-contain p-1"
                  />
                ) : (
                  <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-painel">
                    <Landmark size={18} aria-hidden="true" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-[620]">{c.instituicao || 'Banco'}</p>
                  <p className="miudo truncate">
                    {c.ultima_sincronizacao
                      ? `Atualizado ${dataCurta(c.ultima_sincronizacao.slice(0, 10), hoje)}`
                      : 'Primeira importação em andamento'}
                  </p>
                </div>
                <span className={`selo ${s.classe}`}>{s.rotulo}</span>
                {c.status === 'reconectar' || c.status === 'erro' ? (
                  <button
                    type="button"
                    className="b b-suave"
                    disabled={ocupado !== null}
                    onClick={() => void abrir(c.item_id)}
                  >
                    Reconectar
                  </button>
                ) : (
                  <button
                    type="button"
                    className="b b-fantasma b-icone"
                    disabled={ocupado !== null}
                    onClick={() => void atualizar(c.item_id)}
                    aria-label={`Buscar novos lançamentos de ${c.instituicao}`}
                    title="Buscar novos lançamentos"
                  >
                    <RefreshCw
                      size={17}
                      aria-hidden="true"
                      className={ocupado === c.item_id ? 'gira' : ''}
                    />
                  </button>
                )}
                <button
                  type="button"
                  className="b b-fantasma b-icone"
                  onClick={() => void remover(c)}
                  aria-label={`Desconectar ${c.instituicao}`}
                  title="Desconectar"
                >
                  <Unlink size={17} aria-hidden="true" />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {token && (
        <PluggyConnect
          connectToken={token.valor}
          updateItem={token.item}
          includeSandbox={bancos.sandbox}
          selectedConnectorId={conector}
          language="pt"
          countries={['BR']}
          onSuccess={({ item }) => void concluir(item.id)}
          onError={(e) => {
            // Na reconexão, o item pode ter voltado a funcionar mesmo com aviso de erro.
            if (!e.data?.item)
              avisar({ tipo: 'erro', texto: 'A conexão com o banco não foi concluída.' })
          }}
          onClose={() => setToken(null)}
        />
      )}

      <Folha aberta={escolhendo} aoFechar={() => setEscolhendo(false)} titulo="Escolha seu banco">
        <label className="controle flex items-center gap-2.5 !py-0">
          <Search size={18} className="flex-none text-t3" aria-hidden="true" />
          <input
            type="search"
            className="h-full min-w-0 flex-1 bg-transparent outline-none"
            aria-label="Buscar banco"
            placeholder="Buscar banco"
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
          />
        </label>
        <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {filtrados.map((b) => (
            <li key={`${b.id}-${b.nome}`}>
              <button
                type="button"
                className="flex w-full flex-col items-center gap-1.5 rounded-2xl p-2.5 text-center text-[.8125rem] font-[600] transition-colors hover:bg-painel2"
                onClick={() => escolher(b)}
              >
                <SeloDoBanco banco={b} />
                <span className="line-clamp-2">{b.nome}</span>
              </button>
            </li>
          ))}
        </ul>
        {filtrados.length === 0 && (
          <p className="py-6 text-center text-t2">Nenhum banco com esse nome.</p>
        )}
      </Folha>

      {demonstrando && (
        <DemonstracaoBanco
          aberta
          banco={demonstrando}
          conexaoReal={conexaoReal}
          aoFechar={() => setDemonstrando(null)}
          aoConectar={() => void abrir(undefined, demonstrando.id)}
        />
      )}
    </motion.section>
  )
}
