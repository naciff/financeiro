import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { listSchedules } from '../services/db'
import { hasBackend } from '../lib/runtime'

export function useDashboardData() {
    const [totais, setTotais] = useState<any | null>(null)
    const [totalDespesas, setTotalDespesas] = useState(0)
    const [totalReceitas, setTotalReceitas] = useState(0)
    const [totalReceitasFixasMes, setTotalReceitasFixasMes] = useState(0)
    const [totalReceitasDivisaoLucro, setTotalReceitasDivisaoLucro] = useState(0)
    const [totalRetiradaFixaMes, setTotalRetiradaFixaMes] = useState(0)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function load() {
            if (!supabase) {
                setLoading(false)
                return
            }
            try {
                const now = new Date()
                const year = now.getFullYear()
                const month = now.getMonth()
                const from = new Date(year, month, 1)
                const to = new Date(year, month + 1, 0)
                const r = await supabase.from('monthly_totals_view').select('*').gte('mes', from.toISOString()).lte('mes', to.toISOString()).limit(1)
                setTotais(r.data && r.data[0] ? r.data[0] : null)

                // Fetch schedules to calculate despesas and receitas totals
                if (hasBackend) {
                    const schedulesResult = await listSchedules()
                    if (!schedulesResult.error && schedulesResult.data) {
                        const schedules = schedulesResult.data as any[]

                        // Filter schedules for the current month
                        const currentMonthSchedules = schedules.filter((s: any) => {
                            const dateStr = s.proxima_vencimento || s.ano_mes_inicial
                            if (!dateStr) return false
                            const d = new Date(dateStr)
                            return d.getMonth() === month && d.getFullYear() === year
                        })

                        // Calculate total despesas
                        const despesas = currentMonthSchedules.filter((s: any) => s.operacao === 'despesa')
                        const totalDesp = despesas.reduce((sum: number, s: any) => {
                            const valorParcela = Number(s.parcelas || 1) > 1 ? Math.round((Number(s.valor) / Number(s.parcelas)) * 100) / 100 : Number(s.valor)
                            const valorTotal = Math.round(valorParcela * Number(s.parcelas || 1) * 100) / 100
                            return sum + valorTotal
                        }, 0)
                        setTotalDespesas(totalDesp)

                        // Calculate total receitas
                        const receitas = currentMonthSchedules.filter((s: any) => s.operacao === 'receita')
                        const totalRec = receitas.reduce((sum: number, s: any) => {
                            const valorParcela = Number(s.parcelas || 1) > 1 ? Math.round((Number(s.valor) / Number(s.parcelas)) * 100) / 100 : Number(s.valor)
                            const valorTotal = Math.round(valorParcela * Number(s.parcelas || 1) * 100) / 100
                            return sum + valorTotal
                        }, 0)
                        setTotalReceitas(totalRec)

                        // Calculate total receitas fixas (fixed monthly income) - using all schedules or current month? 
                        // Usually "Fixas Mês" implies what is expected for the month, so filtering by month makes sense too.
                        const receitasFixas = currentMonthSchedules.filter((s: any) => s.operacao === 'receita' && s.tipo === 'fixo')
                        const totalRecFixas = receitasFixas.reduce((sum: number, s: any) => {
                            return sum + Number(s.valor)
                        }, 0)
                        setTotalReceitasFixasMes(totalRecFixas)

                        // Total Receitas Divisão Lucro (Backup Cloud) - keeping as 0 for now
                        setTotalReceitasDivisaoLucro(0)

                        // Calculate total retirada fixa (fixed monthly withdrawal from fixed expenses)
                        const despesasFixas = currentMonthSchedules.filter((s: any) => s.operacao === 'despesa' && s.tipo === 'fixo')
                        const totalRetFixa = despesasFixas.reduce((sum: number, s: any) => {
                            return sum + Number(s.valor)
                        }, 0)
                        setTotalRetiradaFixaMes(totalRetFixa)
                    }
                }
            } catch (error) {
                console.error('Error loading dashboard data:', error)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    return { totais, totalDespesas, totalReceitas, totalReceitasFixasMes, totalReceitasDivisaoLucro, totalRetiradaFixaMes, loading }
}
