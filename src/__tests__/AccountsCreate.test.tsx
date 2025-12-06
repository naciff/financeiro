import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppStoreProvider } from '../store/AppStore'
import Accounts from '../pages/Accounts'

describe('Accounts create and balances', () => {
  it('creates account and shows in balances with formatted value', async () => {
    render(<MemoryRouter><AppStoreProvider><Accounts /></AppStoreProvider></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Inserir' }))
    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'banco' } })
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Conta Teste' } })
    fireEvent.change(screen.getByLabelText('Saldo inicial'), { target: { value: '123.45' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(await screen.findByText('Conta criada com sucesso')).toBeInTheDocument()
    expect(screen.getByText('Conta Teste')).toBeInTheDocument()
    expect(screen.getByText(/R\$ 123\.45/)).toBeInTheDocument()
  })
})
