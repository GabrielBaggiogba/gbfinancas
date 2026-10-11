import { chromium } from 'playwright'
import { createServer } from 'node:http'
import { readFileSync, mkdirSync, existsSync } from 'node:fs'
import { extname, join } from 'node:path'

// node render.mjs probe <t1> <t2> ...      -> probe/pNN.png
// node render.mjs frames <a> <b> <porta>   -> frames/fNNNNN.jpg (quadros a..b-1, 30 fps)
const [modo, ...args] = process.argv.slice(2)
const FPS = 30
const tipos = { '.html': 'text/html', '.png': 'image/png', '.woff2': 'font/woff2', '.js': 'text/javascript' }
const porta = modo === 'frames' ? Number(args[2]) : 8760
const srv = createServer((req, res) => {
  const f = join(process.cwd(), decodeURIComponent(req.url.split('?')[0]))
  if (!existsSync(f)) { res.writeHead(404); return res.end() }
  res.writeHead(200, { 'content-type': tipos[extname(f)] || 'application/octet-stream' })
  res.end(readFileSync(f))
}).listen(porta)
const browser = await chromium.launch()
const page = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage()
page.on('pageerror', (e) => console.log('ERRO NA PÁGINA', e.message))
await page.goto(`http://localhost:${porta}/film.html`)
await page.waitForFunction(() => window.ready === true, null, { timeout: 120000 })
const quadro = async (t, arquivo, opts = {}) => {
  await page.evaluate(async (t) => { await window.seek(t); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))) }, t)
  await page.screenshot({ path: arquivo, clip: { x: 0, y: 0, width: 1920, height: 1080 }, ...opts })
}
if (modo === 'probe') {
  mkdirSync('probe', { recursive: true })
  let i = 0
  for (const t of args.map(Number)) await quadro(t, `probe/p${String(++i).padStart(2, '0')}.png`)
} else if (modo === 'frames') {
  const [a, b] = [Number(args[0]), Number(args[1])]
  mkdirSync('frames', { recursive: true })
  for (let f = a; f < b; f++) await quadro(f / FPS, `frames/f${String(f).padStart(5, '0')}.jpg`, { type: 'jpeg', quality: 95 })
  console.log('feito', a, b)
}
await browser.close()
srv.close()
