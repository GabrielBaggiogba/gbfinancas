'use client'

import { History, Minus, Pencil, Plus, Target, Trash2 } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import Abas from '@/components/app/Abas'
import { Campo, CampoValor, Vazio } from '@/components/app/Campos'
import { useConfirmar } from '@/components/app/Confirmar'
import Folha from '@/components/app/Folha'
import { ICONES } from '@/components/app/Icones'
import Menu from '@/components/app/Menu'
import Valor from '@/components/app/Valor'
import { Anel, Holofote, ItemDeLista } from '@/components/motion/Efeitos'
import Numero from '@/components/motion/Numero'
import { Surgir, itemSurgir } from '@/components/motion/Surgir'
import AnelMarca from '@/components/ui/AnelMarca'
import { dataCurta, distanciaEmDias } from '@/lib/datas'
import { progressoDaMeta } from '../calculos'
import { aporteSchema, metaSchema, primeiraMensagem } from '../esquemas'
import { CORES, novoId } from '../padroes'
import { useDados } from '../store'
import type { Aporte, Meta } from '../tipos'
import { FolhaDeFormulario, SeletorDeCor, SeletorDeIcone, useFolha } from './formularios'
import { Bloco } from './partes'

export default function Metas() {
  const { dados, hoje, aplicar } = useDados()
  const confirmar = useConfirmar()
  const folhaMeta = useFolha<Meta>()
  const folhaAporte = useFolha<Aporte>()
  const [meta, setMeta] = useState<Meta | null>(null)
  const [aporte, setAporte] = useState<Aporte | null>(null)
  const [retirada, setRetirada] = useState(false)
  const [historico, setHistorico] = useState<string | null>(null)

  const itens = useMemo(
    () =>
      dados.metas
        .map((m) => ({ meta: m, ...progressoDaMeta(m, dados, hoje) }))
        .sort((a, b) => Number(a.concluida) - Number(b.concluida) || b.pct - a.pct),
    [dados, hoje],
  )
  const total = itens.reduce((s, i) => s + i.acumulado, 0)
  const alvo = itens.reduce((s, i) => s + i.meta.valor_alvo, 0)

  const abrirMeta = (m?: Meta) => {
    const item = m ?? {
      id: novoId(),
      nome: '',
      valor_alvo: 0,
      prazo: null,
      icone: 'target',
      cor: CORES[dados.metas.length % CORES.length],
      created_at: new Date().toISOString(),
    }
    setMeta(item)
    folhaMeta.abrir(item)
  }
  const editando = !!meta && dados.metas.some((m) => m.id === meta.id)

  const salvarMeta = () => {
    if (!meta) return
    const r = metaSchema.safeParse(meta)
    if (!r.success) return primeiraMensagem(r.error)
    const limpa = { ...meta, ...r.data } as Meta
    folhaMeta.fechar()
    if (editando) {
      const { id, created_at, ...campos } = limpa
      void created_at
      void aplicar([{ op: 'atualizar', tabela: 'metas', id, campos }], 'Meta atualizada')
    } else void aplicar([{ op: 'inserir', tabela: 'metas', linhas: [limpa] }], 'Meta criada')
  }

  const excluirMeta = async (m: Meta) => {
    const ok = await confirmar({
      titulo: `Excluir a meta ${m.nome}?`,
      texto: 'Os aportes registrados nela também serão apagados. Esta ação não pode ser desfeita.',
      acao: 'Excluir',
      perigo: true,
    })
    if (ok) void aplicar([{ op: 'excluir', tabela: 'metas', ids: [m.id] }], 'Meta excluída')
  }

  const abrirAporte = (m: Meta) => {
    const item: Aporte = {
      id: novoId(),
      meta_id: m.id,
      valor: 0,
      data: hoje,
      observacao: '',
      created_at: new Date().toISOString(),
    }
    setRetirada(false)
    setAporte(item)
    folhaAporte.abrir(item)
  }

  const salvarAporte = () => {
    if (!aporte) return
    if (aporte.valor <= 0) return 'Informe um valor maior que zero.'
    const linha = { ...aporte, valor: retirada ? -aporte.valor : aporte.valor }
    const r = aporteSchema.safeParse(linha)
    if (!r.success) return primeiraMensagem(r.error)
    folhaAporte.fechar()
    void aplicar(
      [{ op: 'inserir', tabela: 'aportes', linhas: [{ ...linha, ...r.data }] }],
      retirada ? 'Retirada registrada' : 'Aporte registrado',
    )
  }

  const metaDoAporte = dados.metas.find((m) => m.id === aporte?.meta_id)
  const metaDoHistorico = dados.metas.find((m) => m.id === historico)
  const aportesDoHistorico = dados.aportes
    .filter((a) => a.meta_id === historico)
    .sort((a, b) =>
      a.data < b.data ? 1 : a.data > b.data ? -1 : a.created_at < b.created_at ? 1 : -1,
    )

  return (
    <Surgir className="grid gap-[var(--vao)]">
      <motion.div
        variants={itemSurgir}
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <p className="text-t2">
          {itens.length === 0 ? (
            'Dê um destino para o dinheiro que sobra.'
          ) : (
            <>
              Você já guardou <Valor centavos={total} className="font-[650] text-t1" /> de{' '}
              <Valor centavos={alvo} className="font-[650] text-t1" /> nas suas metas.
            </>
          )}
        </p>
        <button type="button" className="b b-primario" onClick={() => abrirMeta()}>
          <Plus size={17} aria-hidden="true" /> Nova meta
        </button>
      </motion.div>

      {itens.length === 0 ? (
        <Bloco>
          <Vazio
            icone={<Target size={28} aria-hidden="true" />}
            titulo="Nenhuma meta ainda"
            texto="Reserva de emergência, viagem, um equipamento novo: defina o valor, o prazo e acompanhe o progresso."
            acao={
              <button type="button" className="b b-primario" onClick={() => abrirMeta()}>
                <Plus size={17} aria-hidden="true" /> Criar primeira meta
              </button>
            }
          />
        </Bloco>
      ) : (
        <div className="grid gap-[var(--vao)] min-[760px]:grid-cols-2 min-[1280px]:grid-cols-3">
          {itens.map(({ meta: m, pct, acumulado, restante, porMes, concluida }) => {
            const I = ICONES[m.icone] ?? Target
            return (
              <Holofote
                key={m.id}
                className={`cartao cartao-pad ${concluida ? 'borda-luz' : ''}`}
                variants={itemSurgir}
                layout="position"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[1.0625rem] font-[620] tracking-[-.01em]">
                      {m.nome}
                    </p>
                    <p className="miudo">
                      {concluida
                        ? 'Meta concluída'
                        : m.prazo
                          ? `Prazo: ${dataCurta(m.prazo, hoje)} (${distanciaEmDias(m.prazo, hoje)})`
                          : 'Sem prazo definido'}
                    </p>
                  </div>
                  <Menu
                    rotulo={`Ações da meta ${m.nome}`}
                    itens={[
                      { rotulo: 'Ver aportes', icone: History, aoClicar: () => setHistorico(m.id) },
                      { rotulo: 'Editar', icone: Pencil, aoClicar: () => abrirMeta(m) },
                      {
                        rotulo: 'Excluir',
                        icone: Trash2,
                        aoClicar: () => void excluirMeta(m),
                        perigo: true,
                      },
                    ]}
                  />
                </div>

                <div className="my-5 grid place-items-center">
                  <Anel pct={pct} tamanho={148} espessura={12} cor={m.cor}>
                    <div className="grid place-items-center text-center">
                      {concluida ? (
                        <span style={{ color: m.cor }}>
                          <AnelMarca tamanho={44} />
                        </span>
                      ) : (
                        <span style={{ color: m.cor }} aria-hidden="true">
                          <I size={22} />
                        </span>
                      )}
                      <Numero
                        className="num mt-1 block text-[1.5rem] font-[650] tracking-[-.03em]"
                        valor={Math.round(pct * 100)}
                        formato={(n) => `${n}%`}
                      />
                    </div>
                  </Anel>
                </div>

                <div className="flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <p className="miudo">Guardado</p>
                    <p className="truncate text-[1.125rem] font-[650] tracking-[-.02em]">
                      <Valor centavos={acumulado} animado />
                    </p>
                  </div>
                  <div className="min-w-0 text-right">
                    <p className="miudo">{concluida ? 'Alvo' : 'Faltam'}</p>
                    <p className="truncate text-[1.125rem] font-[650] tracking-[-.02em]">
                      <Valor centavos={concluida ? m.valor_alvo : restante} />
                    </p>
                  </div>
                </div>
                {porMes !== null && (
                  <p className="miudo mt-2">
                    Guardando <Valor centavos={porMes} className="font-[600] text-t1" /> por mês
                    você chega no prazo.
                  </p>
                )}
                <button
                  type="button"
                  className="b b-suave mt-4 w-full"
                  onClick={() => abrirAporte(m)}
                >
                  <Plus size={17} aria-hidden="true" /> Registrar aporte
                </button>
              </Holofote>
            )
          })}
        </div>
      )}

      <FolhaDeFormulario
        key={`m${folhaMeta.chave}`}
        aberta={folhaMeta.aberta}
        aoFechar={folhaMeta.fechar}
        titulo={editando ? 'Editar meta' : 'Nova meta'}
        aoSalvar={salvarMeta}
      >
        {meta && (
          <>
            <Campo rotulo="Nome">
              {(id) => (
                <input
                  id={id}
                  className="controle"
                  data-autofoco
                  maxLength={60}
                  placeholder="Ex.: Reserva de emergência"
                  value={meta.nome}
                  onChange={(e) => setMeta({ ...meta, nome: e.target.value })}
                />
              )}
            </Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo rotulo="Valor-alvo">
                {(id) => (
                  <CampoValor
                    id={id}
                    valor={meta.valor_alvo}
                    aoMudar={(v) => setMeta({ ...meta, valor_alvo: v })}
                  />
                )}
              </Campo>
              <Campo rotulo="Prazo (opcional)">
                {(id) => (
                  <input
                    id={id}
                    type="date"
                    className="controle"
                    value={meta.prazo ?? ''}
                    onChange={(e) => setMeta({ ...meta, prazo: e.target.value || null })}
                  />
                )}
              </Campo>
            </div>
            <div>
              <p className="rotulo">Cor</p>
              <SeletorDeCor valor={meta.cor} aoMudar={(cor) => setMeta({ ...meta, cor })} />
            </div>
            <div>
              <p className="rotulo">Ícone</p>
              <SeletorDeIcone
                valor={meta.icone}
                cor={meta.cor}
                aoMudar={(icone) => setMeta({ ...meta, icone })}
              />
            </div>
          </>
        )}
      </FolhaDeFormulario>

      <FolhaDeFormulario
        key={`a${folhaAporte.chave}`}
        aberta={folhaAporte.aberta}
        aoFechar={folhaAporte.fechar}
        titulo={metaDoAporte ? `Aporte em ${metaDoAporte.nome}` : 'Aporte'}
        aoSalvar={salvarAporte}
        rotuloSalvar={retirada ? 'Registrar retirada' : 'Registrar aporte'}
      >
        {aporte && (
          <>
            <Abas
              rotulo="Tipo de movimento"
              className="w-full"
              valor={retirada ? 'retirada' : 'aporte'}
              aoMudar={(v) => setRetirada(v === 'retirada')}
              opcoes={[
                {
                  valor: 'aporte',
                  rotulo: (
                    <>
                      <Plus size={16} aria-hidden="true" /> Guardar
                    </>
                  ),
                },
                {
                  valor: 'retirada',
                  rotulo: (
                    <>
                      <Minus size={16} aria-hidden="true" /> Retirar
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
                  valor={aporte.valor}
                  aoMudar={(valor) => setAporte({ ...aporte, valor })}
                />
              )}
            </Campo>
            <Campo rotulo="Data">
              {(id) => (
                <input
                  id={id}
                  type="date"
                  className="controle"
                  value={aporte.data}
                  onChange={(e) => setAporte({ ...aporte, data: e.target.value })}
                />
              )}
            </Campo>
            <Campo rotulo="Observação">
              {(id) => (
                <input
                  id={id}
                  className="controle"
                  maxLength={200}
                  value={aporte.observacao}
                  onChange={(e) => setAporte({ ...aporte, observacao: e.target.value })}
                />
              )}
            </Campo>
            <p className="miudo">
              O aporte acompanha o progresso da meta e não mexe no saldo das contas. Para mover o
              dinheiro de verdade, faça uma transferência para a conta onde ele fica guardado.
            </p>
          </>
        )}
      </FolhaDeFormulario>

      <Folha
        aberta={historico !== null}
        aoFechar={() => setHistorico(null)}
        titulo={metaDoHistorico ? `Aportes de ${metaDoHistorico.nome}` : 'Aportes'}
      >
        {aportesDoHistorico.length === 0 ? (
          <p className="text-t2">Nenhum aporte registrado nesta meta.</p>
        ) : (
          <ul className="-mx-2">
            <AnimatePresence initial={false}>
              {aportesDoHistorico.map((a) => (
                <ItemDeLista key={a.id} id={a.id}>
                  <div className="flex items-center gap-3 px-2 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block font-[560]">
                        {a.valor < 0 ? 'Retirada' : 'Aporte'}
                      </span>
                      <span className="miudo block truncate">
                        {dataCurta(a.data, hoje)}
                        {a.observacao && ` · ${a.observacao}`}
                      </span>
                    </span>
                    <Valor
                      centavos={a.valor}
                      sinal={a.valor < 0 ? 'menos' : 'mais'}
                      className={`font-[600] ${a.valor < 0 ? '' : 'text-gelo'}`}
                    />
                    <button
                      type="button"
                      className="b b-fantasma b-icone"
                      aria-label="Excluir aporte"
                      onClick={() =>
                        void aplicar(
                          [{ op: 'excluir', tabela: 'aportes', ids: [a.id] }],
                          'Aporte excluído',
                        )
                      }
                    >
                      <Trash2 size={17} aria-hidden="true" />
                    </button>
                  </div>
                </ItemDeLista>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </Folha>
    </Surgir>
  )
}
