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
  'azul',
  'gelo',
  'tinta',
  'erro',
]

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
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
