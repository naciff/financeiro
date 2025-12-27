import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { ServiceData } from '../../hooks/useChartData'
import { formatCurrency } from '../../utils/formatCurrency'

interface ServicesPieChartProps {
    data: ServiceData[]
    onSliceClick?: (slice: ServiceData) => void
}

export function ServicesPieChart({ data, onSliceClick }: ServicesPieChartProps) {
    // Custom tooltip
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const item = payload[0].payload
            return (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
                    <p className="font-semibold text-gray-800 dark:text-gray-100 mb-1">{item.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        Quantidade: <span className="font-bold">{item.count}</span>
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        Percentual: <span className="font-bold">{item.percentual}%</span>
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        Valor: <span className="font-bold">{formatCurrency(item.value)}</span>
                    </p>
                </div>
            )
        }
        return null
    }

    // Render labels outside the pie slices
    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, count }: any) => {
        const RADIAN = Math.PI / 180;
        const radius = outerRadius + 30;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        return (
            <text
                x={x}
                y={y}
                fill={data[index].cor}
                textAnchor={x > cx ? 'start' : 'end'}
                dominantBaseline="central"
                className="text-[10px] md:text-xs font-semibold"
            >
                {`${count} (${(percent * 100).toFixed(0)}%)`}
            </text>
        );
    };

    if (data.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Serviços (Receitas)</h2>
                <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                    Nenhum serviço encontrado em agendamentos de receita
                </div>
            </div>
        )
    }

    return (
        <div className="h-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="count"
                        label={renderCustomizedLabel}
                        labelLine={{ stroke: '#ccc', strokeWidth: 1 }}
                        onClick={(data) => {
                            if (onSliceClick && data && data.payload) {
                                onSliceClick(data.payload)
                            }
                        }}
                        style={{ cursor: onSliceClick ? 'pointer' : 'default' }}
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.cor} strokeWidth={0} cursor={onSliceClick ? "pointer" : "default"} />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    )
}
