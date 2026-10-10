// Esqueleto enquanto o servidor busca as cotações (só quando a cópia guardada venceu).
export default function Carregando() {
  return (
    <div className="grid gap-[var(--vao)]" role="status" aria-label="Carregando cotações">
      <div className="osso h-[400px] !rounded-[22px]" />
      <div className="osso h-[360px] !rounded-[22px]" />
      <div className="osso h-[520px] !rounded-[22px]" />
    </div>
  )
}
