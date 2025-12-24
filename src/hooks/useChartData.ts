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
    items: any[]
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

export function useChartData(orgId?: string | null) {
    const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
    const [expensesByGroup, setExpensesByGroup] = useState<ExpenseByGroup[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function loadChartData() {
            if (!orgId || !hasBackend || !supabase) {
                setLoading(false)
                return
            }

            try {
                // Fetch monthly totals from financials (Controle e Previsão)
                const now = new Date()
                const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1)

                const { data: financials } = await supabase
                    .from('financials')
                    .select('id, data_vencimento, valor, operacao, situacao')
                    .gte('data_vencimento', twelveMonthsAgo.toISOString())
                    .neq('situacao', 4) // Exclude cancelled/skipped
                    .eq('organization_id', orgId)

                if (financials) {
                    const monthlyAgg = new Map<string, { receitas: number, despesas: number }>()

                    financials.forEach((item: any) => {
                        if (!item.data_vencimento) return
                        const date = new Date(item.data_vencimento)
                        // Key format: YYYY-MM for sorting/grouping
                        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

                        const val = Number(item.valor || 0)
                        const isReceita = item.operacao === 'receita' || item.operacao === 'aporte'

                        const current = monthlyAgg.get(key) || { receitas: 0, despesas: 0 }
                        if (isReceita) {
                            current.receitas += val
                        } else {
                            current.despesas += val
                        }
                        monthlyAgg.set(key, current)
                    })

                    // Convert map to sorted array
                    const sortedKeys = Array.from(monthlyAgg.keys()).sort()
                    const monthlyChartData: MonthlyData[] = sortedKeys.map(key => {
                        const [year, month] = key.split('-')
                        const date = new Date(Number(year), Number(month) - 1, 1)
                        const monthName = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
                        const { receitas, despesas } = monthlyAgg.get(key)!

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
                  nome,
                  grupo:grupo_id (
                    id, 
                    nome
                  )
                )
              `)
                        .eq('organization_id', orgId)
                        .eq('operacao', 'despesa')
                        .neq('situacao', 2)

                    if (schedules) {
                        // Group expenses by commitment group
                        const groupMap = new Map<string, { total: number, items: any[] }>()

                        schedules.forEach((item: any) => {
                            // Extract group name from the nested relationship
                            const groupName = item.compromisso?.grupo?.nome || 'Sem Grupo'

                            // Calculate monthly installment value if applicable
                            const rawVal = Number(item.valor || 0)
                            const qtd = Number(item.parcelas || 1)
                            const valor = qtd > 1 ? rawVal / qtd : rawVal

                            const current = groupMap.get(groupName) || { total: 0, items: [] }
                            current.total += valor
                            current.items.push({
                                ...item,
                                valor_calculado: valor // Store calculated monthly value
                            })
                            groupMap.set(groupName, current)
                        })

                        // Calculate total to get percentages
                        const total = Array.from(groupMap.values()).reduce((sum, val) => sum + val.total, 0)

                        // Convert to array and add percentages
                        const expensesData: ExpenseByGroup[] = Array.from(groupMap.entries())
                            .map(([grupo, data], index) => ({
                                grupo,
                                valor: data.total,
                                percentual: total > 0 ? Math.round((data.total / total) * 100) : 0,
                                cor: COLORS[index % COLORS.length],
                                items: data.items.sort((a, b) => {
                                    const dateA = new Date(a.proxima_vencimento || a.ano_mes_inicial).getTime()
                                    const dateB = new Date(b.proxima_vencimento || b.ano_mes_inicial).getTime()
                                    return dateA - dateB
                                })
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
    }, [orgId])

    return { monthlyData, expensesByGroup, loading }
}
