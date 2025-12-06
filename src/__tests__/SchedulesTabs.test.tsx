import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppStoreProvider } from '../store/AppStore'
import Schedules from '../pages/Schedules'

describe('Schedules tabs and grid', () => {
  it('renders tabs and switches active tab with keyboard', () => {
    render(<MemoryRouter><AppStoreProvider><Schedules /></AppStoreProvider></MemoryRouter>)
    const tablist = screen.getByRole('tablist', { name: 'Filtros de agendamentos' })
    expect(tablist).toBeInTheDocument()
    const despesas = screen.getByRole('tab', { name: 'Despesas' })
    despesas.focus()
    fireEvent.keyDown(despesas, { key: 'ArrowRight' })
    const receitas = screen.getByRole('tab', { name: 'Receitas' })
    expect(receitas).toHaveFocus()
    fireEvent.keyDown(receitas, { key: 'Enter' })
    expect(receitas).toHaveAttribute('aria-selected', 'true')
  })
})
