import { useState, useEffect } from 'react'
import { Icon } from '../ui/Icon'
import { formatMoneyBr } from '../../utils/format'

type Props = {
    isOpen: boolean
    title?: string
    item: any
    currentValue?: number
    onClose: () => void
    onConfirm: (data: { valor: number, action: 'keep_open' | 'finalize' }) => void
}

export function PartialConfirmModal({ isOpen, title = 'Registro Parcial', item, currentValue, onClose, onConfirm }: Props) {
    const [action, setAction] = useState<'keep_open' | 'finalize'>('keep_open')
    // Use the passed currentValue (entered in TransactionModal) or fallback to item value
    // This value is strictly for display/confirmation and is read-only here.
    const displayValue = currentValue !== undefined ? currentValue : (item.despesa || item.receita || 0)

    useEffect(() => {
        if (isOpen) {
            setAction('keep_open')
        }
    }, [isOpen])

    if (!isOpen) return null

    const handleConfirm = () => {
        onConfirm({ valor: displayValue, action })
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-[500px] overflow-hidden border dark:border-gray-700">

                {/* Header Style matching BulkTransactionModal */}
                <div className="bg-white dark:bg-gray-900 p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {title}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                        <Icon name="x" className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 bg-white dark:bg-gray-800">
                    <div className="flex gap-6 items-start">
                        {/* Left: Value Input (Read-Only) */}
                        <div className="w-[140px]">
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">VALOR</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">R$</span>
                                <input
                                    type="text"
                                    disabled
                                    className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-right pr-3 py-2 text-base font-bold text-gray-800 dark:text-gray-100 focus:outline-none rounded"
                                    value={formatMoneyBr(displayValue)}
                                />
                            </div>
                        </div>

                        {/* Right: Radio Options */}
                        <div className="flex flex-col gap-4 mt-1">
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:opacity-80 transition-opacity">
                                <div className={`w-4 h-4 rounded-full border border-gray-400 flex items-center justify-center ${action === 'keep_open' ? 'border-blue-600 bg-white' : 'bg-white'}`}>
                                    {action === 'keep_open' && <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>}
                                </div>
                                <input
                                    type="radio"
                                    name="partial_action"
                                    checked={action === 'keep_open'}
                                    onChange={() => setAction('keep_open')}
                                    className="hidden"
                                />
                                Manter Agendamento Aberto
                            </label>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:opacity-80 transition-opacity">
                                <div className={`w-4 h-4 rounded-full border border-gray-400 flex items-center justify-center ${action === 'finalize' ? 'border-blue-600 bg-white' : 'bg-white'}`}>
                                    {action === 'finalize' && <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>}
                                </div>
                                <input
                                    type="radio"
                                    name="partial_action"
                                    checked={action === 'finalize'}
                                    onChange={() => setAction('finalize')}
                                    className="hidden"
                                />
                                Finalizar Agendamento
                            </label>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <button
                        className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors"
                        onClick={onClose}
                    >
                        Cancelar
                    </button>
                    <button
                        className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white text-sm font-medium shadow-sm transition-colors flex items-center gap-2"
                        onClick={handleConfirm}
                    >
                        Confirmar
                    </button>
                </div>

            </div>
        </div>
    )
}
