import type { Config } from 'tailwindcss'

const cores = [
  'fundo',
  'painel',
  'painel2',
  'linha',
  'linha2',
  't1',
  't2',
  't3',
  'verde',
  'menta',
  'ouro',
  'tinta',
  'erro',
]

const config: Config = {
  // Testes ficam de fora: textos de exemplo neles viravam classes CSS inválidas.
  content: ['./src/**/*.{ts,tsx}', '!./src/**/*.test.ts'],
  theme: {
    extend: {
      colors: Object.fromEntries(cores.map((c) => [c, `var(--${c})`])),
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
