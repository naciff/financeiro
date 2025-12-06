import { useEffect, useRef } from 'react'

type Tab = { id: string; label: string }

export function Tabs({ tabs, activeId, onChange, disabled }: { tabs: Tab[]; activeId: string; onChange: (id: string) => void; disabled?: boolean }) {
  const refs = useRef<Array<HTMLButtonElement | null>>([])
  useEffect(() => {
    const idx = tabs.findIndex(t => t.id === activeId)
    const el = refs.current[idx]
    if (el) el.tabIndex = 0
  }, [activeId, tabs])
  function focus(idx: number) {
    const el = refs.current[idx]
    if (el) el.focus()
  }
  return (
    <div role="tablist" aria-label="Filtros de agendamentos" className="flex flex-nowrap gap-2 overflow-x-auto">
      {tabs.map((t, i) => {
        const isActive = t.id === activeId
        return (
          <button
            key={t.id}
            ref={el => refs.current[i] = el}
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${t.id}`}
            id={`tab-${t.id}`}
            aria-disabled={disabled ? true : undefined}
            className={`px-3 py-2 rounded border transition-colors duration-300 text-xs md:text-sm whitespace-nowrap ${isActive ? 'bg-fourtek-blue text-white' : 'bg-white hover:bg-gray-50'} ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
            onClick={() => { if (!disabled) onChange(t.id) }}
            onKeyDown={e => {
              if (disabled) return
              if (e.key === 'ArrowRight') { e.preventDefault(); focus(Math.min(i + 1, tabs.length - 1)) }
              if (e.key === 'ArrowLeft') { e.preventDefault(); focus(Math.max(i - 1, 0)) }
              if (e.key === 'Home') { e.preventDefault(); focus(0) }
              if (e.key === 'End') { e.preventDefault(); focus(tabs.length - 1) }
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChange(t.id) }
            }}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
