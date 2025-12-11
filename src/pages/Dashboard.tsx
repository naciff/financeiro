import { useDashboardData } from '../hooks/useDashboardData'
import { useChartData } from '../hooks/useChartData'
import { formatCurrency } from '../utils/formatCurrency'
import { MonthlyEvolutionChart } from '../components/charts/MonthlyEvolutionChart'
import { ExpensesBarChart } from '../components/charts/ExpensesBarChart'
import { useState, useEffect } from 'react'
import { getProfile } from '../services/db'
import { useAppStore } from '../store/AppStore'

export default function Dashboard() {
  const store = useAppStore()
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [userName, setUserName] = useState('')

  useEffect(() => {
    getProfile().then(r => {
      if (r.data && r.data.name) {
        // Get first name only to be cleaner? Or full name? User said "campo nome"
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
    return <div className="p-6">Carregando...</div>
  }

  return (

    <div className="space-y-6">

      {/* Date Filter */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-text-muted-light dark:text-text-muted-dark">Período:</span>
        <div className="relative">
          <input
            type="month"
            className="pl-4 pr-10 py-2 rounded border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-text-main-light dark:text-text-main-dark text-sm focus:ring-primary focus:border-primary"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
          />
          <span className="material-icons-outlined absolute right-2 top-2 text-text-muted-light dark:text-text-muted-dark pointer-events-none text-lg">calendar_today</span>
        </div>
      </div>

      {/* Top Metrics - 4 columns with Icons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg border border-border-light dark:border-border-dark shadow-sm flex items-center">
          <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 mr-4">
            <span className="material-icons-outlined text-2xl">arrow_downward</span>
          </div>
          <div>
            <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-1">Total entrada (Fixa/Mês)</p>
            <h3 className="text-xl font-bold text-profit">R$ {formatCurrency(totalReceitasFixasMes)}</h3>
          </div>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg border border-border-light dark:border-border-dark shadow-sm flex items-center">
          <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 mr-4">
            <span className="material-icons-outlined text-2xl">arrow_upward</span>
          </div>
          <div>
            <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-1">Total despesas (Fixa/Mês)</p>
            <h3 className="text-xl font-bold text-loss">R$ {formatCurrency(totalRetiradaFixaMes)}</h3>
          </div>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg border border-border-light dark:border-border-dark shadow-sm flex items-center">
          <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 mr-4">
            <span className="material-icons-outlined text-2xl">receipt_long</span>
          </div>
          <div>
            <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-1">Total de despesas lançadas</p>
            <h3 className="text-xl font-bold text-text-main-light dark:text-text-main-dark">R$ {formatCurrency(totalDespesasGeral)}</h3>
          </div>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg border border-border-light dark:border-border-dark shadow-sm flex items-center">
          <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 mr-4">
            <span className="material-icons-outlined text-2xl">savings</span>
          </div>
          <div>
            <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-1">Previsão divisão de lucro Anual</p>
            <h3 className="text-xl font-bold text-profit">R$ {formatCurrency(totalReceitasDivisaoLucro)}</h3>
          </div>
        </div>
      </div>

      {/* Totais do Livro Caixa + Previsão - 4 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg border border-border-light dark:border-border-dark shadow-sm flex items-center">
          <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 mr-4">
            <span className="material-icons-outlined text-2xl">attach_money</span>
          </div>
          <div>
            <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-1">Total recebido</p>
            <h3 className="text-xl font-bold text-neutral">{totais ? `R$ ${formatCurrency(Number(totais.real_total_recebido || 0))}` : 'R$ 0,00'}</h3>
          </div>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg border border-border-light dark:border-border-dark shadow-sm flex items-center">
          <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 mr-4">
            <span className="material-icons-outlined text-2xl">money_off</span>
          </div>
          <div>
            <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-1">Total pago</p>
            <h3 className="text-xl font-bold text-loss">{totais ? `R$ ${formatCurrency(Number(totais.real_total_pago || 0))}` : 'R$ 0,00'}</h3>
          </div>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg border border-border-light dark:border-border-dark shadow-sm flex items-center">
          <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 mr-4">
            <span className="material-icons-outlined text-2xl">account_balance_wallet</span>
          </div>
          <div>
            <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-1">Saldo Atual</p>
            <h3 className={`text-xl font-bold ${Number(totais?.saldo_atual || 0) >= 0 ? 'text-profit' : 'text-loss'}`}>{totais ? `R$ ${formatCurrency(Number(totais.saldo_atual || 0))}` : 'R$ 0,00'}</h3>
          </div>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg border border-border-light dark:border-border-dark shadow-sm flex items-center">
          <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 mr-4">
            <span className="material-icons-outlined text-2xl">trending_up</span>
          </div>
          <div>
            <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-1">Previsão Saldo Mês Atual</p>
            <h3 className={`text-xl font-bold ${Number(totais?.previsao_saldo || 0) >= 0 ? 'text-profit' : 'text-loss'}`}>{totais ? `R$ ${formatCurrency(Number(totais.previsao_saldo || 0))}` : 'R$ 0,00'}</h3>
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
            <ExpensesBarChart data={expensesByGroup} />
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
    </div>
  )
}
