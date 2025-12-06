import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { hasBackend } from '../lib/runtime'

export interface MonthlyData {
    mes: string
    receitas: number
    despesas: number
    lucro: number
}

export interface ExpenseByGroup {
    grupo: string
    valor: number
    percentual: number
    cor: string
}

// Cores predefinidas para os grupos
const COLORS = [
    '#3B82F6', // blue
    '#8B5CF6', // purple
    '#F59E0B', // amber
    '#EF4444', // red
    '#10B981', // green
    '#EC4899', // pink
    '#6366F1', // indigo
    '#14B8A6', // teal
]

export function useChartData() {
    const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
    const [expensesByGroup, setExpensesByGroup] = useState<ExpenseByGroup[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function loadChartData() {
            if (!supabase || !hasBackend) {
                setLoading(false)
                return
            }

            try {
                // Fetch monthly totals for the last 12 months
                const now = new Date()
                const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1)

                const monthlyResult = await supabase
                    .from('monthly_totals_view')
                    .select('*')
                    .gte('mes', twelveMonthsAgo.toISOString())
                    .order('mes', { ascending: true })

                if (monthlyResult.data) {
                    const monthlyChartData: MonthlyData[] = monthlyResult.data.map((row: any) => {
                        const date = new Date(row.mes)
                        const monthName = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
                        const receitas = Number(row.total_recebido || 0)
                        const despesas = Number(row.total_pago || 0)

                        return {
                            mes: monthName.charAt(0).toUpperCase() + monthName.slice(1),
                            receitas,
                            despesas,
                            lucro: receitas - despesas
                        }
                    })
                    setMonthlyData(monthlyChartData)
                }

                // Fetch expenses by commitment from AGENDAMENTOS (Scheduled)
                const user = (await supabase.auth.getUser()).data.user

                if (user) {
                    const { data: schedules } = await supabase
                        .from('schedules')
                        .select(`
                valor,
                parcelas,
                compromisso:compromisso_id (
                  id,
                  nome
                )
              `)
                        .eq('user_id', user.id)
                        .eq('operacao', 'despesa')
                        .neq('situacao', 2)

                    if (schedules) {
                        // Group expenses by commitment
                        const groupMap = new Map<string, number>()

                        schedules.forEach((item: any) => {
                            const groupName = item.compromisso?.nome || 'Sem Compromisso'
                            // Calculate monthly installment value if applicable
                            const rawVal = Number(item.valor || 0)
                            const qtd = Number(item.parcelas || 1)
                            const valor = qtd > 1 ? rawVal / qtd : rawVal

                            const current = groupMap.get(groupName) || 0
                            groupMap.set(groupName, current + valor)
                        })

                        // Calculate total to get percentages
                        const total = Array.from(groupMap.values()).reduce((sum, val) => sum + val, 0)

                        // Convert to array and add percentages
                        const expensesData: ExpenseByGroup[] = Array.from(groupMap.entries())
                            .map(([grupo, valor], index) => ({
                                grupo,
                                valor,
                                percentual: total > 0 ? Math.round((valor / total) * 100) : 0,
                                cor: COLORS[index % COLORS.length]
                            }))
                            .sort((a, b) => b.valor - a.valor) // Sort by value descending

                        setExpensesByGroup(expensesData)
                    }
                }
            } catch (error) {
                console.error('Error loading chart data:', error)
            } finally {
                setLoading(false)
            }
        }

        loadChartData()
    }, [])

    return { monthlyData, expensesByGroup, loading }
}
