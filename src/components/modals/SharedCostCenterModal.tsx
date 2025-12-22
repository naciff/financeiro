import { useState, useEffect } from 'react'
import { Icon } from '../ui/Icon'
import { listCostCenters } from '../../services/db'
import { useAppStore } from '../../store/AppStore'

interface SharedCostCenterModalProps {
    onClose: () => void
    onConfirm: (selectedIds: string[]) => void
    totalValue: number
}

export function SharedCostCenterModal({ onClose, onConfirm, totalValue }: SharedCostCenterModalProps) {
    const store = useAppStore()
    const [centers, setCenters] = useState<{ id: string; descricao: string }[]>([])
    const [selected, setSelected] = useState<Record<string, boolean>>({})

    useEffect(() => {
        if (store.activeOrganization) {
            listCostCenters(store.activeOrganization).then(res => {
                if (res.data) {
                    // Filter out shared cost centers to avoid recursion?
                    // Or user might want to pick another shared one?
                    // Usually shared centers shouldn't be targets of a split.
                    // Let's filter out ones marked as 'compartilhado' if possible, but the type might not be fully inferred yet.
                    // We'll just show all for now or filter in UI.
                    setCenters(res.data.filter((c: any) => !c.compartilhado))
                }
            })
        }
    }, [store.activeOrganization])

    const selectedIds = Object.keys(selected).filter(k => selected[k])
    const shareValue = selectedIds.length > 0 ? totalValue / selectedIds.length : 0

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md flex flex-col max-h-[80vh]">
                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">Dividir Centro de Custo</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200">
                        <Icon name="x" className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 flex-1 overflow-y-auto">
                    <div className="mb-4 text-sm text-gray-600 dark:text-gray-300">
                        Selecione os centros de custo para dividir o valor total de <b>{totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</b>.
                    </div>

                    <div className="space-y-2">
                        {centers.map(center => (
                            <label key={center.id} className="flex items-center gap-3 p-3 rounded border dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="w-5 h-5 text-blue-600 rounded"
                                    checked={!!selected[center.id]}
                                    onChange={e => setSelected(prev => ({ ...prev, [center.id]: e.target.checked }))}
                                />
                                <span className="text-gray-900 dark:text-gray-100 flex-1">{center.descricao}</span>
                                {selected[center.id] && (
                                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                                        {shareValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </span>
                                )}
                            </label>
                        ))}
                    </div>
                </div>

                <div className="p-4 border-t dark:border-gray-700 flex justify-end gap-2">
                    <button
                        className="px-4 py-2 rounded border dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={onClose}
                    >
                        Cancelar
                    </button>
                    <button
                        className="px-4 py-2 rounded bg-black dark:bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
                        disabled={selectedIds.length === 0}
                        onClick={() => onConfirm(selectedIds)}
                    >
                        Confirmar ({selectedIds.length})
                    </button>
                </div>
            </div>
        </div>
    )
}
