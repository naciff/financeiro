import { useDashboardData } from '../hooks/useDashboardData'
import { useChartData } from '../hooks/useChartData'
import { formatCurrency } from '../utils/formatCurrency'
import { MonthlyEvolutionChart } from '../components/charts/MonthlyEvolutionChart'
import { ExpensesBarChart } from '../components/charts/ExpensesBarChart'
import { useState, useEffect, useRef } from 'react'
import { getProfile } from '../services/db'
import { useAppStore } from '../store/AppStore'
import { CountUp } from '../components/ui/CountUp'

import { LoadingSpinner } from '../components/ui/LoadingSpinner'

export default function Dashboard() {
  const store = useAppStore()
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [userName, setUserName] = useState('')
  const [detailGroup, setDetailGroup] = useState<any | null>(null)
  const detailsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (detailGroup && detailsRef.current) {
      detailsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [detailGroup])

  useEffect(() => {
    getProfile().then(r => {
      if (r.data && r.data.name) {
        const firstName = r.data.name.split(' ')[0]
        setUserName(firstName)
      }
    })
  }, [])

  const year = parseInt(selectedMonth.split('-')[0])
  const month = parseInt(selectedMonth.split('-')[1]) - 1

  const {
    totais,
    totalDespesas,
    totalReceitas,
    totalReceitasFixasMes,
    totalReceitasDivisaoLucro,
    totalRetiradaFixaMes,
    totalDespesasGeral,
    loading: metricsLoading
  } = useDashboardData(month, year, store.activeOrganization)
  const { monthlyData, expensesByGroup, loading: chartsLoading } = useChartData(store.activeOrganization)

  if (metricsLoading) {
    return <LoadingSpinner />
  }

  return (

    <div className="space-y-6">

      {/* Date Filter */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-text-muted-light dark:text-text-muted-dark">Período:</span>
        <div className="relative">
          <input
            type="month"
            className="px-4 py-2 rounded border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-text-main-light dark:text-text-main-dark text-sm focus:ring-primary focus:border-primary"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
          />
        </div>
      </div>

      {/* Row 1: Fixed/Monthly & Overdue - 5 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg border border-border-light dark:border-border-dark shadow-sm flex items-center">
          <div className="text-green-600 mr-4">
            <span className="material-icons-outlined text-4xl">arrow_upward</span>
          </div>
          <div>
            <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-1">Total entrada (Fixa/Mês)</p>
            <h3 className="text-xl font-bold text-profit"><CountUp end={totalReceitasFixasMes || 0} /></h3>
          </div>
        </div>

        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg border border-border-light dark:border-border-dark shadow-sm flex items-center">
          <div className="text-red-600 mr-4">
            <span className="material-icons-outlined text-4xl">arrow_downward</span>
          </div>
          <div>
            <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-1">Total despesas (Fixa/Mês)</p>
            <h3 className="text-xl font-bold text-loss"><CountUp end={totalRetiradaFixaMes || 0} /></h3>
          </div>
        </div>

        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg border border-border-light dark:border-border-dark shadow-sm flex items-center">
          <div className="text-red-500 mr-4">
            <span className="material-icons-outlined text-4xl">receipt_long</span>
          </div>
          <div>
            <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-1">Total despesas</p>
            <h3 className="text-xl font-bold text-loss"><CountUp end={totalDespesas || 0} /></h3>
          </div>
        </div>

        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg border border-border-light dark:border-border-dark shadow-sm flex items-center">
          <div className="text-red-600 mr-4">
            <span className="material-icons-outlined text-4xl">warning</span>
          </div>
          <div>
            <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-1">Valores em Aberto</p>
            <h3 className={`text-xl font-bold ${Number(totais?.total_atrasado || 0) >= 0 ? 'text-profit' : 'text-loss'}`}><CountUp end={Number(totais?.total_atrasado || 0)} /></h3>
          </div>
        </div>

        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg border border-border-light dark:border-border-dark shadow-sm flex items-center">
          <div className="text-blue-600 mr-4">
            <span className="material-icons-outlined text-4xl">receipt_long</span>
          </div>
          <div>
            <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-1">Total de despesas lançadas</p>
            <h3 className="text-xl font-bold text-text-main-light dark:text-text-main-dark"><CountUp end={totalDespesasGeral || 0} /></h3>
          </div>
        </div>
      </div>

      {/* Row 2: Totais do Livro Caixa + Previsão - 5 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg border border-border-light dark:border-border-dark shadow-sm flex items-center">
          <div className="text-blue-600 mr-4">
            <span className="material-icons-outlined text-4xl">attach_money</span>
          </div>
          <div>
            <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-1">Total recebido</p>
            <h3 className="text-xl font-bold text-neutral"><CountUp end={Number(totais?.real_total_recebido || 0)} /></h3>
          </div>
        </div>

        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg border border-border-light dark:border-border-dark shadow-sm flex items-center">
          <div className="text-red-600 mr-4">
            <span className="material-icons-outlined text-4xl">money_off</span>
          </div>
          <div>
            <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-1">Total pago</p>
            <h3 className="text-xl font-bold text-loss"><CountUp end={Number(totais?.real_total_pago || 0)} /></h3>
          </div>
        </div>

        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg border border-border-light dark:border-border-dark shadow-sm flex items-center">
          <div className="text-gray-600 mr-4">
            <span className="material-icons-outlined text-4xl">account_balance_wallet</span>
          </div>
          <div>
            <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-1">Saldo Atual</p>
            <h3 className={`text-xl font-bold ${Number(totais?.saldo_atual || 0) >= 0 ? 'text-profit' : 'text-loss'}`}><CountUp end={Number(totais?.saldo_atual || 0)} /></h3>
          </div>
        </div>

        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg border border-border-light dark:border-border-dark shadow-sm flex items-center">
          <div className="text-gray-600 mr-4">
            <span className="material-icons-outlined text-4xl">trending_up</span>
          </div>
          <div>
            <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-1">Previsão Saldo Mês Atual</p>
            <h3 className={`text-xl font-bold ${Number(totais?.previsao_saldo || 0) >= 0 ? 'text-profit' : 'text-loss'}`}><CountUp end={Number(totais?.previsao_saldo || 0)} /></h3>
          </div>
        </div>

        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg border border-border-light dark:border-border-dark shadow-sm flex items-center">
          <div className="text-green-600 mr-4">
            <span className="material-icons-outlined text-4xl">savings</span>
          </div>
          <div>
            <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-1">Previsão divisão de lucro (Anual)</p>
            <h3 className="text-xl font-bold text-profit"><CountUp end={totalReceitasDivisaoLucro || 0} /></h3>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      {chartsLoading ? (
        <div className="text-center py-8 text-gray-500">Carregando gráficos...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8">
          {/* Despesas por Grupo - Restored Recharts */}
          <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg border border-border-light dark:border-border-dark shadow-sm flex flex-col">
            <ExpensesBarChart data={expensesByGroup} onGroupClick={setDetailGroup} />
          </div>

          {/* Evolução Mensal */}
          <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg border border-border-light dark:border-border-dark shadow-sm flex flex-col">
            <h3 className="text-lg font-medium text-text-main-light dark:text-text-main-dark mb-6">Evolução Mensal</h3>
            <div className="flex-1 min-h-[300px]">
              <MonthlyEvolutionChart data={monthlyData} />
            </div>
          </div>
        </div>
      )}

      {/* Drill-down Details */}
      {detailGroup && (
        <div ref={detailsRef} className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg border border-border-light dark:border-border-dark shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: detailGroup.cor }}></span>
              Detalhes: {detailGroup.grupo}
            </h3>
            <button
              onClick={() => setDetailGroup(null)}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <span className="material-icons-outlined">close</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-2">Vencimento</th>
                  <th className="px-4 py-2">Descrição / Compromisso</th>
                  <th className="px-4 py-2 text-right">Valor Parcela</th>
                  <th className="px-4 py-2 text-right">Parcelas</th>
                </tr>
              </thead>
              <tbody>
                {detailGroup.items.map((item: any, idx: number) => (
                  <tr key={idx} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                    <td className="px-4 py-2">
                      {new Date(item.proxima_vencimento || item.ano_mes_inicial).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                    </td>
                    <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">
                      {item.compromisso?.nome || item.descricao || 'Sem descrição'}
                    </td>
                    <td className="px-4 py-2 text-right text-red-600 font-medium">
                      {formatCurrency(item.valor_calculado)}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-500">
                      {item.parcelas}x
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
