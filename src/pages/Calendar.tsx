import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAppStore } from '../store/AppStore'
import { hasBackend } from '../lib/runtime'
import { listSchedules, listTransactions } from '../services/db'

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

  const items = useMemo(() => {
    const schedules = hasBackend ? remoteSchedules : store.schedules
    const transactions = hasBackend ? remoteTransactions : store.transactions

    const list: CalendarItem[] = []

    // Processar Agendamentos
    schedules.forEach((s: any) => {
      const d = new Date(s.proxima_vencimento || s.ano_mes_inicial)
      if (d >= from && d <= to) {
        list.push({
          id: s.id,
          date: d,
          operacao: s.operacao,
          status: s.situacao === 2 ? 'pago' : 'pendente', // 2 = realizado/pago
          entrada: (s.operacao === 'receita' || s.operacao === 'aporte') ? Number(s.valor) : 0,
          saida: (s.operacao === 'despesa' || s.operacao === 'retirada') ? Number(s.valor) : 0,
          descricao: s.historico || 'Agendamento',
          tipo: 'agendamento'
        })
      }
    })

    // Processar Transações (Realizadas)
    transactions.forEach((t: any) => {
      const d = new Date(t.data_vencimento || t.data_lancamento)
      if (d >= from && d <= to) {
        // Evitar duplicar se já existir um agendamento correspondente (opcional, mas difícil sem link direto)
        // Por enquanto mostramos tudo
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

  function fmtMonth(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
  function prevMonth() { const d = new Date(currentDate); d.setMonth(d.getMonth() - 1); setMonth(fmtMonth(d)) }
  function nextMonth() { const d = new Date(currentDate); d.setMonth(d.getMonth() + 1); setMonth(fmtMonth(d)) }
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (11 - i))
    const key = fmtMonth(d)
    return { key, label: d.toLocaleString('default', { month: 'long' }).toUpperCase() + ' ' + d.getFullYear() }
  })

  function colorFor(i: CalendarItem) {
    if (i.status === 'pago' || i.status === 'recebido' || i.status === 'realizado') return 'bg-blue-100 text-blue-700'
    const isOut = i.operacao === 'despesa' || i.operacao === 'retirada'
    const base = isOut ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
    const overdue = i.date < new Date() && (i.status === 'pendente' || i.status === 'agendado')
    return overdue ? 'bg-amber-100 text-amber-700' : base
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Calendário Financeiro</h1>
      <div className="flex items-center gap-4">
        <button className="px-3 py-2 border rounded hover:bg-gray-50" onClick={prevMonth} aria-label="Mês anterior">Anterior</button>
        <select
          className="border rounded px-3 py-2"
          value={month}
          onChange={e => setMonth(e.target.value)}
          aria-label="Selecionar mês"
        >
          {monthOptions.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
        <button className="px-3 py-2 border rounded hover:bg-gray-50" onClick={nextMonth} aria-label="Próximo mês">Próximo</button>
        <span className="text-sm text-gray-600">Atual: {new Date().toLocaleDateString()}</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border rounded p-4">Total a pagar: R$ {totals.totalAPagar.toFixed(2)}</div>
        <div className="bg-white border rounded p-4">Total a receber: R$ {totals.totalAReceber.toFixed(2)}</div>
        <div className="bg-white border rounded p-4">Total já pago: R$ {totals.totalPago.toFixed(2)}</div>
        <div className="bg-white border rounded p-4">Total já recebido: R$ {totals.totalRecebido.toFixed(2)}</div>
      </div>
      {loading && <div role="status" aria-live="polite" className="text-sm text-gray-600">Carregando…</div>}
      <div className="grid grid-cols-7 gap-2">
        {days.map(d => (
          <div key={d} className="bg-white border rounded p-2 min-h-[100px]">
            <div className="text-xs text-gray-500">{d.toString().padStart(2, '0')}</div>
            <div className="mt-1 space-y-1">
              {items.filter(i => i.date.getDate() === d).map((i, idx) => (
                <div key={idx} className={`text-xs rounded px-2 py-1 ${colorFor(i)} truncate`} title={`${i.descricao} - R$ ${Math.max(i.entrada, i.saida).toFixed(2)}`}>
                  {i.tipo === 'agendamento' ? '📅 ' : ''}
                  {(i.operacao === 'despesa' || i.operacao === 'retirada') ? `- R$ ${i.saida.toFixed(2)}` : `+ R$ ${i.entrada.toFixed(2)}`}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
