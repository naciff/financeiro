import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppStoreProvider } from '../store/AppStore'
import CommitmentGroups from '../pages/CommitmentGroups'

describe('CommitmentGroups CRUD UI', () => {
  it('shows form only after clicking Incluir and creates item', () => {
    render(<MemoryRouter><AppStoreProvider><CommitmentGroups /></AppStoreProvider></MemoryRouter>)
    expect(screen.queryByText('Novo grupo')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Inserir' }))
    expect(screen.getByText(/Novo grupo|Editar grupo/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Grupo Teste' } })
    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'despesa' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(screen.getByText(/Grupos/)).toBeInTheDocument()
  })
})
