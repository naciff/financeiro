import { useDashboardData } from '../hooks/useDashboardData'
import { useChartData } from '../hooks/useChartData'
import { formatCurrency } from '../utils/formatCurrency'
import { MonthlyEvolutionChart } from '../components/charts/MonthlyEvolutionChart'
import { ExpensesPieChart } from '../components/charts/ExpensesPieChart'

export default function Dashboard() {
  const {
    totais,
    totalDespesas,
    totalReceitas,
    totalReceitasFixasMes,
    totalReceitasDivisaoLucro,
    totalRetiradaFixaMes,
    totalDespesasGeral, // New field 
    loading: metricsLoading
  } = useDashboardData()
  const { monthlyData, expensesByGroup, loading: chartsLoading } = useChartData()

  if (metricsLoading) {
    return <div className="p-6">Carregando...</div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>

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
          <div className="text-sm text-gray-600 mb-1">Total de Despesas</div>
          <div className="text-2xl font-bold text-black">R$ {formatCurrency(totalDespesasGeral)}</div>
        </div>
        <div className="bg-white border rounded p-4">
          <div className="text-sm text-gray-600 mb-1">Total Divisão de Lucro Anual</div>
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
          <ExpensesPieChart data={expensesByGroup} />
          <MonthlyEvolutionChart data={monthlyData} />
        </div>
      )}
    </div>
  )
}
