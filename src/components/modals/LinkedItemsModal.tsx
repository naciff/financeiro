import React from 'react'
import { Icon } from '../ui/Icon'
import { formatMoneyBr } from '../../utils/format'

interface LinkedItemsModalProps {
    isOpen: boolean
    items: any[]
    onClose: () => void
}

export function LinkedItemsModal({ isOpen, items, onClose }: LinkedItemsModalProps) {
    if (!isOpen) return null

    // Calculate totals
    const totalReceita = items.filter((i: any) => i.operacao === 'receita').reduce((gym, i) => gym + Number(i.valor_total || i.valor), 0)
    const totalDespesa = items.filter((i: any) => i.operacao === 'despesa').reduce((gym, i) => gym + Number(i.valor_total || i.valor), 0)

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <Icon name="list" className="w-5 h-5 text-gray-500" />
                        Itens Vinculados ao Agendamento
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                        <Icon name="x" className="w-5 h-5" />
                    </button>
                </div>

                <div className="overflow-auto flex-1 p-4">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 font-semibold sticky top-0">
                            <tr>
                                <th className="px-3 py-2">Data Venc.</th>
                                <th className="px-3 py-2">Descrição</th>
                                <th className="px-3 py-2">Caixa/Conta</th>
                                <th className="px-3 py-2 text-right">Valor</th>
                                <th className="px-3 py-2 text-center">Situação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {items.map((item, idx) => {
                                const isPaid = item.situacao === 2
                                const isLate = !isPaid && new Date(item.data_vencimento) < new Date()
                                const valor = Number(item.valor_total || item.valor)
                                return (
                                    <tr key={item.id || idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-3 py-2 whitespace-nowrap">
                                            {item.data_vencimento ? new Date(item.data_vencimento).toLocaleDateString('pt-BR') : '-'}
                                        </td>
                                        <td className="px-3 py-2">{item.historico || item.nome || '-'}</td>
                                        <td className="px-3 py-2">{item.caixa?.nome || '-'}</td>
                                        <td className="px-3 py-2 text-right font-medium">
                                            <span className={item.operacao === 'receita' ? 'text-green-600' : 'text-red-600'}>
                                                R$ {formatMoneyBr(valor)}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            {isPaid ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                    Liquidado
                                                </span>
                                            ) : isLate ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                                    Atrasado
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                    Aberto
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                            {items.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-3 py-8 text-center text-gray-500">Nenhum item encontrado.</td>
                                </tr>
                            )}
                        </tbody>
                        <tfoot className="bg-gray-50 dark:bg-gray-900 font-semibold border-t dark:border-gray-700">
                            <tr>
                                <td colSpan={3} className="px-3 py-2 text-right">Totais:</td>
                                <td className="px-3 py-2 text-right text-green-600 whitespace-nowrap">Rec: {formatMoneyBr(totalReceita)}</td>
                                <td className="px-3 py-2 text-center text-red-600 whitespace-nowrap pl-0 text-right">Desp: {formatMoneyBr(totalDespesa)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div className="p-4 border-t dark:border-gray-700 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 transition-colors">
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    )
}
