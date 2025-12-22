import { supabase } from '../../lib/supabase'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProfile, listFavorites } from '../../services/db'
import { TransactionModal } from '../modals/TransactionModal'
import { useAppStore } from '../../store/AppStore'
import { OrganizationModal } from '../modals/OrganizationModal'
import { useLayout } from '../../context/LayoutContext'
import { SettingsDrawer } from './SettingsDrawer'

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
  const { settings, setSettings } = useLayout()
  const dateStr = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const formattedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1)
  const [userName, setUserName] = useState('')

  // Org Switcher State
  const [showOrgMenu, setShowOrgMenu] = useState(false)
  const [showOrgModal, setShowOrgModal] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showFavMenu, setShowFavMenu] = useState(false)
  const [favorites, setFavorites] = useState<any[]>([])
  const [showTxModal, setShowTxModal] = useState(false)
  const [selectedFav, setSelectedFav] = useState<any>(null)

  useEffect(() => {
    if (store.activeOrganization) {
      listFavorites(store.activeOrganization).then(r => setFavorites(r.data || []))
    }
  }, [store.activeOrganization, showFavMenu])

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
  const theme = settings.theme.style

  const updateTheme = (style: any) => setSettings(prev => ({ ...prev, theme: { ...prev.theme, style } }))

  if (!settings.header.visible) return <SettingsDrawer />

  return (
    <>
      <header className={`bg-surface-light dark:bg-surface-dark shadow-sm z-30 ${settings.header.position === 'fixed' || settings.header.position === 'sticky' ? 'sticky top-0' : 'relative'}`}>
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
              <div className="relative">
                <button
                  onClick={() => setShowFavMenu(!showFavMenu)}
                  className="hover:text-primary transition-colors flex items-center gap-1"
                  title="Favoritos"
                >
                  <span className="material-icons-outlined">attach_file</span>
                  <span className="text-sm">Favoritos</span>
                </button>
                {showFavMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowFavMenu(false)}></div>
                    <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-gray-800 rounded shadow-lg border dark:border-gray-700 z-20 py-1 max-h-[300px] overflow-y-auto">
                      {favorites.length === 0 ? (
                        <div className="px-4 py-2 text-sm text-gray-500">Nenhum favorito</div>
                      ) : (
                        favorites.map(fav => (
                          <button
                            key={fav.id}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-200 border-b border-gray-100 dark:border-gray-700 last:border-0"
                            onClick={() => {
                              setSelectedFav(fav)
                              setShowTxModal(true)
                              setShowFavMenu(false)
                            }}
                          >
                            <div className="font-medium truncate">{fav.historico || 'Sem Histórico'}</div>
                            <div className="text-xs text-gray-500 truncate flex justify-between">
                              <span>R$ {Number(fav.valor).toFixed(2)}</span>
                              <span className="uppercase">{fav.operacao}</span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="hidden md:block h-6 w-px bg-border-light dark:bg-border-dark"></div>

            {/* 2. Date */}
            <div className="hidden md:flex items-center gap-2 text-sm text-text-muted-light dark:text-text-muted-dark">
              <span className="material-icons-outlined text-base">calendar_today</span>
              <span>{formattedDate}</span>
            </div>

            <div className="hidden md:block h-6 w-px bg-border-light dark:bg-border-dark"></div>

            {/* 3. Actions: Fullscreen & Notifications */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const toggleFullScreen = () => {
                    const doc = document as any
                    const docEl = document.documentElement as any

                    const requestFullScreen = docEl.requestFullscreen ||
                      docEl.mozRequestFullScreen ||
                      docEl.webkitRequestFullScreen ||
                      docEl.msRequestFullscreen;

                    const cancelFullScreen = doc.exitFullscreen ||
                      doc.mozCancelFullScreen ||
                      doc.webkitExitFullscreen ||
                      doc.msExitFullscreen;

                    const isFullScreen = doc.fullscreenElement ||
                      doc.mozFullScreenElement ||
                      doc.webkitFullscreenElement ||
                      doc.msFullscreenElement;

                    if (!isFullScreen) {
                      if (requestFullScreen) {
                        requestFullScreen.call(docEl);
                      } else {
                        console.error("Fullscreen API is not supported on this device.");
                      }
                    } else {
                      if (cancelFullScreen) {
                        cancelFullScreen.call(doc);
                      }
                    }
                  }

                  toggleFullScreen();
                }}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-text-muted-light dark:text-text-muted-dark transition-colors"
                title="Tela Cheia (F11)"
              >
                <span className="material-icons-outlined text-[20px]">fullscreen</span>
              </button>

              <button
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-text-muted-light dark:text-text-muted-dark transition-colors relative"
                title="Notificações"
              >
                <span className="material-icons-outlined text-[20px]">notifications</span>
                {/* Badge Example (Static for now) */}
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-primary text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-surface-light dark:border-surface-dark">
                  3
                </span>
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
                    <div className="absolute top-full right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded shadow-lg border dark:border-gray-700 z-20 py-1">
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
                      <button
                        onClick={() => {
                          setShowUserMenu(false)
                          window.dispatchEvent(new CustomEvent('open-settings'))
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                      >
                        <span className="material-icons-outlined text-base">settings</span>
                        Ajustes
                      </button>
                      <button
                        onClick={() => {
                          navigate('/help') // Assuming route exists or placeholder
                          setShowUserMenu(false)
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                      >
                        <span className="material-icons-outlined text-base">help</span>
                        Ajuda
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
        {showTxModal && (
          <TransactionModal
            onClose={() => {
              setShowTxModal(false)
              setSelectedFav(null)
            }}
            onSuccess={() => {
              setShowTxModal(false)
              setSelectedFav(null)
              window.location.reload()
            }}
            initialData={selectedFav ? {
              operacao: selectedFav.operacao,
              conta_id: selectedFav.conta_id,
              especie: selectedFav.especie,
              historico: selectedFav.historico,
              valor_entrada: selectedFav.operacao === 'receita' ? selectedFav.valor : 0,
              valor_saida: selectedFav.operacao === 'despesa' ? selectedFav.valor : 0,
              cliente_id: selectedFav.cliente_id,
              grupo_compromisso_id: selectedFav.grupo_compromisso_id,
              compromisso_id: selectedFav.compromisso_id,
              detalhes: selectedFav.detalhes ? JSON.parse(selectedFav.detalhes) : null,
              data_lancamento: new Date().toISOString().split('T')[0],
              data_vencimento: new Date().toISOString().split('T')[0]
            } : null}
          />
        )}
      </header >
      <SettingsDrawer />
    </>
  )
}
