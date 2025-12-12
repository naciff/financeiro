import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

type Item = { to: string; label: string; icon: string; children?: Item[] }

export function Sidebar({
  items,
  onLogout,
  mobile,
  onClose,
  collapsed = false,       // New Prop
  onToggle                 // New Prop
}: {
  items: Item[];
  onLogout?: () => void;
  mobile?: boolean;
  onClose?: () => void;
  collapsed?: boolean;     // Optional to support mobile defaulting to false
  onToggle?: () => void;   // Optional for mobile
}) {
  const loc = useLocation()

  // Mobile always expanded
  const isCollapsed = mobile ? false : collapsed

  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem('sidebar.expanded')
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  })

  // We rely on parent to handle persistence of collapsed state if needed for desktop

  return (
    <div className={`flex flex-col h-full bg-surface-light dark:bg-surface-dark ${isCollapsed ? 'w-16' : 'w-full'} transition-all duration-300`}>
      {/* Header (Brand) */}
      <div className={`h-16 flex items-center ${isCollapsed ? 'justify-center' : 'px-6'} border-b border-border-light dark:border-border-dark flex-shrink-0 overflow-hidden`}>
        <div className="flex items-center gap-3 overflow-hidden">
          <img src="/favicon.png" alt="Logo" className="w-8 h-8 object-contain shrink-0 dark:hidden" />
          <img src="/favicon-dark.png?v=1" alt="Logo" className="w-8 h-8 object-contain shrink-0 hidden dark:block" />
          {!isCollapsed && <span className="font-bold text-lg tracking-tight whitespace-nowrap text-text-main-light dark:text-text-main-dark">ContaMestre</span>}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
        {items.map((i) => {
          const isActive = loc.pathname === i.to || (i.children?.some(c => loc.pathname.startsWith(c.to)))
          const expanded = !!expandedParents[i.to]
          const showChildren = expanded && !isCollapsed && i.children

          // Parent Item
          return (
            <div key={i.to}>
              <div
                className={`flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-6'} py-3 cursor-pointer border-l-4 transition-colors relative group
                  ${isActive
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-text-muted-light dark:text-text-muted-dark hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-primary'
                  }`}
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
                  <button className="flex items-center w-full focus:outline-none">
                    <span className="material-icons-outlined select-none mr-3">{i.icon}</span>
                    {!isCollapsed && (
                      <>
                        <span className="font-medium text-sm flex-1 text-left">{i.label}</span>
                        <span className={`material-icons-outlined text-sm transition-transform ${expanded ? 'rotate-180' : ''}`}>expand_more</span>
                      </>
                    )}
                  </button>
                ) : (
                  // Link behavior
                  <Link to={i.to} className="flex items-center w-full focus:outline-none" onClick={() => { if (mobile && onClose) onClose() }}>
                    <span className="material-icons-outlined select-none mr-3">{i.icon}</span>
                    {!isCollapsed && <span className="font-medium text-sm">{i.label}</span>}
                  </Link>
                )}

                {/* Tooltip for collapsed mode */}
                {isCollapsed && (
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none z-50 whitespace-nowrap">
                    {i.label}
                  </div>
                )}
              </div>

              {/* Children */}
              {showChildren && (
                <div className="bg-gray-50 dark:bg-gray-800/50 py-1">
                  {i.children!.map((c) => {
                    const isChildActive = loc.pathname === c.to
                    return (
                      <Link
                        key={c.to}
                        to={c.to}
                        onClick={() => { if (mobile && onClose) onClose() }}
                        className={`flex items-center pl-14 pr-6 py-2 text-sm hover:text-primary transition-colors
                           ${isChildActive ? 'text-primary font-medium' : 'text-text-muted-light dark:text-text-muted-dark'}
                         `}
                      >
                        <span className="material-icons-outlined text-xs mr-2">{c.icon}</span>
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
        <div className="p-4 border-t border-border-light dark:border-border-dark">
          <button
            onClick={onToggle}
            className="w-full flex items-center justify-center p-2 text-text-muted-light dark:text-text-muted-dark hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <span className="material-icons-outlined">{collapsed ? 'chevron_right' : 'chevron_left'}</span>
          </button>
        </div>
      )}
    </div>
  )
}
