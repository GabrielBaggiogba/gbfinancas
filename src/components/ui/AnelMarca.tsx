export default function AnelMarca({ tamanho = 22 }: { tamanho?: number }) {
  return (
    <svg
      className="anel"
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="10" stroke="var(--linha2)" strokeWidth="2.2" />
      <circle
        className="arco"
        cx="12"
        cy="12"
        r="10"
        pathLength={1}
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        transform="rotate(-90 12 12)"
      />
      <path
        className="marca"
        d="M7 12.5l3.5 3.5L17 8.5"
        pathLength={1}
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
