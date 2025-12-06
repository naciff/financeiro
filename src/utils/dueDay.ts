export function normalizeCardDueDay(input: string): number | null {
  const v = (input || '').replace(/\D/g, '').slice(0, 2)
  if (!v) return null
  const n = parseInt(v)
  if (!Number.isFinite(n)) return null
  if (n < 1) return 1
  if (n > 31) return 31
  return n
}
