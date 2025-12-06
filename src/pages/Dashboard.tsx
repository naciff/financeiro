import { useDashboardData } from '../hooks/useDashboardData'
import { useChartData } from '../hooks/useChartData'
import { formatCurrency } from '../utils/formatCurrency'
import { MonthlyEvolutionChart } from '../components/charts/MonthlyEvolutionChart'
import { ExpensesPieChart } from '../components/charts/ExpensesPieChart'

export default function Dashboard() {
  const { totais, totalDespesas, totalReceitas, totalReceitasFixasMes, totalReceitasDivisaoLucro, totalRetiradaFixaMes, loading } = useDashboardData()
  const { monthlyData, expensesByGroup, loading: chartsLoading } = useChartData()

  if (loading) {
    return <div className="p-6">Carregando...</div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      {/* Top Metrics - 4 columns */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border rounded p-4">
          <div className="text-sm text-gray-600 mb-1">Valor Total Entrada (Fixa/Mês)</div>
          <div className="text-2xl font-bold text-green-600">R$ {formatCurrency(totalReceitasFixasMes)}</div>
        </div>
        <div className="bg-white border rounded p-4">
          <div className="text-sm text-gray-600 mb-1">Valor Total Entrada (Divisão Lucro)</div>
          <div className="text-2xl font-bold text-green-600">R$ {formatCurrency(totalReceitasDivisaoLucro)}</div>
        </div>
        <div className="bg-white border rounded p-4">
          <div className="text-sm text-gray-600 mb-1">Valor Total de Despesas</div>
          <div className="text-2xl font-bold text-red-600">R$ {formatCurrency(totalDespesas)}</div>
        </div>
        <div className="bg-white border rounded p-4">
          <div className="text-sm text-gray-600 mb-1">Valor de Retirada Fixa Mês</div>
          <div className="text-2xl font-bold text-red-600">R$ {formatCurrency(totalRetiradaFixaMes)}</div>
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

      {/* Bottom Totals - 4 columns */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border rounded p-4">
          <div className="text-sm text-gray-600 mb-1">Total a pagar</div>
          <div className="text-2xl font-bold">{totais ? `R$ ${formatCurrency(Number(totais.total_a_pagar))}` : 'R$ 0,00'}</div>
        </div>
        <div className="bg-white border rounded p-4">
          <div className="text-sm text-gray-600 mb-1">Total a receber</div>
          <div className="text-2xl font-bold">{totais ? `R$ ${formatCurrency(Number(totais.total_a_receber))}` : 'R$ 0,00'}</div>
        </div>
        <div className="bg-white border rounded p-4">
          <div className="text-sm text-gray-600 mb-1">Total pago</div>
          <div className="text-2xl font-bold">{totais ? `R$ ${formatCurrency(Number(totais.total_pago))}` : 'R$ 0,00'}</div>
        </div>
        <div className="bg-white border rounded p-4">
          <div className="text-sm text-gray-600 mb-1">Total recebido</div>
          <div className="text-2xl font-bold">{totais ? `R$ ${formatCurrency(Number(totais.total_recebido))}` : 'R$ 0,00'}</div>
        </div>
      </div>
    </div>
  )
}
