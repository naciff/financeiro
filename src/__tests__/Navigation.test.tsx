import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Layout from '../shared/Layout'
import { Sidebar } from '../components/layout/Sidebar'

describe('Navigation hierarchy and accessibility', () => {
  it('renders expandable Cadastro with ARIA and persists expansion', () => {
    const items = [
      { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
      {
        to: '/cadastro', label: 'Cadastro', icon: 'settings', children: [
          { to: '/cadastro/caixa-financeiro', label: 'Caixa Financeiro', icon: 'accounts' },
          { to: '/cadastro/grupo-compromisso', label: 'Grupo de Compromisso', icon: 'reports' },
        ]
      },
    ]
    render(<MemoryRouter><Sidebar items={items} /></MemoryRouter>)
    const btn = screen.getByRole('button', { name: 'Cadastro' })
    expect(btn).toHaveAttribute('aria-haspopup', 'true')
    expect(btn).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(btn)
    expect(btn).toHaveAttribute('aria-expanded', 'true')
    const sub = screen.getByText('Caixa Financeiro')
    expect(sub).toBeInTheDocument()
    fireEvent.click(btn)
    expect(btn).toHaveAttribute('aria-expanded', 'false')
  })

  it('supports arrow key navigation between items', () => {
    const items = [
      { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
      { to: '/calendar', label: 'Calendário', icon: 'calendar' },
    ]
    render(<MemoryRouter initialEntries={['/dashboard']}><Sidebar items={items} /></MemoryRouter>)
    const dash = screen.getByText('Dashboard').closest('a') as HTMLElement
    dash.focus()
    fireEvent.keyDown(dash, { key: 'ArrowDown' })
    const cal = screen.getByText('Calendário').closest('a') as HTMLElement
    expect(document.activeElement).toBe(cal)
  })
})

describe('Mobile overlay', () => {
  it('opens mobile sidebar via Header button', () => {
    render(<MemoryRouter><Layout><div>Content</div></Layout></MemoryRouter>)
    const open = screen.getByRole('button', { name: 'Abrir menu' })
    fireEvent.click(open)
    expect(screen.getByRole('dialog', { name: 'Menu móvel' })).toBeInTheDocument()
  })
})
