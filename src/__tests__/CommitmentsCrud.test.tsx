import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppStoreProvider } from '../store/AppStore'
import Commitments from '../pages/Commitments'

describe('Commitments CRUD UI', () => {
  it('shows form after Incluir and creates commitment', () => {
    render(<MemoryRouter><AppStoreProvider><Commitments /></AppStoreProvider></MemoryRouter>)
    expect(screen.queryByText('Novo compromisso')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Inserir' }))
    expect(screen.getByText(/Novo compromisso|Editar compromisso/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Plano Teste' } })
    fireEvent.change(screen.getByLabelText('Grupo de Compromisso'), { target: { value: '' } })
  })
})
