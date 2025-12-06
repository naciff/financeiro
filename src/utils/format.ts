export function formatMoneyBr(v: number) {
  if (!Number.isFinite(v)) return '0,00'
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)
}

export function formatIntBr(v: number) {
  if (!Number.isFinite(v)) return '0'
  return new Intl.NumberFormat('pt-BR').format(Math.trunc(v))
}
