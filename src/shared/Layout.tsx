import { supabase } from '../lib/supabase'
import { Sidebar } from '../components/layout/Sidebar'
import { Footer } from '../components/layout/Footer'
import { Header } from '../components/layout/Header'
import { Icon } from '../components/ui/Icon'
import { useState, useEffect } from 'react'
import { CalculatorModal } from '../components/modals/CalculatorModal'
import { TransferModal } from '../components/modals/TransferModal'
import { TransactionModal } from '../components/modals/TransactionModal'
import { useLocation } from 'react-router-dom'
import { useAppStore } from '../store/AppStore'
import { listMyMemberships } from '../services/db'

export default function Layout({ children }: { children: React.ReactNode }) {
  const store = useAppStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showCalculator, setShowCalculator] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)
  const [showTransaction, setShowTransaction] = useState(false)
  const [currentUser, setCurrentUser] = useState<string | null>(null)

  useEffect(() => {
    if (supabase) {
      supabase.auth.getUser().then(r => setCurrentUser(r.data.user?.id || null))
    }
  }, [])

  // Auto-select organization
  useEffect(() => {
    // Only check if no organization is selected and we haven't manually deselected (optional logic, but for now simple)
    if (!store.activeOrganization) {
      listMyMemberships().then(res => {
        if (res.data && res.data.length > 0) {
          // If user has memberships, default to the first one
          // Ideally we could check if user has personal data, but as per plan: auto-switch to first org
          // To improve UX: maybe only auto-switch if user has NO personal data?
          // For now, let's auto-switch to first org if it exists, assuming "Personal" is empty for staff users.
          store.setActiveOrganization(res.data[0].owner_id)
        }
      })
    }
  }, [store.activeOrganization]) // Run once or when activeOrg changes (to re-eval?) - Actually checking on mount/null is safer.

  const [permissions, setPermissions] = useState<any>(null)

  useEffect(() => {
    async function checkPermissions() {
      // 1. Personal Mode or Owner Mode -> Full Access
      if (!store.activeOrganization || (currentUser && store.activeOrganization === currentUser)) {
        setPermissions(null)
        return
      }

      // 2. Member Mode -> Fetch Permissions
      const { data } = await listMyMemberships()
      const membership = data?.find(m => m.owner_id === store.activeOrganization)
      setPermissions(membership?.permissions || {})
    }
    checkPermissions()
  }, [store.activeOrganization, currentUser])

  const navRaw = [
    { id: 'dashboard', to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'calendar', to: '/calendar', label: 'Calendário Financeiro', icon: 'calendar_today' },
    { id: 'schedules_control', to: '/schedules/control', label: 'Controle e Previsão', icon: 'analytics' },
    { id: 'ledger', to: '/ledger', label: 'Livro Caixa', icon: 'book' },
    { id: 'schedules', to: '/schedules', label: 'Agendamentos', icon: 'schedule' },
    { id: 'transfers', to: '/transfers', label: 'Transferências', icon: 'swap_horiz' },
    { id: 'reports', to: '/reports', label: 'Relatórios', icon: 'description' },
    { id: 'notes', to: '/notes', label: 'Notas', icon: 'notes' },
    {
      id: 'cadastro', to: '/cadastro', label: 'Cadastro', icon: 'app_registration', children: [
        { to: '/cadastro/caixa-financeiro', label: 'Caixa Financeiro', icon: 'home' },
        { to: '/cadastro/grupo-compromisso', label: 'Grupo de Compromisso', icon: 'group' },
        { to: '/cadastro/compromisso', label: 'Compromisso', icon: 'bookmark' },
        { to: '/cadastro/cost-centers', label: 'Centro de Custo', icon: 'account_balance_wallet' },
        { to: '/cadastro/clientes', label: 'Clientes', icon: 'people' },
      ]
    },
    // Configurações: Only if Personal (activeOrganization is null) OR Owner
    ...((!store.activeOrganization || (currentUser && store.activeOrganization === currentUser)) ? [{
      to: '/settings', label: 'Configurações', icon: 'settings', children: [
        { to: '/settings', label: 'Geral', icon: 'settings_applications' },
        { to: '/permissoes', label: 'Usuário e Permissões', icon: 'lock_person' },
        { to: '/admin/users', label: 'Usuários do Sistema', icon: 'group_add' }
      ]
    }] : [])
  ]

  const nav = navRaw.filter(item => {
    if (!permissions) return true // Full access
    if ((item as any).id && permissions[(item as any).id] === false) return false
    return true
  })
  // Determine current title based on path
  const location = useLocation()
  let currentTitle = 'ContaMestre'

  // Flatten items for easy lookup
  const findTitle = (items: typeof nav): string | undefined => {
    for (const item of items) {
      if (item.to === location.pathname) return item.label
      if (item.children) {
        const childLabel = findTitle(item.children as any)
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
