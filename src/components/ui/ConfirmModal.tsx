import React from 'react'
import { Icon } from './Icon'

interface ConfirmModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    title?: string
    message: string
    children?: React.ReactNode
}

export function ConfirmModal({ isOpen, onClose, onConfirm, title = 'Confirmação', message, children }: ConfirmModalProps) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm rounded">
            <div className="relative bg-white dark:bg-gray-800 border dark:border-gray-700 rounded shadow-lg p-6 w-[300px] text-center">
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                >
                    <Icon name="x" className="w-4 h-4" />
                </button>
                <h3 className="font-semibold text-lg mb-4 text-gray-800 dark:text-gray-100">{title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">{message}</p>
                {children}
                <div className="flex justify-center gap-3">
                    <button
                        className="px-4 py-2 rounded border dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-200"
                        onClick={onClose}
                    >
                        Não
                    </button>
                    <button
                        className="px-4 py-2 rounded bg-black dark:bg-gray-900 text-white hover:bg-gray-800 dark:hover:bg-black text-sm"
                        onClick={onConfirm}
                    >
                        Sim
                    </button>
                </div>
            </div>
        </div>
    )
}
