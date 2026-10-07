'use client'

import {
  Archive,
  ArchiveRestore,
  CreditCard,
  Pencil,
  Plus,
  ShoppingBag,
  Trash2,
  Wifi,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { useAvisar } from '@/components/app/Avisos'
import { Campo, CampoValor, Vazio } from '@/components/app/Campos'
import { useConfirmar } from '@/components/app/Confirmar'
import Menu from '@/components/app/Menu'
import Valor from '@/components/app/Valor'
import { Barra, Inclinar } from '@/components/motion/Efeitos'
import { Surgir, itemSurgir } from '@/components/motion/Surgir'
import { MOLA } from '@/components/motion/molas'
import { dataCurta, distanciaEmDias, rotuloMesCurto } from '@/lib/datas'
import { formatarPct } from '@/lib/dinheiro'
import {
  dividaDoCartao,
  faturaDe,
  faturasDoCartao,
  type Fatura,
  type StatusFatura,
} from '../calculos'
import { useEditor } from '../components/Editor'
import { cartaoSchema, primeiraMensagem } from '../esquemas'
import { emUso } from '../operacoes'
import { novoId } from '../padroes'
import { useDados } from '../store'
import type { Cartao } from '../tipos'
import { FolhaDeFormulario, useFolha } from './formularios'
import { Bloco, LinhaDeLancamento } from './partes'

const SELO: Record<StatusFatura, { rotulo: string; classe: string }> = {
  aberta: { rotulo: 'Aberta', classe: 'selo-azul' },
  futura: { rotulo: 'Futura', classe: '' },
  fechada: { rotulo: 'Fechada', classe: 'selo-aviso' },
  paga: { rotulo: 'Paga', classe: 'selo-ok' },
  atrasada: { rotulo: 'Atrasada', classe: 'selo-erro' },
}

export default function Cartoes() {
  const { dados, aplicar } = useDados()
  const { novo } = useEditor()
  const confirmar = useConfirmar()
  const avisar = useAvisar()
  const folha = useFolha<Cartao>()
  const [rascunho, setRascunho] = useState<Cartao | null>(null)

  const abrir = (cartao?: Cartao) => {
    const item = cartao ?? {
      id: novoId(),
      nome: '',
      limite: 0,
      dia_fechamento: 25,
      dia_vencimento: 5,
      arquivado: false,
      created_at: new Date().toISOString(),
    }
    setRascunho(item)
    folha.abrir(item)
  }
  const editando = !!rascunho && dados.cartoes.some((x) => x.id === rascunho.id)

  const salvar = () => {
    if (!rascunho) return
    const r = cartaoSchema.safeParse(rascunho)
    if (!r.success) return primeiraMensagem(r.error)
    const limpo = { ...rascunho, ...r.data } as Cartao
    folha.fechar()
    if (editando) {
      const { id, created_at, ...campos } = limpo
      void created_at
      void aplicar([{ op: 'atualizar', tabela: 'cartoes', id, campos }], 'Cartão atualizado')
    } else void aplicar([{ op: 'inserir', tabela: 'cartoes', linhas: [limpo] }], 'Cartão criado')
  }

  const arquivar = (cartao: Cartao) =>
    void aplicar(
      [
        {
          op: 'atualizar',
          tabela: 'cartoes',
          id: cartao.id,
          campos: { arquivado: !cartao.arquivado },
        },
      ],
      cartao.arquivado ? 'Cartão reativado' : 'Cartão arquivado',
    )

  const excluir = async (cartao: Cartao) => {
    if (emUso(dados, 'cartoes', cartao.id)) {
      avisar({
        tipo: 'info',
        texto: 'Este cartão tem compras. Arquive-o para tirá-lo da frente sem perder o histórico.',
      })
      return
    }
    const ok = await confirmar({
      titulo: `Excluir o cartão ${cartao.nome}?`,
      texto: 'Ele não tem compras. Esta ação não pode ser desfeita.',
      acao: 'Excluir',
      perigo: true,
    })
    if (ok)
      void aplicar([{ op: 'excluir', tabela: 'cartoes', ids: [cartao.id] }], 'Cartão excluído')
  }

  const ordenados = [...dados.cartoes].sort((a, b) => Number(a.arquivado) - Number(b.arquivado))

  return (
    <Surgir className="grid gap-[var(--vao)]">
      <motion.div variants={itemSurgir} className="flex items-center justify-between gap-3">
        <p className="text-t2">
          A compra entra no mês em que foi feita; o dinheiro só sai da conta quando a fatura é paga.
        </p>
        <button type="button" className="b b-primario flex-none" onClick={() => abrir()}>
          <Plus size={17} aria-hidden="true" /> Novo cartão
        </button>
      </motion.div>

      {ordenados.length === 0 ? (
        <Bloco>
          <Vazio
            icone={<CreditCard size={28} aria-hidden="true" />}
            titulo="Nenhum cartão cadastrado"
            texto="Cadastre o limite e os dias de fechamento e vencimento para acompanhar faturas e parcelas."
            acao={
              <button type="button" className="b b-primario" onClick={() => abrir()}>
                <Plus size={17} aria-hidden="true" /> Cadastrar cartão
              </button>
            }
          />
        </Bloco>
      ) : (
        ordenados.map((cartao) => (
          <PainelDoCartao
            key={cartao.id}
            cartao={cartao}
            aoEditar={() => abrir(cartao)}
            aoArquivar={() => arquivar(cartao)}
            aoExcluir={() => void excluir(cartao)}
            aoComprar={() => novo('despesa', { cartao_id: cartao.id, conta_id: null })}
          />
        ))
      )}

      <FolhaDeFormulario
        key={folha.chave}
        aberta={folha.aberta}
        aoFechar={folha.fechar}
        titulo={editando ? 'Editar cartão' : 'Novo cartão'}
        aoSalvar={salvar}
      >
        {rascunho && (
          <>
            <Campo rotulo="Nome">
              {(id) => (
                <input
                  id={id}
                  className="controle"
                  data-autofoco
                  maxLength={60}
                  placeholder="Ex.: Nubank, Inter Gold"
                  value={rascunho.nome}
                  onChange={(e) => setRascunho({ ...rascunho, nome: e.target.value })}
                />
              )}
            </Campo>
            <Campo rotulo="Limite">
              {(id) => (
                <CampoValor
                  id={id}
                  valor={rascunho.limite}
                  aoMudar={(limite) => setRascunho({ ...rascunho, limite })}
                />
              )}
            </Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo rotulo="Dia do fechamento">
                {(id) => (
                  <input
                    id={id}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={28}
                    className="controle num"
                    value={rascunho.dia_fechamento || ''}
                    onChange={(e) =>
                      setRascunho({ ...rascunho, dia_fechamento: Number(e.target.value) })
                    }
                  />
                )}
              </Campo>
              <Campo rotulo="Dia do vencimento">
                {(id) => (
                  <input
                    id={id}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={28}
                    className="controle num"
                    value={rascunho.dia_vencimento || ''}
                    onChange={(e) =>
                      setRascunho({ ...rascunho, dia_vencimento: Number(e.target.value) })
                    }
                  />
                )}
              </Campo>
            </div>
            <p className="miudo">
              Compras feitas depois do fechamento entram na fatura do mês seguinte.
            </p>
          </>
        )}
      </FolhaDeFormulario>
    </Surgir>
  )
}

function PainelDoCartao({
  cartao,
  aoEditar,
  aoArquivar,
  aoExcluir,
  aoComprar,
}: {
  cartao: Cartao
  aoEditar: () => void
  aoArquivar: () => void
  aoExcluir: () => void
  aoComprar: () => void
}) {
  const { dados, hoje } = useDados()
  const { editar, pagarFatura } = useEditor()

  const c = useMemo(() => {
    const faturas = faturasDoCartao(cartao, dados.lancamentos, hoje)
    const usado = Math.max(0, dividaDoCartao(cartao.id, dados.lancamentos))
    const atual = faturaDe(cartao, hoje)
    const aberta = faturas.find((f) => f.ref === atual) ?? faturas[faturas.length - 1]
    const pendentes = faturas.filter((f) => f.status === 'fechada' || f.status === 'atrasada')
    const inicio = Math.max(0, faturas.indexOf(aberta) - 3)
    const relevantes = faturas.slice(inicio, inicio + 9)
    const grupos = new Map<string, { nome: string; total: number; pagas: number; valor: number }>()
    for (const l of dados.lancamentos) {
      if (l.cartao_id !== cartao.id || !l.grupo_id || !l.parcela_total) continue
      const g = grupos.get(l.grupo_id) ?? {
        nome: l.descricao || 'Compra parcelada',
        total: l.parcela_total,
        pagas: 0,
        valor: l.valor,
      }
      if (l.data <= hoje) g.pagas = Math.max(g.pagas, l.parcela_atual ?? 0)
      grupos.set(l.grupo_id, g)
    }
    return {
      faturas: relevantes,
      usado,
      aberta,
      aPagar: pendentes[0] ?? null,
      parceladas: [...grupos.values()].filter((g) => g.pagas < g.total),
    }
  }, [cartao, dados.lancamentos, hoje])

  const [ref, setRef] = useState(c.aPagar?.ref ?? c.aberta.ref)
  const fatura: Fatura = c.faturas.find((f) => f.ref === ref) ?? c.aberta
  const pct = cartao.limite > 0 ? c.usado / cartao.limite : 0
  const podePagar = fatura.restante > 0 && fatura.status !== 'futura'

  return (
    <motion.section
      variants={itemSurgir}
      className={`cartao grid gap-x-8 gap-y-6 p-[calc(var(--pad)+2px)] min-[1000px]:grid-cols-[340px_minmax(0,1fr)] ${cartao.arquivado ? 'congelado' : ''}`}
      aria-label={`Cartão ${cartao.nome}`}
    >
      <div>
        <Inclinar>
          <div className="cartao-credito brilho">
            <div className="relative z-[1] flex h-full flex-col justify-between">
              <div className="flex items-start justify-between">
                <span className="text-[1.125rem] font-[650] tracking-[-.02em]">{cartao.nome}</span>
                <Wifi size={22} className="rotate-90 opacity-80" aria-hidden="true" />
              </div>
              <div>
                <p className="text-[.75rem] font-[560] opacity-75">Disponível</p>
                <p className="num text-[1.5rem] font-[650] tracking-[-.03em]">
                  <Valor centavos={Math.max(0, cartao.limite - c.usado)} animado />
                </p>
              </div>
              <div className="flex items-end justify-between text-[.75rem] font-[560] opacity-80">
                <span>Fecha dia {cartao.dia_fechamento}</span>
                <span>Vence dia {cartao.dia_vencimento}</span>
              </div>
            </div>
          </div>
        </Inclinar>

        <div className="mt-5">
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <span className="legenda">Limite usado</span>
            <span className="miudo num">
              <Valor centavos={c.usado} /> de <Valor centavos={cartao.limite} /> ·{' '}
              {formatarPct(pct)}
            </span>
          </div>
          <Barra
            pct={pct}
            cor={pct >= 0.9 ? 'var(--erro)' : pct >= 0.7 ? 'var(--aviso)' : 'var(--azul)'}
          />
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            className="b b-suave flex-1"
            onClick={aoComprar}
            disabled={cartao.arquivado}
          >
            <ShoppingBag size={17} aria-hidden="true" /> Nova compra
          </button>
          <Menu
            rotulo={`Ações do cartão ${cartao.nome}`}
            itens={[
              { rotulo: 'Editar', icone: Pencil, aoClicar: aoEditar },
              {
                rotulo: cartao.arquivado ? 'Reativar' : 'Arquivar',
                icone: cartao.arquivado ? ArchiveRestore : Archive,
                aoClicar: aoArquivar,
              },
              { rotulo: 'Excluir', icone: Trash2, aoClicar: aoExcluir, perigo: true },
            ]}
          />
        </div>

        {c.parceladas.length > 0 && (
          <div className="mt-6">
            <h3 className="legenda mb-2.5">Compras parceladas</h3>
            <div className="grid gap-3">
              {c.parceladas.map((g, i) => (
                <div key={`${g.nome}-${i}`}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3">
                    <span className="truncate font-[560]">{g.nome}</span>
                    <span className="miudo num flex-none">
                      {g.pagas}/{g.total} · <Valor centavos={g.valor} />
                    </span>
                  </div>
                  <Barra pct={g.pagas / g.total} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="min-w-0">
        <div
          className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-2"
          role="tablist"
          aria-label="Faturas"
        >
          {c.faturas.map((f) => (
            <button
              key={f.ref}
              type="button"
              role="tab"
              aria-selected={f.ref === ref}
              className="relative flex-none rounded-[14px] px-3.5 py-2 text-left"
              onClick={() => setRef(f.ref)}
            >
              {f.ref === ref && (
                <motion.i
                  layoutId={`fatura-${cartao.id}`}
                  className="absolute inset-0 rounded-[14px] bg-[color:var(--realce)] shadow-[inset_0_0_0_1px_var(--realce2)]"
                  transition={MOLA}
                />
              )}
              <span className="relative block text-[.8125rem] font-[620] capitalize">
                {rotuloMesCurto(f.ref, true)}
              </span>
              <Valor centavos={f.total} className="relative block text-[.8125rem] text-t2" />
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={fatura.ref}
            initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
          >
            <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="legenda flex items-center gap-2">
                  Fatura de <span className="capitalize">{rotuloMesCurto(fatura.ref, true)}</span>
                  <span className={`selo ${SELO[fatura.status].classe}`}>
                    {SELO[fatura.status].rotulo}
                  </span>
                </p>
                <p className="grande mt-1.5">
                  <Valor centavos={fatura.restante > 0 ? fatura.restante : fatura.total} />
                </p>
                <p className="miudo mt-1">
                  Fecha em {dataCurta(fatura.fechamento, hoje)} · vence em{' '}
                  {dataCurta(fatura.vencimento, hoje)} ({distanciaEmDias(fatura.vencimento, hoje)})
                  {fatura.pago > 0 && fatura.restante > 0 && (
                    <>
                      {' '}
                      · já pago <Valor centavos={fatura.pago} />
                    </>
                  )}
                </p>
              </div>
              {podePagar && (
                <button
                  type="button"
                  className="b b-primario"
                  onClick={() => pagarFatura(cartao, fatura.ref, fatura.restante)}
                >
                  Pagar fatura
                </button>
              )}
            </div>

            <div className="-mx-[var(--pad)] mt-3">
              {fatura.compras.length === 0 ? (
                <p className="px-[var(--pad)] py-4 text-t2">Nenhuma compra nesta fatura.</p>
              ) : (
                fatura.compras.map((l) => (
                  <LinhaDeLancamento
                    key={l.id}
                    l={l}
                    dados={dados}
                    hoje={hoje}
                    aoClicar={() => editar(l)}
                  />
                ))
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.section>
  )
}
