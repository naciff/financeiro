import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useLayout } from '../../context/LayoutContext'

type Item = { to: string; label: string; icon: string; children?: Item[] }

export function Sidebar({
  items,
  onLogout,
  mobile,
  onClose,
  onToggle,
  user
}: {
  items: Item[];
  onLogout?: () => void;
  mobile?: boolean;
  onClose?: () => void;
  onToggle?: () => void;
  user?: { name: string; email: string; avatar_url?: string };
}) {
  const loc = useLocation()
  const { settings } = useLayout()

  // Use settings from context
  const isCollapsed = mobile ? false : settings.nav.collapsed

  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem('sidebar.expanded')
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  })

  // We rely on parent to handle persistence of collapsed state if needed for desktop

  // Styling based on theme
  const isDefaultDark = settings.theme.style === 'default'
  const containerClass = isDefaultDark
    ? 'bg-[#1F2937] text-white' // Exact surface-dark hex
    : 'bg-surface-light dark:bg-surface-dark'

  return (
    <div className={`flex flex-col h-full ${containerClass} ${isCollapsed ? 'w-16' : 'w-full'} transition-all duration-300`}>
      {/* Header (Brand) */}
      <div
        className={`h-16 flex items-center ${isCollapsed ? 'justify-center' : 'px-6'} border-b ${isDefaultDark ? 'border-[#374151] hover:bg-gray-800' : 'border-border-light dark:border-border-dark hover:bg-gray-50 dark:hover:bg-gray-800'} flex-shrink-0 overflow-hidden cursor-pointer transition-colors`}
        onClick={onToggle}
        title={isCollapsed ? "Expandir Menu" : "Recolher Menu"}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          {/* Light Mode Logo (Visible in Light Mode AND NOT DefaultDark) */}
          <img src="/favicon.png" alt="Logo" className={`w-8 h-8 object-contain shrink-0 ${isDefaultDark ? 'hidden' : 'block dark:hidden'}`} />

          {/* Dark Mode Logo (Visible in Dark Mode OR DefaultDark) */}
          <img src="/favicon-dark.png?v=1" alt="Logo" className={`w-8 h-8 object-contain shrink-0 ${isDefaultDark ? 'block' : 'hidden dark:block'}`} />

          {!isCollapsed && <span className="font-bold text-lg tracking-tight whitespace-nowrap text-text-main-light dark:text-text-main-dark" style={isDefaultDark ? { color: '#F9FAFB' } : {}}>ContaMestre</span>}
        </div>
      </div>

      {/* User Panel (Top) */}
      {settings.nav.showUserPanel && user && (
        <div className={`px-4 py-2 flex flex-col items-center transition-colors ${settings.theme.style === 'default' ? 'text-white border-b border-white/10' : 'border-b border-border-light dark:border-border-dark'}`}>
          <div className="relative mb-3 group cursor-pointer" title="Meu Perfil">
            <div className={`${isCollapsed ? 'w-10 h-10' : 'w-20 h-20'} rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex items-center justify-center ${isCollapsed ? 'text-sm' : 'text-2xl'} font-bold text-gray-500 dark:text-gray-300 ring-2 ring-offset-2 ring-gray-200 dark:ring-gray-700 ring-offset-surface-light dark:ring-offset-surface-dark transition-all`}>
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                (user.name || user.email || '?').charAt(0).toUpperCase()
              )}
            </div>
            <div className={`absolute bottom-1 right-1 ${isCollapsed ? 'w-2 h-2' : 'w-4 h-4'} bg-green-500 border-2 border-surface-light dark:border-surface-dark rounded-full`}></div>
          </div>

          {!isCollapsed && (
            <div className="text-center w-full overflow-hidden">
              <div className="text-base font-bold truncate leading-tight mb-1">{user.name || 'Usuário'}</div>
              <div className={`text-xs truncate ${settings.theme.style === 'default' ? 'text-gray-400' : 'text-text-muted-light dark:text-text-muted-dark'}`}>{user.email}</div>
            </div>
          )}

          {!isCollapsed && (
            <div className="flex items-center gap-1 w-full justify-center mt-2">
              <Link to="/dashboard" className={`p-2 rounded-lg transition-all hover:bg-white/10 ${settings.theme.style === 'default' ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-primary'}`} title="Dashboard">
                <span className="material-icons-outlined text-[20px]">home</span>
              </Link>
              <Link to="/schedules/control" className={`p-2 rounded-lg transition-all hover:bg-white/10 ${settings.theme.style === 'default' ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-primary'}`} title="Controle e Previsão">
                <span className="material-icons-outlined text-[20px]">analytics</span>
              </Link>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('open-settings'))}
                className={`p-2 rounded-lg transition-all hover:bg-white/10 ${settings.theme.style === 'default' ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-primary'}`}
                title="Ajustes"
              >
                <span className="material-icons-outlined text-[20px]">settings</span>
              </button>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className={`p-2 rounded-lg transition-all hover:bg-white/10 ${settings.theme.style === 'default' ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-primary'}`}
                  title="Sair"
                >
                  <span className="material-icons-outlined text-[20px]">logout</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className={`flex-1 px-2 py-1 space-y-1 overflow-y-auto overflow-x-hidden custom-scrollbar ${isDefaultDark ? 'scrollbar-dark' : ''}`}>
        {items.map((i) => {
          // Check active state recursively
          const isChildActive = i.children?.some(c =>
            c.to === loc.pathname || c.children?.some(gc => gc.to === loc.pathname)
          )
          const isActive = loc.pathname === i.to || isChildActive

          const expanded = !!expandedParents[i.to]
          const showChildren = expanded && !isCollapsed && i.children

          // Determine styling based on theme
          // If default theme, we force dark sidebar styles
          const isDefaultDark = settings.theme.style === 'default'

          const activeClass = isDefaultDark
            ? 'bg-gradient-to-r from-teal-500/10 to-transparent border-l-4 border-teal-500 text-teal-400' // Dark Default Active
            : 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' // Light/Dark Active

          const inactiveClass = isDefaultDark
            ? 'text-gray-400 hover:bg-[#374151]/50 hover:text-white border-transparent' // Dark Default Inactive (using border-dark color for hover bg)
            : 'border-transparent text-text-muted-light dark:text-text-muted-dark hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-primary' // Light/Dark Inactive

          // For children submenu background
          const childrenBg = isDefaultDark ? 'bg-[#111827]/30' : 'bg-gray-50 dark:bg-gray-800/50'

          // Parent Item
          return (
            <div key={i.to} className="mb-1">
              <div
                className={`flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-4'} py-3 cursor-pointer border-l-4 rounded-r-lg transition-all relative group font-medium
                  ${isActive ? activeClass : inactiveClass}
                `}
                onClick={() => {
                  if (i.children) {
                    setExpandedParents(s => ({ ...s, [i.to]: !expanded }))
                    if (isCollapsed && onToggle) onToggle() // Auto expand if clicking parent in collapsed mode
                  } else {
                    if (mobile && onClose) onClose()
                  }
                }}
              >
                {i.children && !isCollapsed ? (
                  // Button behavior for parent toggle
                  <button className="flex items-center w-full focus:outline-none text-left">
                    <span className={`material-icons-outlined select-none ${isCollapsed ? 'text-2xl' : 'mr-3 text-xl'}`}>{i.icon}</span>
                    {!isCollapsed && (
                      <>
                        <span className="text-sm flex-1">{i.label}</span>
                        <span className={`material-icons-outlined text-sm transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>expand_more</span>
                      </>
                    )}
                  </button>
                ) : (
                  // Link behavior
                  <Link to={i.to} className="flex items-center w-full focus:outline-none" onClick={() => { if (mobile && onClose) onClose() }}>
                    <span className="material-icons-outlined select-none ${isCollapsed ? 'text-2xl' : 'mr-3 text-xl'}">{i.icon}</span>
                    {!isCollapsed && <span className="text-sm">{i.label}</span>}
                  </Link>
                )}

                {/* Tooltip for collapsed mode */}
                {isCollapsed && (
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-2 bg-gray-900 text-white text-xs font-medium rounded-md opacity-0 group-hover:opacity-100 pointer-events-none z-[60] whitespace-nowrap shadow-lg">
                    {i.label}
                    {/* Arrow */}
                    <div className="absolute top-1/2 right-full -translate-y-1/2 border-8 border-transparent border-r-gray-900"></div>
                  </div>
                )}
              </div>

              {/* Children (Level 1) */}
              {showChildren && (
                <div className={`${childrenBg} mt-1 rounded-lg overflow-hidden`}>
                  {i.children!.map((c) => {
                    const isDirectChildActive = loc.pathname === c.to
                    const hasGrandChildren = c.children && c.children.length > 0
                    const isGrandChildActive = c.children?.some(gc => gc.to === loc.pathname)
                    const isChildOrGrandChildActive = isDirectChildActive || isGrandChildActive

                    // Specific expanded state for Level 1 items (if they have children)
                    const childExpanded = !!expandedParents[c.to]

                    const childActiveClass = isDefaultDark ? 'text-teal-400 font-medium bg-white/5' : 'text-primary font-medium bg-blue-50 dark:bg-blue-900/10'
                    const childInactiveClass = isDefaultDark ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-text-muted-light dark:text-text-muted-dark hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700/50'


                    if (hasGrandChildren) {
                      // Level 1 Item with Children (Submenu)
                      return (
                        <div key={c.to}>
                          <div
                            className={`flex items-center pl-12 pr-4 py-2 text-sm cursor-pointer transition-colors relative select-none
                                        ${isChildOrGrandChildActive ? childActiveClass : childInactiveClass}
                                    `}
                            onClick={() => setExpandedParents(s => ({ ...s, [c.to]: !childExpanded }))}
                          >
                            <span className="material-icons-outlined text-[16px] mr-2 opacity-80">{c.icon}</span>
                            <span className="flex-1">{c.label}</span>
                            <span className={`material-icons-outlined text-xs transition-transform ${childExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                          </div>

                          {/* Level 2 Children */}
                          {childExpanded && (
                            <div className={`ml-8 my-1 border-l ${isDefaultDark ? 'border-[#374151]' : 'border-gray-200 dark:border-gray-700'}`}>
                              {c.children!.map(gc => {
                                const isGcActive = loc.pathname === gc.to || (gc.to.includes('?') && loc.search && gc.to.endsWith(loc.search))
                                // Handle exact match or query param match logic if needed more robust
                                // Simple string check for now:
                                const isActiveStart = loc.pathname + loc.search === gc.to

                                const gcActiveClass = isDefaultDark ? 'text-teal-400 font-medium' : 'text-primary font-bold'
                                const gcInactiveClass = isDefaultDark ? 'text-gray-500 hover:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-primary'

                                return (
                                  <Link
                                    key={gc.to}
                                    to={gc.to}
                                    onClick={() => { if (mobile && onClose) onClose() }}
                                    className={`block pl-6 py-1.5 text-xs transition-colors
                                                        ${isActiveStart ? gcActiveClass : gcInactiveClass}
                                                    `}
                                  >
                                    {gc.label}
                                  </Link>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    }

                    // Level 1 Item (Link)
                    return (
                      <Link
                        key={c.to}
                        to={c.to}
                        onClick={() => { if (mobile && onClose) onClose() }}
                        className={`flex items-center pl-12 pr-4 py-2 text-sm transition-colors
                           ${isDirectChildActive ? childActiveClass : childInactiveClass}
                         `}
                      >
                        <span className="material-icons-outlined text-[16px] mr-2 opacity-80">{c.icon}</span>
                        {c.label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Collapse Toggle (Desktop only) */}
      {!mobile && onToggle && (
        <div className={`h-12 border-t flex items-center justify-center ${settings.theme.style === 'default' ? 'border-gray-700' : 'border-border-light dark:border-border-dark'}`}>
          <button
            onClick={onToggle}
            className={`w-full h-full flex items-center justify-center transition-colors ${settings.theme.style === 'default' ? 'text-gray-500 hover:bg-gray-800 hover:text-white' : 'text-text-muted-light dark:text-text-muted-dark hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          >
            <span className="material-icons-outlined">{isCollapsed ? 'chevron_right' : 'chevron_left'}</span>
          </button>
        </div>
      )}
    </div>
  )
}
