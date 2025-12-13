import React from 'react'

export function Footer() {
  return (
    <footer
      role="contentinfo"
      aria-label="Rodapé"
      className="bg-white dark:bg-gray-800 border-t dark:border-gray-700 h-12 flex items-center px-8 text-[0.8rem] text-[#808080] dark:text-gray-400 shrink-0 transition-colors duration-200"
    >
      <div className="w-full flex items-center justify-center relative">
        <span>@2026 ContaMestre</span>
        <span className="absolute right-0">Versão {__APP_VERSION__}</span>
      </div>
    </footer>
  )
}
