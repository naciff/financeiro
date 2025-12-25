import { useDashboardData } from '../hooks/useDashboardData'
import { useChartData } from '../hooks/useChartData'
import { formatCurrency } from '../utils/formatCurrency'
import { MonthlyEvolutionChart } from '../components/charts/MonthlyEvolutionChart'
import { ExpensesBarChart } from '../components/charts/ExpensesBarChart'
import { useState, useEffect, useRef } from 'react'
import { getProfile } from '../services/db'
import { useAppStore } from '../store/AppStore'
import { CountUp } from '../components/ui/CountUp'
import { DashboardCustomizeModal } from '../components/modals/DashboardCustomizeModal'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'

export default function Dashboard() {
  const store = useAppStore()
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [userName, setUserName] = useState('')
  const [detailGroup, setDetailGroup] = useState<any | null>(null)
  const detailsRef = useRef<HTMLDivElement>(null)

  // Customization State
  const [showCustomizeModal, setShowCustomizeModal] = useState(false)

  // Define Widgets
  const WIDGETS = [
    { id: 'total_entrada_fixa', label: 'Total entrada (Fixa/Mês)', icon: 'arrow_upward', color: 'text-green-600', countUp: (data: any) => data?.totalReceitasFixasMes || 0, textColor: 'text-profit', isCurrency: true },
    { id: 'total_despesa_fixa', label: 'Total despesas (Fixa/Mês)', icon: 'arrow_downward', color: 'text-red-600', countUp: (data: any) => data?.totalRetiradaFixaMes || 0, textColor: 'text-loss', isCurrency: true },
    { id: 'total_despesa', label: 'Total despesas variáveis', icon: 'receipt_long', color: 'text-red-500', countUp: (data: any) => data?.totalDespesas || 0, textColor: 'text-loss', isCurrency: true },
    { id: 'valores_aberto', label: 'Valores em Aberto', icon: 'warning', color: 'text-red-600', countUp: (data: any) => Number(data?.totais?.total_atrasado || 0), textColor: (data: any) => Number(data?.totais?.total_atrasado || 0) >= 0 ? 'text-profit' : 'text-loss', isCurrency: true },
    { id: 'despesas_lancadas', label: 'Total de despesas lançadas', icon: 'receipt_long', color: 'text-blue-600', countUp: (data: any) => data?.totalDespesasGeral || 0, textColor: 'text-text-main-light dark:text-text-main-dark', isCurrency: true },
    { id: 'total_recebido', label: 'Total recebido (Livro Caixa)', icon: 'attach_money', color: 'text-blue-600', countUp: (data: any) => Number(data?.totais?.real_total_recebido || 0), textColor: 'text-neutral', isCurrency: true },
    { id: 'total_pago', label: 'Total pago (Livro Caixa)', icon: 'money_off', color: 'text-red-600', countUp: (data: any) => Number(data?.totais?.real_total_pago || 0), textColor: 'text-loss', isCurrency: true },
    { id: 'saldo_atual', label: 'Saldo Atual', icon: 'account_balance_wallet', color: 'text-gray-600', countUp: (data: any) => Number(data?.totais?.saldo_atual || 0), textColor: (data: any) => Number(data?.totais?.saldo_atual || 0) >= 0 ? 'text-profit' : 'text-loss', isCurrency: true },
    { id: 'previsao_saldo', label: 'Previsão Saldo Mês Atual', icon: 'trending_up', color: 'text-gray-600', countUp: (data: any) => Number(data?.totais?.previsao_saldo || 0), textColor: (data: any) => Number(data?.totais?.previsao_saldo || 0) >= 0 ? 'text-profit' : 'text-loss', isCurrency: true },
    { id: 'saldo_aplicacao', label: 'Saldo Aplicação', icon: 'savings', color: 'text-blue-500', countUp: (data: any) => data?.totais?.saldo_aplicacao || 0, textColor: (data: any) => Number(data?.totais?.saldo_aplicacao || 0) >= 0 ? 'text-profit' : 'text-loss', isCurrency: true },
    { id: 'divisao_lucro', label: 'Previsão divisão de lucro (Anual)', icon: 'savings', color: 'text-green-600', countUp: (data: any) => data?.totalReceitasDivisaoLucro || 0, textColor: 'text-profit', isCurrency: true },
  ]

  const [selectedWidgets, setSelectedWidgets] = useState<string[]>(() => {
    const saved = localStorage.getItem('dashboard_widgets')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        console.error('Error parsing saved widgets', e)
      }
    }
    return WIDGETS.map(w => w.id)
  })

  // Save changes to localStorage
  const handleSaveWidgets = (newSelection: string[]) => {
    setSelectedWidgets(newSelection)
    localStorage.setItem('dashboard_widgets', JSON.stringify(newSelection))
  }

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

  const dashboardData = useDashboardData(month, year, store.activeOrganization)
  const {
    totais,
    totalDespesas,
    totalReceitas,
    totalReceitasFixasMes,
    totalReceitasDivisaoLucro,
    totalRetiradaFixaMes,
    totalDespesasGeral,
    loading: metricsLoading
  } = dashboardData

  const { monthlyData, expensesByGroup, loading: chartsLoading } = useChartData(store.activeOrganization)

  if (metricsLoading) {
    return <LoadingSpinner />
  }

  // Helper to render widget
  const renderWidget = (widgetId: string) => {
    const widget = WIDGETS.find(w => w.id === widgetId)
    if (!widget) return null

    // Evaluate dynamic value logic
    // We pass the whole dashboardData hook result to countUp function
    const value = widget.countUp(dashboardData)
    const textColorClass = typeof widget.textColor === 'function' ? widget.textColor(dashboardData) : widget.textColor

    return (
      <div key={widget.id} className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg border border-border-light dark:border-border-dark shadow-sm flex items-center animate-in fade-in zoom-in duration-300">
        <div className={`${widget.color} mr-4`}>
          <span className="material-icons-outlined text-4xl">{widget.icon}</span>
        </div>
        <div>
          <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-1">{widget.label}</p>
          <h3 className={`text-xl font-bold ${textColorClass}`}>
            <CountUp end={value} />
          </h3>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative">
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

        {/* Customize Button */}
        <button
          onClick={() => setShowCustomizeModal(true)}
          className="p-2 text-gray-500 dark:text-gray-400 hover:text-primary transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          title="Customizar Dashboard"
        >
          <span className="material-icons-outlined text-2xl">settings</span>
        </button>
      </div>

      {/* Dynamic Widget Grid - Auto Flow */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6 mb-6">
        {WIDGETS.filter(w => selectedWidgets.includes(w.id)).map(w => renderWidget(w.id))}
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

      {/* Customization Modal */}
      <DashboardCustomizeModal
        isOpen={showCustomizeModal}
        onClose={() => setShowCustomizeModal(false)}
        initialSelection={selectedWidgets}
        onSave={handleSaveWidgets}
        availableWidgets={WIDGETS.map(w => ({ id: w.id, label: w.label }))}
      />
    </div>
  )
}
