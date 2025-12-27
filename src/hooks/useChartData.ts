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

export interface ServiceData {
    name: string
    count: number
    percentual: number
    cor: string
    value: number
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
    const [servicesData, setServicesData] = useState<ServiceData[]>([])
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
                favorecido_id,
                cliente:clients(id, nome),
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
                                cliente_nome: (item.cliente && item.cliente.nome) ? item.cliente.nome : (item.favorecido_id ? 'ID: ' + item.favorecido_id : 'Sem Cliente'),
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

                    // Fetch revenue services from AGENDAMENTOS
                    const { data: revenueSchedules } = await supabase
                        .from('schedules')
                        .select('*, cliente:clients(id, nome), contract_items')
                        .eq('organization_id', orgId)
                        .eq('operacao', 'receita')
                        .neq('situacao', 2)

                    if (revenueSchedules) {
                        const serviceCountMap = new Map<string, number>()
                        const serviceValueMap = new Map<string, number>()
                        const serviceItemsMap = new Map<string, any[]>()
                        let totalServiceCount = 0

                        revenueSchedules.forEach((s: any) => {
                            if (s.contract_items && Array.isArray(s.contract_items)) {
                                s.contract_items.forEach((item: any) => {
                                    const name = item.name || 'Outros'
                                    serviceCountMap.set(name, (serviceCountMap.get(name) || 0) + 1)

                                    // Calculate value: using item value (unit) * qty - discount
                                    // Assumption based on Schedules.tsx form logic
                                    const val = (Number(item.value || 0) * Number(item.qty || 1)) - Number(item.discount || 0)
                                    serviceValueMap.set(name, (serviceValueMap.get(name) || 0) + val)

                                    const currentItems = serviceItemsMap.get(name) || []
                                    currentItems.push({
                                        ...s,
                                        descricao: item.name + (item.qty > 1 ? ` (${item.qty}x)` : ''), // Item detail
                                        cliente_nome: s.cliente?.nome || 'Cliente não identificado', // Client Name
                                        valor_calculado: val, // Value of THIS service item
                                        proxima_vencimento: s.proxima_vencimento || s.ano_mes_inicial
                                    })
                                    serviceItemsMap.set(name, currentItems)

                                    totalServiceCount++
                                })
                            }
                        })

                        const servicesStats: ServiceData[] = Array.from(serviceCountMap.entries())
                            .map(([name, count], index) => ({
                                name,
                                count,
                                percentual: totalServiceCount > 0 ? Math.round((count / totalServiceCount) * 100) : 0,
                                cor: COLORS[index % COLORS.length],
                                value: serviceValueMap.get(name) || 0,
                                items: (serviceItemsMap.get(name) || []).sort((a, b) => {
                                    const dateA = new Date(a.proxima_vencimento || a.ano_mes_inicial).getTime()
                                    const dateB = new Date(b.proxima_vencimento || b.ano_mes_inicial).getTime()
                                    return dateA - dateB
                                })
                            }))
                            .sort((a, b) => b.count - a.count)

                        setServicesData(servicesStats)
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

    return { monthlyData, expensesByGroup, servicesData, loading }
}
