import React from 'react'

interface ConfirmModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    title?: string
    message: string
}

export function ConfirmModal({ isOpen, onClose, onConfirm, title = 'Confirmação', message }: ConfirmModalProps) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-sm rounded">
            <div className="bg-white border rounded shadow-lg p-6 w-[300px] text-center">
                <h3 className="font-semibold text-lg mb-4 text-gray-800">{title}</h3>
                <p className="text-sm text-gray-600 mb-6">{message}</p>
                <div className="flex justify-center gap-3">
                    <button
                        className="px-4 py-2 rounded border hover:bg-gray-50 text-sm"
                        onClick={onClose}
                    >
                        Não
                    </button>
                    <button
                        className="px-4 py-2 rounded bg-black text-white hover:bg-gray-800 text-sm"
                        onClick={onConfirm}
                    >
                        Sim
                    </button>
                </div>
            </div>
        </div>
    )
}
