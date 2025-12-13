export function formatMoneyBr(v: number) {
  if (!Number.isFinite(v)) return '0,00'
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)
}

export function formatIntBr(v: number) {
  if (!Number.isFinite(v)) return '0'
  return new Intl.NumberFormat('pt-BR').format(Math.trunc(v))
}

export function digits(v: string) {
  return v.replace(/\D/g, '')
}

export function maskCpfCnpj(v: string) {
  v = v.replace(/\D/g, '')
  if (v.length > 14) v = v.slice(0, 14)
  if (v.length > 11) {
    return v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  } else {
    return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }
}
