import { supabase } from '../lib/supabase'
import { Sidebar } from '../components/layout/Sidebar'
import { Footer } from '../components/layout/Footer'
import { Header } from '../components/layout/Header'
import { Icon } from '../components/ui/Icon'
import { useState } from 'react'
import { CalculatorModal } from '../components/modals/CalculatorModal'
import { TransferModal } from '../components/modals/TransferModal'
import { TransactionModal } from '../components/modals/TransactionModal'
import { useLocation } from 'react-router-dom'

export default function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showCalculator, setShowCalculator] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)
  const [showTransaction, setShowTransaction] = useState(false)

  const nav = [
    { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { to: '/calendar', label: 'Calendário', icon: 'calendar_today' },
    { to: '/schedules/control', label: 'Controle e Previsão', icon: 'analytics' },
    { to: '/ledger', label: 'Livro Caixa', icon: 'book' },
    { to: '/schedules', label: 'Agendamentos', icon: 'schedule' },
    { to: '/transfers', label: 'Transferências', icon: 'swap_horiz' },
    { to: '/reports', label: 'Relatórios', icon: 'description' },
    { to: '/notes', label: 'Notas', icon: 'notes' },
    {
      to: '/cadastro', label: 'Cadastro', icon: 'app_registration', children: [
        { to: '/cadastro/caixa-financeiro', label: 'Caixa Financeiro', icon: 'home' },
        { to: '/cadastro/grupo-compromisso', label: 'Grupo de Compromisso', icon: 'group' },
        { to: '/cadastro/compromisso', label: 'Compromisso', icon: 'bookmark' },
        { to: '/cadastro/clientes', label: 'Clientes', icon: 'people' },
      ]
    },
    {
      to: '/settings', label: 'Configurações', icon: 'settings', children: [
        { to: '/profile', label: 'Perfil', icon: 'person' },
        { to: '/settings', label: 'Geral', icon: 'settings_applications' }
      ]
    },
  ]
  // Determine current title based on path
  const location = useLocation()
  let currentTitle = 'ContaMestre'

  // Flatten items for easy lookup
  const findTitle = (items: typeof nav): string | undefined => {
    for (const item of items) {
      if (item.to === location.pathname) return item.label
      if (item.children) {
        const childLabel = findTitle(item.children)
        if (childLabel) return childLabel
      }
    }
    return undefined
  }

  currentTitle = findTitle(nav) || 'Dashboard'

  // State for sidebar collapse (persisted)
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('sidebar.collapsed') === 'true'
    } catch { return false }
  })

  const toggleCollapse = () => {
    setCollapsed(prev => {
      const n = !prev
      localStorage.setItem('sidebar.collapsed', String(n))
      return n
    })
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark font-body text-text-main-light dark:text-text-main-dark transition-colors duration-200 antialiased">
      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)}></div>
          <div className="relative bg-surface-light dark:bg-surface-dark w-64 h-full shadow-xl">
            <Sidebar items={nav} onLogout={() => supabase?.auth.signOut()} mobile onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex flex-col flex-shrink-0 bg-surface-light dark:bg-surface-dark border-r border-border-light dark:border-border-dark overflow-y-auto transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
        <Sidebar
          items={nav}
          onLogout={() => supabase?.auth.signOut()}
          collapsed={collapsed}
          onToggle={toggleCollapse}
        />
      </aside>

      <main className="flex-1 overflow-y-auto flex flex-col">
        <Header
          onMenuToggle={() => setMobileOpen(true)}
          title={currentTitle}
          onOpenCalculator={() => setShowCalculator(true)}
          onOpenTransaction={() => setShowTransaction(true)}
          onOpenTransfer={() => setShowTransfer(true)}
        />

        <div className="flex-1 overflow-y-auto relative p-6">
          {children}
        </div>

        <Footer />
      </main>

      {showCalculator && <CalculatorModal onClose={() => setShowCalculator(false)} />}
      {showTransfer && <TransferModal onClose={() => setShowTransfer(false)} />}
      {showTransaction && <TransactionModal onClose={() => setShowTransaction(false)} />}
    </div>
  )
}
