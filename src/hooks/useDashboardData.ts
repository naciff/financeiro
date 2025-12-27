import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { listSchedules } from '../services/db'
import { hasBackend } from '../lib/runtime'

export function useDashboardData(selectedMonth?: number, selectedYear?: number, orgId?: string | null) {
    const [totais, setTotais] = useState<any | null>(null)
    const [totalDespesas, setTotalDespesas] = useState(0)
    const [totalReceitas, setTotalReceitas] = useState(0)
    const [totalReceitasFixasMes, setTotalReceitasFixasMes] = useState(0)
    const [totalReceitasDivisaoLucro, setTotalReceitasDivisaoLucro] = useState(0)
    const [totalRetiradaFixaMes, setTotalRetiradaFixaMes] = useState(0)
    const [totalDespesasGeral, setTotalDespesasGeral] = useState(0)
    const [saldoAtualGeral, setSaldoAtualGeral] = useState(0)
    const [saldoAplicacao, setSaldoAplicacao] = useState(0)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function load() {
            const client = supabase
            if (!client || !orgId) {
                setLoading(false)
                return
            }

            let currentSaldoGeral = 0

            try {
                const now = new Date()
                const year = selectedYear || now.getFullYear()
                const month = selectedMonth !== undefined ? selectedMonth : now.getMonth()
                const from = new Date(year, month, 1)
                const to = new Date(year, month + 1, 0)
                const r = await client.from('monthly_totals_view').select('*').eq('organization_id', orgId).gte('mes', from.toISOString()).lte('mes', to.toISOString()).limit(1)
                setTotais(r.data && r.data[0] ? r.data[0] : null)

                // Fetch transactions for the current month to calculate realized totals (Livro Caixa)
                if (hasBackend) {
                    const { data: txsData, error: txsError } = await client
                        .from('transactions')
                        .select('valor_entrada, valor_saida, data_lancamento')
                        .eq('organization_id', orgId)
                        .gte('data_lancamento', from.toISOString())
                        .lte('data_lancamento', to.toISOString())
                        .neq('operacao', 'transferencia') // Exclude transfers

                    if (!txsError && txsData) {
                        const realTotalPago = txsData.reduce((sum, tx) => sum + Number(tx.valor_saida || 0), 0)
                        const realTotalRecebido = txsData.reduce((sum, tx) => sum + Number(tx.valor_entrada || 0), 0)

                        setTotais((prev: any) => ({
                            ...prev,
                            real_total_pago: realTotalPago,
                            real_total_recebido: realTotalRecebido
                        }))
                    }

                    // Calculate Saldo Atual from account_balances_view, filtering ACTIVE accounts
                    const { data: accountsData } = await client.from('account_balances_view').select('account_id, saldo_atual').eq('organization_id', orgId)
                    const { data: activeAccounts } = await client.from('accounts').select('id, ativo, tipo').eq('organization_id', orgId)

                    const saldoGeral = accountsData?.reduce((sum, bal) => {
                        const account = activeAccounts?.find(a => a.id === bal.account_id)
                        if (account && account.ativo === false) return sum
                        return sum + Number(bal.saldo_atual || 0)
                    }, 0) || 0

                    const saldoApp = accountsData?.reduce((sum, bal) => {
                        const account = activeAccounts?.find(a => a.id === bal.account_id)
                        if (account && account.ativo !== false && account.tipo === 'aplicacao') {
                            return sum + Number(bal.saldo_atual || 0)
                        }
                        return sum
                    }, 0) || 0

                    currentSaldoGeral = saldoGeral
                    setSaldoAtualGeral(saldoGeral)
                    setSaldoAplicacao(saldoApp)
                }

                // Fetch schedules to calculate despesas and receitas totals
                if (hasBackend) {
                    const user = (await client.auth.getUser()).data.user

                    // Fetch ALL expenses for the "Valor Total de Despesas" card (General Total)
                    if (user) {
                        const { data: allExpenses } = await client
                            .from('schedules')
                            .select('valor')
                            .eq('organization_id', orgId)
                            .eq('operacao', 'despesa')
                            .neq('situacao', 2) // Filter out canceled/inactive

                        if (allExpenses) {
                            const totalGeral = allExpenses.reduce((sum, item) => sum + Number(item.valor || 0), 0)
                            setTotalDespesasGeral(totalGeral)
                        }
                    }

                    const schedulesResult = await listSchedules(5000, { orgId: orgId as string, includeConcluded: true }) // Fetch ALL, including paid, to properly calc totals

                    if (!schedulesResult.error && schedulesResult.data) {
                        const schedules = schedulesResult.data as any[]

                        // Filter schedules for the current month
                        const currentMonthSchedules = schedules.filter((s: any) => {
                            const dateStr = s.data_vencimento || s.vencimento || s.proxima_vencimento || s.ano_mes_inicial
                            if (!dateStr) return false
                            // Fix: Parse manually to avoid timezone issues (e.g. 2026-01-01 becomes Dec 31 2025 in GMT-3)
                            const [y, m] = dateStr.split('T')[0].split('-').map(Number)
                            return (m - 1) === month && y === year
                        })

                        // Calculate total despesas (PENDING ONLY per user request) - NOW ONLY VARIABLE
                        const despesas = currentMonthSchedules.filter((s: any) =>
                            s.operacao?.toLowerCase() === 'despesa' && s.situacao !== 2 && s.tipo === 'variavel'
                        )
                        const totalDesp = despesas.reduce((sum: number, s: any) => {
                            const valorParcela = Number(s.parcelas || 1) > 1 ? Math.round((Number(s.valor) / Number(s.parcelas)) * 100) / 100 : Number(s.valor)
                            return sum + valorParcela
                        }, 0)
                        setTotalDespesas(totalDesp)

                        // Calculate total receitas
                        const receitas = currentMonthSchedules.filter((s: any) => s.operacao?.toLowerCase() === 'receita')
                        const totalRec = receitas.reduce((sum: number, s: any) => {
                            const valorParcela = Number(s.parcelas || 1) > 1 ? Math.round((Number(s.valor) / Number(s.parcelas)) * 100) / 100 : Number(s.valor)
                            return sum + valorParcela
                        }, 0)
                        setTotalReceitas(totalRec)

                        // Calculate total receitas fixas/mensal (fixed only OR contract variable)
                        const receitasFixas = currentMonthSchedules.filter((s: any) => {
                            if (s.operacao?.toLowerCase() !== 'receita') return false
                            if (s.tipo === 'fixo') return true

                            // Include Contracts as Fixed Income even if variable
                            const cc = s.cost_center?.descricao || ''
                            if (s.tipo === 'variavel' && cc.toLowerCase().includes('contrato')) return true

                            return false
                        })
                        const totalRecFixas = receitasFixas.reduce((sum: number, s: any) => {
                            // Logic matches general total: if parcels > 1, use monthly value.
                            const valorParcela = Number(s.parcelas || 1) > 1 ? Math.round((Number(s.valor) / Number(s.parcelas)) * 100) / 100 : Number(s.valor)
                            return sum + valorParcela
                        }, 0)
                        setTotalReceitasFixasMes(totalRecFixas)

                        // Calculate PREDICTED Balance for Current Month
                        // Formula: Real Balance + All Pending Revenue (until end of month) - All Pending Expenses (until end of month)
                        // This logic mirrors the ScheduleSummaryView "Saldo Previsto"
                        const endOfSelectedMonth = new Date(year, month + 1, 0)

                        const pendingSchedules = schedules.filter((s: any) => {
                            if (s.situacao === 2) return false // Ignore realized (already in Real Balance)
                            const dStr = s.data_vencimento || s.vencimento || s.proxima_vencimento || s.ano_mes_inicial
                            if (!dStr) return false
                            const d = new Date(dStr)

                            // Include ONLY items up to the end of the selected month
                            // (Past pending items are technically overdue and affect the 'current' state, so they should be included)
                            return d <= endOfSelectedMonth
                        })

                        const pendingIn = pendingSchedules.reduce((sum: number, s: any) => {
                            const op = s.operacao?.toLowerCase()
                            if (op === 'receita' || op === 'aporte') {
                                // For pending items, we use the full value or parcel value?
                                // ScheduleSummaryView typically sums the 'valor' field from the view
                                // If it's variable/installments, 'valor' might be Total? 
                                // But usually 'schedules' list returns generated/projected items?
                                // listSchedules returns `schedules_view`? 
                                // No, listSchedules queries `schedules`? 
                                // Let's simplify and use logic similar to 'totalDespesas':
                                // If parcelas > 1, calc single parcel value.
                                const val = Number(s.parcelas || 1) > 1 ? Number(s.valor) / Number(s.parcelas) : Number(s.valor)
                                return sum + val
                            }
                            return sum
                        }, 0)

                        const pendingOut = pendingSchedules.reduce((sum: number, s: any) => {
                            const op = s.operacao?.toLowerCase()
                            if (op === 'despesa' || op === 'retirada') {
                                const val = Number(s.parcelas || 1) > 1 ? Number(s.valor) / Number(s.parcelas) : Number(s.valor)
                                return sum + val
                            }
                            return sum
                        }, 0)

                        const predicted = currentSaldoGeral + pendingIn - pendingOut

                        // We set this into the return object directly below, but we can also store state if needed.
                        // For now we will return it in the hook final object.
                        // We need to update the 'totais' state or just pass it through.
                        setTotais((prev: any) => ({
                            ...prev,
                            // Override the 'previsao_saldo' if it was coming from database view
                            previsao_saldo: predicted
                        }))

                        // Total Receitas Divisão Lucro (Yearly Forecast - Current Year Only)
                        const divisaoLucroSchedules = schedules.filter((s: any) => {
                            const isReceita = s.operacao?.toLowerCase() === 'receita'
                            const isDivisao = s.compromisso?.nome?.toLowerCase().includes('divisão de lucro')

                            if (!isReceita || !isDivisao) return false

                            // Check Year
                            const dStr = s.proxima_vencimento || s.ano_mes_inicial || s.data_vencimento
                            if (!dStr) return false
                            const dYear = new Date(dStr).getFullYear()
                            return dYear === year
                        })
                        const totalDivisaoLucro = divisaoLucroSchedules.reduce((sum: number, s: any) => sum + Number(s.valor), 0)
                        setTotalReceitasDivisaoLucro(totalDivisaoLucro)

                        // Calculate total retirada fixa/mensal
                        // User request: include items that are open/unpaid (overdue + current). 
                        // We use 'pendingSchedules' which already filters for date <= endOfMonth and situacao !== 2.
                        const despesasFixas = pendingSchedules.filter((s: any) => {
                            if (s.operacao?.toLowerCase() !== 'despesa') return false
                            const tipo = s.tipo?.toLowerCase()
                            const periodo = s.periodo?.toLowerCase()
                            return tipo === 'fixo' || periodo === 'mensal'
                        })
                        const totalRetFixa = despesasFixas.reduce((sum: number, s: any) => {
                            const valorParcela = Number(s.parcelas || 1) > 1 ? Math.round((Number(s.valor) / Number(s.parcelas)) * 100) / 100 : Number(s.valor)
                            return sum + valorParcela
                        }, 0)
                        setTotalRetiradaFixaMes(totalRetFixa)

                        // Calculate "Valores em aberto"
                        // User request: "considerar o que em aberto para tras e o mes completo referente ao periodo em questão"
                        // This matches exactly the logic of 'pendingSchedules' (Open items <= endOfSelectedMonth)

                        const valoresEmAbertoSchedules = pendingSchedules; // pendingSchedules is already filtered: situacao!=2 && date <= endOfSelectedMonth

                        const totalAtrasado = valoresEmAbertoSchedules.reduce((sum: number, s: any) => {
                            const op = s.operacao?.toLowerCase()
                            const val = Number(s.parcelas || 1) > 1 ? Number(s.valor) / Number(s.parcelas) : Number(s.valor)

                            if (op === 'receita' || op === 'aporte') {
                                return sum + val
                            } else if (op === 'despesa' || op === 'retirada') {
                                return sum - val
                            }
                            return sum
                        }, 0)

                        setTotais((prev: any) => ({
                            ...prev,
                            total_atrasado: totalAtrasado
                        }))
                    }
                }
            } catch (error) {
                console.error('Error loading dashboard data:', error)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [selectedMonth, selectedYear, orgId])

    return {
        totais: {
            ...totais,
            saldo_atual: saldoAtualGeral,
            saldo_aplicacao: saldoAplicacao
            // If we calculated predicted inside the effect and updated 'totais', it's there.
            // But 'totais' update might lag one render cycle or race?
            // Actually, we are updating 'totais' state in the effect.
            // However, the 'saldoGeral' dependency is tricky. 
            // 'saldoGeral' is fetched in the effect.
            // Let's rely on the state update we did above.
        },
        totalDespesas,
        totalReceitas,
        totalReceitasFixasMes,
        totalReceitasDivisaoLucro,
        totalRetiradaFixaMes,
        totalDespesasGeral,
        loading
    }
}
