/** Teto "redondo" para o eixo: 1, 2, 2,5, 5 ou 10 vezes uma potência de dez. */
export function tetoRedondo(valor: number): number {
  if (valor <= 0) return 100
  const potencia = 10 ** Math.floor(Math.log10(valor))
  const fracao = valor / potencia
  const passo = fracao <= 1 ? 1 : fracao <= 2 ? 2 : fracao <= 2.5 ? 2.5 : fracao <= 5 ? 5 : 10
  return passo * potencia
}

/** Caminho de uma coluna com o topo arredondado e a base reta. */
export function coluna(x: number, y: number, largura: number, altura: number, raio = 4): string {
  const r = Math.min(raio, largura / 2, Math.max(0, altura))
  return `M${x},${y + altura} V${y + r} Q${x},${y} ${x + r},${y} H${x + largura - r} Q${x + largura},${y} ${x + largura},${y + r} V${y + altura} Z`
}
