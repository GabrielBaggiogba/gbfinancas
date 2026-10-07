'use client'

import {
  CornerDownRight,
  Database,
  Download,
  FileUp,
  Keyboard,
  LogOut,
  Monitor,
  Moon,
  Palette,
  Pencil,
  Plus,
  Sun,
  Tags,
  Trash2,
  Upload,
  UserRound,
} from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useRef, useState, type ChangeEvent } from 'react'
import { flushSync } from 'react-dom'
import Abas from '@/components/app/Abas'
import { useAvisar } from '@/components/app/Avisos'
import { Campo } from '@/components/app/Campos'
import { useConfirmar } from '@/components/app/Confirmar'
import { IconeCategoria } from '@/components/app/Icones'
import Menu from '@/components/app/Menu'
import { usePreferencias, type Tema } from '@/components/app/Preferencias'
import { ItemDeLista } from '@/components/motion/Efeitos'
import { Surgir } from '@/components/motion/Surgir'
import { sair } from '@/features/auth/actions'
import { baixar, interpretarExtrato, type LinhaImportada } from '@/lib/csv'
import { apagarTudo, restaurarBackup } from '../actions'
import { categoriaSchema, primeiraMensagem } from '../esquemas'
import { lancamentoVazio } from '../fabrica'
import { CORES, novoId } from '../padroes'
import { useDados } from '../store'
import type { Categoria, TipoCategoria } from '../tipos'
import {
  FolhaDeFormulario,
  Interruptor,
  SeletorDeCor,
  SeletorDeIcone,
  useFolha,
} from './formularios'
import { Bloco } from './partes'

type Importacao = { linhas: LinhaImportada[]; ignoradas: number; arquivo: string }

export default function Configuracoes() {
  const { dados, hoje, email, demo, aplicar } = useDados()
  const prefs = usePreferencias()
  const confirmar = useConfirmar()
  const avisar = useAvisar()
  const reduzido = useReducedMotion()
  const folha = useFolha<Categoria>()
  const [rascunho, setRascunho] = useState<Categoria | null>(null)
  const [tipoCat, setTipoCat] = useState<TipoCategoria>('despesa')
  const [importacao, setImportacao] = useState<Importacao | null>(null)
  const [contaImportacao, setContaImportacao] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const arquivoBackup = useRef<HTMLInputElement>(null)
  const arquivoCsv = useRef<HTMLInputElement>(null)

  // A troca de tema se abre em círculo a partir do clique (View Transitions), quando dá.
  const trocarTema = (tema: Tema, alvo: HTMLElement | null) => {
    const doc = document as Document & { startViewTransition?: (f: () => void) => unknown }
    if (!doc.startViewTransition || reduzido) return prefs.definir({ tema })
    const r = alvo?.getBoundingClientRect()
    document.documentElement.style.setProperty(
      '--vx',
      `${r ? r.left + r.width / 2 : innerWidth / 2}px`,
    )
    document.documentElement.style.setProperty(
      '--vy',
      `${r ? r.top + r.height / 2 : innerHeight / 2}px`,
    )
    doc.startViewTransition(() => flushSync(() => prefs.definir({ tema })))
  }

  // ---------- Categorias ----------
  const raizes = dados.categorias
    .filter((c) => c.tipo === tipoCat && !c.pai_id)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  const filhas = (id: string) =>
    dados.categorias
      .filter((c) => c.pai_id === id)
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))

  const abrirCategoria = (c?: Categoria, pai?: Categoria) => {
    const item = c ?? {
      id: novoId(),
      nome: '',
      tipo: pai?.tipo ?? tipoCat,
      icone: pai?.icone ?? 'tag',
      cor: pai?.cor ?? CORES[raizes.length % CORES.length],
      pai_id: pai?.id ?? null,
      created_at: new Date().toISOString(),
    }
    setRascunho(item)
    folha.abrir(item)
  }
  const editando = !!rascunho && dados.categorias.some((c) => c.id === rascunho.id)

  const salvarCategoria = () => {
    if (!rascunho) return
    const r = categoriaSchema.safeParse(rascunho)
    if (!r.success) return primeiraMensagem(r.error)
    const limpa = { ...rascunho, ...r.data } as Categoria
    folha.fechar()
    if (editando) {
      const { id, created_at, ...campos } = limpa
      void created_at
      void aplicar([{ op: 'atualizar', tabela: 'categorias', id, campos }], 'Categoria atualizada')
    } else
      void aplicar([{ op: 'inserir', tabela: 'categorias', linhas: [limpa] }], 'Categoria criada')
  }

  const excluirCategoria = async (c: Categoria) => {
    const ids = new Set([c.id, ...filhas(c.id).map((f) => f.id)])
    const usos = dados.lancamentos.filter((l) => l.categoria_id && ids.has(l.categoria_id)).length
    const ok = await confirmar({
      titulo: `Excluir a categoria ${c.nome}?`,
      texto:
        (ids.size > 1 ? `As ${ids.size - 1} subcategorias também serão excluídas. ` : '') +
        (usos > 0
          ? `${usos} ${usos === 1 ? 'lançamento ficará' : 'lançamentos ficarão'} sem categoria.`
          : 'Nenhum lançamento usa esta categoria.'),
      acao: 'Excluir',
      perigo: true,
    })
    if (ok)
      void aplicar([{ op: 'excluir', tabela: 'categorias', ids: [c.id] }], 'Categoria excluída')
  }

  // ---------- Dados ----------
  const exportarBackup = () => {
    baixar(
      `gbfinancas-backup-${hoje}.json`,
      JSON.stringify(
        { app: 'gbfinancas', versao: 1, exportado_em: new Date().toISOString(), dados },
        null,
        2,
      ),
      'application/json',
    )
    avisar({ tipo: 'ok', texto: 'Backup baixado' })
  }

  const escolherBackup = async (e: ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0]
    e.target.value = ''
    if (!arquivo) return
    let conteudo: unknown
    try {
      conteudo = JSON.parse(await arquivo.text())
    } catch {
      avisar({ tipo: 'erro', texto: 'Este arquivo não é um backup válido do GBFinanças.' })
      return
    }
    const ok = await confirmar({
      titulo: 'Restaurar este backup?',
      texto:
        'Todos os dados atuais serão substituídos pelos do arquivo. Esta ação não pode ser desfeita.',
      acao: 'Restaurar',
      perigo: true,
    })
    if (!ok) return
    setOcupado(true)
    const r = await restaurarBackup(conteudo).catch(() => null)
    if (r?.ok) window.location.assign('/')
    else {
      setOcupado(false)
      avisar({
        tipo: 'erro',
        texto: r && !r.ok ? r.mensagem : 'Não foi possível restaurar. Tente de novo.',
      })
    }
  }

  const escolherCsv = async (e: ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0]
    e.target.value = ''
    if (!arquivo) return
    const resultado = interpretarExtrato(await arquivo.text())
    if (resultado.linhas.length === 0) {
      avisar({
        tipo: 'erro',
        texto:
          'Não encontrei lançamentos no arquivo. Ele precisa ter colunas de data, descrição e valor.',
      })
      return
    }
    setContaImportacao(dados.contas.find((c) => !c.arquivada)?.id ?? '')
    setImportacao({ ...resultado, arquivo: arquivo.name })
  }

  const importar = async () => {
    if (!importacao || !contaImportacao) return
    const linhas = importacao.linhas.slice(0, 5000).map((l) =>
      lancamentoVazio({
        tipo: l.entrada ? 'receita' : 'despesa',
        data: l.data,
        valor: l.valor,
        descricao: l.descricao,
        conta_id: contaImportacao,
        forma_pagamento: 'pix',
        observacao: 'Importado de CSV',
      }),
    )
    setImportacao(null)
    await aplicar(
      [{ op: 'inserir', tabela: 'lancamentos', linhas }],
      `${linhas.length} ${linhas.length === 1 ? 'lançamento importado' : 'lançamentos importados'}`,
    )
  }

  const apagar = async () => {
    const ok = await confirmar({
      titulo: 'Apagar todos os dados?',
      texto:
        'Contas, cartões, lançamentos, orçamentos, metas e recorrentes serão apagados. Sua conta de acesso continua. Faça um backup antes, porque esta ação não pode ser desfeita.',
      acao: 'Apagar tudo',
      perigo: true,
    })
    if (!ok) return
    setOcupado(true)
    const r = await apagarTudo().catch(() => null)
    if (r?.ok) window.location.assign('/')
    else {
      setOcupado(false)
      avisar({
        tipo: 'erro',
        texto: r && !r.ok ? r.mensagem : 'Não foi possível apagar. Tente de novo.',
      })
    }
  }

  const entradasCsv = importacao?.linhas.filter((l) => l.entrada).length ?? 0

  return (
    <Surgir className="grid gap-[var(--vao)] min-[1100px]:grid-cols-2">
      <div className="grid content-start gap-[var(--vao)]">
        <Bloco
          titulo={
            <span className="flex items-center gap-2">
              <Palette size={18} aria-hidden="true" /> Aparência
            </span>
          }
        >
          <p className="rotulo">Tema</p>
          <Abas
            rotulo="Tema"
            className="w-full"
            valor={prefs.tema}
            aoMudar={(tema) => trocarTema(tema, document.activeElement as HTMLElement | null)}
            opcoes={[
              {
                valor: 'sistema',
                rotulo: (
                  <>
                    <Monitor size={16} aria-hidden="true" /> Sistema
                  </>
                ),
              },
              {
                valor: 'escuro',
                rotulo: (
                  <>
                    <Moon size={16} aria-hidden="true" /> Escuro
                  </>
                ),
              },
              {
                valor: 'claro',
                rotulo: (
                  <>
                    <Sun size={16} aria-hidden="true" /> Claro
                  </>
                ),
              },
            ]}
          />
          <div className="mt-3 divide-y divide-[color:var(--linha)]">
            <Interruptor
              rotulo="Modo compacto"
              descricao="Menos espaço entre os elementos, para ver mais por tela."
              ligado={prefs.compacto}
              aoMudar={(compacto) => prefs.definir({ compacto })}
            />
            <Interruptor
              rotulo="Ocultar valores"
              descricao="Borra os valores na tela. Também fica no ícone de olho, no topo."
              ligado={prefs.ocultar}
              aoMudar={(ocultar) => prefs.definir({ ocultar })}
            />
          </div>
        </Bloco>

        <Bloco
          titulo={
            <span className="flex items-center gap-2">
              <Database size={18} aria-hidden="true" /> Dados e backup
            </span>
          }
        >
          <div className="grid gap-2.5 min-[560px]:grid-cols-2">
            <button type="button" className="b b-suave justify-start" onClick={exportarBackup}>
              <Download size={17} aria-hidden="true" /> Baixar backup
            </button>
            <button
              type="button"
              className="b b-suave justify-start"
              disabled={ocupado}
              onClick={() => arquivoBackup.current?.click()}
            >
              <Upload size={17} aria-hidden="true" /> Restaurar backup
            </button>
            <button
              type="button"
              className="b b-suave justify-start"
              onClick={() => arquivoCsv.current?.click()}
            >
              <FileUp size={17} aria-hidden="true" /> Importar CSV
            </button>
            <button
              type="button"
              className="b b-perigo justify-start"
              disabled={ocupado}
              onClick={() => void apagar()}
            >
              <Trash2 size={17} aria-hidden="true" /> Apagar todos os dados
            </button>
          </div>
          <input
            ref={arquivoBackup}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => void escolherBackup(e)}
          />
          <input
            ref={arquivoCsv}
            type="file"
            accept=".csv,text/csv,text/plain"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => void escolherCsv(e)}
          />
          <p className="miudo mt-3">
            O backup é um arquivo com tudo o que está no app. Guarde-o em lugar seguro: ele contém
            seus dados financeiros. O CSV de importação precisa de colunas de data, descrição e
            valor (valor negativo vira saída).
          </p>
          {demo && (
            <p className="miudo mt-2">No modo demonstração, os dados ficam só neste computador.</p>
          )}
        </Bloco>

        <Bloco
          titulo={
            <span className="flex items-center gap-2">
              <Keyboard size={18} aria-hidden="true" /> Atalhos de teclado
            </span>
          }
        >
          <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2.5">
            <dt>
              <kbd className="tecla">N</kbd>
            </dt>
            <dd className="text-t2">Novo lançamento</dd>
            <dt>
              <kbd className="tecla">/</kbd>
            </dt>
            <dd className="text-t2">Buscar nos lançamentos</dd>
            <dt>
              <kbd className="tecla">Esc</kbd>
            </dt>
            <dd className="text-t2">Fechar painéis e janelas</dd>
          </dl>
        </Bloco>

        <Bloco
          titulo={
            <span className="flex items-center gap-2">
              <UserRound size={18} aria-hidden="true" /> Conta
            </span>
          }
        >
          <p className="miudo">Conectado como</p>
          <p className="truncate font-[560]">{email}</p>
          <form action={sair} className="mt-4">
            <button type="submit" className="b b-suave">
              <LogOut size={17} aria-hidden="true" /> Sair
            </button>
          </form>
        </Bloco>
      </div>

      <Bloco
        titulo={
          <span className="flex items-center gap-2">
            <Tags size={18} aria-hidden="true" /> Categorias
          </span>
        }
        acao={
          <button type="button" className="b b-primario" onClick={() => abrirCategoria()}>
            <Plus size={17} aria-hidden="true" /> Nova
          </button>
        }
      >
        <Abas
          rotulo="Tipo de categoria"
          className="w-full"
          valor={tipoCat}
          aoMudar={setTipoCat}
          opcoes={[
            { valor: 'despesa', rotulo: 'Saídas' },
            { valor: 'receita', rotulo: 'Entradas' },
          ]}
        />
        <motion.ul
          key={tipoCat}
          className="-mx-2 mt-3"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
        >
          <AnimatePresence initial={false}>
            {raizes
              .flatMap((c) => [c, ...filhas(c.id)])
              .map((c) => (
                <ItemDeLista key={c.id} id={c.id}>
                  <div
                    className={`flex items-center gap-3 rounded-xl px-2 py-1.5 ${c.pai_id ? 'pl-7' : ''}`}
                  >
                    {c.pai_id && (
                      <CornerDownRight size={15} className="flex-none text-t3" aria-hidden="true" />
                    )}
                    <IconeCategoria
                      icone={c.icone}
                      cor={c.cor}
                      tamanho={c.pai_id ? 15 : 18}
                      className={c.pai_id ? '!h-8 !w-8' : ''}
                    />
                    <span
                      className={`min-w-0 flex-1 truncate ${c.pai_id ? 'text-t2' : 'font-[560]'}`}
                    >
                      {c.nome}
                    </span>
                    <Menu
                      rotulo={`Ações da categoria ${c.nome}`}
                      itens={[
                        { rotulo: 'Editar', icone: Pencil, aoClicar: () => abrirCategoria(c) },
                        ...(c.pai_id
                          ? []
                          : [
                              {
                                rotulo: 'Nova subcategoria',
                                icone: Plus,
                                aoClicar: () => abrirCategoria(undefined, c),
                              },
                            ]),
                        {
                          rotulo: 'Excluir',
                          icone: Trash2,
                          aoClicar: () => void excluirCategoria(c),
                          perigo: true,
                        },
                      ]}
                    />
                  </div>
                </ItemDeLista>
              ))}
          </AnimatePresence>
        </motion.ul>
        {raizes.length === 0 && (
          <p className="mt-3 text-t2">Nenhuma categoria deste tipo. Crie a primeira.</p>
        )}
      </Bloco>

      <FolhaDeFormulario
        key={`c${folha.chave}`}
        aberta={folha.aberta}
        aoFechar={folha.fechar}
        titulo={
          editando ? 'Editar categoria' : rascunho?.pai_id ? 'Nova subcategoria' : 'Nova categoria'
        }
        aoSalvar={salvarCategoria}
      >
        {rascunho && (
          <>
            <div className="flex items-center gap-3 rounded-2xl bg-painel2 p-3 shadow-[inset_0_0_0_1px_var(--linha)]">
              <IconeCategoria icone={rascunho.icone} cor={rascunho.cor} />
              <span className="min-w-0 flex-1 truncate font-[560]">
                {rascunho.nome || 'Nome da categoria'}
              </span>
              <span className="selo">{rascunho.tipo === 'despesa' ? 'Saída' : 'Entrada'}</span>
            </div>
            <Campo rotulo="Nome">
              {(id) => (
                <input
                  id={id}
                  className="controle"
                  data-autofoco
                  maxLength={40}
                  placeholder="Ex.: Mercado"
                  value={rascunho.nome}
                  onChange={(e) => setRascunho({ ...rascunho, nome: e.target.value })}
                />
              )}
            </Campo>
            {!editando && !rascunho.pai_id && (
              <Campo rotulo="Tipo">
                {(id) => (
                  <select
                    id={id}
                    className="controle"
                    value={rascunho.tipo}
                    onChange={(e) =>
                      setRascunho({ ...rascunho, tipo: e.target.value as TipoCategoria })
                    }
                  >
                    <option value="despesa">Saída</option>
                    <option value="receita">Entrada</option>
                  </select>
                )}
              </Campo>
            )}
            {rascunho.pai_id && (
              <p className="miudo">
                Subcategoria de {dados.categorias.find((c) => c.id === rascunho.pai_id)?.nome}. Nos
                gráficos, ela soma na categoria-mãe.
              </p>
            )}
            <div>
              <p className="rotulo">Cor</p>
              <SeletorDeCor
                valor={rascunho.cor}
                aoMudar={(cor) => setRascunho({ ...rascunho, cor })}
              />
            </div>
            <div>
              <p className="rotulo">Ícone</p>
              <SeletorDeIcone
                valor={rascunho.icone}
                cor={rascunho.cor}
                aoMudar={(icone) => setRascunho({ ...rascunho, icone })}
              />
            </div>
          </>
        )}
      </FolhaDeFormulario>

      <FolhaDeFormulario
        aberta={importacao !== null}
        aoFechar={() => setImportacao(null)}
        titulo="Importar CSV"
        aoSalvar={() => {
          if (!contaImportacao) return 'Escolha a conta que recebe os lançamentos.'
          void importar()
        }}
        rotuloSalvar={`Importar ${Math.min(importacao?.linhas.length ?? 0, 5000)} lançamentos`}
      >
        {importacao && (
          <>
            <p className="text-t2">
              <span className="font-[560] text-t1">{importacao.arquivo}</span>:{' '}
              {importacao.linhas.length} lançamentos encontrados ({entradasCsv} entradas e{' '}
              {importacao.linhas.length - entradasCsv} saídas)
              {importacao.ignoradas > 0 &&
                `, ${importacao.ignoradas} linhas ignoradas por falta de data ou valor`}
              .
            </p>
            <Campo rotulo="Lançar na conta">
              {(id) => (
                <select
                  id={id}
                  className="controle"
                  value={contaImportacao}
                  onChange={(e) => setContaImportacao(e.target.value)}
                >
                  {dados.contas
                    .filter((c) => !c.arquivada)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                </select>
              )}
            </Campo>
            <div className="rounded-2xl bg-painel2 p-3 shadow-[inset_0_0_0_1px_var(--linha)]">
              <p className="legenda mb-2">Primeiras linhas</p>
              <ul className="grid gap-1.5 text-[.875rem]">
                {importacao.linhas.slice(0, 5).map((l, i) => (
                  <li key={i} className="flex items-center justify-between gap-3">
                    <span className="num flex-none text-t3">
                      {l.data.slice(8)}/{l.data.slice(5, 7)}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {l.descricao || 'Sem descrição'}
                    </span>
                    <span className={`num flex-none font-[600] ${l.entrada ? 'text-gelo' : ''}`}>
                      {l.entrada ? '+' : '−'} {(l.valor / 100).toFixed(2).replace('.', ',')}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="miudo">
              Os lançamentos entram sem categoria. Depois, filtre por &ldquo;Importado de CSV&rdquo;
              na busca para categorizar.
            </p>
          </>
        )}
      </FolhaDeFormulario>
    </Surgir>
  )
}
