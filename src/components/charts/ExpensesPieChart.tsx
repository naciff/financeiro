import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { ExpenseByGroup } from '../../hooks/useChartData'
import { formatCurrency } from '../../utils/formatCurrency'

interface ExpensesPieChartProps {
    data: ExpenseByGroup[]
}

export function ExpensesPieChart({ data }: ExpensesPieChartProps) {
    // Custom label component to show percentage inside the pie
    const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
        const RADIAN = Math.PI / 180
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5
        const x = cx + radius * Math.cos(-midAngle * RADIAN)
        const y = cy + radius * Math.sin(-midAngle * RADIAN)

        return (
            <text
                x={x}
                y={y}
                fill="white"
                textAnchor={x > cx ? 'start' : 'end'}
                dominantBaseline="central"
                className="font-bold text-sm"
            >
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        )
    }

    // Custom tooltip
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload
            return (
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                    <p className="font-semibold text-gray-800 mb-1">{data.grupo}</p>
                    <p className="text-sm text-gray-600">
                        Valor: <span className="font-bold">R$ {formatCurrency(data.valor)}</span>
                    </p>
                    <p className="text-sm text-gray-600">
                        Percentual: <span className="font-bold">{data.percentual}%</span>
                    </p>
                </div>
            )
        }
        return null
    }

    // Custom legend
    const renderLegend = (props: any) => {
        const { payload } = props
        return (
            <div className="flex flex-wrap gap-2 justify-center mt-4">
                {payload.map((entry: any, index: number) => (
                    <div key={`legend-${index}`} className="flex items-center gap-2">
                        <div
                            className="w-3 h-3 rounded-sm"
                            style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-xs text-gray-700">{entry.value}</span>
                    </div>
                ))}
            </div>
        )
    }

    if (data.length === 0) {
        return (
            <div className="bg-white border rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Despesas por Grupo de Compromisso</h2>
                <div className="flex items-center justify-center h-64 text-gray-500">
                    Nenhuma despesa encontrada
                </div>
            </div>
        )
    }

    return (
        <div className="bg-white border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Despesas por Grupo de Compromisso</h2>
            <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderCustomLabel}
                        outerRadius={100}
                        innerRadius={60}
                        fill="#8884d8"
                        dataKey="valor"
                        animationBegin={0}
                        animationDuration={1000}
                        animationEasing="ease-out"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.cor} />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend content={renderLegend} />
                </PieChart>
            </ResponsiveContainer>

            {/* Summary below chart */}
            <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600 space-y-1">
                    {data.slice(0, 5).map((item, index) => (
                        <div key={index} className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: item.cor }}
                                />
                                <span>{item.grupo}</span>
                            </div>
                            <span className="font-semibold">R$ {formatCurrency(item.valor)}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
