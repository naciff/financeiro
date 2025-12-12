import { supabase } from '../../lib/supabase'
import { useEffect, useState } from 'react'
import { getProfile } from '../../services/db'

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
  const dateStr = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const formattedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1)
  const [userName, setUserName] = useState('')
  // Initialize state based on localStorage
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'auto'>(() => {
    if (localStorage.theme === 'light') return 'light'
    if (localStorage.theme === 'dark') return 'dark'
    return 'auto'
  })

  useEffect(() => {
    getProfile().then(r => {
      if (r.data && r.data.name) {
        setUserName(r.data.name.split(' ')[0])
      }
    })
  }, [])

  return (
    <header className="bg-surface-light dark:bg-surface-dark shadow-sm sticky top-0 z-10">
      <div className="px-8 py-4 flex items-center justify-between">

        {/* Left: Mobile Toggle & Title */}
        <div className="flex items-center gap-4">
          <button
            aria-label="Abrir menu"
            className="md:hidden p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-text-muted-light dark:text-text-muted-dark"
            onClick={onMenuToggle}
          >
            <span className="material-icons-outlined">menu</span>
          </button>

          <div>
            <h1 className="text-2xl font-bold text-text-main-light dark:text-text-main-dark">{title}</h1>
            <p className="text-sm text-text-muted-light dark:text-text-muted-dark">Olá, {userName || 'Usuário'}</p>
          </div>
        </div>

        {/* Right: Actions & User */}
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-4 text-text-muted-light dark:text-text-muted-dark">
            <button onClick={onOpenCalculator} className="hover:text-primary transition-colors" title="Calculadora"><span className="material-icons-outlined">calculate</span></button>
            <button onClick={onOpenTransaction} className="hover:text-primary transition-colors" title="Novo Lançamento"><span className="material-icons-outlined">add</span></button>
            <button onClick={onOpenTransfer} className="hover:text-primary transition-colors" title="Transferências"><span className="material-icons-outlined">swap_horiz</span></button>
          </div>

          <div className="hidden md:block h-6 w-px bg-border-light dark:bg-border-dark"></div>

          <div className="hidden md:flex items-center gap-2 text-sm text-text-muted-light dark:text-text-muted-dark">
            <span className="material-icons-outlined text-base">calendar_today</span>
            <span>{formattedDate}</span>
          </div>

          <div className="flex items-center gap-2 ml-4">
            {/* Theme Switcher */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-full border border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setThemeMode('light')
                  localStorage.setItem('theme', 'light')
                  document.documentElement.classList.remove('dark')
                }}
                className={`p-1.5 rounded-full transition-all ${themeMode === 'light'
                    ? 'bg-white dark:bg-gray-600 shadow-sm text-yellow-500'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
                title="Claro"
              >
                <span className="material-icons-outlined text-lg">light_mode</span>
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
                className={`p-1.5 rounded-full transition-all ${themeMode === 'auto'
                    ? 'bg-white dark:bg-gray-600 shadow-sm text-primary'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
                title="Automático"
              >
                <span className="material-icons-outlined text-lg">brightness_auto</span>
              </button>
              <button
                onClick={() => {
                  setThemeMode('dark')
                  localStorage.setItem('theme', 'dark')
                  document.documentElement.classList.add('dark')
                }}
                className={`p-1.5 rounded-full transition-all ${themeMode === 'dark'
                    ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-400'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
                title="Escuro"
              >
                <span className="material-icons-outlined text-lg">dark_mode</span>
              </button>
            </div>

            <button
              onClick={() => supabase?.auth.signOut()}
              className="text-sm font-medium hover:text-loss transition-colors text-text-muted-light dark:text-text-muted-dark"
            >
              Sair
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
