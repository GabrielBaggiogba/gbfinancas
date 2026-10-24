'use client'

import { Landmark, Link2, RefreshCw, ShieldCheck, Unlink } from 'lucide-react'
import { motion } from 'motion/react'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import { useAvisar } from '@/components/app/Avisos'
import { useConfirmar } from '@/components/app/Confirmar'
import { itemSurgir } from '@/components/motion/Surgir'
import { useDados } from '@/features/financas/store'
import { dataCurta } from '@/lib/datas'
import { atualizarConexao, criarTokenDeConexao, desconectar, registrarConexao } from './actions'
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

  const titulo = (
    <h2 className="titulo-secao flex items-center gap-2">
      <Landmark size={18} aria-hidden="true" /> Bancos conectados
    </h2>
  )

  if (demo || !bancos.ativo)
    return (
      <motion.section variants={itemSurgir} className="cartao p-[var(--pad)]">
        {titulo}
        <p className="mt-2 text-t2">
          Conecte seu banco pelo Open Finance e os lançamentos entram sozinhos, todos os dias.
          {demo ? ' Indisponível no modo demonstração.' : ' Em breve.'}
        </p>
      </motion.section>
    )

  const falhou = (r: { ok: boolean; mensagem?: string } | null) => {
    if (r?.ok) return false
    avisar({ tipo: 'erro', texto: r?.mensagem ?? 'Sem conexão. Tente de novo.' })
    return true
  }

  const abrir = async (item?: string) => {
    setOcupado(item ?? 'nova')
    const r = await criarTokenDeConexao(item).catch(() => null)
    setOcupado(null)
    if (!falhou(r) && r?.ok) setToken({ valor: r.token, item })
  }

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
    <motion.section variants={itemSurgir} className="cartao p-[var(--pad)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {titulo}
        <button
          type="button"
          className="b b-primario"
          disabled={ocupado !== null}
          onClick={() => void abrir()}
        >
          <Link2 size={17} aria-hidden="true" /> Conectar banco
        </button>
      </div>
      <p className="mt-2 flex items-start gap-2 text-[.9375rem] text-t2">
        <ShieldCheck size={17} aria-hidden="true" className="mt-0.5 flex-none text-menta" />
        Pelo Open Finance, regulado pelo Banco Central. Você autoriza no app do seu banco, o
        GBFinanças só consegue ler (nunca movimentar) e você pode desconectar quando quiser.
      </p>

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
    </motion.section>
  )
}
