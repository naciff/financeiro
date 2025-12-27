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
import { listMyMemberships, listMyOrganizations, getProfile } from '../services/db'
import { useLayout } from '../context/LayoutContext'
import { CookieConsentModal } from '../components/modals/CookieConsentModal'
import { MobileNav } from '../components/layout/MobileNav'

export default function Layout({ children }: { children: React.ReactNode }) {
  const store = useAppStore()
  const { settings, setSettings } = useLayout()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showCalculator, setShowCalculator] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)
  const [showTransaction, setShowTransaction] = useState(false)
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isOrgOwner, setIsOrgOwner] = useState(false)
  const [myProfile, setMyProfile] = useState<any>(null)

  useEffect(() => {
    if (supabase) {
      supabase.auth.getUser().then(r => {
        const u = r.data.user
        setCurrentUser(u?.id || null)
        setUserEmail(u?.email || null)

        // Fetch Profile for sidebar
        getProfile().then(async (r) => {
          // Merge with user metadata for fallback
          let profileData = { ...r.data } as any;

          if (u?.user_metadata) {
            if (!profileData.name) profileData.name = u.user_metadata.full_name || u.user_metadata.name;
            if (!profileData.avatar_url) profileData.avatar_url = u.user_metadata.avatar_url || u.user_metadata.picture;
          }

          // If avatar_url is a storage path (not http), download it
          if (supabase && profileData.avatar_url && !profileData.avatar_url.startsWith('http') && !profileData.avatar_url.startsWith('blob:')) {
            try {
              const { data, error } = await supabase.storage.from('avatars').download(profileData.avatar_url)
              if (!error && data) {
                profileData.avatar_url = URL.createObjectURL(data)
              }
            } catch (e) {
              console.error("Error downloading avatar", e)
            }
          }

          setMyProfile({
            name: profileData.name || u?.email?.split('@')[0] || 'Usuário',
            email: u?.email || '',
            avatar_url: profileData.avatar_url || null
          })
        })
      })
    }
  }, [])

  // Heartbeat: Update last_login every 5 minutes if user is active
  useEffect(() => {
    if (!currentUser) return

    // Initial update on mount/login
    import('../services/db').then(async db => {
      const { error } = await db.updateProfile(currentUser, { last_login: new Date().toISOString() })
      if (error) console.error('Heartbeat Init Error:', error)
    })

    const intervalId = setInterval(() => {
      import('../services/db').then(async db => {
        const { error } = await db.updateProfile(currentUser, { last_login: new Date().toISOString() })
        if (error) console.error('Heartbeat Interval Error:', error)
      })
    }, 5 * 60 * 1000) // 5 minutes

    return () => clearInterval(intervalId)
  }, [currentUser])

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
          store.setActiveOrganization(res.data[0].organization_id)
        }
      })
    }
  }, [store.activeOrganization]) // Run once or when activeOrg changes (to re-eval?) - Actually checking on mount/null is safer.

  const [permissions, setPermissions] = useState<any>(null)

  useEffect(() => {
    async function checkPermissions() {
      // 1. Fetch relevant data
      const [membershipsRes, orgsRes] = await Promise.all([
        listMyMemberships(),
        listMyOrganizations()
      ])

      const myOrgs = orgsRes.data || []

      // 2. Check Ownership
      if (!store.activeOrganization) {
        setIsOrgOwner(true) // "Pessoal" implies owner usually, or treated as such
      } else {
        const currentOrg = myOrgs.find((o: any) => o.id === store.activeOrganization)
        setIsOrgOwner(currentOrg?.owner_id === currentUser)
      }

      // 3. Permissions (Member Mode)
      if (store.activeOrganization && currentUser) {
        // If owner, full access (permissions = null)
        const currentOrg = myOrgs.find((o: any) => o.id === store.activeOrganization)
        if (currentOrg?.owner_id === currentUser) {
          setPermissions(null)
          return
        }

        // If member, check membership permissions
        // Note: listMyMemberships might need update if it's legacy, but assuming it returns memberships for now
        // If listMyMemberships returns empty or wrong data, this part might fail, but let's focus on Settings menu first.
        const membership = membershipsRes.data?.find((m: any) => m.organization_id === store.activeOrganization || m.owner_id === store.activeOrganization)
        setPermissions(membership?.permissions || {})
      } else {
        setPermissions(null)
      }
    }
    if (currentUser) {
      checkPermissions()
    }
  }, [store.activeOrganization, currentUser])

  const navRaw = [
    { id: 'dashboard', to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'calendar', to: '/calendar', label: 'Calendário Financeiro', icon: 'calendar_today' },
    { id: 'schedules_control', to: '/schedules/control', label: 'Controle e Previsão', icon: 'analytics' },
    { id: 'ledger', to: '/ledger', label: 'Livro Caixa', icon: 'book' },
    { id: 'schedules', to: '/schedules', label: 'Agendamentos', icon: 'schedule' },
    { id: 'transfers', to: '/transfers', label: 'Transferências', icon: 'swap_horiz' },
    { id: 'saldo_detalhado', to: '/saldo-detalhado', label: 'Saldo Detalhado', icon: 'payments' },
    { id: 'reports', to: '/reports', label: 'Relatórios', icon: 'description' },
    { id: 'notes', to: '/notes', label: 'Notas', icon: 'notes' },
    {
      id: 'cadastro', to: '/cadastro', label: 'Cadastro', icon: 'app_registration', children: [
        { to: '/cadastro/caixa-financeiro', label: 'Caixa Financeiro', icon: 'account_balance' },
        { to: '/cadastro/grupo-compromisso', label: 'Grupo de Compromisso', icon: 'group' },
        { to: '/cadastro/compromisso', label: 'Compromisso', icon: 'bookmark' },
        { to: '/cadastro/cost-centers', label: 'Centro de Custo', icon: 'account_balance_wallet' },
        { to: '/cadastro/clientes', label: 'Clientes', icon: 'people' },
        { to: '/cadastro/servicos', label: 'Serviços', icon: 'app_registration' },
      ]
    },
    // Configurações: Only if Master User (ramon.naciff@gmail.com)
    ...(userEmail === 'ramon.naciff@gmail.com' ? [{
      to: '/settings', label: 'Configurações', icon: 'settings', children: [
        { to: '/settings?tab=geral', label: 'Geral', icon: 'settings_applications' },
        { to: '/settings?tab=organizacoes', label: 'Organizações', icon: 'business' },
        { to: '/settings?tab=integracoes', label: 'Integrações', icon: 'link' },
        { to: '/admin/db-manager', label: 'Gerenciador de Banco', icon: 'storage' }
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


  const toggleCollapse = () => {
    setSettings(prev => ({
      ...prev,
      nav: { ...prev.nav, collapsed: !prev.nav.collapsed }
    }))
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark font-body text-text-main-light dark:text-text-main-dark transition-colors duration-200 antialiased">
      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)}></div>
          <div className="relative bg-surface-light dark:bg-surface-dark w-64 h-full shadow-xl">
            <Sidebar items={nav} onLogout={() => supabase?.auth.signOut()} mobile onClose={() => setMobileOpen(false)} user={myProfile} />
          </div>
        </div>
      )}

      {/* Desktop Sidebar (Only if position is SIDE) */}
      {settings.nav.open && settings.nav.position === 'side' && (
        <aside className={`hidden md:flex flex-col flex-shrink-0 bg-surface-light dark:bg-surface-dark border-r border-border-light dark:border-border-dark overflow-y-auto transition-all duration-300 ${settings.nav.collapsed ? 'w-16' : 'w-64'}`}>
          <Sidebar
            items={nav}
            onLogout={() => supabase?.auth.signOut()}
            onToggle={toggleCollapse}
            user={myProfile}
          />
        </aside>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto flex flex-col">

        {/* Top Navigation Mode (If position is TOP) */}
        {settings.nav.open && settings.nav.position === 'top' && (
          <div className="hidden md:block bg-surface-light dark:bg-surface-dark border-b border-border-light dark:border-border-dark">
            {/* We render a horizontal version of the sidebar/nav here. For simplicity, reusing Sidebar but might need a horizontal variant. 
                    Given standard 'Sidebar' is vertical, we might need a HorizontalMenu component. 
                    However, usually 'Top' nav replaces the header or sits below it. 
                    Let's try to adapt Sidebar or render a simple horizontal strip using the same 'nav' items. */}
            <div className="container mx-auto px-4 overflow-x-auto flex items-center h-14 no-scrollbar">
              {nav.map(item => (
                <a key={item.to} href={item.to} className="flex items-center gap-2 px-4 py-2 text-sm text-text-muted-light dark:text-text-muted-dark hover:text-primary whitespace-nowrap">
                  <span className="material-icons-outlined text-[18px]">{item.icon}</span>
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        )}
        <Header
          onMenuToggle={() => setMobileOpen(true)}
          title={currentTitle}
          onOpenCalculator={() => setShowCalculator(true)}
          onOpenTransaction={() => { console.log('Layout: Opening Transaction Modal'); setShowTransaction(true) }}
          onOpenTransfer={() => setShowTransfer(true)}
        />

        <div className="flex-1 relative p-4 md:p-6 pb-24 md:pb-6">
          {children}
        </div>

        <Footer />
        <MobileNav onMore={() => setMobileOpen(true)} />
      </main>

      {showCalculator && <CalculatorModal onClose={() => setShowCalculator(false)} />}
      {showTransfer && <TransferModal onClose={() => setShowTransfer(false)} />}
      {showTransaction && <TransactionModal onClose={() => setShowTransaction(false)} />}

      <CookieConsentModal />
    </div>
  )
}
