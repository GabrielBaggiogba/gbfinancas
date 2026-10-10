// As barras da marca em onda, para telas de espera. O movimento fica em globals.css.
export default function Carregador({ tamanho = 34 }: { tamanho?: number }) {
  return (
    <svg
      className="carregador"
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="2.5" y="4" width="5" height="16" rx="2.5" fill="var(--gelo)" />
      <rect x="9.5" y="4" width="5" height="16" rx="2.5" fill="var(--azul)" />
      <rect x="16.5" y="4" width="5" height="16" rx="2.5" fill="var(--gelo)" />
    </svg>
  )
}
