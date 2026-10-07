export default function Marca({ tamanho = 24 }: { tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="5" y="4" width="5" height="16" rx="2.5" fill="var(--gelo)" />
      <rect x="14" y="10" width="5" height="10" rx="2.5" fill="var(--azul)" />
    </svg>
  )
}
