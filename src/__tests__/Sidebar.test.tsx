import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Sidebar } from '../components/layout/Sidebar'

describe('Sidebar', () => {
  const items = [
    { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { to: '/calendar', label: 'Calendário', icon: 'calendar' },
  ]

  it('renderiza itens com ícones e labels', () => {
    render(<MemoryRouter><Sidebar items={items} /></MemoryRouter>)
    expect(screen.getByLabelText('Menu principal')).toBeInTheDocument()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Calendário')).toBeInTheDocument()
  })

  it('colapsa e expande com duração 300ms e ARIA correta', () => {
    render(<MemoryRouter><Sidebar items={items} /></MemoryRouter>)
    const toggle = screen.getByRole('button', { name: /recolher menu|expandir menu/i })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    const sidebar = screen.getByLabelText('Menu principal')
    expect(sidebar).toHaveClass('duration-300')
  })

  it('adiciona tooltips quando colapsado', () => {
    render(<MemoryRouter><Sidebar items={items} /></MemoryRouter>)
    const toggle = screen.getByRole('button', { name: /recolher menu|expandir menu/i })
    fireEvent.click(toggle)
    expect(screen.getByText('Dashboard').closest('a')).toHaveAttribute('title', 'Dashboard')
  })

  it('permite alternar com teclado (Enter)', () => {
    render(<MemoryRouter><Sidebar items={items} /></MemoryRouter>)
    const toggle = screen.getByRole('button', { name: /recolher menu|expandir menu/i })
    fireEvent.keyDown(toggle, { key: 'Enter' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })
})
