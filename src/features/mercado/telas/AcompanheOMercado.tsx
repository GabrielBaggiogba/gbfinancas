import { ArrowUpRight } from 'lucide-react'
import { Holofote } from '@/components/motion/Efeitos'
import { LINKS_DE_MERCADO } from '../links'

/** Links para sites de mercado. Abrem em nova aba; nada é lido dessas páginas. */
export default function AcompanheOMercado() {
  return (
    <section aria-labelledby="acompanhe-o-mercado">
      <h2 id="acompanhe-o-mercado" className="titulo-secao">
        Acompanhe o mercado
      </h2>
      <p className="miudo mt-1">
        Sites externos para notícias, cotações e gráficos. Cada um abre em uma nova aba.
      </p>
      <ul className="mt-4 grid gap-[var(--vao)] min-[700px]:grid-cols-2 min-[1180px]:grid-cols-3">
        {LINKS_DE_MERCADO.map((l) => (
          <li key={l.url} className="min-w-0">
            <Holofote className="cartao noticia h-full">
              <a
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-full flex-col p-[var(--pad)]"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="selo">{l.tipo}</span>
                  <ArrowUpRight size={16} aria-hidden="true" className="noticia-seta text-t3" />
                </span>
                <h3 className="noticia-titulo mt-2.5 text-[1.0625rem]">{l.nome}</h3>
                <p className="mt-1.5 text-[.9375rem] text-t2">{l.descricao}</p>
                <span className="miudo mt-auto pt-4">
                  {new URL(l.url).hostname.replace(/^www\./, '')}
                  <span className="sr-only"> (abre em nova aba)</span>
                </span>
              </a>
            </Holofote>
          </li>
        ))}
      </ul>
    </section>
  )
}
