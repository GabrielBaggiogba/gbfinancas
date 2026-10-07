import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import AtivaToque from '@/components/AtivaToque'
import './globals.css'

const fonte = localFont({
  src: './fonts/HankenGrotesk-latin.woff2',
  weight: '100 900',
  display: 'swap',
  variable: '--font-sans',
  adjustFontFallback: 'Arial',
})

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'GBFinanças',
  description: 'Entrada e saída do dia, e nada mais.',
  applicationName: 'GBFinanças',
  appleWebApp: { capable: true, title: 'GBFinanças', statusBarStyle: 'black-translucent' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#000000',
  colorScheme: 'dark',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={fonte.variable}>
      <body className="bg-fundo text-t1 font-sans antialiased">
        <AtivaToque />
        {children}
      </body>
    </html>
  )
}
