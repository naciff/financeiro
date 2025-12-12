import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { MonthlyData } from '../../hooks/useChartData'
import { formatCurrency } from '../../utils/formatCurrency'

interface MonthlyEvolutionChartProps {
    data: MonthlyData[]
}

export function MonthlyEvolutionChart({ data }: MonthlyEvolutionChartProps) {
    // Custom tooltip component
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
                    <p className="font-semibold text-gray-800 dark:text-gray-100 mb-2">{payload[0].payload.mes}</p>
                    <div className="space-y-1">
                        <p className="text-sm text-green-600 dark:text-green-400">
                            Receitas: <span className="font-bold">R$ {formatCurrency(payload[0].value)}</span>
                        </p>
                        <p className="text-sm text-red-600 dark:text-red-400">
                            Despesas: <span className="font-bold">R$ {formatCurrency(payload[1].value)}</span>
                        </p>
                        <p className="text-sm text-blue-600 dark:text-blue-400">
                            Lucro: <span className="font-bold">R$ {formatCurrency(payload[2].value)}</span>
                        </p>
                    </div>
                </div>
            )
        }
        return null
    }

    return (
        <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-6">
            {/* Chart updated to BarChart */}
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Evolução Mensal</h2>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                    <XAxis
                        dataKey="mes"
                        stroke="#6B7280"
                        style={{ fontSize: '12px' }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        stroke="#6B7280"
                        style={{ fontSize: '12px' }}
                        tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                        wrapperStyle={{ fontSize: '14px', paddingTop: '20px' }}
                        formatter={(value) => {
                            if (value === 'receitas') return 'Receitas'
                            if (value === 'despesas') return 'Despesas'
                            if (value === 'lucro') return 'Lucro Líquido'
                            return value
                        }}
                    />
                    <Bar
                        dataKey="receitas"
                        fill="#10B981"
                        radius={[4, 4, 0, 0]}
                        name="receitas"
                    />
                    <Bar
                        dataKey="despesas"
                        fill="#EF4444"
                        radius={[4, 4, 0, 0]}
                        name="despesas"
                    />
                    <Bar
                        dataKey="lucro"
                        fill="#3B82F6"
                        radius={[4, 4, 0, 0]}
                        name="lucro"
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}
