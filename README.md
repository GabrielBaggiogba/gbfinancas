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
- **Mercado**: "O que está relevante hoje?" com as 5 maiores altas e baixas do último pregão, ranking de ações (valor de mercado, mais negociadas, small caps), tabela de todas as ações da B3 com busca, setor e ordenação, e a seção "Acompanhe o mercado" com links para InfoMoney, Valor, B3, Investing.com, TradingView e Forbes. Cada ativo abre o gráfico no TradingView.
- **Faixa do topo**: altas e baixas do dia passando em uma linha em todas as telas da área logada. Anda devagar, para ao passar o mouse ou focar, tem botão de pausa e fica parada (e rolável) para quem pede menos movimento no sistema.
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
| `BRAPI_TOKEN`                   | opcional: chave da brapi.dev para mais requisições      | brapi.dev → Dashboard          |

A chave `service_role` não é usada em lugar nenhum.

## Cotações

As cotações vêm da lista pública da [brapi.dev](https://brapi.dev) (`/api/quote/list`), lida pelo servidor e guardada por 15 minutos. Funciona sem chave. Os dados chegam com atraso (cerca de 30 minutos no plano gratuito) e não são em tempo real.

- Ficam de fora o mercado fracionário (códigos terminados em F) e ações sem negócio no dia.
- Altas e baixas consideram só ações com volume financeiro acima de R$ 1 milhão no dia, para fugir de saltos sem negócio.
- Volume financeiro = ações negociadas × último preço (aproximado).
- Small caps: valor de mercado até R$ 10 bilhões.
- Sem resposta da fonte, a faixa e a tela mostram "Cotações indisponíveis" em vez de números.

Se um dia precisar de mais requisições, crie uma conta na brapi.dev e coloque a chave em `BRAPI_TOKEN`. As regras ficam em `src/features/mercado/acoes.ts`.

## Deploy

Push na `main` publica automaticamente na Vercel. Pull Requests geram uma URL de preview. Variáveis novas: Vercel → Project → Settings → Environment Variables.

## Estrutura

- `src/app/(app)`: área logada (layout com os dados, uma pasta por tela)
- `src/app/login`, `src/app/auth`: acesso
- `src/features/financas`: tipos, validação (`esquemas.ts`), regras financeiras (`calculos.ts`), ações do servidor, armazenamento (`servidor/`) e telas (`telas/`)
- `src/features/noticias`: fontes, leitor de RSS e Atom, classificação por tema e telas
- `src/features/mercado`: cotações (brapi.dev), rankings, faixa do topo e links de mercado
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
