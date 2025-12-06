import { describe, it, expect } from 'vitest'
import { normalizeCardDueDay } from '../utils/dueDay'

describe('normalizeCardDueDay', () => {
  it('limits to 1..31 and strips non-digits', () => {
    expect(normalizeCardDueDay('0')).toBe(1)
    expect(normalizeCardDueDay('32')).toBe(31)
    expect(normalizeCardDueDay('15')).toBe(15)
    expect(normalizeCardDueDay('AB12')).toBe(12)
    expect(normalizeCardDueDay('')).toBeNull()
  })
})
