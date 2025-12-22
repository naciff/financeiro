import React from 'react'

export function LoadingSpinner() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] w-full animate-in fade-in duration-300">
            <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-600 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-500 dark:text-gray-400 font-medium">Carregando...</p>
        </div>
    )
}
