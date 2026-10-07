'use client'

import { ChartPie, Pencil, Plus, Trash2 } from 'lucide-react'
import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { Campo, CampoValor, Vazio } from '@/components/app/Campos'
import { useConfirmar } from '@/components/app/Confirmar'
import { IconeCategoria } from '@/components/app/Icones'
import Menu from '@/components/app/Menu'
import Valor from '@/components/app/Valor'
import { Anel, Holofote } from '@/components/motion/Efeitos'
import Numero from '@/components/motion/Numero'
import { Surgir, itemSurgir } from '@/components/motion/Surgir'
import {
  diasEntre,
  diasNoMes,
  fimDoMes,
  listarMeses,
  mesDe,
  rotuloMes,
  rotuloMesCurto,
} from '@/lib/datas'
import { formatarReais } from '@/lib/dinheiro'
import { gastoDoOrcamento, usoDoOrcamento, type NivelOrcamento } from '../calculos'
import { orcamentoSchema, primeiraMensagem } from '../esquemas'
import { novoId } from '../padroes'
import { useDados } from '../store'
import type { Orcamento } from '../tipos'
import { FolhaDeFormulario, useFolha } from './formularios'
import { Bloco, SeletorDeMes } from './partes'

const COR: Record<NivelOrcamento, string> = {
  ok: 'var(--azul)',
  atencao: 'var(--aviso)',
  alerta: 'var(--erro)',
  estourado: 'var(--erro)',
}
const ROTULO: Record<NivelOrcamento, { texto: string; classe: string } | null> = {
  ok: null,
  atencao: { texto: 'Passou de 70%', classe: 'selo-aviso' },
  alerta: { texto: 'Passou de 90%', classe: 'selo-erro' },
  estourado: { texto: 'Limite estourado', classe: 'selo-erro' },
}

export default function Orcamentos() {
  const { dados, hoje, aplicar } = useDados()
  const confirmar = useConfirmar()
  const [ref, setRef] = useState(mesDe(hoje))
  const folha = useFolha<Orcamento>()
  const [rascunho, setRascunho] = useState<Orcamento | null>(null)

  const c = useMemo(() => {
    const meses = listarMeses(ref, 6)
    const itens = dados.orcamentos.map((o) => ({
      o,
      categoria: dados.categorias.find((x) => x.id === o.categoria_id) ?? null,
      ...usoDoOrcamento(o, dados, ref),
      historico: meses.map((m) => ({ ref: m, usado: gastoDoOrcamento(o, dados, m) })),
    }))
    return {
      geral: itens.find((i) => i.o.categoria_id === null) ?? null,
      categorias: itens.filter((i) => i.o.categoria_id !== null).sort((a, b) => b.pct - a.pct),
    }
  }, [dados, ref])

  const livres = dados.categorias.filter(
    (cat) =>
      cat.tipo === 'despesa' &&
      !cat.pai_id &&
      !dados.orcamentos.some((o) => o.categoria_id === cat.id && o.id !== rascunho?.id),
  )
  const temGeral = dados.orcamentos.some((o) => o.categoria_id === null && o.id !== rascunho?.id)
  const editando = !!rascunho && dados.orcamentos.some((o) => o.id === rascunho.id)

  const abrir = (o?: Orcamento) => {
    const item = o ?? {
      id: novoId(),
      categoria_id: temGeral ? (livres[0]?.id ?? null) : null,
      valor: 0,
      created_at: new Date().toISOString(),
    }
    setRascunho(item)
    folha.abrir(item)
  }

  const salvar = () => {
    if (!rascunho) return
    const r = orcamentoSchema.safeParse(rascunho)
    if (!r.success) return primeiraMensagem(r.error)
    folha.fechar()
    if (editando)
      void aplicar(
        [
          {
            op: 'atualizar',
            tabela: 'orcamentos',
            id: rascunho.id,
            campos: { valor: rascunho.valor, categoria_id: rascunho.categoria_id },
          },
        ],
        'Orçamento atualizado',
      )
    else
      void aplicar(
        [{ op: 'inserir', tabela: 'orcamentos', linhas: [rascunho] }],
        'Orçamento criado',
      )
  }

  const excluir = async (o: Orcamento, nome: string) => {
    const ok = await confirmar({
      titulo: `Excluir o orçamento de ${nome}?`,
      texto: 'Os lançamentos continuam como estão; só o limite deixa de existir.',
      acao: 'Excluir',
      perigo: true,
    })
    if (ok)
      void aplicar([{ op: 'excluir', tabela: 'orcamentos', ids: [o.id] }], 'Orçamento excluído')
  }

  const mesAtual = ref === mesDe(hoje)
  const diasRestantes = mesAtual ? diasEntre(hoje, fimDoMes(ref)) + 1 : 0
  const podeCriar = !temGeral || livres.length > 0

  return (
    <Surgir className="grid gap-[var(--vao)]">
      <motion.div
        variants={itemSurgir}
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <SeletorDeMes valor={ref} aoMudar={setRef} hoje={hoje} />
        <button
          type="button"
          className="b b-primario"
          onClick={() => abrir()}
          disabled={!podeCriar}
        >
          <Plus size={17} aria-hidden="true" /> Novo orçamento
        </button>
      </motion.div>

      {dados.orcamentos.length === 0 ? (
        <Bloco>
          <Vazio
            icone={<ChartPie size={28} aria-hidden="true" />}
            titulo="Defina quanto quer gastar"
            texto="Crie um limite geral para o mês ou um por categoria. O app avisa aos 70%, 90% e 100%."
            acao={
              <button type="button" className="b b-primario" onClick={() => abrir()}>
                <Plus size={17} aria-hidden="true" /> Criar orçamento
              </button>
            }
          />
        </Bloco>
      ) : (
        <>
          {c.geral && (
            <Holofote
              className={`cartao overflow-hidden ${c.geral.nivel === 'ok' ? '' : 'borda-luz'}`}
              variants={itemSurgir}
            >
              <div className="relative flex flex-wrap items-center gap-x-8 gap-y-5 p-[calc(var(--pad)+4px)]">
                <Anel
                  key={ref}
                  pct={c.geral.pct}
                  tamanho={132}
                  espessura={12}
                  cor={COR[c.geral.nivel]}
                >
                  <div className="text-center">
                    <Numero
                      key={ref}
                      className="num block text-[1.625rem] font-[650] tracking-[-.03em]"
                      valor={Math.round(c.geral.pct * 100)}
                      formato={(n) => `${n}%`}
                    />
                    <span className="miudo">usado</span>
                  </div>
                </Anel>
                <div className="min-w-[220px] flex-1">
                  <p className="legenda flex items-center gap-2">
                    Orçamento geral ·{' '}
                    <span className="first-letter:uppercase">{rotuloMes(ref)}</span>
                    {ROTULO[c.geral.nivel] && (
                      <span className={`selo ${ROTULO[c.geral.nivel]!.classe}`}>
                        {ROTULO[c.geral.nivel]!.texto}
                      </span>
                    )}
                  </p>
                  <p className="grande mt-2">
                    <Valor centavos={c.geral.usado} /> <span className="text-t3">de</span>{' '}
                    <Valor centavos={c.geral.o.valor} />
                  </p>
                  <p className="miudo mt-1.5">
                    {c.geral.restante >= 0 ? (
                      <>
                        Restam <Valor centavos={c.geral.restante} className="font-[600] text-t1" />
                        {mesAtual && diasRestantes > 0 && (
                          <>
                            {' '}
                            · dá{' '}
                            <Valor
                              centavos={Math.floor(c.geral.restante / diasRestantes)}
                              className="font-[600] text-t1"
                            />{' '}
                            por dia até o fim do mês
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        <Valor centavos={-c.geral.restante} className="font-[600] text-erro" />{' '}
                        acima do limite
                      </>
                    )}
                  </p>
                </div>
                <Menu
                  rotulo="Ações do orçamento geral"
                  itens={[
                    { rotulo: 'Editar', icone: Pencil, aoClicar: () => abrir(c.geral!.o) },
                    {
                      rotulo: 'Excluir',
                      icone: Trash2,
                      aoClicar: () => void excluir(c.geral!.o, 'geral'),
                      perigo: true,
                    },
                  ]}
                />
              </div>
            </Holofote>
          )}

          <div className="grid gap-[var(--vao)] min-[800px]:grid-cols-2 min-[1280px]:grid-cols-3">
            {c.categorias.map((i) => {
              const nome = i.categoria?.nome ?? 'Categoria removida'
              const maior = Math.max(i.o.valor, ...i.historico.map((h) => h.usado), 1)
              return (
                <Holofote key={i.o.id} className="cartao cartao-pad" variants={itemSurgir}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      {i.categoria && (
                        <IconeCategoria icone={i.categoria.icone} cor={i.categoria.cor} />
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-[620]">{nome}</p>
                        <p className="miudo num">
                          <Valor centavos={i.usado} /> de <Valor centavos={i.o.valor} />
                        </p>
                      </div>
                    </div>
                    <Menu
                      rotulo={`Ações do orçamento de ${nome}`}
                      itens={[
                        { rotulo: 'Editar', icone: Pencil, aoClicar: () => abrir(i.o) },
                        {
                          rotulo: 'Excluir',
                          icone: Trash2,
                          aoClicar: () => void excluir(i.o, nome),
                          perigo: true,
                        },
                      ]}
                    />
                  </div>

                  <div className="barra barra-marcada mt-4" aria-hidden="true">
                    <motion.i
                      key={ref}
                      style={{ ['--c' as string]: COR[i.nivel], width: '100%' }}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: Math.min(1, i.pct) }}
                      transition={{ type: 'spring', bounce: 0, duration: 0.9, delay: 0.1 }}
                    />
                    <b style={{ left: '70%' }} />
                    <b style={{ left: '90%' }} />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="miudo num">
                      {i.restante >= 0
                        ? `Restam ${formatarReais(i.restante)}`
                        : `${formatarReais(-i.restante)} acima`}
                    </span>
                    {ROTULO[i.nivel] ? (
                      <span className={`selo ${ROTULO[i.nivel]!.classe}`}>
                        {ROTULO[i.nivel]!.texto}
                      </span>
                    ) : (
                      <span className="miudo num">{Math.round(i.pct * 100)}%</span>
                    )}
                  </div>

                  <div
                    className="mt-4 flex h-[46px] items-end gap-1.5"
                    role="img"
                    aria-label={`Gasto com ${nome} nos últimos seis meses`}
                  >
                    {i.historico.map((h, n) => (
                      <div
                        key={h.ref}
                        className="flex h-full flex-1 flex-col justify-end gap-1"
                        title={`${rotuloMes(h.ref)}: ${formatarReais(h.usado)}`}
                      >
                        <motion.i
                          key={ref}
                          className="block w-full origin-bottom rounded-t-[4px]"
                          style={{
                            height: `${Math.max(3, (h.usado / maior) * 30)}px`,
                            background:
                              h.usado > i.o.valor
                                ? 'var(--erro)'
                                : h.ref === ref
                                  ? 'var(--azul)'
                                  : 'var(--serie-neutra)',
                            opacity: h.ref === ref ? 1 : 0.55,
                          }}
                          initial={{ scaleY: 0 }}
                          animate={{ scaleY: 1 }}
                          transition={{
                            type: 'spring',
                            bounce: 0,
                            duration: 0.6,
                            delay: 0.2 + n * 0.05,
                          }}
                        />
                        <span className="text-center text-[.625rem] leading-none text-t3">
                          {rotuloMesCurto(h.ref)}
                        </span>
                      </div>
                    ))}
                  </div>
                </Holofote>
              )
            })}
          </div>
        </>
      )}

      <FolhaDeFormulario
        key={folha.chave}
        aberta={folha.aberta}
        aoFechar={folha.fechar}
        titulo={editando ? 'Editar orçamento' : 'Novo orçamento'}
        aoSalvar={salvar}
      >
        {rascunho && (
          <>
            <Campo rotulo="Vale para">
              {(id) => (
                <select
                  id={id}
                  className="controle"
                  value={rascunho.categoria_id ?? ''}
                  onChange={(e) =>
                    setRascunho({ ...rascunho, categoria_id: e.target.value || null })
                  }
                >
                  {!temGeral && <option value="">Todas as saídas (orçamento geral)</option>}
                  {livres.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nome}
                    </option>
                  ))}
                </select>
              )}
            </Campo>
            <Campo
              rotulo="Limite por mês"
              dica={`Vale para todos os meses. Este mês tem ${diasNoMes(ref)} dias.`}
            >
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
          </>
        )}
      </FolhaDeFormulario>
    </Surgir>
  )
}
