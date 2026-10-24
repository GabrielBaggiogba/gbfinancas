// Grão, o mascote do GBFinanças: uma moeda que brotou ("de grão em grão...").
// Desenhado em SVG para ficar nítido em qualquer tamanho; o movimento fica em globals.css
// (.mascote) e para sozinho para quem pede menos movimento.

type Humor = 'feliz' | 'pensando' | 'comemorando'

export default function Mascote({
  tamanho = 96,
  humor = 'feliz',
  animado = true,
  className = '',
}: {
  tamanho?: number
  humor?: Humor
  animado?: boolean
  className?: string
}) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 120 120"
      aria-hidden="true"
      focusable="false"
      className={`mascote ${animado ? 'mascote-vivo' : ''} ${className}`}
      data-humor={humor}
    >
      <ellipse
        cx="60"
        cy="113"
        rx="27"
        ry="4"
        fill="#0b1f14"
        opacity="0.13"
        className="mascote-sombra"
      />
      <g className="mascote-corpo">
        {/* broto */}
        <g className="mascote-broto">
          <path
            d="M60 31 C60 25 60 21 60 15"
            stroke="#15803d"
            strokeWidth="3.6"
            strokeLinecap="round"
            fill="none"
          />
          <path d="M60 19 C53 9 42 9 37 15 C43 23 53 24 60 19 Z" fill="#22c55e" />
          <path d="M60 16 C66 4 79 3 85 9 C80 18 68 21 60 16 Z" fill="#4ade80" />
          <path
            d="M60 16 C67 10 74 8 80 9"
            stroke="#15803d"
            strokeWidth="1.4"
            strokeLinecap="round"
            fill="none"
            opacity="0.55"
          />
        </g>
        {/* moeda */}
        <circle cx="60" cy="70" r="41" fill="#d99a1e" />
        <circle cx="60" cy="68" r="39" fill="#f2c14e" />
        <circle cx="60" cy="68" r="31.5" fill="none" stroke="#e0a82e" strokeWidth="2.4" />
        <path
          d="M33 52 C38 40 49 33 62 32"
          stroke="#fff3c4"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
          opacity="0.8"
        />
        {/* rosto */}
        <g className="mascote-olhos">
          {humor === 'comemorando' ? (
            <>
              <path
                d="M42 66 Q47 60 52 66"
                stroke="#0b1f14"
                strokeWidth="3.4"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M68 66 Q73 60 78 66"
                stroke="#0b1f14"
                strokeWidth="3.4"
                strokeLinecap="round"
                fill="none"
              />
            </>
          ) : (
            <>
              <ellipse cx="47" cy={humor === 'pensando' ? 62 : 64} rx="4.6" ry="6" fill="#0b1f14" />
              <ellipse cx="73" cy={humor === 'pensando' ? 62 : 64} rx="4.6" ry="6" fill="#0b1f14" />
              <circle cx="48.6" cy={humor === 'pensando' ? 59.6 : 61.6} r="1.7" fill="#fff" />
              <circle cx="74.6" cy={humor === 'pensando' ? 59.6 : 61.6} r="1.7" fill="#fff" />
            </>
          )}
        </g>
        <ellipse cx="38.5" cy="76" rx="6" ry="3.6" fill="#f08a6b" opacity="0.45" />
        <ellipse cx="81.5" cy="76" rx="6" ry="3.6" fill="#f08a6b" opacity="0.45" />
        {humor === 'pensando' ? (
          <path
            d="M55 81 Q60 78 66 80"
            stroke="#0b1f14"
            strokeWidth="3.4"
            strokeLinecap="round"
            fill="none"
          />
        ) : humor === 'comemorando' ? (
          <path d="M49 76 Q60 91 71 76 Z" fill="#0b1f14" />
        ) : (
          <path
            d="M50 77 Q60 87 70 77"
            stroke="#0b1f14"
            strokeWidth="3.6"
            strokeLinecap="round"
            fill="none"
          />
        )}
      </g>
      {humor === 'comemorando' && (
        <g className="mascote-brilhos" fill="#f2c14e">
          <path d="M14 40 l2.5 6 6 2.5 -6 2.5 -2.5 6 -2.5 -6 -6 -2.5 6 -2.5 z" />
          <path d="M104 34 l2 4.5 4.5 2 -4.5 2 -2 4.5 -2 -4.5 -4.5 -2 4.5 -2 z" />
        </g>
      )}
    </svg>
  )
}
