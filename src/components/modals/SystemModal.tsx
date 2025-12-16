import React, { useEffect } from 'react'

type SystemModalProps = {
    title: string
    message: string
    isOpen: boolean
    onClose: () => void
    onConfirm?: () => void
    type?: 'alert' | 'confirm' | 'error' | 'success'
    confirmText?: string
    cancelText?: string
}

export function SystemModal({
    title,
    message,
    isOpen,
    onClose,
    onConfirm,
    type = 'alert',
    confirmText = 'OK',
    cancelText = 'Cancelar'
}: SystemModalProps) {

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        if (isOpen) window.addEventListener('keydown', handleEscape)
        return () => window.removeEventListener('keydown', handleEscape)
    }, [isOpen, onClose])

    if (!isOpen) return null

    // Styling based on type
    const isError = type === 'error'
    const isSuccess = type === 'success'

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm transform transition-all scale-100 animate-scale-in border border-gray-100 dark:border-gray-700">
                <div className="p-6 text-center">
                    {/* Icon/Header */}
                    {isSuccess && (
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600 dark:text-green-400">
                            <span className="material-icons-outlined text-2xl">check</span>
                        </div>
                    )}
                    {isError && (
                        <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-400">
                            <span className="material-icons-outlined text-2xl">error_outline</span>
                        </div>
                    )}

                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        {title}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                        {message}
                    </p>

                    <div className="flex gap-3 justify-center">
                        {type === 'confirm' && (
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                {cancelText}
                            </button>
                        )}

                        <button
                            onClick={() => {
                                if (onConfirm) onConfirm()
                                onClose() // Default valid, user can override if needed but simpler here
                            }}
                            className={`px-6 py-2 text-sm font-medium text-white rounded-lg shadow-sm transition-all transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2
                ${isError ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' :
                                    isSuccess ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' :
                                        'bg-[#014d6d] hover:bg-[#013c55] focus:ring-[#014d6d]'
                                }`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
