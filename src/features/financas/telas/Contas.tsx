'use client'

import { Archive, ArchiveRestore, ArrowLeftRight, Lock, Pencil, Plus, Trash2 } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Campo, CampoValor } from '@/components/app/Campos'
import { useConfirmar } from '@/components/app/Confirmar'
import { useAvisar } from '@/components/app/Avisos'
import { ICONE_DA_CONTA } from '@/components/app/Icones'
import Menu from '@/components/app/Menu'
import Valor from '@/components/app/Valor'
import Linha from '@/components/graficos/Linha'
import { Holofote } from '@/components/motion/Efeitos'
import { Surgir, itemSurgir } from '@/components/motion/Surgir'
import { CURVA_FIO } from '@/components/motion/molas'
import { dataCurta, somarDias } from '@/lib/datas'
import { dividaDoCartao, patrimonio, saldoDisponivel, saldosPorConta } from '../calculos'
import { useEditor } from '../components/Editor'
import { contaSchema, primeiraMensagem } from '../esquemas'
import { emUso } from '../operacoes'
import { ROTULO_CONTA, novoId } from '../padroes'
import { useDados } from '../store'
import type { Conta, TipoConta } from '../tipos'
import { FolhaDeFormulario, Interruptor, useFolha } from './formularios'

type Feixe = { d: string; chave: string }

export default function Contas() {
  const { dados, hoje, aplicar } = useDados()
  const { novo } = useEditor()
  const confirmar = useConfirmar()
  const avisar = useAvisar()
  const reduzido = useReducedMotion()
  const folha = useFolha<Conta>()
  const [rascunho, setRascunho] = useState<Conta | null>(null)
  const [negativo, setNegativo] = useState(false)
  const grade = useRef<HTMLDivElement>(null)
  const [feixe, setFeixe] = useState<Feixe | null>(null)

  const c = useMemo(() => {
    const dias = Array.from({ length: 30 }, (_, i) => somarDias(hoje, i - 29))
    const historico = dias.map((d) => ({ d, saldos: saldosPorConta(dados, d) }))
    return {
      saldos: saldosPorConta(dados, hoje),
      total: saldoDisponivel(dados, hoje),
      patrimonio: patrimonio(dados, hoje),
      divida: dados.cartoes.reduce(
        (s, x) => s + Math.max(0, dividaDoCartao(x.id, dados.lancamentos, hoje)),
        0,
      ),
      serie: (id: string) =>
        historico.map((h) => ({
          rotulo: dataCurta(h.d),
          titulo: dataCurta(h.d, hoje),
          valor: h.saldos.get(id) ?? 0,
        })),
    }
  }, [dados, hoje])

  // Luz no fio (Krivvo): quando surge uma transferência, um traço de luz vai de uma conta à outra.
  const ultima = useMemo(
    () =>
      dados.lancamentos
        .filter((l) => l.tipo === 'transferencia')
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0],
    [dados.lancamentos],
  )
  const vista = useRef<string | null | undefined>(undefined)
  useEffect(() => {
    const id = ultima?.id ?? null
    if (vista.current === undefined) {
      vista.current = id
      return
    }
    if (id === vista.current) return
    vista.current = id
    const caixa = grade.current
    if (!ultima || !caixa || reduzido) return
    const de = caixa.querySelector<HTMLElement>(`[data-conta="${ultima.conta_id}"]`)
    const para = caixa.querySelector<HTMLElement>(`[data-conta="${ultima.conta_destino_id}"]`)
    if (!de || !para) return
    const base = caixa.getBoundingClientRect()
    const a = de.getBoundingClientRect()
    const b = para.getBoundingClientRect()
    const x1 = a.left + a.width / 2 - base.left
    const y1 = a.top + a.height / 2 - base.top
    const x2 = b.left + b.width / 2 - base.left
    const y2 = b.top + b.height / 2 - base.top
    const dx = x2 - x1
    setFeixe({
      d: `M${x1},${y1} C${x1 + dx * 0.45},${y1 - 60} ${x2 - dx * 0.45},${y2 + 40} ${x2},${y2}`,
      chave: ultima.id,
    })
    const fim = window.setTimeout(() => setFeixe(null), 1500)
    return () => window.clearTimeout(fim)
  }, [ultima, reduzido])

  const abrir = (conta?: Conta) => {
    const item = conta ?? {
      id: novoId(),
      nome: '',
      tipo: 'corrente' as TipoConta,
      saldo_inicial: 0,
      arquivada: false,
      created_at: new Date().toISOString(),
    }
    setNegativo(item.saldo_inicial < 0)
    setRascunho({ ...item, saldo_inicial: Math.abs(item.saldo_inicial) })
    folha.abrir(item)
  }
  const editando = !!rascunho && dados.contas.some((x) => x.id === rascunho.id)

  const salvar = () => {
    if (!rascunho) return
    const r = contaSchema.safeParse({
      ...rascunho,
      saldo_inicial: negativo ? -rascunho.saldo_inicial : rascunho.saldo_inicial,
    })
    if (!r.success) return primeiraMensagem(r.error)
    const limpa = { ...rascunho, ...r.data } as Conta
    folha.fechar()
    if (editando) {
      const { id, created_at, ...campos } = limpa
      void created_at
      void aplicar([{ op: 'atualizar', tabela: 'contas', id, campos }], 'Conta atualizada')
    } else void aplicar([{ op: 'inserir', tabela: 'contas', linhas: [limpa] }], 'Conta criada')
  }

  const arquivar = (conta: Conta) =>
    void aplicar(
      [
        {
          op: 'atualizar',
          tabela: 'contas',
          id: conta.id,
          campos: { arquivada: !conta.arquivada },
        },
      ],
      conta.arquivada ? 'Conta reativada' : 'Conta arquivada',
    )

  const excluir = async (conta: Conta) => {
    if (emUso(dados, 'contas', conta.id)) {
      avisar({
        tipo: 'info',
        texto:
          'Esta conta tem lançamentos. Arquive-a para tirá-la da frente sem perder o histórico.',
      })
      return
    }
    const ok = await confirmar({
      titulo: `Excluir a conta ${conta.nome}?`,
      texto: 'Ela não tem lançamentos. Esta ação não pode ser desfeita.',
      acao: 'Excluir',
      perigo: true,
    })
    if (ok) void aplicar([{ op: 'excluir', tabela: 'contas', ids: [conta.id] }], 'Conta excluída')
  }

  const ativas = dados.contas.filter((x) => !x.arquivada)
  const arquivadas = dados.contas.filter((x) => x.arquivada)

  return (
    <Surgir className="grid gap-[var(--vao)]">
      <Holofote className="cartao overflow-hidden" variants={itemSurgir}>
        <span className="aurora" aria-hidden="true" />
        <div className="relative flex flex-wrap items-end justify-between gap-6 p-[calc(var(--pad)+4px)]">
          <div>
            <p className="legenda">Patrimônio total</p>
            <p className="heroi mt-2.5">
              <Valor centavos={c.patrimonio} animado />
            </p>
            <p className="miudo mt-2.5">
              <Valor centavos={c.total} className="text-t1" /> em contas
              {c.divida > 0 && (
                <>
                  {' '}
                  menos <Valor centavos={c.divida} className="text-t1" /> em faturas de cartão
                </>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="b b-suave"
              disabled={ativas.length < 2}
              title={ativas.length < 2 ? 'Crie outra conta para transferir' : undefined}
              onClick={() => novo('transferencia')}
            >
              <ArrowLeftRight size={17} aria-hidden="true" /> Transferir
            </button>
            <button type="button" className="b b-primario" onClick={() => abrir()}>
              <Plus size={17} aria-hidden="true" /> Nova conta
            </button>
          </div>
        </div>
      </Holofote>

      <div
        ref={grade}
        className="relative grid gap-[var(--vao)] min-[700px]:grid-cols-2 min-[1280px]:grid-cols-3"
      >
        {ativas.map((conta) => {
          const I = ICONE_DA_CONTA[conta.tipo]
          const saldo = c.saldos.get(conta.id) ?? 0
          return (
            <Holofote key={conta.id} className="cartao" variants={itemSurgir} layout="position">
              <div className="cartao-pad pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      data-conta={conta.id}
                      className="icone-cat !h-11 !w-11"
                      style={{ ['--c' as string]: 'var(--azul)' }}
                      aria-hidden="true"
                    >
                      <I size={20} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[1.0625rem] font-[620] tracking-[-.01em]">
                        {conta.nome}
                      </span>
                      <span className="miudo block">{ROTULO_CONTA[conta.tipo]}</span>
                    </span>
                  </div>
                  <Menu
                    rotulo={`Ações da conta ${conta.nome}`}
                    itens={[
                      { rotulo: 'Editar', icone: Pencil, aoClicar: () => abrir(conta) },
                      { rotulo: 'Arquivar', icone: Archive, aoClicar: () => arquivar(conta) },
                      {
                        rotulo: 'Excluir',
                        icone: Trash2,
                        aoClicar: () => void excluir(conta),
                        perigo: true,
                      },
                    ]}
                  />
                </div>
                <p className={`grande mt-4 ${saldo < 0 ? 'text-erro' : ''}`}>
                  <Valor centavos={saldo} animado />
                </p>
              </div>
              <div className="px-2 pb-2" aria-hidden="true">
                <Linha pontos={c.serie(conta.id)} altura={56} mini nome={conta.nome} />
              </div>
            </Holofote>
          )
        })}

        {feixe && (
          <svg
            className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible"
            aria-hidden="true"
          >
            <motion.path
              key={feixe.chave}
              d={feixe.d}
              fill="none"
              stroke="var(--azul)"
              strokeWidth="2.4"
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray="0.2 1.4"
              style={{ filter: 'drop-shadow(0 0 7px var(--azul))' }}
              initial={{ strokeDashoffset: 0.2, opacity: 1 }}
              animate={{ strokeDashoffset: -1.05, opacity: [1, 1, 0] }}
              transition={{ duration: 0.95, ease: CURVA_FIO, delay: 0.25 }}
            />
          </svg>
        )}
      </div>

      {arquivadas.length > 0 && (
        <motion.section variants={itemSurgir}>
          <h2 className="legenda mb-2.5 px-1">Arquivadas</h2>
          <div className="grid gap-[var(--vao)] min-[700px]:grid-cols-2 min-[1280px]:grid-cols-3">
            {arquivadas.map((conta) => (
              <div key={conta.id} className="cartao congelado cartao-pad flex items-center gap-3">
                <span
                  className="icone-cat"
                  style={{ ['--c' as string]: 'var(--t3)' }}
                  aria-hidden="true"
                >
                  <Lock size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-[560]">{conta.nome}</span>
                  <Valor centavos={c.saldos.get(conta.id) ?? 0} className="miudo" />
                </span>
                <Menu
                  rotulo={`Ações da conta ${conta.nome}`}
                  itens={[
                    { rotulo: 'Reativar', icone: ArchiveRestore, aoClicar: () => arquivar(conta) },
                    {
                      rotulo: 'Excluir',
                      icone: Trash2,
                      aoClicar: () => void excluir(conta),
                      perigo: true,
                    },
                  ]}
                />
              </div>
            ))}
          </div>
        </motion.section>
      )}

      <FolhaDeFormulario
        key={folha.chave}
        aberta={folha.aberta}
        aoFechar={folha.fechar}
        titulo={editando ? 'Editar conta' : 'Nova conta'}
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
                  placeholder="Ex.: Nubank, Carteira"
                  value={rascunho.nome}
                  onChange={(e) => setRascunho({ ...rascunho, nome: e.target.value })}
                />
              )}
            </Campo>
            <Campo rotulo="Tipo">
              {(id) => (
                <select
                  id={id}
                  className="controle"
                  value={rascunho.tipo}
                  onChange={(e) => setRascunho({ ...rascunho, tipo: e.target.value as TipoConta })}
                >
                  {Object.entries(ROTULO_CONTA).map(([valor, rotulo]) => (
                    <option key={valor} value={valor}>
                      {rotulo}
                    </option>
                  ))}
                </select>
              )}
            </Campo>
            <Campo
              rotulo="Saldo inicial"
              dica="Quanto havia na conta antes do primeiro lançamento registrado aqui."
            >
              {(id) => (
                <CampoValor
                  id={id}
                  valor={rascunho.saldo_inicial}
                  aoMudar={(v) => setRascunho({ ...rascunho, saldo_inicial: v })}
                />
              )}
            </Campo>
            <Interruptor
              rotulo="Saldo inicial negativo"
              descricao="Use para conta que começou no cheque especial."
              ligado={negativo}
              aoMudar={setNegativo}
            />
          </>
        )}
      </FolhaDeFormulario>
    </Surgir>
  )
}
