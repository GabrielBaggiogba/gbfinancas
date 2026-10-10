// Esqueleto enquanto o servidor lê os feeds (só quando a cópia guardada venceu).
export default function Carregando() {
  return (
    <div className="grid gap-[var(--vao)]" role="status" aria-label="Carregando notícias">
      <div className="osso h-[230px] !rounded-[22px]" />
      <div className="osso h-[58px]" />
      <div className="osso h-[300px] !rounded-[22px]" />
      <div className="grid gap-[var(--vao)] min-[700px]:grid-cols-2 min-[1180px]:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="osso h-[320px] !rounded-[22px]" />
        ))}
      </div>
    </div>
  )
}
