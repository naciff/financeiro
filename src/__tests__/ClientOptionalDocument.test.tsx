import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppStoreProvider } from '../store/AppStore'
import Schedules from '../pages/Schedules'

describe('Client form optional CPF/CNPJ', () => {
  it('allows saving without CPF/CNPJ and validates when provided', async () => {
    render(<MemoryRouter><AppStoreProvider><Schedules /></AppStoreProvider></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Novo cliente' }))
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Cliente Teste' } })
    fireEvent.click(screen.getByLabelText('Pessoa Física'))
    fireEvent.change(screen.getByLabelText(/CPF\/CNPJ/), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(screen.queryByText(/Documento válido|CPF inválido|CNPJ inválido/)).toBeNull()
  })
})
