import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppStoreProvider } from '../store/AppStore'
import Schedules from '../pages/Schedules'

describe('Schedules behavior', () => {
  it('shows Operação desabilitada alinhada à aba atual', () => {
    render(<MemoryRouter><AppStoreProvider><Schedules /></AppStoreProvider></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Incluir' }))
    const op = screen.getByLabelText('Operação') as HTMLSelectElement
    expect(op).toBeDisabled()
    expect(op.value).toBe('despesa')
  })

  it('shows type filter dropdown and changes selection', () => {
    render(<MemoryRouter><AppStoreProvider><Schedules /></AppStoreProvider></MemoryRouter>)
    const filter = screen.getByLabelText('Tipo') as HTMLSelectElement
    fireEvent.change(filter, { target: { value: 'variavel' } })
    expect(filter.value).toBe('variavel')
  })
})
