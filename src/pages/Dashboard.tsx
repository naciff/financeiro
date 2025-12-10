import { useDashboardData } from '../hooks/useDashboardData'
import { useChartData } from '../hooks/useChartData'
import { formatCurrency } from '../utils/formatCurrency'
import { MonthlyEvolutionChart } from '../components/charts/MonthlyEvolutionChart'
import { ExpensesBarChart } from '../components/charts/ExpensesBarChart'
import { useState, useEffect } from 'react'
import { getProfile } from '../services/db'

export default function Dashboard() {
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
  } = useDashboardData(month, year)
  const { monthlyData, expensesByGroup, loading: chartsLoading } = useChartData()

  if (metricsLoading) {
    return <div className="p-6">Carregando...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          {userName && <div className="text-sm text-gray-500">Olá, {userName}</div>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">Período:</label>
        <input
          type="month"
          className="border rounded px-3 py-2 text-sm bg-white"
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
        />
      </div>

      {/* Top Metrics - 4 columns */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border rounded p-4">
          <div className="text-sm text-gray-600 mb-1">Total entrada (Fixa/Mês)</div>
          <div className="text-2xl font-bold text-green-600">R$ {formatCurrency(totalReceitasFixasMes)}</div>
        </div>
        <div className="bg-white border rounded p-4">
          <div className="text-sm text-gray-600 mb-1">Total despesas (Fixa/Mês)</div>
          <div className="text-2xl font-bold text-red-600">R$ {formatCurrency(totalRetiradaFixaMes)}</div>
        </div>
        <div className="bg-white border rounded p-4">
          <div className="text-sm text-gray-600 mb-1">Total de despesas lançadas</div>
          <div className="text-2xl font-bold text-black">R$ {formatCurrency(totalDespesasGeral)}</div>
        </div>
        <div className="bg-white border rounded p-4">
          <div className="text-sm text-gray-600 mb-1">Previsão divisão de lucro Anual</div>
          <div className="text-2xl font-bold text-green-600">R$ {formatCurrency(totalReceitasDivisaoLucro)}</div>
        </div>
      </div>

      {/* Totais do Livro Caixa + Previsão - 4 columns */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border rounded p-4">
          <div className="text-sm text-gray-600 mb-1">Total recebido</div>
          <div className="text-2xl font-bold text-blue-600">{totais ? `R$ ${formatCurrency(Number(totais.real_total_recebido || 0))}` : 'R$ 0,00'}</div>
        </div>
        <div className="bg-white border rounded p-4">
          <div className="text-sm text-gray-600 mb-1">Total pago</div>
          <div className="text-2xl font-bold text-red-600">{totais ? `R$ ${formatCurrency(Number(totais.real_total_pago || 0))}` : 'R$ 0,00'}</div>
        </div>
        <div className="bg-white border rounded p-4">
          <div className="text-sm text-gray-600 mb-1">Saldo Atual</div>
          <div className={`text-2xl font-bold ${Number(totais?.saldo_atual || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{totais ? `R$ ${formatCurrency(Number(totais.saldo_atual || 0))}` : 'R$ 0,00'}</div>
        </div>
        <div className="bg-white border rounded p-4">
          <div className="text-sm text-gray-600 mb-1">Previsão Saldo Mês Atual</div>
          <div className={`text-2xl font-bold ${Number(totais?.previsao_saldo || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{totais ? `R$ ${formatCurrency(Number(totais.previsao_saldo || 0))}` : 'R$ 0,00'}</div>
        </div>
      </div>

      {/* Charts Section */}
      {chartsLoading ? (
        <div className="text-center py-8 text-gray-500">Carregando gráficos...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ExpensesBarChart data={expensesByGroup} />
          <MonthlyEvolutionChart data={monthlyData} />
        </div>
      )}
    </div>
  )
}
