import React, { useState, useEffect } from 'react'
import { Icon } from '../ui/Icon'

interface DashboardCustomizeModalProps {
    isOpen: boolean
    onClose: () => void
    initialSelection: string[]
    onSave: (selectedIds: string[]) => void
    availableWidgets: { id: string; label: string }[]
}

export function DashboardCustomizeModal({ isOpen, onClose, initialSelection, onSave, availableWidgets }: DashboardCustomizeModalProps) {
    const [selected, setSelected] = useState<string[]>([])

    useEffect(() => {
        if (isOpen) {
            setSelected(initialSelection)
        }
    }, [isOpen, initialSelection])

    if (!isOpen) return null

    const handleToggle = (id: string) => {
        if (selected.includes(id)) {
            // Check minimum limit (8)
            if (selected.length <= 8) {
                // Ideally show a toast or alert, but for now just block
                return
            }
            setSelected(prev => prev.filter(item => item !== id))
        } else {
            // Check maximum limit (10)
            if (selected.length >= 10) {
                return
            }
            setSelected(prev => [...prev, id])
        }
    }

    const handleSave = () => {
        onSave(selected)
        onClose()
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg shadow-lg w-full max-w-md p-6 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-text-muted-light dark:text-text-muted-dark hover:text-text-main-light dark:hover:text-text-main-dark transition-colors"
                >
                    <Icon name="x" className="w-5 h-5" />
                </button>

                <h2 className="text-xl font-bold text-text-main-light dark:text-text-main-dark mb-4">
                    Customizar Dashboard
                </h2>

                <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-6">
                    Selecione entre 8 e 10 cards para exibir no seu dashboard.<br />
                    Atualmente selecionado: {selected.length}
                </p>

                <div className="space-y-3 max-h-[60vh] overflow-y-auto mb-6 pr-2">
                    {availableWidgets.map(widget => {
                        const isSelected = selected.includes(widget.id)
                        const isDisabled = (isSelected && selected.length <= 8) || (!isSelected && selected.length >= 10)

                        return (
                            <div
                                key={widget.id}
                                onClick={() => handleToggle(widget.id)}
                                className={`
                                    flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all
                                    ${isSelected
                                        ? 'bg-primary/10 border-primary block'
                                        : 'bg-transparent border-border-light dark:border-border-dark opacity-70 hover:opacity-100'
                                    }
                                    ${isDisabled && !isSelected ? 'opacity-40 cursor-not-allowed' : ''}
                                `}
                            >
                                <span className="text-sm font-medium text-text-main-light dark:text-text-main-dark">
                                    {widget.label}
                                </span>
                                <div className={`
                                    w-5 h-5 rounded border flex items-center justify-center
                                    ${isSelected
                                        ? 'bg-primary border-primary text-white'
                                        : 'border-text-muted-light dark:border-text-muted-dark'
                                    }
                                `}>
                                    {isSelected && <Icon name="check" className="w-3.5 h-3.5" />}
                                </div>
                            </div>
                        )
                    })}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border-light dark:border-border-dark">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-text-muted-light dark:text-text-muted-dark hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={selected.length < 8 || selected.length > 10}
                        className="px-4 py-2 text-sm bg-primary text-white rounded hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Salvar
                    </button>
                </div>
            </div>
        </div>
    )
}
