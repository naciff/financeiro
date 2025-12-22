import React from 'react'
import { useLayout } from '../../context/LayoutContext'

export function Footer() {
  const { settings } = useLayout()

  if (!settings.footer.visible) return null

  return (
    <footer
      role="contentinfo"
      aria-label="Rodapé"
      className={`bg-white dark:bg-gray-800 border-t dark:border-gray-700 h-12 flex items-center px-8 text-[0.8rem] text-[#808080] dark:text-gray-400 shrink-0 transition-colors duration-200 ${settings.footer.position === 'fixed' ? 'fixed bottom-0 w-full z-20 shadow-md' : settings.footer.position === 'sticky' ? 'sticky bottom-0 z-10' : ''}`}
    >
      <div className="w-full flex items-center justify-between">
        <span>© 2026 ContaMestre</span>

        <div className="flex items-center gap-4 text-xs font-medium">
          <span className="text-gray-400">Versão {__APP_VERSION__}</span>
          <button onClick={() => window.open('/privacy', '_blank')} className="hover:text-primary transition-colors">Privacidade</button>
          <button onClick={() => window.open('/terms', '_blank')} className="hover:text-primary transition-colors">Termos</button>
          <button className="hover:text-primary transition-colors">Suporte</button>
        </div>
      </div>
    </footer>
  )
}
