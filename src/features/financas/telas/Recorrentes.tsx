'use client'

import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Pause,
  Pencil,
  Play,
  Plus,
  Repeat,
  Trash2,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import Abas from '@/components/app/Abas'
import { Campo, CampoValor, Vazio } from '@/components/app/Campos'
import { useConfirmar } from '@/components/app/Confirmar'
import { IconeCategoria } from '@/components/app/Icones'
import Menu from '@/components/app/Menu'
import Valor from '@/components/app/Valor'
import Linha from '@/components/graficos/Linha'
import { Holofote, ItemDeLista } from '@/components/motion/Efeitos'
import { Surgir, itemSurgir } from '@/components/motion/Surgir'
import { dataCurta, distanciaEmDias, mesDe, somarDias } from '@/lib/datas'
import { fluxoFuturo, statusDoRecorrente, type StatusRecorrente } from '../calculos'
import { primeiraMensagem, recorrenteSchema } from '../esquemas'
import { categoriasOrdenadas, nomeDaCategoria, operacoesDoRecorrente } from '../fabrica'
import { COR_NEUTRA, ROTULO_FREQUENCIA, novoId } from '../padroes'
import { useDados } from '../store'
import type { Frequencia, Recorrente } from '../tipos'
import { FolhaDeFormulario, Interruptor, useFolha } from './formularios'
import { Bloco } from './partes'

const FATOR_MENSAL: Record<Frequencia, number> = { semanal: 52 / 12, mensal: 1, anual: 1 / 12 }
const SELO: Record<StatusRecorrente, { rotulo: string; classe: string }> = {
  atrasado: { rotulo: 'Atrasado', classe: 'selo-erro' },
  hoje: { rotulo: 'Vence hoje', classe: 'selo-aviso' },
  pendente: { rotulo: 'Pendente', classe: '' },
  pausado: { rotulo: 'Pausado', classe: '' },
}
const ORDEM: Record<StatusRecorrente, number> = { atrasado: 0, hoje: 1, pendente: 2, pausado: 3 }

export default function Recorrentes() {
  const { dados, hoje, aplicar } = useDados()
  const confirmar = useConfirmar()
  const folha = useFolha<Recorrente>()
  const [rascunho, setRascunho] = useState<Recorrente | null>(null)
  const contaPadrao = dados.contas.find((x) => !x.arquivada)?.id ?? null

  const c = useMemo(() => {
    const ativos = dados.recorrentes.filter((r) => r.ativo)
    const mensal = (tipo: 'receita' | 'despesa') =>
      Math.round(
        ativos
          .filter((r) => r.tipo === tipo)
          .reduce((s, r) => s + r.valor * FATOR_MENSAL[r.frequencia], 0),
      )
    const fluxo = fluxoFuturo(dados, hoje, 90)
    const pagosNoMes = new Set(
      dados.lancamentos
        .filter((l) => l.recorrente_id && mesDe(l.data) === mesDe(hoje))
        .map((l) => l.recorrente_id as string),
    )
    return {
      entradas: mensal('receita'),
      saidas: mensal('despesa'),
      fluxo: fluxo.map((p) => ({
        rotulo: dataCurta(p.data),
        titulo: dataCurta(p.data, hoje),
        valor: p.saldo,
      })),
      menor: fluxo.reduce((m, p) => (p.saldo < m.saldo ? p : m), fluxo[0]),
      pagosNoMes,
      lista: [...dados.recorrentes]
        .map((r) => ({ r, status: statusDoRecorrente(r, hoje) }))
        .sort(
          (a, b) =>
            ORDEM[a.status] - ORDEM[b.status] ||
            (a.r.proximo_vencimento < b.r.proximo_vencimento ? -1 : 1),
        ),
    }
  }, [dados, hoje])

  const abrir = (r?: Recorrente) => {
    const item = r ?? {
      id: novoId(),
      tipo: 'despesa' as const,
      descricao: '',
      valor: 0,
      categoria_id: null,
      conta_id: contaPadrao,
      cartao_id: null,
      frequencia: 'mensal' as Frequencia,
      proximo_vencimento: somarDias(hoje, 1),
      ativo: true,
      created_at: new Date().toISOString(),
    }
    setRascunho(item)
    folha.abrir(item)
  }
  const editando = !!rascunho && dados.recorrentes.some((r) => r.id === rascunho.id)

  const salvar = () => {
    if (!rascunho) return
    const r = recorrenteSchema.safeParse(rascunho)
    if (!r.success) return primeiraMensagem(r.error)
    const limpo = { ...rascunho, ...r.data } as Recorrente
    folha.fechar()
    if (editando) {
      const { id, created_at, ...campos } = limpo
      void created_at
      void aplicar(
        [{ op: 'atualizar', tabela: 'recorrentes', id, campos }],
        'Recorrente atualizado',
      )
    } else
      void aplicar([{ op: 'inserir', tabela: 'recorrentes', linhas: [limpo] }], 'Recorrente criado')
  }

  const excluir = async (r: Recorrente) => {
    const ok = await confirmar({
      titulo: `Excluir ${r.descricao}?`,
      texto:
        'Os lançamentos já registrados continuam no histórico. Só a repetição deixa de existir.',
      acao: 'Excluir',
      perigo: true,
    })
    if (ok)
      void aplicar([{ op: 'excluir', tabela: 'recorrentes', ids: [r.id] }], 'Recorrente excluído')
  }

  const origem = rascunho?.cartao_id
    ? `cartao:${rascunho.cartao_id}`
    : rascunho?.conta_id
      ? `conta:${rascunho.conta_id}`
      : ''

  return (
    <Surgir className="grid gap-[var(--vao)]">
      <div className="grid gap-[var(--vao)] min-[1100px]:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <div className="grid content-start gap-[var(--vao)] min-[560px]:max-[1099px]:grid-cols-2">
          <Holofote className="cartao cartao-pad" variants={itemSurgir}>
            <p className="legenda flex items-center gap-2">
              <ArrowDownLeft size={15} className="text-t3" aria-hidden="true" /> Entradas fixas por
              mês
            </p>
            <p className="grande mt-2 text-gelo">
              <Valor centavos={c.entradas} animado />
            </p>
          </Holofote>
          <Holofote className="cartao cartao-pad" variants={itemSurgir}>
            <p className="legenda flex items-center gap-2">
              <ArrowUpRight size={15} className="text-t3" aria-hidden="true" /> Saídas fixas por mês
            </p>
            <p className="grande mt-2">
              <Valor centavos={c.saidas} animado />
            </p>
            <p className="miudo mt-1">
              Sobra prevista:{' '}
              <Valor centavos={c.entradas - c.saidas} className="font-[600] text-t1" />
            </p>
          </Holofote>
        </div>
        <Bloco
          titulo="Fluxo de caixa previsto"
          acao={<span className="miudo">próximos 90 dias</span>}
        >
          <Linha pontos={c.fluxo} nome="Saldo previsto" altura={196} />
          <p className="miudo mt-2">
            Menor saldo previsto:{' '}
            <Valor
              centavos={c.menor.saldo}
              className={`font-[600] ${c.menor.saldo < 0 ? 'text-erro' : 'text-t1'}`}
            />{' '}
            em {dataCurta(c.menor.data, hoje)}. Considera recorrentes, faturas e lançamentos
            futuros.
          </p>
        </Bloco>
      </div>

      <Bloco
        titulo="Lançamentos recorrentes"
        semPad
        acao={
          <button type="button" className="b b-primario" onClick={() => abrir()}>
            <Plus size={17} aria-hidden="true" /> Novo
          </button>
        }
      >
        {c.lista.length === 0 ? (
          <Vazio
            icone={<Repeat size={28} aria-hidden="true" />}
            titulo="Nada se repete ainda"
            texto="Cadastre salário, aluguel, assinaturas e contas fixas. Eles entram nos vencimentos e na previsão de saldo."
            acao={
              <button type="button" className="b b-primario" onClick={() => abrir()}>
                <Plus size={17} aria-hidden="true" /> Cadastrar recorrente
              </button>
            }
          />
        ) : (
          <ul className="pb-2">
            <AnimatePresence initial={false}>
              {c.lista.map(({ r, status }) => {
                const cat = dados.categorias.find((x) => x.id === r.categoria_id)
                const entrada = r.tipo === 'receita'
                return (
                  <ItemDeLista key={r.id} id={r.id}>
                    <div
                      className={`linha-lista !cursor-default ${status === 'pausado' ? 'opacity-55' : ''}`}
                    >
                      <IconeCategoria icone={cat?.icone ?? 'repeat'} cor={cat?.cor ?? COR_NEUTRA} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate font-[560]">{r.descricao}</span>
                          {status !== 'pendente' && (
                            <span className={`selo flex-none ${SELO[status].classe}`}>
                              {SELO[status].rotulo}
                            </span>
                          )}
                          {c.pagosNoMes.has(r.id) && (
                            <span className="selo selo-ok flex-none max-[560px]:!hidden">
                              <Check size={12} aria-hidden="true" /> {entrada ? 'Recebido' : 'Pago'}{' '}
                              este mês
                            </span>
                          )}
                        </span>
                        <span className="miudo block truncate">
                          {ROTULO_FREQUENCIA[r.frequencia]} ·{' '}
                          {nomeDaCategoria(r.categoria_id, dados.categorias)}
                          {status !== 'pausado' && (
                            <>
                              {' '}
                              · próximo: {dataCurta(r.proximo_vencimento, hoje)} (
                              {distanciaEmDias(r.proximo_vencimento, hoje)})
                            </>
                          )}
                        </span>
                      </span>
                      <Valor
                        centavos={r.valor}
                        sinal={entrada ? 'mais' : 'menos'}
                        className={`flex-none font-[600] ${entrada ? 'text-gelo' : ''}`}
                      />
                      {status !== 'pausado' && (
                        <motion.button
                          type="button"
                          className="chip flex-none max-[560px]:!hidden"
                          whileTap={{ scale: 0.94 }}
                          onClick={() =>
                            void aplicar(
                              operacoesDoRecorrente(r, hoje, contaPadrao),
                              entrada ? 'Recebimento registrado' : 'Pagamento registrado',
                            )
                          }
                        >
                          {entrada ? 'Recebi' : 'Paguei'}
                        </motion.button>
                      )}
                      <Menu
                        rotulo={`Ações de ${r.descricao}`}
                        itens={[
                          ...(status !== 'pausado'
                            ? [
                                {
                                  rotulo: entrada ? 'Marcar como recebido' : 'Marcar como pago',
                                  icone: Check,
                                  aoClicar: () =>
                                    void aplicar(
                                      operacoesDoRecorrente(r, hoje, contaPadrao),
                                      entrada ? 'Recebimento registrado' : 'Pagamento registrado',
                                    ),
                                },
                              ]
                            : []),
                          { rotulo: 'Editar', icone: Pencil, aoClicar: () => abrir(r) },
                          {
                            rotulo: r.ativo ? 'Pausar' : 'Retomar',
                            icone: r.ativo ? Pause : Play,
                            aoClicar: () =>
                              void aplicar(
                                [
                                  {
                                    op: 'atualizar',
                                    tabela: 'recorrentes',
                                    id: r.id,
                                    campos: { ativo: !r.ativo },
                                  },
                                ],
                                r.ativo ? 'Recorrente pausado' : 'Recorrente retomado',
                              ),
                          },
                          {
                            rotulo: 'Excluir',
                            icone: Trash2,
                            aoClicar: () => void excluir(r),
                            perigo: true,
                          },
                        ]}
                      />
                    </div>
                  </ItemDeLista>
                )
              })}
            </AnimatePresence>
          </ul>
        )}
      </Bloco>

      <FolhaDeFormulario
        key={folha.chave}
        aberta={folha.aberta}
        aoFechar={folha.fechar}
        titulo={editando ? 'Editar recorrente' : 'Novo recorrente'}
        aoSalvar={salvar}
      >
        {rascunho && (
          <>
            <Abas
              rotulo="Tipo"
              className="w-full"
              valor={rascunho.tipo}
              aoMudar={(tipo) =>
                setRascunho({
                  ...rascunho,
                  tipo,
                  categoria_id: null,
                  cartao_id: tipo === 'receita' ? null : rascunho.cartao_id,
                  conta_id:
                    tipo === 'receita' ? (rascunho.conta_id ?? contaPadrao) : rascunho.conta_id,
                })
              }
              opcoes={[
                {
                  valor: 'despesa',
                  rotulo: (
                    <>
                      <ArrowUpRight size={16} aria-hidden="true" /> Saída
                    </>
                  ),
                },
                {
                  valor: 'receita',
                  rotulo: (
                    <>
                      <ArrowDownLeft size={16} aria-hidden="true" /> Entrada
                    </>
                  ),
                },
              ]}
            />
            <Campo rotulo="Valor">
              {(id) => (
                <CampoValor
                  id={id}
                  grande
                  autoFoco
                  valor={rascunho.valor}
                  aoMudar={(valor) => setRascunho({ ...rascunho, valor })}
                />
              )}
            </Campo>
            <Campo rotulo="Descrição">
              {(id) => (
                <input
                  id={id}
                  className="controle"
                  maxLength={120}
                  placeholder={
                    rascunho.tipo === 'receita'
                      ? 'Ex.: salário'
                      : 'Ex.: aluguel, internet, academia'
                  }
                  value={rascunho.descricao}
                  onChange={(e) => setRascunho({ ...rascunho, descricao: e.target.value })}
                />
              )}
            </Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo rotulo="Repete">
                {(id) => (
                  <select
                    id={id}
                    className="controle"
                    value={rascunho.frequencia}
                    onChange={(e) =>
                      setRascunho({ ...rascunho, frequencia: e.target.value as Frequencia })
                    }
                  >
                    <option value="semanal">Toda semana</option>
                    <option value="mensal">Todo mês</option>
                    <option value="anual">Todo ano</option>
                  </select>
                )}
              </Campo>
              <Campo rotulo="Próximo vencimento">
                {(id) => (
                  <input
                    id={id}
                    type="date"
                    className="controle"
                    value={rascunho.proximo_vencimento}
                    onChange={(e) =>
                      setRascunho({ ...rascunho, proximo_vencimento: e.target.value })
                    }
                  />
                )}
              </Campo>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Campo rotulo="Categoria">
                {(id) => (
                  <select
                    id={id}
                    className="controle"
                    value={rascunho.categoria_id ?? ''}
                    onChange={(e) =>
                      setRascunho({ ...rascunho, categoria_id: e.target.value || null })
                    }
                  >
                    <option value="">Sem categoria</option>
                    {categoriasOrdenadas(dados.categorias, rascunho.tipo).map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.rotulo}
                      </option>
                    ))}
                  </select>
                )}
              </Campo>
              <Campo rotulo={rascunho.tipo === 'receita' ? 'Entra em' : 'Pago com'}>
                {(id) => (
                  <select
                    id={id}
                    className="controle"
                    value={origem}
                    onChange={(e) => {
                      const [tipo, valor] = e.target.value.split(':')
                      setRascunho({
                        ...rascunho,
                        conta_id: tipo === 'conta' ? valor : null,
                        cartao_id: tipo === 'cartao' ? valor : null,
                      })
                    }}
                  >
                    <optgroup label="Contas">
                      {dados.contas
                        .filter((x) => !x.arquivada || x.id === rascunho.conta_id)
                        .map((x) => (
                          <option key={x.id} value={`conta:${x.id}`}>
                            {x.nome}
                          </option>
                        ))}
                    </optgroup>
                    {rascunho.tipo === 'despesa' && dados.cartoes.some((x) => !x.arquivado) && (
                      <optgroup label="Cartões de crédito">
                        {dados.cartoes
                          .filter((x) => !x.arquivado || x.id === rascunho.cartao_id)
                          .map((x) => (
                            <option key={x.id} value={`cartao:${x.id}`}>
                              {x.nome}
                            </option>
                          ))}
                      </optgroup>
                    )}
                  </select>
                )}
              </Campo>
            </div>
            {editando && (
              <Interruptor
                rotulo="Ativo"
                descricao="Pausado, ele some dos vencimentos e da previsão."
                ligado={rascunho.ativo}
                aoMudar={(ativo) => setRascunho({ ...rascunho, ativo })}
              />
            )}
          </>
        )}
      </FolhaDeFormulario>
    </Surgir>
  )
}
