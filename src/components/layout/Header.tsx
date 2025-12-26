import { supabase } from '../../lib/supabase'
import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProfile, listFavorites, getDailyFinancials } from '../../services/db'
import { TransactionModal } from '../modals/TransactionModal'
import { useAppStore } from '../../store/AppStore'
import { OrganizationModal } from '../modals/OrganizationModal'
import { useLayout } from '../../context/LayoutContext'
import { SettingsDrawer } from './SettingsDrawer'
import { formatCurrency } from '../../utils/formatCurrency'

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

  // Notifications State
  const [notifications, setNotifications] = useState<any[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(false)

  useEffect(() => {
    const handleFullScreenChange = () => {
      const doc = document as any
      const isFull = !!(doc.fullscreenElement || doc.mozFullScreenElement || doc.webkitFullscreenElement || doc.msFullscreenElement)
      setIsFullScreen(isFull)
    }

    document.addEventListener('fullscreenchange', handleFullScreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullScreenChange)
    document.addEventListener('mozfullscreenchange', handleFullScreenChange)
    document.addEventListener('MSFullscreenChange', handleFullScreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullScreenChange)
      document.removeEventListener('mozfullscreenchange', handleFullScreenChange)
      document.removeEventListener('MSFullscreenChange', handleFullScreenChange)
    }
  }, [])

  useEffect(() => {
    if (store.activeOrganization) {
      listFavorites(store.activeOrganization).then(r => setFavorites(r.data || []))

      // Fetch Daily Notifications
      // Note: We use today's date in local time string roughly to match API expectations or ISO Date
      const todayIso = new Date().toISOString().split('T')[0]
      getDailyFinancials(todayIso, store.activeOrganization).then(r => {
        if (r.data) {
          // Filter: Only pending items for today
          // Status 1 = Pending, 2 = Paid/Concluded. We want pending.
          // In the mixed return from getDailyFinancials:
          // 'agendamento' type usually doesn't have numeric status in the same way, but mappedSchedules sets type='agendamento'.
          // 'financials' have situacao. 1 = Pending.
          // 'transactions' (realizado) are done, so we probably exclude them or include if user wants 'due today' validation.
          // User request: "quando tiver algum item no calendario vencendo no dia" -> implies pending things to pay/receive.

          const pending = r.data.filter(item => {
            // For financials/schedules
            if (item.situacao === 2) return false // Already paid/received
            if (item.status === 'pago' || item.status === 'recebido' || item.status === 'realizado') return false

            return true
          })
          setNotifications(pending)
        }
      })
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

  // Group Notifications by Account (Caixa)
  const groupedNotifications = useMemo(() => {
    const groups: Record<string, any[]> = {}
    notifications.forEach(item => {
      const accountName = item.caixa?.nome || 'Sem Conta'
      if (!groups[accountName]) groups[accountName] = []
      groups[accountName].push(item)
    })
    return groups
  }, [notifications])

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

          <div className="flex items-center gap-6">
            {/* Mobile Org Switcher */}
            <div className="md:hidden relative">
              <button
                onClick={() => setShowOrgMenu(!showOrgMenu)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-text-muted-light dark:text-text-muted-dark transition-colors"
                title="Trocar Empresa"
              >
                <div className="relative">
                  <span className="material-icons-outlined text-[24px]">business</span>
                  <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-surface-light dark:border-surface-dark ${store.activeOrganization ? 'bg-green-500' : 'bg-blue-500'}`}></span>
                </div>
              </button>

              {showOrgMenu && (
                <>
                  <div className="fixed inset-0 z-[60]" onClick={() => setShowOrgMenu(false)}></div>
                  <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border dark:border-gray-700 z-[70] py-2 animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-4 py-2 border-b dark:border-gray-700 mb-1">
                      <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Selecionar Empresa</div>
                    </div>
                    {store.organizations.map(org => (
                      <button
                        key={org.id}
                        className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors ${store.activeOrganization === org.id ? 'bg-blue-50 dark:bg-blue-900/20 font-bold text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-200'}`}
                        onClick={() => {
                          store.setActiveOrganization(org.id)
                          setShowOrgMenu(false)
                        }}
                      >
                        <span className={`w-3 h-3 rounded-full shrink-0 ${org.name === 'Pessoal' ? 'bg-blue-500' : 'bg-green-500'}`}></span>
                        <span className="truncate">{org.name}</span>
                        {store.activeOrganization === org.id && <span className="material-icons-outlined text-sm ml-auto">check</span>}
                      </button>
                    ))}

                    <div className="border-t dark:border-gray-700 my-1"></div>
                    <button
                      className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-blue-600 dark:text-blue-400 transition-colors"
                      onClick={() => {
                        handleCreateOrg()
                        setShowOrgMenu(false)
                      }}
                    >
                      <span className="material-icons-outlined text-base">add_business</span>
                      Nova Empresa
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* 1. Shortcuts */}
            <div className="hidden md:flex items-center gap-4 text-text-muted-light dark:text-text-muted-dark">
              <button onClick={onOpenCalculator} className="hover:text-primary transition-colors" title="Calculadora"><span className="material-icons-outlined">calculate</span></button>
              <button onClick={() => { console.log('Header: Clicked Add Button'); if (onOpenTransaction) onOpenTransaction() }} className="hover:text-primary transition-colors" title="Novo Lançamento"><span className="material-icons-outlined">add</span></button>
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
                              <span>{store.showValues ? `R$ ${Number(fav.valor).toFixed(2)}` : '*****'}</span>
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
                onClick={() => store.setShowValues(!store.showValues)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-text-muted-light dark:text-text-muted-dark transition-colors"
                title={store.showValues ? "Ocultar Valores" : "Mostrar Valores"}
              >
                <span className="material-icons-outlined text-[20px]">
                  {store.showValues ? 'visibility' : 'visibility_off'}
                </span>
              </button>

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
                title={isFullScreen ? "Sair da Tela Cheia" : "Tela Cheia (F11)"}
              >
                <span className="material-icons-outlined text-[20px]">
                  {isFullScreen ? 'fullscreen_exit' : 'fullscreen'}
                </span>
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-text-muted-light dark:text-text-muted-dark transition-colors relative ${showNotifications ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                  title="Notificações"
                >
                  <span className="material-icons-outlined text-[20px]">notifications</span>
                  {notifications.length > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-primary text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-surface-light dark:border-surface-dark">
                      {notifications.length}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowNotifications(false)}></div>
                    <div className="absolute top-full right-0 mt-2 w-80 md:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border dark:border-gray-700 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                      <div className="p-3 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-between items-center">
                        <h3 className="font-semibold text-gray-700 dark:text-gray-200">Notificações</h3>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{notifications.length} pendências hoje</span>
                      </div>

                      <div className="max-h-[400px] overflow-y-auto p-2 space-y-4">
                        {notifications.length === 0 ? (
                          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            <span className="material-icons-outlined text-4xl mb-2 opacity-50 block">check_circle</span>
                            <p>Tudo em dia!</p>
                            <p className="text-xs">Nenhum vencimento pendente para hoje.</p>
                          </div>
                        ) : (
                          Object.entries(groupedNotifications).map(([accountName, items]) => (
                            <div key={accountName} className="space-y-2">
                              {/* Account Header */}
                              <div className="flex items-center gap-2 px-2">
                                <span className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 tracking-wider sticky top-0 bg-white dark:bg-gray-800 z-10 py-1">{accountName}</span>
                                <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1"></div>
                              </div>

                              {/* Items List */}
                              <div className="space-y-2">
                                {items.map((item, idx) => (
                                  <div key={item.id || idx} className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                                    {/* Left colored border based on operation */}
                                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${item.operacao === 'receita' ? 'bg-green-500' : 'bg-red-500'}`}></div>

                                    <div className="pl-3">
                                      <div className="flex justify-between items-start mb-1">
                                        <div className="flex items-center gap-2">
                                          <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${item.operacao === 'receita' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                                            {item.operacao}
                                          </span>
                                          <span className="text-[10px] text-gray-400 uppercase tracking-wide">
                                            {item.tipo === 'agendamento' ? 'Agendamento' : 'Transação'}
                                          </span>
                                        </div>
                                        <span className={`text-sm font-bold ${item.operacao === 'receita' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                          {store.showValues ? `${item.operacao === 'despesa' ? '-' : '+'} ${formatCurrency(item.valor)}` : '*****'}
                                        </span>
                                      </div>

                                      <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate pr-4" title={item.historico || item.descricao}>
                                        {item.historico || item.descricao || 'Sem descrição'}
                                      </div>

                                      <div className="flex justify-between items-end mt-2">
                                        <div className="text-xs text-gray-500">
                                          {item.cliente?.nome || 'Sem cliente'}
                                        </div>
                                        <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full border border-amber-100 dark:border-amber-900/30">
                                          Pendente
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="hidden md:block h-6 w-px bg-border-light dark:bg-border-dark"></div>

            {/* 4. Org & User (Org first) */}
            <div className="hidden md:flex items-center gap-4 mx-1 relative">

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
