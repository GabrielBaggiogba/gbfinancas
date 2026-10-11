const T = 111.5
const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x))
const io = (x) => { x = cl(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2 }
const out = (x) => { x = cl(x); return 1 - Math.pow(1 - x, 4) }
const rampa = (t, a, d) => cl((t - a) / d)
// Mola amortecida (resposta ao degrau), sem quique exagerado.
const mola = (x) => { if (x <= 0) return 0; const w = 9, z = 0.82, wd = w * Math.sqrt(1 - z * z); return 1 - Math.exp(-z * w * x) * (Math.cos(wd * x) + (z * w / wd) * Math.sin(wd * x)) }

const NAV = { Dashboard: [12,82,228,42], 'Lançamentos': [12,128,228,42], Contas: [12,174,228,42], 'Cartões': [12,220,228,42], 'Orçamentos': [12,266,228,42], Metas: [12,312,228,42], Recorrentes: [12,358,228,42], 'Relatórios': [12,404,228,42], Mercado: [12,450,228,42], 'Configurações': [12,496,228,42] }
const LARGO = [0, 0, 1920, 1080]

// Cada cena: imagem, início e fim, câmera [tempo, retângulo] e destaques [início, fim, retângulo].
const CENAS = [
  { id: 'dashboard', cap: 'Dashboard', a: 7.2, b: 17.9,
    cam: [[7.2, LARGO], [10.0, [442,72,904,300]], [13.6, [442,388,904,347]], [15.7, [442,751,904,296]]],
    foco: [[7.7, 9.8, NAV.Dashboard], [10.3, 11.1, [442,72,904,164]], [11.15, 12.65, [442,252,444,120]], [12.7, 13.6, [902,252,214,120]]] },
  { id: 'lancamentos', cap: 'Lançamentos', a: 17.9, b: 28.85,
    cam: [[17.9, LARGO], [19.7, [442,222,1288,470]], [23.3, [442,72,1288,134]]],
    foco: [[18.1, 19.6, NAV['Lançamentos']], [23.5, 24.4, [506,94,676,46]], [24.45, 26.2, [454,148,514,42]], [26.3, 28.5, [1561,91,52,52]]] },
  { id: 'contas', cap: 'Contas', a: 28.85, b: 37.7,
    cam: [[28.85, LARGO], [30.5, [442,252,1288,197]], [33.8, [442,72,1288,377]]],
    foco: [[29.0, 30.4, NAV.Contas], [30.6, 31.6, [442,252,419,197]], [31.65, 32.6, [877,252,419,197]], [32.65, 33.7, [1311,252,419,197]], [34.9, 37.3, [442,72,1288,164]]] },
  { id: 'cartoes', cap: 'Cartões', a: 37.7, b: 48.65,
    cam: [[37.7, LARGO], [39.3, [442,128,1288,507]], [42.4, [816,140,912,480]]],
    foco: [[37.9, 39.2, NAV['Cartões']], [39.4, 40.3, [460,146,352,226]], [40.35, 41.9, [834,148,876,66]], [42.6, 44.6, [816,320,912,58]], [45.0, 48.2, [1586,262,126,52]]] },
  { id: 'orcamentos', cap: 'Orçamentos', a: 48.65, b: 58.15,
    cam: [[48.65, LARGO], [50.3, [442,334,1288,200]], [53.0, [442,134,1288,400]]],
    foco: [[48.85, 50.2, NAV['Orçamentos']], [50.4, 52.5, [442,334,419,200]], [53.2, 57.7, [442,134,1288,184]]] },
  { id: 'metas', cap: 'Metas', a: 58.15, b: 66.95,
    cam: [[58.15, LARGO], [59.6, [442,128,1288,403]], [62.5, [442,128,860,403]]],
    foco: [[58.3, 59.5, NAV.Metas], [59.7, 62.1, [442,128,419,403]], [62.7, 66.6, [877,128,419,403]]] },
  { id: 'recorrentes', cap: 'Recorrentes', a: 66.95, b: 77.55,
    cam: [[66.95, LARGO], [69.6, [442,397,1288,369]], [72.2, [442,72,1288,309]]],
    foco: [[67.1, 69.4, NAV.Recorrentes], [69.8, 71.9, [442,397,1288,369]], [72.4, 77.1, [947,72,783,309]]] },
  { id: 'relatorios', cap: 'Relatórios', a: 77.55, b: 87.2,
    cam: [[77.55, LARGO], [79.2, [442,74,1288,451]], [81.6, [442,541,1288,353]], [84.0, [1100,60,640,170]]],
    foco: [[77.7, 79.1, NAV['Relatórios']], [79.3, 80.6, [442,74,236,42]], [80.7, 81.5, [442,248,636,277]], [81.8, 83.6, [442,541,1288,353]], [84.2, 85.4, [1467,69,97,52]], [85.45, 86.8, [1560,69,176,52]]] },
  { id: 'mercado', cap: 'Mercado · cotações com atraso', a: 87.2, b: 93.55,
    cam: [[87.2, LARGO], [88.6, [442,72,1288,550]], [91.0, [442,638,1288,397]]],
    foco: [[87.35, 88.5, NAV.Mercado], [88.8, 90.8, [442,159,1288,463]], [91.2, 93.2, [442,638,1288,397]]] },
  { id: 'dashboard', cap: 'Calculadora', a: 93.55, b: 95.75,
    cam: [[93.55, LARGO], [93.75, [1560,700,340,360]]],
    foco: [[93.9, 95.75, [1838,998,64,64]]] },
  { id: 'calculadora', cap: 'Calculadora', a: 95.75, b: 99.0,
    cam: [[95.75, [1560,700,340,360]], [95.8, [1596,561,300,431]]],
    foco: [] },
  { id: 'configuracoes', cap: 'Configurações', a: 99.0, b: 104.9,
    cam: [[99.0, LARGO], [100.0, [442,72,636,285]], [101.6, [1094,72,636,560]], [102.9, [442,373,636,270]]],
    foco: [[99.1, 99.95, NAV['Configurações']], [100.1, 101.5, [458,158,604,54]], [101.8, 102.8, [1094,72,636,560]], [103.1, 104.5, [458,432,604,52]]],
    claro: [100.55, 101.55] },
]

// Legendas: [início, fim, texto]. Os tempos vêm das pausas medidas na narração.
const reparte = (a, b, partes) => { const total = partes.join('').length; let t = a; return partes.map((p) => { const d = (b - a) * p.length / total; const r = [t, t + d, p]; t += d; return r }) }
const LEGENDAS = [
  [7.89, 9.9, 'O Dashboard é a sua visão geral.'],
  ...reparte(10.29, 17.47, ['Saldo atual, entradas e saídas do mês, saldo projetado', 'e os gráficos que mostram para onde o dinheiro está indo.']),
  [18.22, 22.9, 'Em Lançamentos, você registra cada entrada, saída ou transferência.'],
  ...reparte(23.47, 28.44, ['Busque, filtre por período e categoria,', 'e exporte tudo para planilha quando precisar.']),
  ...reparte(29.19, 37.39, ['Em Contas ficam a conta corrente, a poupança, a carteira e os investimentos.', 'Cada uma com o seu saldo, somando o seu patrimônio total.']),
  [38.02, 42.1, 'Em Cartões, acompanhe o limite, a fatura atual e as próximas.'],
  ...reparte(42.53, 48.28, ['As compras parceladas aparecem mês a mês,', 'e o pagamento da fatura fica registrado separado da compra.']),
  [48.99, 52.6, 'Em Orçamentos, defina quanto quer gastar em cada categoria.'],
  [53.09, 57.8, 'O aplicativo avisa quando você chega a 70, 90 e 100% do limite.'],
  [58.5, 62.2, 'Em Metas, escolha um objetivo, o valor e o prazo.'],
  [62.6, 66.7, 'A cada aporte, você vê quanto falta e quanto guardar por mês para chegar lá.'],
  [67.24, 72.15, 'Recorrentes cuida do que se repete: aluguel, assinaturas, salário.'],
  [72.2, 77.2, 'Você vê os próximos vencimentos e o fluxo de caixa previsto para os próximos 90 dias.'],
  [77.87, 83.7, 'Em Relatórios, compare dois meses, veja as maiores despesas e a evolução do seu patrimônio.'],
  [84.16, 86.9, 'Dá para exportar em planilha ou imprimir em PDF.'],
  [87.55, 93.2, 'Em Mercado, acompanhe as maiores altas e baixas do dia e o ranking das ações da bolsa brasileira.'],
  [93.91, 95.4, 'Precisa fazer uma conta rápida?'],
  [95.79, 98.85, 'A calculadora fica sempre a um toque, no canto da tela.'],
  [99.28, 104.6, 'E em Configurações, você escolhe o tema, organiza as categorias e faz o backup dos seus dados.'],
]

const ABAS = ['Dashboard', 'Lançamentos', 'Contas', 'Cartões', 'Orçamentos', 'Metas', 'Recorrentes', 'Relatórios', 'Mercado', 'Configurações']
const $ = (id) => document.getElementById(id)
const palavras = (el, texto) => { el.innerHTML = ''; return texto.split(' ').map((p, i, l) => { const s = document.createElement('span'); s.textContent = p + (i < l.length - 1 ? ' ' : ''); el.appendChild(s); return s }) }

// Montagem (uma vez): uma camada por cena, com a imagem e os anéis de destaque.
const telas = $('telas')
CENAS.forEach((c, n) => {
  const d = document.createElement('div'); d.className = 'tela'; d.style.zIndex = 2 + n
  d.innerHTML = `<img src="shots/${c.id}.png">` + (c.claro ? `<img src="shots/${c.id}-claro.png" class="claro">` : '')
  c.aneis = c.foco.map(() => { const a = document.createElement('div'); a.className = 'anel'; d.appendChild(a); return a })
  c.el = d; c.imgClaro = d.querySelector('.claro'); telas.appendChild(d)
})
const pAbre = palavras($('abre-linha'), 'O seu dinheiro organizado em um só lugar.')
const pF1 = palavras($('fecha-l1'), 'Simples de usar todo dia,')
const pF2 = palavras($('fecha-l2'), 'no computador e no celular.')
const fichas = ABAS.map((n) => { const f = document.createElement('div'); f.className = 'ficha'; f.textContent = n; $('fichas').appendChild(f); return f })

function enquadrar(r) {
  const [x, y, w, h] = r
  if (w >= 1900) return { z: 1, cx: 960, cy: 540 }
  const z = Math.min(1700 / w, 760 / h, 2.3)
  return { z, cx: x + w / 2, cy: y + h / 2 }
}
function camera(c, t) {
  let de = enquadrar(c.cam[0][1]), para = de, k = 1, desde = c.cam[0][0]
  for (const [tk, r] of c.cam) { if (t >= tk) { de = para; para = enquadrar(r); k = io((t - tk) / 1.0); desde = tk } }
  const z = Math.exp(Math.log(de.z) + (Math.log(para.z) - Math.log(de.z)) * k) * (1 + 0.012 * cl((t - desde) / 6))
  const cx = de.cx + (para.cx - de.cx) * k, cy = de.cy + (para.cy - de.cy) * k
  const ay = 540 - 80 * cl((z - 1) / 0.25) // com zoom, o assunto sobe para não ficar atrás da legenda
  return { z, tx: 960 - cx * z, ty: ay - cy * z }
}
const sobe = (spans, t, t0, passo = 0.07) => spans.forEach((s, i) => { const k = out(rampa(t, t0 + i * passo, 0.5)); s.style.transform = `translateY(${(1 - k) * 110}%)`; s.style.opacity = k })

window.seek = async (t) => {
  t = cl(t, 0, T)
  $('brilho').style.background = `radial-gradient(900px circle at ${50 + 22 * Math.sin(t * 0.21)}% ${46 + 18 * Math.cos(t * 0.17)}%, rgba(42,168,234,.34), transparent 70%)`
  $('progresso').style.width = (t / T * 100) + '%'

  // Telas do app
  let capitulo = ''
  for (const c of CENAS) {
    const vis = t >= c.a && t < c.b + 0.4
    c.el.style.visibility = vis ? 'visible' : 'hidden'
    if (!vis) continue
    c.el.style.opacity = io(rampa(t, c.a, 0.4)) * (c.b > 104 ? 1 - io(rampa(t, c.b - 0.3, 0.5)) : 1)
    const cam = camera(c, t)
    c.el.style.transform = `translate(${cam.tx}px, ${cam.ty}px) scale(${cam.z})`
    if (c.imgClaro) c.imgClaro.style.opacity = io(rampa(t, c.claro[0], 0.3)) * (1 - io(rampa(t, c.claro[1], 0.3)))
    c.foco.forEach(([a, b, r], i) => {
      const el = c.aneis[i], dentro = t >= a - 0.02 && t < b + 0.25
      el.style.visibility = dentro ? 'inherit' : 'hidden'
      if (!dentro) return
      const k = mola((t - a) / 0.9 * 1.6), sai = 1 - rampa(t, b, 0.25), m = 8 + (1 - k) * 14
      el.style.left = (r[0] - m) + 'px'; el.style.top = (r[1] - m) + 'px'
      el.style.width = (r[2] + 2 * m) + 'px'; el.style.height = (r[3] + 2 * m) + 'px'
      el.style.opacity = cl(k * 1.4) * sai
      el.style.borderWidth = (3.2 / cam.z + 0.6) + 'px'
      el.style.borderRadius = Math.min(26, r[3] / 2 + m) + 'px'
      el.style.boxShadow = `0 0 0 4000px rgba(0,0,0,0.5), 0 0 ${26 / cam.z}px rgba(42,168,234,.9)`
    })
    if (t >= c.a + 0.15 && t < c.b) capitulo = c.cap
  }

  // Legenda
  const leg = LEGENDAS.find(([a, b]) => t >= a - 0.05 && t < b + 0.2)
  $('sombra').style.opacity = io(rampa(t, 7.3, 0.5)) * (1 - io(rampa(t, 104.6, 0.4)))
  $('legenda').style.visibility = t >= 7.6 && t < 104.8 ? 'visible' : 'hidden'
  $('capitulo').textContent = capitulo
  if (leg) {
    const entra = out(rampa(t, leg[0] - 0.05, 0.28))
    $('fala').textContent = leg[2]
    $('fala').style.opacity = entra * (1 - rampa(t, leg[1] + 0.05, 0.15))
    $('fala').style.transform = `translateY(${(1 - entra) * 14}px)`
  } else $('fala').style.opacity = 0

  // Abertura
  const aVis = t < 7.7
  $('abre').style.visibility = aVis ? 'visible' : 'hidden'
  if (aVis) {
    $('abre').style.opacity = 1 - io(rampa(t, 7.15, 0.45))
    const e = mola(t / 0.9 * 1.3), e2 = mola((t - 0.14) / 0.9 * 1.3)
    $('b1').setAttribute('height', 16 * e); $('b1').setAttribute('y', 20 - 16 * e)
    $('b2').setAttribute('height', 10 * e2); $('b2').setAttribute('y', 20 - 10 * e2)
    $('abre-nome').style.transform = `translateY(${(1 - out(rampa(t, 0.35, 0.7))) * 110}%)`
    sobe(pAbre, t, 1.5, 0.3)
    const abreGrade = io(rampa(t, 4.5, 0.8))
    $('abre-marca').style.transform = `scale(${1 - 0.28 * abreGrade})`
    $('fichas').style.height = (abreGrade * 192) + 'px'
    $('fichas').style.marginTop = (abreGrade * 70) + 'px'
    fichas.forEach((f, i) => { const k = mola((t - 4.85 - i * 0.16) / 0.9 * 1.5); f.style.opacity = cl(k * 1.5); f.style.transform = `translateY(${(1 - k) * 40}px) scale(${0.9 + 0.1 * k})` })
  }

  // Fechamento
  const fVis = t >= 104.6
  $('fecha').style.visibility = fVis ? 'visible' : 'hidden'
  if (fVis) {
    const k = mola((t - 105.0) / 0.9 * 1.3)
    $('fecha-marca').style.opacity = cl(k * 1.6)
    $('fecha-marca').style.transform = `scale(${0.86 + 0.14 * k + 0.012 * cl((t - 105) / 6.5)})`
    $('fecha-nome').style.transform = `translateY(${(1 - out(rampa(t, 105.05, 0.6))) * 110}%)`
    sobe(pF1, t, 106.6, 0.2); sobe(pF2, t, 108.4, 0.22)
  }
  $('hud').textContent = t.toFixed(2) + ' s'
}

// Pré-visualização: espaço toca/pausa, setas andam 0,5 s. O render nunca usa este relógio.
let tAtual = Number(new URLSearchParams(location.search).get('t') || 0), tocando = false, ultimo = 0
addEventListener('keydown', (e) => { if (e.key === ' ') { tocando = !tocando; ultimo = performance.now() } if (e.key === 'ArrowRight') tAtual += 0.5; if (e.key === 'ArrowLeft') tAtual -= 0.5; if (e.key === 'r') tAtual = 0; seek(tAtual) })
const laco = (agora) => { if (tocando) { tAtual = (tAtual + (agora - ultimo) / 1000) % T; seek(tAtual) } ultimo = agora; requestAnimationFrame(laco) }
requestAnimationFrame(laco)

Promise.all([document.fonts.ready, ...[...document.images].map((i) => i.decode().catch(() => {}))]).then(async () => { await seek(tAtual); window.ready = true })
