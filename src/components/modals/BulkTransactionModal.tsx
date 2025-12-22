import { useState, useMemo, useEffect } from 'react'
import { Icon } from '../ui/Icon'
import { formatMoneyBr } from '../../utils/format'
import { FloatingLabelInput } from '../ui/FloatingLabelInput'
import { FloatingLabelSelect } from '../ui/FloatingLabelSelect'

type Props = {
    isOpen: boolean
    onClose: () => void
    onConfirm: (data: { date: string, accountId: string, total: number }) => void
    items: any[]
    accounts: any[]
}

export function BulkTransactionModal({ isOpen, onClose, onConfirm, items, accounts }: Props) {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [accountId, setAccountId] = useState('')

    // Initialize account with the first item's account if available, or just empty
    useEffect(() => {
        if (isOpen && items.length > 0) {
            // Try to find a common account or default to the first one's preference?
            // The screenshot shows "Caixa de Lançamento" selected.
            if (items[0].caixaId) setAccountId(items[0].caixaId)
            else if (items[0].conta_id) setAccountId(items[0].conta_id)
        }
    }, [isOpen, items])

    const totalItems = useMemo(() => {
        return items.reduce((acc, item) => acc + (item.receita || 0) + (item.despesa || 0), 0) // Sum of absolute values essentially, strictly looking at what will be registered
    }, [items])

    // In the screenshot "Total à Registrar" seems to be the same as Total Items initially
    // We could allow editing, but for now let's keep it derived.
    const totalToRegister = totalItems

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh] overflow-hidden border dark:border-gray-700">

                {/* Header Style mimicking the screenshot (Green check, bold title, gradient background?) */}
                {/* Using a clean modern interpretation of the "Header bar" */}
                <div className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 p-3 border-b border-gray-300 dark:border-gray-700 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 shadow-sm ml-2">
                            Confirmação de Registro do(s) Item(s)
                        </h2>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded border border-gray-300 dark:border-gray-600 transition-colors font-medium text-sm"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => onConfirm({ date, accountId, total: totalToRegister })}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors font-medium text-sm shadow-sm"
                        >
                            Confirmar
                        </button>
                    </div>
                </div>

                {/* Top Form Section */}
                <div className="p-4 bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">

                        {/* Data de Registro */}
                        <div className="md:col-span-2">
                            <FloatingLabelInput
                                label="Data de Registro"
                                id="date"
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                            />
                        </div>

                        {/* Caixa de Lançamento */}
                        <div className="md:col-span-4">
                            <FloatingLabelSelect
                                label="Caixa de Lançamento"
                                id="account"
                                value={accountId}
                                onChange={e => setAccountId(e.target.value)}
                                disabled={true}
                            >
                                <option value="" className="dark:bg-gray-800">Selecione...</option>
                                {accounts.map(acc => (
                                    <option key={acc.id} value={acc.id} className="dark:bg-gray-800">{acc.nome}</option>
                                ))}
                            </FloatingLabelSelect>
                        </div>

                        {/* Totals */}
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 border-b border-gray-300 dark:border-gray-600 pb-0.5 w-full">
                                Total do(s) Item(s)
                            </label>
                            <div className="bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 px-2 py-1 text-sm font-bold text-right text-gray-700 dark:text-gray-200 rounded">
                                R$ {formatMoneyBr(totalItems)}
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 border-b border-gray-300 dark:border-gray-600 pb-0.5 w-full">
                                Total à Registrar
                            </label>
                            <div className="bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 px-2 py-1 text-sm font-bold text-right text-gray-700 dark:text-gray-200 rounded">
                                R$ {formatMoneyBr(totalToRegister)}
                            </div>
                        </div>

                        {/* Checkbox Placeholder from screenshot */}
                        <div className="md:col-span-2 flex flex-col justify-end pb-1">
                            <label className="flex items-center gap-1 text-[10px] text-gray-600 dark:text-gray-400 whitespace-nowrap cursor-not-allowed opacity-60">
                                <input type="checkbox" disabled className="rounded border-gray-300 w-3 h-3" />
                                Itens Individuais/Agrupado?
                            </label>
                            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600"></div>
                        </div>
                    </div>
                </div>

                {/* List Section Header */}
                <div className="px-4 py-2 bg-white dark:bg-gray-800 border-b dark:border-gray-700 flex items-center">
                    <span className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wide">
                        Registro(s) à Confirmar
                    </span>
                    <div className="flex-1 border-b border-gray-200 dark:border-gray-700 ml-2 relative top-1"></div>
                </div>

                {/* List Content */}
                <div className="flex-1 overflow-y-auto bg-gray-100 dark:bg-gray-900 p-4">
                    <div className="space-y-2">
                        {/* Table Header like */}
                        <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400 px-1">
                            <div className="col-span-4">Favorecido</div>
                            <div className="col-span-3">Compromisso</div>
                            <div className="col-span-2">Vencimento</div>
                            <div className="col-span-3 text-right">Valor Item</div>
                        </div>

                        {items.map((item, idx) => (
                            <div key={item.id || idx} className="grid grid-cols-12 gap-2 items-center bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 p-1.5 rounded shadow-sm">
                                <div className="col-span-4">
                                    <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 px-2 py-1 text-xs text-gray-700 dark:text-gray-200 h-8 truncate">
                                        {item.cliente || item.favorecido || 'Sem Favorecido'}
                                    </div>
                                </div>
                                <div className="col-span-3">
                                    <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 px-2 py-1 text-xs text-gray-700 dark:text-gray-200 h-8 truncate">
                                        {item.compromisso || 'Sem Compromisso'}
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 px-2 py-1 text-xs text-gray-700 dark:text-gray-200 h-8 justify-center">
                                        {item.vencimentoBr}
                                    </div>
                                </div>
                                <div className="col-span-3">
                                    <div className="flex items-center justify-end border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 px-2 py-1 text-xs font-bold text-gray-700 dark:text-gray-200 h-8">
                                        R$ {formatMoneyBr(item.receita > 0 ? item.receita : item.despesa)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

            {/* Footer removed as buttons moved to header */}
        </div>
    )
}
