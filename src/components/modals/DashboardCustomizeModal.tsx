import React, { useState, useEffect } from 'react'
import { Icon } from '../ui/Icon'

interface DashboardCustomizeModalProps {
    isOpen: boolean
    onClose: () => void
    initialSelection: string[]
    initialCharts: string[]
    onSave: (selectedWidgets: string[], selectedCharts: string[]) => void
    availableWidgets: { id: string; label: string }[]
    availableCharts: { id: string; label: string }[]
}

export function DashboardCustomizeModal({ isOpen, onClose, initialSelection, initialCharts, onSave, availableWidgets, availableCharts }: DashboardCustomizeModalProps) {
    const [selectedWidgets, setSelectedWidgets] = useState<string[]>([])
    const [selectedCharts, setSelectedCharts] = useState<string[]>([])

    useEffect(() => {
        if (isOpen) {
            setSelectedWidgets(initialSelection)
            setSelectedCharts(initialCharts)
        }
    }, [isOpen, initialSelection, initialCharts])

    if (!isOpen) return null

    const toggleWidget = (id: string) => {
        if (selectedWidgets.includes(id)) {
            if (selectedWidgets.length <= 8) return
            setSelectedWidgets(prev => prev.filter(item => item !== id))
        } else {
            if (selectedWidgets.length >= 10) return
            setSelectedWidgets(prev => [...prev, id])
        }
    }

    const toggleChart = (id: string) => {
        if (selectedCharts.includes(id)) {
            setSelectedCharts(prev => prev.filter(item => item !== id))
        } else {
            if (selectedCharts.length >= 2) return // Limit to 2 charts
            setSelectedCharts(prev => [...prev, id])
        }
    }

    const handleSave = () => {
        onSave(selectedWidgets, selectedCharts)
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

                <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-4">
                    Selecione entre 8 e 10 cards e até 2 gráficos.
                </p>

                <div className="space-y-6 max-h-[60vh] overflow-y-auto mb-6 pr-2">
                    <div>
                        <h3 className="text-sm font-bold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider mb-3">
                            Cards de Métricas ({selectedWidgets.length}/10)
                        </h3>
                        <div className="space-y-2">
                            {availableWidgets.map(widget => {
                                const isSelected = selectedWidgets.includes(widget.id)
                                const isDisabled = (isSelected && selectedWidgets.length <= 8) || (!isSelected && selectedWidgets.length >= 10)

                                return (
                                    <div
                                        key={widget.id}
                                        onClick={() => toggleWidget(widget.id)}
                                        className={`
                                            flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all
                                            ${isSelected
                                                ? 'bg-primary/10 border-primary'
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
                    </div>

                    <div>
                        <h3 className="text-sm font-bold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider mb-3">
                            Gráficos ({selectedCharts.length}/2)
                        </h3>
                        <div className="space-y-2">
                            {availableCharts.map(chart => {
                                const isSelected = selectedCharts.includes(chart.id)
                                const isDisabled = !isSelected && selectedCharts.length >= 2

                                return (
                                    <div
                                        key={chart.id}
                                        onClick={() => toggleChart(chart.id)}
                                        className={`
                                            flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all
                                            ${isSelected
                                                ? 'bg-blue-500/10 border-blue-500'
                                                : 'bg-transparent border-border-light dark:border-border-dark opacity-70 hover:opacity-100'
                                            }
                                            ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}
                                        `}
                                    >
                                        <span className="text-sm font-medium text-text-main-light dark:text-text-main-dark">
                                            {chart.label}
                                        </span>
                                        <div className={`
                                            w-5 h-5 rounded border flex items-center justify-center
                                            ${isSelected
                                                ? 'bg-blue-500 border-blue-500 text-white'
                                                : 'border-text-muted-light dark:border-text-muted-dark'
                                            }
                                        `}>
                                            {isSelected && <Icon name="check" className="w-3.5 h-3.5" />}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
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
                        disabled={selectedWidgets.length < 8 || selectedWidgets.length > 10}
                        className="px-4 py-2 text-sm bg-primary text-white rounded hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Salvar
                    </button>
                </div>
            </div>
        </div>
    )
}
