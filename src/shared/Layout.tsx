import { supabase } from '../lib/supabase'
import { Sidebar } from '../components/layout/Sidebar'
import { Footer } from '../components/layout/Footer'
import { Header } from '../components/layout/Header'
import { Icon } from '../components/ui/Icon'
import { useState } from 'react'
import { CalculatorModal } from '../components/modals/CalculatorModal'
import { TransferModal } from '../components/modals/TransferModal'
import { TransactionModal } from '../components/modals/TransactionModal'

export default function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showCalculator, setShowCalculator] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)
  const [showTransaction, setShowTransaction] = useState(false)

  const nav = [
    { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { to: '/calendar', label: 'Calendário', icon: 'calendar' },
    { to: '/schedules/control', label: 'Controle e Previsão', icon: 'reports' },
    { to: '/ledger', label: 'Livro Caixa', icon: 'ledger' },
    { to: '/schedules', label: 'Agendamentos', icon: 'schedule' },
    { to: '/transfers', label: 'Transferências', icon: 'transfer' },
    { to: '/reports', label: 'Relatórios', icon: 'file-text' },
    {
      to: '/cadastro', label: 'Cadastro', icon: 'settings', children: [
        { to: '/cadastro/caixa-financeiro', label: 'Caixa Financeiro', icon: 'accounts' },
        { to: '/cadastro/grupo-compromisso', label: 'Grupo de Compromisso', icon: 'group' },
        { to: '/cadastro/compromisso', label: 'Compromisso', icon: 'commitment' },
        { to: '/cadastro/clientes', label: 'Clientes', icon: 'clients' },
      ]
    },
    { to: '/settings', label: 'Configurações', icon: 'settings' },
  ]
  return (
    <div className="min-h-screen flex bg-gray-50 text-gray-900">
      <Header onMenuToggle={() => setMobileOpen(true)} />
      <div className="hidden md:block">
        <Sidebar items={nav} onLogout={() => supabase?.auth.signOut()} />
      </div>
      <main className="flex-1 p-6 pb-20 mt-12 md:mt-0 relative">
        <div className="hidden md:flex items-center gap-4 absolute top-4 right-6 text-sm text-gray-700">

          <div className="flex items-center gap-2 border-r pr-4 mr-2">
            <button
              className="p-1.5 rounded hover:bg-gray-200 text-gray-700 transition-colors"
              title="Calculadora"
              onClick={() => setShowCalculator(true)}
            >
              <Icon name="calculator" className="w-5 h-5" />
            </button>
            <button
              className="p-1.5 rounded hover:bg-gray-200 text-gray-700 transition-colors"
              title="Incluir Lançamento (Livro Caixa)"
              onClick={() => setShowTransaction(true)}
            >
              <Icon name="add" className="w-5 h-5" />
            </button>
            <button
              className="p-1.5 rounded hover:bg-gray-200 text-gray-700 transition-colors"
              title="Transferência"
              onClick={() => setShowTransfer(true)}
            >
              <Icon name="transfer" className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Icon name="calendar-primary" className="w-5 h-5" />
            <span>{(() => {
              const dateStr = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
              return dateStr.charAt(0).toUpperCase() + dateStr.slice(1)
            })()}</span>
          </div>
          <button
            onClick={() => supabase?.auth.signOut()}
            className="flex items-center gap-1 hover:text-red-600 transition-colors font-medium border-l border-gray-300 pl-4"
          >
            Sair
          </button>
        </div>
        {children}
      </main>
      <Footer />

      {mobileOpen && (
        <div className="md:hidden">
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setMobileOpen(false)} aria-hidden="true"></div>
          <div id="mobile-sidebar" className="fixed top-0 left-0 bottom-0 w-64 bg-white border-r z-50 transition-transform duration-300 overflow-y-auto sidebar-scroll" role="dialog" aria-label="Menu móvel">
            <Sidebar items={nav} onLogout={() => { setMobileOpen(false); supabase?.auth.signOut() }} />
          </div>
        </div>
      )}

      {showCalculator && <CalculatorModal onClose={() => setShowCalculator(false)} />}
      {showTransfer && <TransferModal onClose={() => setShowTransfer(false)} />}
      {showTransaction && <TransactionModal onClose={() => setShowTransaction(false)} />}
    </div>
  )
}
