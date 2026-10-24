// Logo do GBFinanças: três barras subindo, como um gráfico de crescimento, e uma folha
// dourada brotando da maior (o dinheiro que cresce). Usa as cores do tema.
export default function Marca({ tamanho = 24 }: { tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="2.5" y="14.5" width="5" height="7.5" rx="2.5" fill="var(--verde)" opacity="0.55" />
      <rect x="9.5" y="10.5" width="5" height="11.5" rx="2.5" fill="var(--verde)" />
      <rect x="16.5" y="7" width="5" height="15" rx="2.5" fill="var(--menta)" />
      <path d="M19 7.1 C18.6 4.1 16.4 2.1 13.1 1.9 C13.3 5.1 15.6 7.3 19 7.1 Z" fill="#e7b43a" />
      <path
        d="M18.6 6.7 C17.6 5 16.2 3.8 14.4 3"
        stroke="#b8862a"
        strokeWidth="0.7"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}
