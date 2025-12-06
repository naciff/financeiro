import { describe, it, expect } from 'vitest'
import { AppStoreProvider, useAppStore } from '../store/AppStore'
import { renderHook, act } from '@testing-library/react'

describe('Accounts store behaviors', () => {
  it('ensures only one principal per type', () => {
    const { result } = renderHook(() => useAppStore(), { wrapper: ({ children }) => <AppStoreProvider>{children}</AppStoreProvider> })
    act(() => {
      result.current.createAccount({ nome: 'Banco A', tipo: 'banco', saldo_inicial: 0, principal: true })
      result.current.createAccount({ nome: 'Banco B', tipo: 'banco', saldo_inicial: 0 })
    })
    const a1 = result.current.accounts[0]
    const a2 = result.current.accounts[1]
    act(() => { result.current.updateAccount(a2.id, { principal: true }) })
    const after = result.current.accounts.filter(a => a.tipo === 'banco' && a.principal)
    expect(after.length).toBe(1)
    expect(after[0].id).toBe(a2.id)
  })

  it('prevents delete when transactions linked', () => {
    const { result } = renderHook(() => useAppStore(), { wrapper: ({ children }) => <AppStoreProvider>{children}</AppStoreProvider> })
    let accId: string = ''
    act(() => { result.current.createAccount({ nome: 'Carteira', tipo: 'carteira', saldo_inicial: 0 }); accId = result.current.accounts[0].id })
    // Simulate a transaction linked
    act(() => { (result.current as any).transactions.push({ id: 't1', conta_id: accId, valor_entrada: 0, valor_saida: 0, status: 'pago' }) })
    const res = result.current.deleteAccount(accId)
    expect(res.ok).toBe(false)
  })
})
