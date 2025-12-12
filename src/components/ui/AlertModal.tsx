import React from 'react'

interface AlertModalProps {
    isOpen: boolean
    title?: string
    message: string
    onClose: () => void
}

export function AlertModal({ isOpen, title = 'Aviso', message, onClose }: AlertModalProps) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 text-center">
                    {title}
                </h3>

                <div className="text-center text-gray-600 dark:text-gray-300 mb-6">
                    {message}
                </div>

                <div className="flex justify-center">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-black dark:bg-gray-900 text-white rounded font-medium hover:bg-gray-800 dark:hover:bg-black transition-colors"
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    )
}
