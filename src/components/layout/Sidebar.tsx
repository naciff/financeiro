import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Icon } from '../ui/Icon'

type Item = { to: string; label: string; icon: string; children?: Item[] }

export function Sidebar({ items, onLogout }: { items: Item[]; onLogout?: () => void }) {
  const [collapsed, setCollapsed] = useState(false)
  const loc = useLocation()
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem('sidebar.expanded')
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem('sidebar.expanded', JSON.stringify(expandedParents))
    } catch { }
  }, [expandedParents])

  const flatItems = useMemo(() => {
    const out: Array<{ key: string; to?: string; label: string; depth: number }> = []
    items.forEach(i => {
      out.push({ key: i.to, to: i.to, label: i.label, depth: 0 })
      if (i.children && expandedParents[i.to]) {
        i.children.forEach(c => out.push({ key: `${i.to}:${c.to}`, to: c.to, label: c.label, depth: 1 }))
      }
    })
    return out
  }, [items, expandedParents])

  const itemRefs = useRef<Array<HTMLAnchorElement | HTMLButtonElement | null>>([])
  function focusAt(index: number) {
    const el = itemRefs.current[index]
    if (el) el.focus()
  }
  return (
    <nav role="navigation" aria-label="Menu principal" className={`bg-white border-r h-screen sticky top-0 flex flex-col transition-all duration-300 ease-in-out ${collapsed ? 'w-16' : 'w-64'}`}>
      <div className="flex items-center justify-between p-4">
        <button
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          aria-expanded={!collapsed}
          aria-controls="sidebar-items"
          className="rounded p-2 hover:bg-gray-100 focus:outline-none focus:ring"
          onClick={() => setCollapsed(v => !v)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCollapsed(v => !v) } }}
        >
          <img src="/favicon.png" alt="Menu" className="w-8 h-8 object-contain" />
        </button>
        {!collapsed && <div className="font-semibold">ContaMestre</div>}
      </div>
      <ul id="sidebar-items" className="flex-1 space-y-1 sidebar-scroll pr-2">
        {items.map((i, pi) => {
          const isActiveParent = loc.pathname === i.to || (i.children?.some(c => loc.pathname.startsWith(c.to)))
          const isExpandable = !!i.children?.length
          const expanded = !!expandedParents[i.to]
          return (
            <li key={i.to}>
              {isExpandable ? (
                <button
                  ref={el => itemRefs.current[pi] = el}
                  type="button"
                  aria-label={i.label}
                  title={i.label}
                  className={`flex items-center gap-2 w-full text-left px-4 py-3 min-h-12 transition-colors duration-300 ${isActiveParent ? 'bg-fourtek-blue text-white' : 'hover:bg-fourtek-blue-light'}`}
                  aria-haspopup="true"
                  aria-expanded={expanded}
                  onClick={() => setExpandedParents(s => ({ ...s, [i.to]: !expanded }))}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedParents(s => ({ ...s, [i.to]: !expanded })) }
                    if (e.key === 'ArrowRight' && !expanded) { e.preventDefault(); setExpandedParents(s => ({ ...s, [i.to]: true })) }
                    if (e.key === 'ArrowLeft' && expanded) { e.preventDefault(); setExpandedParents(s => ({ ...s, [i.to]: false })) }
                    if (e.key === 'ArrowDown') { e.preventDefault(); focusAt(Math.min(pi + 1, flatItems.length - 1)) }
                    if (e.key === 'ArrowUp') { e.preventDefault(); focusAt(Math.max(pi - 1, 0)) }
                  }}
                >
                  <Icon name={i.icon} className="w-5 h-5" title={i.label} />
                  {!collapsed && <span className="text-base">{i.label}</span>}
                  {!collapsed && (
                    <span className="ml-auto" aria-hidden="true">
                      <Icon name={expanded ? 'chevron-down' : 'chevron-right'} className="w-5 h-5" />
                    </span>
                  )}
                </button>
              ) : (
                <Link
                  ref={el => itemRefs.current[pi] = el}
                  to={i.to}
                  title={i.label}
                  className={`flex items-center gap-2 px-4 py-3 min-h-12 transition-colors duration-300 ${loc.pathname === i.to ? 'bg-fourtek-blue text-white' : 'hover:bg-fourtek-blue-light'}`}
                  aria-current={loc.pathname === i.to ? 'page' : undefined}
                  onKeyDown={e => {
                    const idx = pi
                    if (e.key === 'ArrowDown') { e.preventDefault(); focusAt(Math.min(idx + 1, flatItems.length - 1)) }
                    if (e.key === 'ArrowUp') { e.preventDefault(); focusAt(Math.max(idx - 1, 0)) }
                  }}
                >
                  <Icon name={i.icon} className="w-5 h-5" title={i.label} />
                  <span className={`transition-opacity duration-300 ${collapsed ? 'opacity-0 pointer-events-none w-0 overflow-hidden' : 'opacity-100 text-base'}`}>{i.label}</span>
                </Link>
              )}
              {expanded && i.children && !collapsed && (
                <ul className="mt-2 space-y-2 pl-10" aria-label={`Submenu ${i.label}`}>
                  {i.children.map((c, ci) => {
                    const idx = pi + 1 + ci
                    const active = loc.pathname.startsWith(c.to)
                    return (
                      <li key={c.to}>
                        <Link
                          ref={el => itemRefs.current[idx] = el}
                          to={c.to}
                          title={c.label}
                          className={`flex items-center gap-3 px-4 py-2 min-h-12 transition-colors duration-300 ${active ? 'bg-fourtek-blue/80 text-white' : 'hover:bg-fourtek-blue-light'}`}
                          aria-current={active ? 'page' : undefined}
                          onKeyDown={e => {
                            if (e.key === 'ArrowRight') { e.preventDefault() }
                            if (e.key === 'ArrowLeft') { e.preventDefault(); setExpandedParents(s => ({ ...s, [i.to]: false })) }
                            if (e.key === 'ArrowDown') { e.preventDefault(); focusAt(Math.min(idx + 1, flatItems.length - 1)) }
                            if (e.key === 'ArrowUp') { e.preventDefault(); focusAt(Math.max(idx - 1, 0)) }
                          }}
                        >
                          <Icon name={c.icon} className="w-6 h-6" title={c.label} />
                          <span className="text-sm">{c.label}</span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
      <div className="p-4">
        {onLogout && (
          <button
            className="flex items-center gap-3 w-full text-left px-4 py-2 rounded hover:bg-gray-50"
            onClick={() => onLogout()}
          >
            <Icon name="logout" className="w-5 h-5" title="Sair" />
            <span className={`transition-opacity duration-300 ${collapsed ? 'opacity-0 pointer-events-none w-0 overflow-hidden' : 'opacity-100 text-base'}`}>Sair</span>
          </button>
        )}
      </div>
    </nav>
  )
}
