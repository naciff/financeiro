import { useMemo, useState } from 'react'
import { formatMoneyBr } from '../../utils/format'

type Props = {
    data: any[]
    history?: any[]
    showHistoryOption?: boolean
    accounts: any[]
}

export function ScheduleSummaryView({ data, history, showHistoryOption, accounts, totalBalance = 0 }: Props & { totalBalance?: number }) {
    const [showLast12Months, setShowLast12Months] = useState(false)

    const summary = useMemo(() => {
        const targetData = (showLast12Months && history) ? history : data
        // Group by Year-Month
        const groups: Record<string, any> = {}

        // Helper to get key
        const getKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

        // Filter range if "Last 12 Months" is active
        // Logic: Include Current Month + Previous 11 Months. Exclude Future beyond current month?
        // Or just take [Now - 12M, Now]? 
        // User image shows "Dez 2025" (Current) down to "Dez 2024". (13 months)
        // Let's filter <= EndOfCurrentMonth and >= StartOfCurrentMonth - 12 Months?

        let processedData = targetData
        if (showLast12Months) {
            const now = new Date()
            const start = new Date(now.getFullYear(), now.getMonth() - 12, 1) // 12 months back + current
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 0) // End of current month
            processedData = targetData.filter(d => {
                const date = new Date(d.vencimento)
                return date >= start && date <= end
            })
        }

        processedData.forEach(item => {
            if (!item.vencimento) return
            const date = new Date(item.vencimento)
            const key = getKey(date)

            if (!groups[key]) {
                groups[key] = {
                    year: date.getFullYear(),
                    month: date.getMonth(),
                    prev_aportes: 0,
                    prev_retiradas: 0,
                    // prev_orcamentos: 0,
                    prev_despesas: 0,
                    prev_receitas: 0,
                    real_pagamentos: 0,
                    real_recebimentos: 0,
                    real_aportes: 0,
                    real_retiradas: 0,
                }
            }

            const g = groups[key]
            const val = Number(item.valor || (item.receita + item.despesa))

            const isPaid = item.situacao === 2
            const op = (item.operacao || '').toLowerCase()

            if (isPaid) {
                // Realizadas
                if (op === 'despesa') g.real_pagamentos += val
                else if (op === 'receita') g.real_recebimentos += val
                else if (op === 'aporte') g.real_aportes += val
                else if (op === 'retirada') g.real_retiradas += val
            } else {
                // Previsão (Pending)
                if (op === 'despesa') g.prev_despesas += val
                else if (op === 'receita') g.prev_receitas += val
                else if (op === 'aporte') g.prev_aportes += val
                else if (op === 'retirada') g.prev_retiradas += val
                // Orçamentos? Assuming 0 for now.
            }
        })

        // 1. Convert to array and sort ASCENDING by date for cumulative calculation
        const chronologicallySorted = Object.values(groups).sort((a: any, b: any) => {
            return (a.year * 12 + a.month) - (b.year * 12 + b.month)
        })

        // 2. Calculate Cumulative Predicted Balance
        // Start from Current Balance
        let runningBalance = totalBalance

        // We need to determine if we should start adding/subtracting from the FIRST visible month or if we have past data hidden?
        // The 'summary' data usually contains strictly what is filtered. 
        // If we want "Future Prediction", we assume 'totalBalance' is the state at "Now" (or rather, the sum of all active accounts right now).
        // Any 'Pending' (Previsão) item in the list represents a future change to that balance (or past pending that hasn't happened yet).
        // So simply adding (Receita - Despesa) of Pending items to the totalBalance should work, provided we iterate correctly.

        const withBalance = chronologicallySorted.map((row: any) => {
            // Pending Net Change
            const pendingNet = (row.prev_receitas + row.prev_aportes) - (row.prev_despesas + row.prev_retiradas)

            // Update running balance
            runningBalance += pendingNet

            return { ...row, saldoPrevisto: runningBalance }
        })

        // 3. Sort DESCENDING for Display (Newest First)
        const sorted = withBalance.sort((a: any, b: any) => {
            return (b.year * 12 + b.month) - (a.year * 12 + a.month)
        })

        // Calculate Statistics & Balances
        return sorted.map((row: any) => {
            // Diferença Mês = (Prev Receitas + Real Receitas) - (Prev Despesas + Real Despesas)
            // (Receita Prev + Receita Real + Aporte Prev + Aporte Real) - (Desp Prev + Desp Real + Ret Prev + Ret Real)
            const totalIn = row.prev_receitas + row.real_recebimentos + row.prev_aportes + row.real_aportes
            const totalOut = row.prev_despesas + row.real_pagamentos + row.prev_retiradas + row.real_retiradas
            const diff = totalIn - totalOut

            const totalDesp = row.prev_despesas + row.real_pagamentos
            const pctDesp = totalDesp > 0 ? (row.real_pagamentos / totalDesp) * 100 : 0

            const totalRet = row.prev_retiradas + row.real_retiradas
            const pctRet = totalRet > 0 ? (row.real_retiradas / totalRet) * 100 : 0

            // Month name
            const monthName = new Date(row.year, row.month, 1).toLocaleString('pt-BR', { month: 'long' })
            const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1)

            // Situacao
            const now = new Date()
            const rowDate = new Date(row.year, row.month, 1)
            const isCurrent = now.getMonth() === row.month && now.getFullYear() === row.year
            const isPast = rowDate < new Date(now.getFullYear(), now.getMonth(), 1)
            const situacao = isCurrent ? 'MÊS ATUAL' : (isPast ? 'REALIZADO' : 'FUTURO')

            return {
                ...row,
                monthName: capitalizedMonth,
                situacao,
                diff,
                pctDesp,
                pctRet
            }
        })
    }, [data, history, showLast12Months, accounts, totalBalance])

    return (
        <div className="flex flex-col gap-4">
            {showHistoryOption && (
                <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <input
                            type="checkbox"
                            checked={showLast12Months}
                            onChange={e => setShowLast12Months(e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        Mostrar 12 Últimos Meses
                    </label>
                </div>
            )}

            <div className="overflow-x-auto border rounded bg-white dark:bg-gray-800 dark:border-gray-700">
                <table className="w-full text-xs text-center border-collapse">
                    <thead>
                        <tr className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-b dark:border-gray-600">
                            <th colSpan={3} className="p-1 border-r dark:border-gray-600">Referência</th>
                            <th colSpan={4} className="p-1 bg-gray-200 dark:bg-gray-600 border-r dark:border-gray-500 text-yellow-700 dark:text-yellow-400 font-bold">Previsão e Realizar</th>
                            <th colSpan={4} className="p-1 bg-teal-600 text-white border-r dark:border-gray-500">Realizadas</th>
                            <th colSpan={3} className="p-1 bg-yellow-50 dark:bg-yellow-900/30 border-r dark:border-gray-500">Estatística</th>
                            <th className="p-0 bg-white dark:bg-gray-800 border-r dark:border-gray-500 align-bottom min-w-[120px]">
                                <div className="flex flex-col w-full">
                                    <div className="bg-blue-700 text-white p-1 font-bold text-xs uppercase">Saldo Atual</div>
                                    <div className={`p-2 text-center font-bold text-xs ${totalBalance >= 0 ? 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100' : 'bg-gray-200 dark:bg-gray-600 text-red-600 dark:text-red-400'}`}>
                                        {formatMoneyBr(totalBalance)}
                                    </div>
                                </div>
                            </th>
                        </tr>
                        <tr className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-b dark:border-gray-600 font-medium text-xs">
                            <th className="p-1 border-r dark:border-gray-600">Situação</th>
                            <th className="p-1 border-r dark:border-gray-600">Ano</th>
                            <th className="p-1 border-r dark:border-gray-600">Mês Referência</th>

                            {/* Previsão */}
                            {/* Previsão */}
                            <th className="p-1 border-r dark:border-gray-600">Despesas</th>
                            <th className="p-1 border-r dark:border-gray-600 text-blue-600 dark:text-blue-400">Receitas</th>
                            <th className="p-1 border-r dark:border-gray-600">Retiradas</th>
                            <th className="p-1 border-r dark:border-gray-600">Aportes</th>

                            {/* Realizadas */}
                            {/* Realizadas */}
                            <th className="p-1 border-r dark:border-gray-600 bg-teal-50 dark:bg-teal-900/20">Pagamentos</th>
                            <th className="p-1 border-r dark:border-gray-600 bg-teal-50 dark:bg-teal-900/20">Recebimentos</th>
                            <th className="p-1 border-r dark:border-gray-600 bg-teal-50 dark:bg-teal-900/20">Retiradas</th>
                            <th className="p-1 border-r dark:border-gray-600 bg-teal-50 dark:bg-teal-900/20">Aportes</th>

                            {/* Estatística */}
                            <th className="p-1 border-r dark:border-gray-600 font-bold text-gray-800 dark:text-gray-100">Diferença Mês</th>
                            <th className="p-1 border-r dark:border-gray-600">% Despesas</th>
                            <th className="p-1 border-r dark:border-gray-600">% Retiradas</th>

                            <th className="p-1 bg-blue-100 dark:bg-blue-900/40 font-bold">Saldo Previsto</th>
                        </tr>
                    </thead>
                    <tbody className="text-xs">
                        {summary.length === 0 && (
                            <tr><td colSpan={16} className="p-4 text-center text-gray-500">Nenhum dado encontrado</td></tr>
                        )}
                        {summary.map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700 border-b dark:border-gray-700 last:border-0">
                                <td className={`p-1 border-r dark:border-gray-600 ${row.situacao === 'MÊS ATUAL' ? 'bg-blue-100 dark:bg-blue-900/50 font-bold' : (row.situacao === 'EM ATRASO' ? 'text-red-500' : '')}`}>{row.situacao}</td>
                                <td className="p-1 border-r dark:border-gray-600 text-red-500">{row.year}</td>
                                <td className="p-1 border-r dark:border-gray-600 text-red-500">{row.monthName}</td>

                                {/* Previsão */}
                                {/* Previsão */}
                                <td className="p-1 border-r dark:border-gray-600 text-right text-red-600">{row.prev_despesas > 0 ? formatMoneyBr(row.prev_despesas) : '0,00'}</td>
                                <td className="p-1 border-r dark:border-gray-600 text-right text-blue-600">{row.prev_receitas > 0 ? formatMoneyBr(row.prev_receitas) : '0,00'}</td>
                                <td className="p-1 border-r dark:border-gray-600 text-right">{row.prev_retiradas > 0 ? formatMoneyBr(row.prev_retiradas) : '0,00'}</td>
                                <td className="p-1 border-r dark:border-gray-600 text-right">{row.prev_aportes > 0 ? formatMoneyBr(row.prev_aportes) : '0,00'}</td>

                                {/* Realizadas */}
                                {/* Realizadas */}
                                <td className="p-1 border-r dark:border-gray-600 text-right bg-teal-50 dark:bg-teal-900/10 text-teal-700 dark:text-teal-400">{row.real_pagamentos > 0 ? formatMoneyBr(row.real_pagamentos) : '0,00'}</td>
                                <td className="p-1 border-r dark:border-gray-600 text-right bg-teal-50 dark:bg-teal-900/10 text-teal-700 dark:text-teal-400">{row.real_recebimentos > 0 ? formatMoneyBr(row.real_recebimentos) : '0,00'}</td>
                                <td className="p-1 border-r dark:border-gray-600 text-right bg-teal-50 dark:bg-teal-900/10 text-teal-700 dark:text-teal-400">{row.real_retiradas > 0 ? formatMoneyBr(row.real_retiradas) : '0,00'}</td>
                                <td className="p-1 border-r dark:border-gray-600 text-right bg-teal-50 dark:bg-teal-900/10 text-teal-700 dark:text-teal-400">{row.real_aportes > 0 ? formatMoneyBr(row.real_aportes) : '0,00'}</td>

                                {/* Estatística */}
                                <td className={`p-1 border-r dark:border-gray-600 text-right font-medium ${row.diff >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{formatMoneyBr(row.diff)}</td>
                                <td className="p-1 border-r dark:border-gray-600 text-right">%{row.pctDesp.toFixed(2)}</td>
                                <td className="p-1 border-r dark:border-gray-600 text-right">%{row.pctRet.toFixed(2)}</td>

                                <td className={`p-1 bg-blue-50 dark:bg-blue-900/20 text-right font-bold ${row.saldoPrevisto >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                    {formatMoneyBr(row.saldoPrevisto)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
