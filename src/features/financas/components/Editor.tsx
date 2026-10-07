'use client'

import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Copy, Trash2 } from 'lucide-react'
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import Abas from '@/components/app/Abas'
import { Campo, CampoValor } from '@/components/app/Campos'
import { useConfirmar } from '@/components/app/Confirmar'
import Folha from '@/components/app/Folha'
import { Faisca, LuzNoFio } from '@/components/motion/Efeitos'
import { formatarReais } from '@/lib/dinheiro'
import { lancamentoSchema, primeiraMensagem } from '../esquemas'
import { categoriasOrdenadas, lancamentoVazio, parcelar } from '../fabrica'
import { ROTULO_FORMA } from '../padroes'
import { useDados } from '../store'
import type { Cartao, FormaPagamento, Lancamento, TipoLancamento } from '../tipos'

type TipoNovo = 'receita' | 'despesa' | 'transferencia'
type Pedido = { modo: 'novo' | 'editar'; lancamento: Lancamento; chave: number }
type Contexto = {
  novo: (tipo: TipoNovo, base?: Partial<Lancamento>) => void
  editar: (l: Lancamento) => void
  duplicar: (l: Lancamento) => void
  pagarFatura: (cartao: Cartao, ref: string, valor: number) => void
}

const Ctx = createContext<Contexto | null>(null)

export function useEditor(): Contexto {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useEditor fora do ProvedorDoEditor')
  return ctx
}

const FORMAS_DA_CONTA: FormaPagamento[] = ['pix', 'debito', 'dinheiro', 'boleto', 'transferencia']

/** Um único painel de lançamento para o app inteiro: qualquer tela abre por aqui. */
export function ProvedorDoEditor({ children }: { children: ReactNode }) {
  const { dados, hoje } = useDados()
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [aberta, setAberta] = useState(false)

  const abrir = useCallback((modo: Pedido['modo'], lancamento: Lancamento) => {
    setPedido((p) => ({ modo, lancamento, chave: (p?.chave ?? 0) + 1 }))
    setAberta(true)
  }, [])

  const contexto = useMemo<Contexto>(() => {
    const primeiraConta = dados.contas.find((c) => !c.arquivada)?.id ?? null
    return {
      novo: (tipo, base) =>
        abrir(
          'novo',
          lancamentoVazio({
            tipo,
            data: hoje,
            conta_id: base?.cartao_id ? null : primeiraConta,
            forma_pagamento:
              tipo === 'transferencia' ? 'transferencia' : base?.cartao_id ? 'credito' : 'pix',
            ...base,
          }),
        ),
      editar: (l) => abrir('editar', l),
      pagarFatura: (cartao, ref, valor) =>
        abrir(
          'novo',
          lancamentoVazio({
            tipo: 'pagamento_fatura',
            data: hoje,
            valor,
            descricao: `Fatura ${cartao.nome}`,
            conta_id: primeiraConta,
            cartao_id: cartao.id,
            fatura_ref: ref,
            forma_pagamento: 'boleto',
          }),
        ),
      duplicar: (l) => {
        const { id, created_at, ...resto } = l
        void id
        void created_at
        abrir(
          'novo',
          lancamentoVazio({
            ...resto,
            data: hoje,
            parcela_atual: null,
            parcela_total: null,
            grupo_id: null,
            recorrente_id: null,
          }),
        )
      },
    }
  }, [abrir, dados.contas, hoje])

  const titulo = !pedido
    ? ''
    : pedido.modo === 'editar'
      ? 'Editar lançamento'
      : pedido.lancamento.tipo === 'receita'
        ? 'Nova entrada'
        : pedido.lancamento.tipo === 'despesa'
          ? 'Nova saída'
          : pedido.lancamento.tipo === 'pagamento_fatura'
            ? 'Pagar fatura'
            : 'Nova transferência'

  return (
    <Ctx.Provider value={contexto}>
      {children}
      <Folha aberta={aberta} aoFechar={() => setAberta(false)} titulo={titulo}>
        {pedido && (
          <Formulario key={pedido.chave} pedido={pedido} fechar={() => setAberta(false)} />
        )}
      </Folha>
    </Ctx.Provider>
  )
}

function Formulario({ pedido, fechar }: { pedido: Pedido; fechar: () => void }) {
  const { dados, aplicar } = useDados()
  const { duplicar } = useEditor()
  const confirmar = useConfirmar()
  const editando = pedido.modo === 'editar'
  const [l, setL] = useState<Lancamento>(pedido.lancamento)
  const [parcelas, setParcelas] = useState(1)
  const [erro, setErro] = useState('')
  const [pulso, setPulso] = useState(0)
  const mudar = (campos: Partial<Lancamento>) => setL((atual) => ({ ...atual, ...campos }))

  const contas = dados.contas.filter(
    (c) => !c.arquivada || c.id === l.conta_id || c.id === l.conta_destino_id,
  )
  const cartoes = dados.cartoes.filter((c) => !c.arquivado || c.id === l.cartao_id)
  const categorias = categoriasOrdenadas(
    dados.categorias,
    l.tipo === 'receita' ? 'receita' : 'despesa',
  )
  const origem = l.cartao_id ? `cartao:${l.cartao_id}` : l.conta_id ? `conta:${l.conta_id}` : ''
  const noCartao = l.tipo === 'despesa' && !!l.cartao_id
  const fatura = l.tipo === 'pagamento_fatura'

  const trocarTipo = (tipo: TipoLancamento) => {
    const conta = l.conta_id ?? contas[0]?.id ?? null
    if (tipo === 'transferencia')
      mudar({
        tipo,
        cartao_id: null,
        conta_id: conta,
        conta_destino_id: contas.find((c) => c.id !== conta)?.id ?? null,
        categoria_id: null,
        forma_pagamento: 'transferencia',
      })
    else
      mudar({
        tipo,
        conta_destino_id: null,
        categoria_id: null,
        cartao_id: tipo === 'receita' ? null : l.cartao_id,
        conta_id: tipo === 'receita' ? conta : l.cartao_id ? null : conta,
        forma_pagamento:
          l.forma_pagamento === 'transferencia' ||
          (tipo === 'receita' && l.forma_pagamento === 'credito')
            ? 'pix'
            : l.forma_pagamento,
      })
    setParcelas(1)
  }

  const trocarOrigem = (valor: string) => {
    const [tipo, id] = valor.split(':')
    if (tipo === 'cartao') mudar({ cartao_id: id, conta_id: null, forma_pagamento: 'credito' })
    else {
      mudar({
        conta_id: id,
        cartao_id: null,
        forma_pagamento:
          l.forma_pagamento === 'credito' || !l.forma_pagamento ? 'pix' : l.forma_pagamento,
      })
      setParcelas(1)
    }
  }

  const salvar = async (e: FormEvent) => {
    e.preventDefault()
    const analise = lancamentoSchema.safeParse(l)
    if (!analise.success) {
      setErro(primeiraMensagem(analise.error))
      setPulso((p) => p + 1)
      return
    }
    const limpo = { ...l, ...analise.data } as Lancamento
    fechar()
    if (editando) {
      const { id, created_at, ...campos } = limpo
      void created_at
      await aplicar(
        [{ op: 'atualizar', tabela: 'lancamentos', id, campos }],
        'Lançamento atualizado',
      )
    } else {
      const linhas = parcelar(limpo, noCartao ? parcelas : 1)
      await aplicar(
        [{ op: 'inserir', tabela: 'lancamentos', linhas }],
        linhas.length > 1
          ? `Compra lançada em ${linhas.length} parcelas`
          : fatura
            ? 'Pagamento registrado'
            : 'Lançamento salvo',
      )
    }
  }

  const excluir = async () => {
    const grupo = l.grupo_id ? dados.lancamentos.filter((x) => x.grupo_id === l.grupo_id) : []
    const ok = await confirmar({
      titulo: 'Excluir este lançamento?',
      texto:
        grupo.length > 1
          ? `Ele faz parte de uma compra em ${grupo.length} parcelas. Só esta parcela será excluída.`
          : 'Esta ação não pode ser desfeita.',
      acao: 'Excluir',
      perigo: true,
    })
    if (!ok) return
    fechar()
    await aplicar([{ op: 'excluir', tabela: 'lancamentos', ids: [l.id] }], 'Lançamento excluído')
  }

  const nomeConta = (id: string | null) => dados.contas.find((c) => c.id === id)?.nome ?? 'Escolha'

  return (
    <form noValidate onSubmit={salvar} className="flex min-h-full flex-col">
      <div key={pulso} className={`flex flex-col gap-4 ${pulso > 0 ? 'mov-nega' : ''}`}>
        {!fatura && (
          <Abas
            rotulo="Tipo de lançamento"
            className="w-full"
            valor={l.tipo}
            aoMudar={trocarTipo}
            opcoes={[
              {
                valor: 'receita',
                rotulo: (
                  <>
                    <ArrowDownLeft size={16} aria-hidden="true" /> Entrada
                  </>
                ),
              },
              {
                valor: 'despesa',
                rotulo: (
                  <>
                    <ArrowUpRight size={16} aria-hidden="true" /> Saída
                  </>
                ),
              },
              {
                valor: 'transferencia',
                rotulo: (
                  <>
                    <ArrowLeftRight size={16} aria-hidden="true" /> Transferir
                  </>
                ),
              },
            ]}
          />
        )}

        <Campo rotulo="Valor">
          {(id) => (
            <CampoValor
              id={id}
              grande
              autoFoco
              valor={l.valor}
              aoMudar={(valor) => mudar({ valor })}
            />
          )}
        </Campo>

        {l.tipo === 'transferencia' && (
          <div className="flex items-center justify-between gap-2 rounded-2xl bg-painel2 px-4 py-3 shadow-[inset_0_0_0_1px_var(--linha)]">
            <span className="chip chip-ativo max-w-[36%] truncate">{nomeConta(l.conta_id)}</span>
            <LuzNoFio largura={110} altura={30} />
            <span className="chip chip-ativo max-w-[36%] truncate">
              {nomeConta(l.conta_destino_id)}
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Data">
            {(id) => (
              <input
                id={id}
                type="date"
                className="controle"
                value={l.data}
                onChange={(e) => mudar({ data: e.target.value })}
              />
            )}
          </Campo>
          {l.tipo === 'transferencia' || fatura ? (
            <Campo rotulo={fatura ? 'Paga com' : 'Sai de'}>
              {(id) => (
                <select
                  id={id}
                  className="controle"
                  value={l.conta_id ?? ''}
                  onChange={(e) => mudar({ conta_id: e.target.value })}
                >
                  {contas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              )}
            </Campo>
          ) : (
            <Campo rotulo={l.tipo === 'receita' ? 'Entra em' : 'Pago com'}>
              {(id) => (
                <select
                  id={id}
                  className="controle"
                  value={origem}
                  onChange={(e) => trocarOrigem(e.target.value)}
                >
                  <optgroup label="Contas">
                    {contas.map((c) => (
                      <option key={c.id} value={`conta:${c.id}`}>
                        {c.nome}
                      </option>
                    ))}
                  </optgroup>
                  {l.tipo === 'despesa' && cartoes.length > 0 && (
                    <optgroup label="Cartões de crédito">
                      {cartoes.map((c) => (
                        <option key={c.id} value={`cartao:${c.id}`}>
                          {c.nome}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              )}
            </Campo>
          )}
        </div>

        {l.tipo === 'transferencia' && (
          <Campo rotulo="Vai para">
            {(id) => (
              <select
                id={id}
                className="controle"
                value={l.conta_destino_id ?? ''}
                onChange={(e) => mudar({ conta_destino_id: e.target.value || null })}
              >
                <option value="">Escolha a conta</option>
                {contas
                  .filter((c) => c.id !== l.conta_id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
              </select>
            )}
          </Campo>
        )}

        <Campo rotulo="Descrição">
          {(id) => (
            <input
              id={id}
              className="controle"
              maxLength={120}
              placeholder={
                l.tipo === 'receita'
                  ? 'Ex.: salário'
                  : l.tipo === 'despesa'
                    ? 'Ex.: mercado'
                    : 'Opcional'
              }
              value={l.descricao}
              onChange={(e) => mudar({ descricao: e.target.value })}
            />
          )}
        </Campo>

        {(l.tipo === 'receita' || l.tipo === 'despesa') && (
          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Categoria">
              {(id) => (
                <select
                  id={id}
                  className="controle"
                  value={l.categoria_id ?? ''}
                  onChange={(e) => mudar({ categoria_id: e.target.value || null })}
                >
                  <option value="">Sem categoria</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.rotulo}
                    </option>
                  ))}
                </select>
              )}
            </Campo>
            {noCartao ? (
              <Campo rotulo="Parcelas">
                {(id) =>
                  editando ? (
                    <input
                      id={id}
                      className="controle"
                      disabled
                      value={
                        l.parcela_total ? `${l.parcela_atual} de ${l.parcela_total}` : 'À vista'
                      }
                    />
                  ) : (
                    <select
                      id={id}
                      className="controle"
                      value={parcelas}
                      onChange={(e) => setParcelas(Number(e.target.value))}
                    >
                      {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          {n === 1
                            ? 'À vista'
                            : `${n}x de ${formatarReais(Math.floor(l.valor / n))}`}
                        </option>
                      ))}
                    </select>
                  )
                }
              </Campo>
            ) : (
              <Campo rotulo="Forma de pagamento">
                {(id) => (
                  <select
                    id={id}
                    className="controle"
                    value={l.forma_pagamento ?? ''}
                    onChange={(e) =>
                      mudar({ forma_pagamento: (e.target.value || null) as FormaPagamento | null })
                    }
                  >
                    {FORMAS_DA_CONTA.map((f) => (
                      <option key={f} value={f}>
                        {ROTULO_FORMA[f]}
                      </option>
                    ))}
                  </select>
                )}
              </Campo>
            )}
          </div>
        )}

        <Campo rotulo="Observação">
          {(id) => (
            <textarea
              id={id}
              className="controle"
              maxLength={500}
              rows={2}
              value={l.observacao}
              onChange={(e) => mudar({ observacao: e.target.value })}
            />
          )}
        </Campo>

        {erro && (
          <p role="alert" className="text-[.9375rem] text-erro">
            {erro}
          </p>
        )}
      </div>

      <div className="mt-6 flex gap-2">
        {editando && (
          <>
            <button
              type="button"
              className="b b-perigo b-icone b-grande"
              onClick={excluir}
              aria-label="Excluir lançamento"
            >
              <Trash2 size={19} aria-hidden="true" />
            </button>
            {!fatura && (
              <button
                type="button"
                className="b b-suave b-icone b-grande"
                onClick={() => duplicar(l)}
                aria-label="Duplicar lançamento"
              >
                <Copy size={19} aria-hidden="true" />
              </button>
            )}
          </>
        )}
        <Faisca className="flex-1">
          <button type="submit" className="b b-primario b-grande w-full">
            {editando ? 'Salvar alterações' : 'Salvar'}
          </button>
        </Faisca>
      </div>
    </form>
  )
}
