import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { ExpenseByGroup } from '../../hooks/useChartData'
import { formatCurrency } from '../../utils/formatCurrency'

interface ExpensesBarChartProps {
    data: ExpenseByGroup[]
}

export function ExpensesBarChart({ data }: ExpensesBarChartProps) {
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
                    <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.cor} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>

            {/* Optional Summary/Legend if needed, but Bar Chart usually self-explanatory with Axis */}
        </div>
    )
}
