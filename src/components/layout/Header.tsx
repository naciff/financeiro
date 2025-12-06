import React from 'react'

export function Header({ onMenuToggle }: { onMenuToggle: () => void }) {
  return (
    <header className="md:hidden fixed top-0 left-0 right-0 h-12 bg-white border-b flex items-center justify-between px-3 z-40">
      <button aria-label="Abrir menu" aria-expanded="false" aria-controls="mobile-sidebar" className="p-2 rounded hover:bg-gray-100" onClick={onMenuToggle}>
        <span className="block w-5 h-0.5 bg-black mb-1"></span>
        <span className="block w-5 h-0.5 bg-black mb-1"></span>
        <span className="block w-5 h-0.5 bg-black"></span>
      </button>
      <div className="font-semibold">Financeiro</div>
      <div className="w-6" aria-hidden="true"></div>
    </header>
  )
}
