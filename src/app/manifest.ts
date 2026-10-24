import type { MetadataRoute } from 'next'

// Manifesto do aplicativo (PWA): o que o celular e o computador usam ao instalar.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'GBFinanças',
    short_name: 'GBFinanças',
    description:
      'Gestão financeira com WhatsApp, inteligência artificial e Open Finance: lançamentos, contas, cartões, orçamentos e metas.',
    lang: 'pt-BR',
    dir: 'ltr',
    start_url: '/?origem=app',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#f3f8f4',
    theme_color: '#16a34a',
    categories: ['finance', 'productivity'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Nova saída',
        short_name: 'Saída',
        url: '/?acao=saida',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Lançar com IA',
        short_name: 'IA',
        url: '/?acao=ia',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Pergunte ao Grão',
        short_name: 'Grão',
        url: '/?acao=grao',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Contas e bancos',
        short_name: 'Contas',
        url: '/contas',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
    ],
    screenshots: [
      {
        src: '/screenshots/computador.png',
        sizes: '1280x800',
        type: 'image/png',
        form_factor: 'wide',
        label: 'Painel no computador',
      },
      {
        src: '/screenshots/celular.png',
        sizes: '390x844',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'Painel no celular',
      },
    ],
  }
}
