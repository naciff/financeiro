import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { ExpenseByGroup } from '../../hooks/useChartData'
import { formatCurrency } from '../../utils/formatCurrency'

import { useAppStore } from '../../store/AppStore'

interface ExpensesBarChartProps {
    data: ExpenseByGroup[]
    onGroupClick?: (group: ExpenseByGroup) => void
}

export function ExpensesBarChart({ data, onGroupClick }: ExpensesBarChartProps) {
    const { showValues } = useAppStore()
    // Custom tooltip
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload
            return (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
                    <p className="font-semibold text-gray-800 dark:text-gray-100 mb-1">{data.grupo}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        Valor: <span className="font-bold">{showValues ? `R$ ${formatCurrency(data.valor)}` : '*****'}</span>
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        Percentual: <span className="font-bold">{showValues ? `${data.percentual}%` : '*****'}</span>
                    </p>
                </div>
            )
        }
        return null
    }

    if (data.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Despesas por Grupo de Compromisso</h2>
                <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                    Nenhuma despesa encontrada
                </div>
            </div>
        )
    }

    return (
        <div className="h-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis
                        type="category"
                        dataKey="grupo"
                        width={150}
                        tick={{ fontSize: 12 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="valor" radius={[0, 4, 4, 0]} onClick={(data) => {
                        if (onGroupClick && data && data.payload) {
                            onGroupClick(data.payload)
                        }
                    }} style={{ cursor: onGroupClick ? 'pointer' : 'default' }}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.cor} cursor={onGroupClick ? "pointer" : "default"} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}
