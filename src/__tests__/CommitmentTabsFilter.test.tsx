import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppStoreProvider } from '../store/AppStore'
import Commitments from '../pages/Commitments'

describe('Commitments tabs filtering', () => {
  it('switches tabs and updates counter', () => {
    render(<MemoryRouter><AppStoreProvider><Commitments /></AppStoreProvider></MemoryRouter>)
    expect(screen.getByText('Compromissos')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Receita' }))
    expect(screen.getByText(/itens/)).toBeInTheDocument()
  })
})
