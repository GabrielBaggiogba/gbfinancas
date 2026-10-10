# GBFinanças

Gestão financeira pessoal para usar todo dia no computador e no celular: lançamentos, contas, cartões de crédito, orçamentos, metas, contas recorrentes e relatórios. Tema escuro ou claro, com azul como cor de destaque.

**Produção:** https://gbfinancas.vercel.app

## Funcionalidades

- **Dashboard**: saldo atual, entradas e saídas do mês, saldo projetado, taxa de economia, gráficos (entradas x saídas, evolução do saldo, gastos por categoria), últimos lançamentos, próximos vencimentos, metas, orçamentos e alertas.
- **Lançamentos**: entrada, saída e transferência; valor, data, descrição, categoria, conta ou cartão, forma de pagamento e observação. Editar, duplicar, excluir com confirmação, busca, filtros (período, tipo, categoria, conta, faixa de valor), ordenação, exportação CSV e calendário financeiro.
- **Contas**: corrente, dinheiro, poupança, carteira digital e investimento, com saldo de cada uma, patrimônio total e transferências que não contam como renda nem gasto.
- **Cartões**: limite, fechamento e vencimento, fatura atual e próximas, compras parceladas (parcela atual/total) e pagamento de fatura separado da compra.
- **Orçamentos**: limite geral e por categoria, com avisos aos 70%, 90% e 100% e histórico dos últimos seis meses.
- **Metas**: valor-alvo, prazo, aportes e retiradas, percentual concluído e quanto guardar por mês.
- **Recorrentes**: semanal, mensal ou anual, com próximo vencimento, status e fluxo de caixa previsto para 90 dias.
- **Relatórios**: mensal, anual e comparação entre dois meses; 10 maiores despesas, categorias que mais cresceram, evolução do patrimônio, CSV e impressão em PDF.
- **Configurações**: tema (sistema, escuro, claro), modo compacto, ocultar valores, categorias e subcategorias, backup e restauração, importação de CSV.
- **Notícias**: manchetes de finanças e investimentos lidas dos feeds públicos (RSS) de portais brasileiros, com filtro por tema e fonte. O servidor guarda o resultado por 30 minutos e renova sozinho; cada notícia abre no site de origem. As fontes ficam em `src/features/noticias/fontes.ts`.
- **Acompanhe o mercado**: na tela de Notícias, links para sites de notícias, cotações e gráficos. Abrem em nova aba e ficam em `src/features/mercado/links.ts`.
- **Destaques da semana**: faixa no topo com os ativos de maior alta percentual na semana, o período, a fonte e a hora da atualização. Pode ser pausada e não corre para quem pede menos movimento no sistema. Depende de uma API de cotações (veja abaixo); sem ela, mostra "Dados semanais indisponíveis".
- **Atalhos**: `N` novo lançamento, `/` busca, `Esc` fecha painéis.

## Stack

Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS 3 · Motion · Supabase (Postgres e Auth) · Zod · Vercel

## Ver sem Supabase

```bash
npm install
npm run demo
```

Abra http://localhost:3000 e entre com qualquer e-mail e senha. O modo demonstração cria dados de exemplo e os guarda em um arquivo na pasta temporária do computador. Um e-mail começando com `vazio` abre sem dados, para ver o primeiro uso. Esse modo só liga com `GBF_MODO_DEMO=1`, sem Supabase configurado, e nunca em produção na Vercel.

## Rodando localmente

1. `git clone https://github.com/GabrielBaggiogba/gbfinancas && cd gbfinancas`
2. `npm install`
3. Copie `.env.example` para `.env.local` e preencha (veja abaixo)
4. `npm run dev` e abra http://localhost:3000

Outros comandos: `npm test` (regras financeiras, datas e dinheiro), `npm run lint`, `npm run build`, `npm run format`.

## Supabase

O banco fica em `supabase/migrations`, em ordem:

1. `20261006000000_cria_lancamentos_diarios.sql`: a tabela da primeira versão (um registro por dia).
2. `20261007000000_gestao_financeira.sql`: contas, cartões, categorias, lançamentos, orçamentos, metas, aportes e recorrentes, todas com RLS. Também copia os registros diários antigos para o modelo novo, em uma conta "Carteira".

Para aplicar em um projeto novo, rode os arquivos em ordem no SQL Editor do Supabase, ou use a CLI:

```bash
npx supabase link --project-ref <ref>
npx supabase db push
```

Em Authentication → URL Configuration, o Site URL deve ser o endereço de produção e as Redirect URLs devem incluir `https://<seu-dominio>/**` e `http://localhost:3000/**`.

Os valores ficam no banco em reais com duas casas (`numeric`). O app trabalha em centavos inteiros e converte na camada de dados.

## Variáveis de ambiente

| Variável                        | Para que serve                                          | Onde pegar                     |
| ------------------------------- | ------------------------------------------------------- | ------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | endereço do projeto                                     | Supabase → Settings → API      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | chave pública (anon ou publishable)                     | Supabase → Settings → API Keys |
| `NEXT_PUBLIC_SITE_URL`          | opcional: origem usada no link de confirmação de e-mail | o endereço do site             |
| `GBF_MODO_DEMO`                 | opcional: `1` liga o modo demonstração                  | só em desenvolvimento          |

| `GBF_DESTAQUES_API_URL`         | opcional: endereço da API de cotações da faixa do topo  | o provedor de dados escolhido  |
| `GBF_DESTAQUES_API_CHAVE`       | opcional: chave enviada em `Authorization: Bearer`      | o provedor de dados escolhido  |
| `GBF_DESTAQUES_FONTE`           | opcional: nome da fonte mostrado na faixa               | você escolhe                   |

A chave `service_role` não é usada em lugar nenhum.

## Destaques da semana

O projeto não traz cotações próprias e não lê as páginas dos sites de mercado. A faixa do topo chama, pelo servidor, o endereço em `GBF_DESTAQUES_API_URL` e espera um JSON assim:

```json
{
  "fonte": "Nome do provedor",
  "inicio": "2026-10-05",
  "fim": "2026-10-09",
  "atualizado_em": "2026-10-09T21:05:00Z",
  "ativos": [{ "codigo": "XXXX3", "nome": "Empresa", "variacao": 4.32 }]
}
```

`variacao` é a variação percentual do ativo entre `inicio` e `fim` (4.32 = +4,32%). `nome` e `fonte` são opcionais; sem `fonte`, vale `GBF_DESTAQUES_FONTE` ou o domínio da API. A faixa mostra as 12 maiores variações positivas, guarda a resposta por 30 minutos e fica em "Dados semanais indisponíveis" quando a API não está configurada, não responde, manda um período maior que 7 dias ou dados com mais de 7 dias. Se o provedor escolhido usa outro formato, a conversão cabe em `src/features/mercado/servidor.ts`.

## Deploy

Push na `main` publica automaticamente na Vercel. Pull Requests geram uma URL de preview. Variáveis novas: Vercel → Project → Settings → Environment Variables.

## Estrutura

- `src/app/(app)`: área logada (layout com os dados, uma pasta por tela)
- `src/app/login`, `src/app/auth`: acesso
- `src/features/financas`: tipos, validação (`esquemas.ts`), regras financeiras (`calculos.ts`), ações do servidor, armazenamento (`servidor/`) e telas (`telas/`)
- `src/features/noticias`: fontes, leitor de RSS e Atom, classificação por tema e telas
- `src/features/mercado`: links de mercado e a faixa de destaques da semana
- `src/features/auth`: login, cadastro e sessão
- `src/components/app`: casca, painéis, campos, menus e avisos
- `src/components/graficos`: gráficos em SVG
- `src/components/motion`: efeitos e molas
- `src/lib`: dinheiro, datas, CSV e Supabase
- `supabase/migrations`: banco de dados versionado

Como os dados circulam: o layout da área logada lê tudo do usuário uma vez e entrega a um provedor no cliente. Cada alteração aparece na tela na hora e segue para o servidor em fila, validada de novo com o mesmo schema; se o servidor recusar, a alteração é desfeita e a pessoa é avisada. Por isso trocar de tela não espera o servidor.

## Decisões e limites

- **Fuso**: "hoje" é sempre a data de São Paulo.
- **Cartão**: a compra conta como gasto na data da compra (ou de cada parcela); o saldo da conta só muda quando a fatura é paga.
- **Metas**: aportes medem o progresso e não movem dinheiro entre contas. Para mover, use uma transferência.
- **Orçamentos**: o limite vale para todos os meses; o histórico compara o gasto de cada mês com o limite atual.
- **Exclusão**: conta ou cartão com lançamentos não é excluído, só arquivado.
- **Volume**: o app carrega até 50 mil lançamentos por usuário de uma vez. Acima disso, vale paginar no servidor.
- **Tela de login**: usa só `globals.css` e fica sempre no tema escuro.
- **Next.js 14**: `npm audit` acusa avisos conhecidos dessa linha. Não rode `npm audit fix --force`, porque ele troca a versão principal.

## Próximos passos

- Recuperação de senha por e-mail
- Notificações de vencimento e backup automático
- Importação de extrato com mapeamento de colunas e categorização em lote
- Dashboard com blocos que a pessoa pode mover ou ocultar
- Assistente que responde perguntas sobre os próprios dados
