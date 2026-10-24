# GBFinanças

Gestão financeira pessoal para usar todo dia no computador e no celular: lançamentos, contas, cartões de crédito, orçamentos, metas, contas recorrentes e relatórios. Tema claro em verde e branco, ou escuro em verde e dourado. Lançamentos também por WhatsApp, foto de nota, PDF e voz, com inteligência artificial.

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
- **Mercado**: "O que está relevante hoje?" com as 5 maiores altas e baixas do último pregão, ranking de ações (valor de mercado, mais negociadas, small caps), tabela de todas as ações da B3 com busca, setor e ordenação, e a seção "Acompanhe o mercado" com links para InfoMoney, Valor, B3, Investing.com, TradingView e Forbes. Cada ativo abre o gráfico no TradingView.
- **Faixa de altas e baixas**: passa em uma linha no topo da tela Mercado. Anda devagar, para ao passar o mouse ou focar, tem botão de pausa e fica parada (e rolável) para quem pede menos movimento no sistema.
- **Comece aqui**: vídeo narrado de dois minutos que apresenta cada tela, com legendas e capítulos clicáveis. A fonte do vídeo fica em `video/`.
- **Calculadora**: botão no canto inferior direito de todas as telas; abre uma janela flutuante que aceita vírgula, parênteses e porcentagem (`200 + 10%` dá 220).
- **Lançar com IA**: botão no topo; aceita texto livre ("almoço 32 no pix"), voz (navegadores com reconhecimento de fala), foto de nota fiscal ou PDF. Mostra os lançamentos para conferir antes de salvar. No editor, a categoria é sugerida pela descrição (primeiro repetindo a de um lançamento igual, depois pela IA).
- **Pergunte ao Grão**: assistente no topo que responde perguntas sobre o próprio dinheiro ("Quanto sobrou do salário?", "Posso comprar um tênis este mês?") com base nos lançamentos, contas, cartões, limites e metas. Não recomenda investimentos.
- **Primeiros passos**: guia no Dashboard para quem está começando (saldo das contas, cartões, renda, gastos, limite e meta), que some quando tudo está feito ou a pessoa fecha.
- **Importar extrato**: OFX (o formato que os bancos exportam) ou CSV, em Configurações.
- **Grão**: o mascote, uma moeda que brotou, desenhado em SVG (`src/components/ui/Mascote.tsx`). A logo são três barras subindo com uma folha dourada (`Marca.tsx`, `src/app/icon.svg`).
- **WhatsApp**: a pessoa vincula o número em Configurações e passa a lançar mandando texto, foto ou PDF; responde `desfazer` para apagar o último registro. Áudio ainda não é lido.
- **Lembretes**: todo dia às 8h, aviso por e-mail e WhatsApp das contas recorrentes que vencem ou entram nos próximos dias (antecedência escolhida pela pessoa).
- **Família**: gestão compartilhada com até 5 pessoas, por link de convite. Membros lançam nas finanças de quem convidou, com o próprio login; a lista mostra quem lançou cada gasto.
- **Planos**: página pública `/planos` com Essencial, Completo e Família, cobrança mensal ou anual e lista de espera. Contas criadas antes do lançamento são "fundadoras", com acesso total sem custo. A cobrança ainda não existe: liga com `GBF_COBRANCA_ATIVA=1` quando houver checkout.
- **Atalhos**: `N` novo lançamento, `/` busca, `Esc` fecha painéis.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 3 · Motion · Supabase (Postgres e Auth) · Zod · Vercel

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
3. `20261009000000_seguranca.sql`: as policies passam a exigir que conta, cartão, categoria, meta e recorrente referenciados sejam do próprio usuário, e cria a função que exclui a conta de acesso (botão "Excluir conta" em Configurações).
4. `20261010000000_auditoria_e_limite.sql`: tabela `auditoria` (cada gravação deixa uma linha com quem, tabela, operação e quantidade; a pessoa só lê a própria) e limite de 600 comandos de gravação por minuto por usuário, feito no banco. O registro não é limpo sozinho.
5. `20261024000000_planos_e_perfis.sql`: tabela `perfis` (plano, telefone do WhatsApp, preferências de aviso), criada sozinha para cada conta nova; marca todas as contas existentes como "fundador". Tabela `lista_espera` da página de planos.
6. `20261025000000_familia.sql`: membros, convites e as policies que deixam membros lerem e gravarem nas finanças do dono; coluna `criado_por` em lançamentos.
7. `20261026000000_whatsapp.sql`: controle de mensagens já processadas e do comando "desfazer".

O app funciona antes dessas migrations serem aplicadas: plano, família, avisos e WhatsApp só aparecem quando as tabelas existem.

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
| `ANTHROPIC_API_KEY`             | liga a leitura com IA e a categoria automática          | console.anthropic.com → API Keys |
| `GBF_IA_MODELO`                 | opcional: modelo da IA (padrão `claude-opus-5-5`)      | —                              |
| `SUPABASE_SERVICE_ROLE_KEY`     | só no servidor: WhatsApp e lembretes, que rodam sem sessão | Supabase → Settings → API Keys |
| `RESEND_API_KEY`, `GBF_EMAIL_REMETENTE` | lembretes por e-mail (remetente com domínio verificado, ex.: `GBFinanças <avisos@seudominio.com>`) | resend.com |
| `CRON_SECRET`                   | protege a rota dos lembretes diários                    | invente um texto longo         |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_NUMERO` | WhatsApp Cloud API | developers.facebook.com → seu app → WhatsApp |
| `WHATSAPP_TEMPLATE_LEMBRETE`    | modelo aprovado pela Meta para os lembretes (um parâmetro no corpo) | WhatsApp Manager → Modelos |
| `GBF_COBRANCA_ATIVA`            | `1` quando a assinatura começar a ser cobrada         | —                              |

A chave `service_role` ignora as regras de acesso do banco: fica só nas variáveis da Vercel, nunca com o prefixo `NEXT_PUBLIC_`. O código que a usa (`src/lib/supabase/admin.ts`) filtra tudo por usuário.

### Configurar o WhatsApp

1. Em developers.facebook.com, crie um app do tipo Business e adicione o produto WhatsApp. Use um número só para o app.
2. Gere um token permanente (usuário do sistema com permissão `whatsapp_business_messaging`) e anote o Phone number ID e o App secret.
3. Em WhatsApp → Configuration, cadastre o webhook `https://<seu-dominio>/api/whatsapp` com o mesmo texto de `WHATSAPP_VERIFY_TOKEN` e assine o campo `messages`.
4. Para os lembretes, crie em WhatsApp Manager um modelo de mensagem (categoria Utilidade, idioma Português (BR)) com um parâmetro no corpo, por exemplo: "Lembrete do GBFinanças: {{1}}". Coloque o nome dele em `WHATSAPP_TEMPLATE_LEMBRETE`.

### Lembretes

`vercel.json` agenda `/api/cron/lembretes` todo dia às 11h UTC (8h em Brasília). A Vercel manda o `CRON_SECRET` no cabeçalho; sem ele, a rota recusa.

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
- `src/features/ia`: leitura de lançamentos com o Claude (texto, foto, PDF) e o painel "Lançar com IA"
- `src/features/whatsapp`, `src/features/avisos`: webhook do WhatsApp, lembretes por e-mail e WhatsApp
- `src/features/familia`, `src/features/planos`: gestão compartilhada, planos e lista de espera
- `src/features/mercado`: cotações (brapi.dev), rankings, faixa de altas e baixas e links de mercado
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
- **Tela de login**: usa só `globals.css` e fica sempre no tema claro.
- **IA**: a pessoa sempre confere antes de salvar no app; no WhatsApp o registro é imediato, com `desfazer` por uma hora. Cada leitura custa centavos na API da Anthropic.
- **Família**: cada pessoa participa de uma família só. Restaurar backup e apagar tudo ficam só com o dono.
- **Dependências**: `npm audit --omit=dev` não acusa nada. Os avisos restantes são de ferramentas de desenvolvimento (Vitest, Tailwind) e não vão para produção. Não rode `npm audit fix --force`, porque ele troca versões principais.

## Próximos passos

- Recuperação de senha por e-mail
- Checkout da assinatura (Mercado Pago ou Stripe) e limites por plano
- Open Finance (contas sincronizadas)
- Áudio pelo WhatsApp (precisa de um serviço de transcrição)
- Importação de extrato com mapeamento de colunas e categorização em lote
- Dashboard com blocos que a pessoa pode mover ou ocultar
