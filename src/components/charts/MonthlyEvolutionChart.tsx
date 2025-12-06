import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
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
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                    <p className="font-semibold text-gray-800 mb-2">{payload[0].payload.mes}</p>
                    <div className="space-y-1">
                        <p className="text-sm text-green-600">
                            Receitas: <span className="font-bold">R$ {formatCurrency(payload[0].value)}</span>
                        </p>
                        <p className="text-sm text-red-600">
                            Despesas: <span className="font-bold">R$ {formatCurrency(payload[1].value)}</span>
                        </p>
                        <p className="text-sm text-blue-600">
                            Lucro: <span className="font-bold">R$ {formatCurrency(payload[2].value)}</span>
                        </p>
                    </div>
                </div>
            )
        }
        return null
    }

    return (
        <div className="bg-white border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Evolução Mensal</h2>
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                        dataKey="mes"
                        stroke="#6B7280"
                        style={{ fontSize: '12px' }}
                    />
                    <YAxis
                        stroke="#6B7280"
                        style={{ fontSize: '12px' }}
                        tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                        wrapperStyle={{ fontSize: '14px' }}
                        formatter={(value) => {
                            if (value === 'receitas') return 'Receitas'
                            if (value === 'despesas') return 'Despesas'
                            if (value === 'lucro') return 'Lucro Líquido'
                            return value
                        }}
                    />
                    <Line
                        type="monotone"
                        dataKey="receitas"
                        stroke="#10B981"
                        strokeWidth={2}
                        dot={{ fill: '#10B981', r: 4 }}
                        activeDot={{ r: 6 }}
                        animationDuration={1500}
                        animationEasing="ease-in-out"
                    />
                    <Line
                        type="monotone"
                        dataKey="despesas"
                        stroke="#EF4444"
                        strokeWidth={2}
                        dot={{ fill: '#EF4444', r: 4 }}
                        activeDot={{ r: 6 }}
                        animationDuration={1500}
                        animationEasing="ease-in-out"
                    />
                    <Line
                        type="monotone"
                        dataKey="lucro"
                        stroke="#3B82F6"
                        strokeWidth={2}
                        dot={{ fill: '#3B82F6', r: 4 }}
                        activeDot={{ r: 6 }}
                        animationDuration={1500}
                        animationEasing="ease-in-out"
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}
