import React from 'react'

export function Footer() {
  return (
    <footer
      role="contentinfo"
      aria-label="Rodapé"
      className="fixed bottom-0 left-0 right-0 bg-white border-t h-12 flex items-center px-4 text-[0.8rem] text-[#808080]"
    >
      <div className="mx-auto w-full max-w-6xl flex items-center justify-center relative">
        <span>@2026 ContaMestre</span>
        <span className="absolute right-0">Versão {__APP_VERSION__}</span>
      </div>
    </footer>
  )
}
