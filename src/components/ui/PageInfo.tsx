import { useState, useRef, useEffect } from 'react'

export function PageInfo({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [ref])

    return (
        <div className="relative inline-block" ref={ref}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors p-1"
                title="Informações da tela"
            >
                <span className="material-icons-outlined text-xl">info</span>
            </button>

            {isOpen && (
                <div className="absolute right-0 top-8 z-50 w-72 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300">
                    <div className="absolute top-0 right-3 -mt-2 w-4 h-4 bg-white dark:bg-gray-800 border-t border-l border-gray-200 dark:border-gray-700 transform rotate-45"></div>
                    {children}
                </div>
            )}
        </div>
    )
}
