import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAppStore } from '../store/AppStore'
import { hasBackend } from '../lib/runtime'
import { listSchedules, listTransactions } from '../services/db'
import { Icon } from '../components/ui/Icon'
import { PageInfo } from '../components/ui/PageInfo'
import { formatMoneyBr } from '../utils/format'

type CalendarItem = {
  id: string
  date: Date
  operacao: string
  status: string
  entrada: number
  saida: number
  descricao: string
  tipo: 'agendamento' | 'transacao'
}

function monthRange(d = new Date()) {
  const from = new Date(d.getFullYear(), d.getMonth(), 1)
  const to = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  return { from, to }
}

export default function Calendar() {
  const store = useAppStore()
  const [params, setParams] = useSearchParams()
  const cached = (() => {
    try { return localStorage.getItem('calendar.month') || '' } catch { return '' }
  })()
  const initialMonth = params.get('month') || cached || new Date().toISOString().slice(0, 7)
  const [month, setMonth] = useState(initialMonth)
  const [loading, setLoading] = useState(false)

  const [remoteSchedules, setRemoteSchedules] = useState<any[]>([])
  const [remoteTransactions, setRemoteTransactions] = useState<any[]>([])

  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    try { localStorage.setItem('calendar.month', month) } catch { }
    setParams(p => { p.set('month', month); return p }, { replace: true })

    if (hasBackend) {
      setLoading(true)
      Promise.all([listSchedules(1000), listTransactions(1000)]).then(([s, t]) => {
        if (s.data) setRemoteSchedules(s.data)
        if (t.data) setRemoteTransactions(t.data)
        setLoading(false)
      })
    }
  }, [month, setParams])

  const currentDate = useMemo(() => {
    const [y, m] = month.split('-').map(Number)
    return new Date(y, m - 1, 1)
  }, [month])
  const { from, to } = monthRange(currentDate)

  // Helper to parse date string YYYY-MM-DD to a local date object
  // considering the timezone to avoid "previous day" issues when doing new Date()
  const parseLocalDate = (dateStr: string) => {
    if (!dateStr) return new Date()
    // Append T12:00:00 to ensure we are in the middle of the day, avoiding timezone shifts to previous day
    return new Date(dateStr.split('T')[0] + 'T12:00:00')
  }

  const items = useMemo(() => {
    const schedules = hasBackend ? remoteSchedules : store.schedules
    const transactions = hasBackend ? remoteTransactions : store.transactions

    const list: CalendarItem[] = []

    // Processar Agendamentos
    schedules.forEach((s: any) => {
      const d = parseLocalDate(s.proxima_vencimento || s.ano_mes_inicial)
      if (d >= from && d <= to) {
        // Use installment value (valor_parcela) if available (common for variable/installments), 
        // fallback to main value (common for fixed with no specific parcel value)
        const val = Number(s.valor_parcela) || Number(s.valor)

        list.push({
          id: s.id,
          date: d,
          operacao: s.operacao,
          status: s.situacao === 2 ? 'pago' : 'pendente', // 2 = realizado/pago
          entrada: (s.operacao === 'receita' || s.operacao === 'aporte') ? val : 0,
          saida: (s.operacao === 'despesa' || s.operacao === 'retirada') ? val : 0,
          descricao: s.historico || 'Agendamento',
          tipo: 'agendamento'
        })
      }
    })

    // Processar Transações (Realizadas)
    transactions.forEach((t: any) => {
      const d = parseLocalDate(t.data_vencimento || t.data_lancamento)
      if (d >= from && d <= to) {
        list.push({
          id: t.id,
          date: d,
          operacao: t.operacao,
          status: t.status,
          entrada: Number(t.valor_entrada || 0),
          saida: Number(t.valor_saida || 0),
          descricao: t.historico || 'Transação',
          tipo: 'transacao'
        })
      }
    })

    return list.sort((a, b) => a.date.getTime() - b.date.getTime())
  }, [store.schedules, store.transactions, remoteSchedules, remoteTransactions, from, to])

  const totals = useMemo(() => {
    const totalAPagar = items.filter(i => i.operacao === 'despesa' || i.operacao === 'retirada').reduce((acc, i) => acc + i.saida, 0)
    const totalAReceber = items.filter(i => i.operacao === 'receita' || i.operacao === 'aporte').reduce((acc, i) => acc + i.entrada, 0)
    const totalPago = items.filter(i => (i.operacao === 'despesa' || i.operacao === 'retirada') && (i.status === 'pago' || i.status === 'realizado')).reduce((acc, i) => acc + i.saida, 0)
    const totalRecebido = items.filter(i => (i.operacao === 'receita' || i.operacao === 'aporte') && (i.status === 'recebido' || i.status === 'realizado')).reduce((acc, i) => acc + i.entrada, 0)
    return { totalAPagar, totalAReceber, totalPago, totalRecebido }
  }, [items])

  const days = Array.from({ length: to.getDate() }, (_, i) => i + 1)
  const startDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay() // 0 = Sunday
  const emptyDays = Array.from({ length: startDay }, (_, i) => i)

  const weekDays = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']

  function fmtMonth(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
  function prevMonth() { const d = new Date(currentDate); d.setMonth(d.getMonth() - 1); setMonth(fmtMonth(d)) }
  function nextMonth() { const d = new Date(currentDate); d.setMonth(d.getMonth() + 1); setMonth(fmtMonth(d)) }
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (11 - i))
    const key = fmtMonth(d)
    return { key, label: d.toLocaleString('default', { month: 'long' }).toUpperCase() + ' ' + d.getFullYear() }
  })

  function getStatusColor(i: any) {
    if (i.status === 'pago' || i.status === 'recebido' || i.status === 'realizado') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
    const isOut = i.operacao === 'despesa' || i.operacao === 'retirada'
    const base = isOut ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
    const overdue = i.date < new Date() && (i.status === 'pendente' || i.status === 'agendado')
    return overdue ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : base
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button className="px-2 py-1 text-sm border dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200" onClick={prevMonth} aria-label="Mês anterior">Anterior</button>
          <select
            className="border dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            value={month}
            onChange={e => setMonth(e.target.value)}
            aria-label="Selecionar mês"
          >
            {monthOptions.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
          <button className="px-2 py-1 text-sm border dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200" onClick={nextMonth} aria-label="Próximo mês">Próximo</button>
        </div>
        <PageInfo>
          Visualize suas finanças em um formato de calendário mensal.
          <ul className="list-disc pl-4 mt-2 space-y-1">
            <li>Use as setas para navegar entre os meses.</li>
            <li>Clique em um dia para ver os detalhes dos lançamentos.</li>
            <li>Os indicadores coloridos mostram se há Receitas (Azul) ou Despesas (Vermelho) no dia.</li>
          </ul>
        </PageInfo>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded p-3">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Total a pagar:</div>
          <div className="text-base font-bold text-gray-800 dark:text-gray-100">R$ {formatMoneyBr(totals.totalAPagar)}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded p-3">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Total a receber:</div>
          <div className="text-base font-bold text-gray-800 dark:text-gray-100">R$ {formatMoneyBr(totals.totalAReceber)}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded p-3">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Total já pago:</div>
          <div className="text-base font-bold text-gray-800 dark:text-gray-100">R$ {formatMoneyBr(totals.totalPago)}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded p-3">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Total já recebido:</div>
          <div className="text-base font-bold text-gray-800 dark:text-gray-100">R$ {formatMoneyBr(totals.totalRecebido)}</div>
        </div>
      </div>
      {loading && <div role="status" aria-live="polite" className="text-sm text-gray-600 dark:text-gray-400">Carregando…</div>}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map(d => (
          <div key={d} className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 py-1 uppercase border-b dark:border-gray-700 mb-2">{d}</div>
        ))}

        {emptyDays.map(d => <div key={`empty-${d}`} className="bg-gray-50 dark:bg-gray-800/50 border dark:border-gray-700 rounded p-2 min-h-[100px] opacity-50"></div>)}

        {days.map(d => {
          const currentDayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), d)
          const isToday = new Date().toDateString() === currentDayDate.toDateString()

          return (
            <div
              key={d}
              className={`bg-white dark:bg-gray-800 border dark:border-gray-700 rounded p-2 min-h-[100px] hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer ${isToday ? 'ring-2 ring-blue-500' : ''}`}
              onClick={() => {
                setSelectedDay(currentDayDate)
                setModalOpen(true)
              }}
            >
              <div className={`text-xs ${isToday ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>{d.toString().padStart(2, '0')}</div>
              <div className="mt-1 flex justify-center items-center h-full pb-4">
                {(() => {
                  const dayItems = items.filter(i => i.date.getDate() === d)
                  if (dayItems.length === 0) return null

                  const totalVal = dayItems.reduce((acc, i) => acc + Math.max(i.entrada, i.saida), 0)
                  const count = dayItems.length


                  const hasRevenue = dayItems.some(i => i.operacao === 'receita' || i.operacao === 'aporte')
                  const hasExpense = dayItems.some(i => i.operacao === 'despesa' || i.operacao === 'retirada')

                  return (
                    <div className="flex gap-1" title={`${count} itens - Total: R$ ${totalVal.toFixed(2)}`}>
                      {hasRevenue && <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>}
                      {hasExpense && <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>}
                    </div>
                  )

                })()}
              </div>
            </div>
          )
        })}
      </div>

      {/* Details Modal */}
      {modalOpen && selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg overflow-hidden animate-scale-in">
            <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-800">
              <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-100">
                Detalhes do Dia {selectedDay.toLocaleDateString()}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <Icon name="close" className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <div className="p-4 max-h-[60vh] overflow-y-auto">
              {(() => {
                const dayItems = items.filter(i => i.date.getDate() === selectedDay.getDate())

                if (dayItems.length === 0) {
                  return <div className="text-center text-gray-500 dark:text-gray-400 py-8">Nenhum lançamento para este dia.</div>
                }

                return (
                  <div className="space-y-2">
                    {dayItems.map((item, idx) => (
                      <div key={idx} className={`p-3 rounded-lg border dark:border-gray-700 flex items-center justify-between ${getStatusColor(item)} bg-opacity-10 border-opacity-20`}>
                        <div className="flex-1 min-w-0 mr-4">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs uppercase font-bold px-1.5 py-0.5 rounded ${item.operacao === 'receita' ? 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-100' : 'bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-100'}`}>
                              {item.operacao}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 uppercase">{item.tipo}</span>
                          </div>
                          <p className="font-medium truncate text-gray-900 dark:text-gray-100" title={item.descricao}>{item.descricao}</p>
                        </div>
                        <div className="text-right whitespace-nowrap">
                          <div className="font-bold text-gray-800 dark:text-gray-100">
                            {item.entrada > 0 ? `+ ${formatMoneyBr(item.entrada)}` : `- ${formatMoneyBr(item.saida)}`}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">{item.status}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>

            <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-end">
              <button
                className="px-4 py-2 bg-gray-800 dark:bg-gray-700 text-white rounded hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
                onClick={() => setModalOpen(false)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
