import { chromium } from 'playwright'
import { writeFileSync } from 'node:fs'
const base = 'http://localhost:3000'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2, reducedMotion: 'reduce', colorScheme: 'dark', locale: 'pt-BR' })
const page = await ctx.newPage()
await page.goto(base + '/login', { waitUntil: 'networkidle' })
await page.fill('#email', 'video@exemplo.com')
await page.fill('#senha', 'demo-local-1')
await page.keyboard.press('Enter')
await page.waitForURL(base + '/', { timeout: 60000 })
const rects = {}
const medir = () => page.evaluate(() => {
  const r = (el) => { const b = el.getBoundingClientRect(); return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)] }
  return {
    nav: Object.fromEntries([...document.querySelectorAll('.lateral a.nav-item')].map((a) => [a.title, r(a)])),
    cartoes: [...document.querySelectorAll('.cartao, .ticker, .topo .b, .calc-botao, .calc-painel')].map((c) => ({ t: c.innerText.replace(/\s+/g, ' ').slice(0, 46), r: r(c) })).filter((c) => c.r[1] < 1080 && c.r[3] > 0),
    altura: document.documentElement.scrollHeight,
  }
})
const tirar = async (nome, caminho, antes) => {
  if (caminho) await page.goto(base + caminho, { waitUntil: 'networkidle' })
  if (antes) await antes()
  await page.waitForTimeout(2500)
  rects[nome] = await medir()
  await page.screenshot({ path: `shots/${nome}.png` })
  console.log('ok', nome, rects[nome].altura)
}
await tirar('dashboard', '/')
await tirar('lancamentos', '/lancamentos')
await tirar('contas', '/contas')
await tirar('cartoes', '/cartoes')
await tirar('orcamentos', '/orcamentos')
await tirar('metas', '/metas')
await tirar('recorrentes', '/recorrentes')
await tirar('relatorios', '/relatorios')
await tirar('mercado', '/mercado', () => page.waitForTimeout(3000))
await tirar('configuracoes', '/configuracoes')
await tirar('calculadora', '/', async () => {
  await page.click('.calc-botao')
  await page.fill('.calc-visor input', '1.500,50 + 10%')
})
await ctx.addCookies([{ name: 'gbf_tema', value: 'claro', url: base }])
await tirar('configuracoes-claro', '/configuracoes')
writeFileSync('shots/rects.json', JSON.stringify(rects, null, 1))
await browser.close()
