import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppStoreProvider } from '../store/AppStore'
import Accounts from '../pages/Accounts'

describe('Accounts numeric inputs', () => {
  it('accepts numeric-only for banco, agência e conta', () => {
    render(<MemoryRouter><AppStoreProvider><Accounts /></AppStoreProvider></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Inserir' }))
    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'banco' } })
    const banco = screen.getByPlaceholderText('000')
    const agencia = screen.getByPlaceholderText('00000')
    const conta = screen.getByPlaceholderText('000000')
    fireEvent.change(banco, { target: { value: '341' } })
    fireEvent.change(agencia, { target: { value: '12345' } })
    expect(agencia).toHaveValue('12345')
    fireEvent.change(conta, { target: { value: '123456' } })
    expect(conta).toHaveValue('123456')
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(screen.queryByText(/Agência deve ter 5 dígitos/)).toBeNull()
  })
})
