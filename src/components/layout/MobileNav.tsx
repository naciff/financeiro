import { Link, useLocation } from 'react-router-dom'
import { Icon } from '../ui/Icon'

export function MobileNav({ onMore }: { onMore: () => void }) {
    const location = useLocation()

    const items = [
        { to: '/dashboard', label: 'Dashboard', icon: 'grid' },
        { to: '/calendar', label: 'Calendário', icon: 'calendar' },
        { to: '/schedules/control', label: 'Controle', icon: 'speed' },
        { to: '/ledger', label: 'Livro Caixa', icon: 'book' },
    ]

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 pb-safe pb-4 pt-2 px-2 flex justify-between items-center z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
            {items.map(item => {
                const isActive = location.pathname === item.to
                return (
                    <Link
                        key={item.to}
                        to={item.to}
                        className={`flex flex-col items-center gap-1 min-w-[60px] p-1 rounded-lg transition-colors ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                    >
                        <Icon name={item.icon} className="w-6 h-6" />
                        <span className="text-[10px] font-medium">{item.label}</span>
                    </Link>
                )
            })}

            <button
                onClick={onMore}
                className="flex flex-col items-center gap-1 min-w-[60px] p-1 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
                <Icon name="menu" className="w-6 h-6" />
                <span className="text-[10px] font-medium">Mais</span>
            </button>
        </div>
    )
}
