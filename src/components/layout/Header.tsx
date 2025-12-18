import { supabase } from '../../lib/supabase'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProfile } from '../../services/db'
import { useAppStore } from '../../store/AppStore'
import { OrganizationModal } from '../modals/OrganizationModal'

export function Header({
  onMenuToggle,
  title,
  onOpenCalculator,
  onOpenTransaction,
  onOpenTransfer
}: {
  onMenuToggle: () => void;
  title: string;
  onOpenCalculator?: () => void;
  onOpenTransaction?: () => void;
  onOpenTransfer?: () => void;
}) {
  const store = useAppStore()
  const dateStr = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const formattedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1)
  const [userName, setUserName] = useState('')
  // Initialize state based on localStorage
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'auto'>(() => {
    if (localStorage.theme === 'light') return 'light'
    if (localStorage.theme === 'dark') return 'dark'
    return 'auto'
  })

  // Org Switcher State
  const [showOrgMenu, setShowOrgMenu] = useState(false)
  const [showOrgModal, setShowOrgModal] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

  useEffect(() => {
    getProfile().then(r => {
      if (r.data && r.data.name) {
        setUserName(r.data.name.split(' ')[0])
      }
    })
  }, [])

  const currentOrg = store.organizations.find(o => o.id === store.activeOrganization)
  const currentOrgName = currentOrg ? currentOrg.name : 'Selecione...'

  const handleCreateOrg = () => {
    setShowOrgModal(true)
  }

  const navigate = useNavigate()

  return (
    <header className="bg-surface-light dark:bg-surface-dark shadow-sm sticky top-0 z-10">
      <div className="h-16 px-8 flex items-center justify-between">

        {/* Left: Mobile Toggle & Title */}
        <div className="flex items-center gap-4">
          <button
            aria-label="Abrir menu"
            className="md:hidden p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-text-muted-light dark:text-text-muted-dark"
            onClick={onMenuToggle}
          >
            <span className="material-icons-outlined">menu</span>
          </button>

          <h1 className="text-2xl font-bold text-text-main-light dark:text-text-main-dark">{title}</h1>
        </div>

        {/* Right: Rearranged Items */}
        <div className="flex items-center gap-6">

          {/* 1. Shortcuts */}
          <div className="hidden md:flex items-center gap-4 text-text-muted-light dark:text-text-muted-dark">
            <button onClick={onOpenCalculator} className="hover:text-primary transition-colors" title="Calculadora"><span className="material-icons-outlined">calculate</span></button>
            <button onClick={onOpenTransaction} className="hover:text-primary transition-colors" title="Novo Lançamento"><span className="material-icons-outlined">add</span></button>
            <button onClick={onOpenTransfer} className="hover:text-primary transition-colors" title="Transferências"><span className="material-icons-outlined">swap_horiz</span></button>
          </div>

          <div className="hidden md:block h-6 w-px bg-border-light dark:bg-border-dark"></div>

          {/* 2. Date */}
          <div className="hidden md:flex items-center gap-2 text-sm text-text-muted-light dark:text-text-muted-dark">
            <span className="material-icons-outlined text-base">calendar_today</span>
            <span>{formattedDate}</span>
          </div>

          <div className="hidden md:block h-6 w-px bg-border-light dark:bg-border-dark"></div>

          {/* 3. Theme Switcher */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-0.5 rounded-full border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => {
                setThemeMode('light')
                localStorage.setItem('theme', 'light')
                document.documentElement.classList.remove('dark')
              }}
              className={`p-0.5 rounded-full transition-all ${themeMode === 'light'
                ? 'bg-white dark:bg-gray-600 shadow-sm text-yellow-500'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              title="Claro"
            >
              <span className="material-icons-outlined text-sm">light_mode</span>
            </button>
            <button
              onClick={() => {
                setThemeMode('auto')
                localStorage.removeItem('theme')
                if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                  document.documentElement.classList.add('dark')
                } else {
                  document.documentElement.classList.remove('dark')
                }
              }}
              className={`p-0.5 rounded-full transition-all ${themeMode === 'auto'
                ? 'bg-white dark:bg-gray-600 shadow-sm text-primary'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              title="Automático"
            >
              <span className="material-icons-outlined text-sm">brightness_auto</span>
            </button>
            <button
              onClick={() => {
                setThemeMode('dark')
                localStorage.setItem('theme', 'dark')
                document.documentElement.classList.add('dark')
              }}
              className={`p-0.5 rounded-full transition-all ${themeMode === 'dark'
                ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-400'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              title="Escuro"
            >
              <span className="material-icons-outlined text-sm">dark_mode</span>
            </button>
          </div>

          <div className="hidden md:block h-6 w-px bg-border-light dark:bg-border-dark"></div>

          {/* 4. Org & User (Org first) */}
          <div className="hidden md:flex items-center gap-4 mx-1 relative">

            {/* Org Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowOrgMenu(!showOrgMenu)}
                className="flex items-center gap-1 text-xs font-medium bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-text-main-light dark:text-text-main-dark"
              >
                <span className={`w-2 h-2 rounded-full ${store.activeOrganization ? 'bg-green-500' : 'bg-blue-500'}`}></span>
                {currentOrgName}
                <span className="material-icons-outlined text-[10px]">expand_more</span>
              </button>

              {showOrgMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowOrgMenu(false)}></div>
                  <div className="absolute top-full right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded shadow-lg border dark:border-gray-700 z-20 py-1">
                    {store.organizations.map(org => (
                      <button
                        key={org.id}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 ${store.activeOrganization === org.id ? 'font-bold text-primary dark:text-primary-light' : 'text-gray-700 dark:text-gray-200'}`}
                        onClick={() => {
                          store.setActiveOrganization(org.id)
                          setShowOrgMenu(false)
                        }}
                      >
                        <span className={`w-2 h-2 rounded-full ${org.name === 'Pessoal' ? 'bg-blue-500' : 'bg-green-500'}`}></span>
                        {org.name}
                      </button>
                    ))}

                    <div className="border-t dark:border-gray-700 my-1"></div>
                    <button
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-primary"
                      onClick={() => {
                        handleCreateOrg()
                        setShowOrgMenu(false)
                      }}
                    >
                      <span className="material-icons-outlined text-sm">add</span>
                      Nova Empresa
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-1 text-sm text-text-muted-light dark:text-text-muted-dark hover:text-primary transition-colors"
              >
                Olá, {userName || 'Usuário'}
                <span className="material-icons-outlined text-[16px]">expand_more</span>
              </button>

              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)}></div>
                  <div className="absolute top-full right-0 mt-1 w-40 bg-white dark:bg-gray-800 rounded shadow-lg border dark:border-gray-700 z-20 py-1">
                    <button
                      onClick={() => {
                        navigate('/profile')
                        setShowUserMenu(false)
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <span className="material-icons-outlined text-base">person</span>
                      Meu Perfil
                    </button>
                    <div className="border-t dark:border-gray-700 my-1"></div>
                    <button
                      onClick={() => {
                        supabase?.auth.signOut()
                        setShowUserMenu(false)
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <span className="material-icons-outlined text-base">logout</span>
                      Sair
                    </button>
                  </div>
                </>
              )}
            </div>

          </div>
        </div>
      </div>
      <OrganizationModal
        isOpen={showOrgModal}
        onClose={() => setShowOrgModal(false)}
        onSuccess={(org) => store.setActiveOrganization(org.id)}
      />
    </header>
  )
}
