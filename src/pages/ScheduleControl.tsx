
import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/AppStore'
import { hasBackend } from '../lib/runtime'
import { Icon } from '../components/ui/Icon'
import { PageInfo } from '../components/ui/PageInfo'
import { ScheduleSummaryView } from '../components/schedule/ScheduleSummaryView'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { AlertModal } from '../components/ui/AlertModal'
import { TransactionModal } from '../components/modals/TransactionModal'

import { BulkTransactionModal } from '../components/modals/BulkTransactionModal'
import { listFinancials, listAccounts, listCommitmentGroups, listCostCenters, confirmProvision, updateFinancial, updateScheduleAndFutureFinancials, getFinancialItemByScheduleAndDate, updateSchedule, deleteFinancial, listFinancialsBySchedule, createTransaction, skipFinancialItem, listAccountBalances, listTransactions } from '../services/db'
import { formatMoneyBr } from '../utils/format'
import { useDailyAutomation } from '../hooks/useDailyAutomation'
import { LinkedItemsModal } from '../components/modals/LinkedItemsModal'
import { FloatingLabelSelect } from '../components/ui/FloatingLabelSelect'

type Filter = 'vencidos' | '7dias' | 'mesAtual' | 'proximoMes' | '2meses' | '6meses' | '12meses' | 'fimAno'

const GROUP_TITLES = ['Meses Anteriores', 'Vencidos', 'Próximos Lançamentos']

function toBr(iso: string) {
  if (!iso) return ''
  // Fix: Parse date without timezone conversion
  const dateStr = iso.split('T')[0] // Get YYYY-MM-DD
  if (!dateStr) return ''
  const [yyyy, mm, dd] = dateStr.split('-')
  if (!yyyy || !mm || !dd) return ''
  return `${dd}/${mm}/${yyyy}`
}

export default function ScheduleControl() {
  const navigate = useNavigate()
  const navigator = useNavigate() // Typo fix if needed, but original used useNavigate
  const store = useAppStore()
  const [remote, setRemote] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [modal, setModal] = useState<any | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<Filter>('mesAtual')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<{ key: string, dir: 'asc' | 'desc' }>({ key: 'vencimento', dir: 'asc' })
  const [activeMainTab, setActiveMainTab] = useState<'realizar' | 'resumida' | 'saldos'>('realizar')
  const [msg, setMsg] = useState('')
  const [showTransactionModal, setShowTransactionModal] = useState(false)

  // Filtros adicionais
  const [filterCaixa, setFilterCaixa] = useState('')
  const [filterOp, setFilterOp] = useState('Todas')
  const [filterGrupo, setFilterGrupo] = useState('')
  const [caixas, setCaixas] = useState<any[]>([])
  const [grupos, setGrupos] = useState<any[]>([])
  const [costCenters, setCostCenters] = useState<any[]>([])
  const [filterCostCenter, setFilterCostCenter] = useState('')
  const [balances, setBalances] = useState<any[]>([])

  // Estados do Modal
  const [modalContaId, setModalContaId] = useState('')
  const [modalData, setModalData] = useState('')
  const [modalDataLancamento, setModalDataLancamento] = useState('')
  const [modalValor, setModalValor] = useState(0)
  const [modalHistorico, setModalHistorico] = useState('')
  const [modalNotaFiscal, setModalNotaFiscal] = useState('')
  const [modalDetalhes, setModalDetalhes] = useState('')

  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, item: any } | null>(null)
  const [editValueModal, setEditValueModal] = useState<{ open: boolean, item: any, value: number } | null>(null)
  const [editDateModal, setEditDateModal] = useState<{ open: boolean, item: any, date: string } | null>(null)
  const [showUpdateScheduleModal, setShowUpdateScheduleModal] = useState(false)

  const [pendingConfirmation, setPendingConfirmation] = useState<any>(null)
  const [showBulkConfirm, setShowBulkConfirm] = useState(false)
  const [showSkipConfirm, setShowSkipConfirm] = useState(false)
  const [skipId, setSkipId] = useState<string | null>(null)

  // Test Report Modal State
  const [showTestConfirm, setShowTestConfirm] = useState(false)
  const [testResultModal, setTestResultModal] = useState({ open: false, title: '', message: '' })

  // Carregar caixas e grupos
  const [statusMessage, setStatusMessage] = useState('')
  const [confirmItem, setConfirmItem] = useState<any>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  // Bulk Launch State
  // Bulk Launch State derived from 'conferido' status
  const [showBulkLaunchModal, setShowBulkLaunchModal] = useState(false)




  async function handleConfirmSingle() {
    if (!confirmItem) return
    setShowConfirmModal(false)

    try {
      const item = confirmItem
      // Optimistic Update: Immediately remove the confirmed item from the view
      setRemote(prev => prev.filter(r => r.id !== item.id))

      const todayIso = new Date().toISOString().split('T')[0]

      const res = await confirmProvision(item.id, {
        valor: item.despesa || item.receita,
        data: todayIso,
        cuentaId: item.caixaId || (caixas.find(c => c.principal)?.id),
        compromisso_id: item.compromisso_id,
        grupo_compromisso_id: item.grupo_compromisso_id,
        cost_center_id: item.cost_center_id
      })

      if (res.error) throw res.error
      if (res.data && !res.data.success) throw new Error(res.data.message)

      if (item.scheduleId) {
        const isVariable = item.tipo === 'variavel'
        const isLastInstallment = isVariable && (item.parcela === item.totalParcelas)

        if (item.tipo === 'fixo' || (isVariable && !isLastInstallment)) {
          const nextDue = getNextVencimento(item.vencimento, item.periodo)
          console.log('Rolling over schedule:', item.scheduleId, '(', item.periodo, ') to', nextDue.toISOString())

          let nextHistorico = item.historico
          if (isVariable) {
            const match = (item.historico || '').match(/\((\d+)\/(\d+)\)/)
            if (match) {
              const cur = parseInt(match[1], 10)
              const total = parseInt(match[2], 10)
              if (cur < total) {
                nextHistorico = item.historico.replace(`(${cur}/${total})`, `(${cur + 1}/${total})`)
              }
            }
          }

          await updateSchedule(item.scheduleId, {
            proxima_vencimento: nextDue.toISOString(),
            historico: nextHistorico
          })
        } else if (isVariable && isLastInstallment) {
          console.log('Concluding variable schedule:', item.scheduleId)
          await updateSchedule(item.scheduleId, { situacao: 2 })
        }
      }

      // Force page reload as requested by user ("F5 automatico")
      window.location.reload()

    } catch (error: any) {
      alert('Erro ao confirmar: ' + error.message)
    } finally {
      setConfirmItem(null)
    }
  }
  function getNextVencimento(vencimentoIso: string, periodo: string) {
    const dateParts = vencimentoIso.split('T')[0].split('-')
    const [y, m, d] = dateParts.map(Number)
    const currentDue = new Date(Date.UTC(y, m - 1, d))
    const nextDue = new Date(currentDue)

    switch (periodo) {
      case 'semanal':
        nextDue.setUTCDate(nextDue.getUTCDate() + 7)
        break
      case 'quinzenal':
        nextDue.setUTCDate(nextDue.getUTCDate() + 15)
        break
      case 'mensal':
      default:
        nextDue.setUTCMonth(nextDue.getUTCMonth() + 1)
        break
      case 'bimestral':
        nextDue.setUTCMonth(nextDue.getUTCMonth() + 2)
        break
      case 'trimestral':
        nextDue.setUTCMonth(nextDue.getUTCMonth() + 3)
        break
      case 'semestral':
        nextDue.setUTCMonth(nextDue.getUTCMonth() + 6)
        break
      case 'anual':
        nextDue.setUTCFullYear(nextDue.getUTCFullYear() + 1)
        break
      case 'unico':
        // No rollover
        break
    }
    return nextDue
  }

  const [bulkDate, setBulkDate] = useState('')
  const [bulkAccount, setBulkAccount] = useState('')

  const [showLinkedItemsModal, setShowLinkedItemsModal] = useState(false)
  const [showSelectAllConfirm, setShowSelectAllConfirm] = useState(false)
  const [linkedItems, setLinkedItems] = useState<any[]>([])

  const { runNow } = useDailyAutomation()

  useEffect(() => {
    if (hasBackend && store.activeOrganization) {
      const orgId = store.activeOrganization
      listAccounts(orgId).then(r => { if (!r.error && r.data) setCaixas(r.data as any) })
      listCommitmentGroups(orgId).then(r => { if (!r.error && r.data) setGrupos(r.data as any) })
      listCostCenters(orgId).then(r => { if (!r.error && r.data) setCostCenters(r.data as any) })
      listAccountBalances(orgId).then(r => { if (!r.error && r.data) setBalances(r.data as any) })
    }
  }, [store.activeOrganization])

  // Lock body scroll when modal is open
  useEffect(() => {
    if (modal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }
    return () => { document.body.style.overflow = 'auto' }
  }, [modal])

  function toggleSort(key: string) {
    setSort(s => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })
  }

  const [partialModal, setPartialModal] = useState<{ open: boolean, item: any } | null>(null)

  // Carregar dados do Livro Financeiro (Todos para permitir histórico no resumo)
  async function refresh() {
    if (hasBackend && store.activeOrganization) {
      const r = await listFinancials({ orgId: store.activeOrganization })
      if (!r.error && r.data) {
        setRemote(r.data as any)
      }
      const t = await listTransactions(5000, store.activeOrganization)
      if (!t.error && t.data) {
        setTransactions(t.data as any)
      }
    }
  }

  useEffect(() => {
    refresh()
  }, [store.activeOrganization])

  useEffect(() => {
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [])


  const rows = useMemo(() => {
    // Se estiver usando store local, não temos tabela livro_financeiro, então fallback ou vazio?
    // User pediu para usar a tabela nova. Vamos assumir backend apenas para essa feature ou adaptar.
    // Como a migration é backend only, store.schedules não vai funcionar aqui.
    // Vamos usar 'remote' apenas.
    const src = remote.filter((r: any) => r.situacao === 1 || r.situacao === 2)
    const now = new Date()
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    // Calcular data limite baseado no filtro
    function getFilterEndDate(): Date {
      switch (filter) {
        case 'vencidos': return now
        case '7dias': { const n = new Date(now); n.setDate(n.getDate() + 7); return n }
        case 'mesAtual': return endMonth
        case 'proximoMes': return new Date(now.getFullYear(), now.getMonth() + 2, 0)
        case '2meses': { const e = new Date(now); e.setMonth(e.getMonth() + 2); return e }
        case '6meses': { const e = new Date(now); e.setMonth(e.getMonth() + 6); return e }
        case '12meses': { const e = new Date(now); e.setMonth(e.getMonth() + 12); return e }
        case 'fimAno': return new Date(now.getFullYear(), 11, 31)
        default: return endMonth
      }
    }

    // Filtro de data
    function within(d: Date) {
      switch (filter) {
        case 'vencidos': return d <= now
        case '7dias': { const n = new Date(now); n.setDate(n.getDate() + 7); return d > now && d <= n }
        case 'mesAtual': return d <= endMonth
        case 'proximoMes': { const s = new Date(now.getFullYear(), now.getMonth() + 1, 1); const e = new Date(now.getFullYear(), now.getMonth() + 2, 0); return d >= s && d <= e }
        case '2meses': { const e = new Date(now); e.setMonth(e.getMonth() + 2); return d > now && d <= e }
        case '6meses': { const e = new Date(now); e.setMonth(e.getMonth() + 6); return d > now && d <= e }
        case '12meses': { const e = new Date(now); e.setMonth(e.getMonth() + 12); return d > now && d <= e }
        case 'fimAno': { const e = new Date(now.getFullYear(), 11, 31); return d > now && d <= e }
      }
    }

    // Deduplicate src based on item.id
    const seenIds = new Set()
    const uniqueSrc = src.filter((s: any) => {
      if (!s.id) return false
      if (seenIds.has(s.id)) return false
      seenIds.add(s.id)
      return true
    })

    const data = uniqueSrc.map((s: any) => {
      // Usar data_vencimento do livro financeiro
      const vencimentoIso = s.data_vencimento
      if (!vencimentoIso) return null; // Skip invalid rows

      const parts = vencimentoIso.split('T')[0].split('-')
      if (parts.length < 3) return null;

      const [y, m, d_str] = parts.map(Number)

      const today = new Date()
      const utcToday = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
      const utcDue = Date.UTC(y, m - 1, d_str)
      const msPerDay = 1000 * 60 * 60 * 24
      const diffTime = utcToday - utcDue
      const diffDays = Math.floor(diffTime / msPerDay)

      const d = new Date(y, m - 1, d_str)

      // Valor vem direto do livro financeiro
      const valor = Number(s.valor)
      const isReceita = s.operacao === 'receita' || s.operacao === 'aporte'

      let statusMessage = ''
      if (diffDays > 0) {
        statusMessage = `Vencido há ${diffDays} dia(s)...`
      } else if (diffDays === 0) {
        statusMessage = 'Vencimento Hoje...'
      }

      // Mapeamento de campos
      // id_livro Ã© a PK, usamos como id

      // Parse installment info from historico if available "Description (1/3)"
      const match = (s.historico || '').match(/\((\d+)\/(\d+)\)/)
      let parcela = 1
      let totalParcelas = 1
      if (match) {
        parcela = parseInt(match[1], 10)
        totalParcelas = parseInt(match[2], 10)
      }

      return {
        id: s.id,
        operacao: s.operacao,
        vencimento: vencimentoIso,
        vencimentoBr: toBr(vencimentoIso),
        caixa: s.caixa?.nome || '',
        caixaId: s.caixa_id || '',
        cliente: s.cliente?.nome || '',
        compromisso: s.agendamento?.compromisso?.nome || '',
        grupoCompromisso: s.agendamento?.grupo?.nome || '',
        grupoCompromissoId: s.agendamento?.grupo?.id || '',
        historico: s.historico || '',
        notaFiscal: '', // Não temos NF no livro financeiro ainda? Podemos puxar do agendamento se quiser, mas usually é na transação
        detalhes: '',
        especie: s.especie || '',
        receita: isReceita ? valor : 0,
        despesa: !isReceita ? valor : 0,
        parcela: parcela,
        totalParcelas: totalParcelas,
        vencimentoDate: d,
        diasAtraso: diffDays,
        statusMessage: statusMessage,
        agendamento: s.agendamento, // Pass full object for modal checks
        parcial: s.agendamento?.parcial || false,
        scheduleId: s.agendamento?.id || s.id_agendamento,
        tipo: s.agendamento?.tipo,
        periodo: s.agendamento?.periodo,
        conferido: s.conferido || false,
        // Fields for TransactionModal (snake_case) - Force string ID
        cliente_id: s.cliente?.id ? String(s.cliente.id) : (s.cliente_id ? String(s.cliente_id) : ''),
        grupo_compromisso_id: s.agendamento?.grupo?.id ? String(s.agendamento.grupo.id) : (s.grupo_compromisso_id ? String(s.grupo_compromisso_id) : ''),
        compromisso_id: s.agendamento?.compromisso?.id ? String(s.agendamento.compromisso.id) : (s.compromisso_id ? String(s.compromisso_id) : ''),
        cost_center_id: s.cost_center_id || s.agendamento?.cost_center_id || s.agendamento?.cost_center?.id || '',
        // Do not pass objects for 'compromisso' or 'cliente' as they conflict with string names used in Table
        conta_id: s.caixa_id ? String(s.caixa_id) : '',
        caixa_id: s.caixa_id ? String(s.caixa_id) : '',
        valor_entrada: isReceita ? valor : 0,
        valor_saida: !isReceita ? valor : 0,
        data_vencimento: vencimentoIso,
        data_lancamento: s.data_lancamento || vencimentoIso,
        situacao: s.situacao // Mapear situacao
      }
    }).filter((r): r is NonNullable<typeof r> => r !== null)
      .filter(r => !filterCaixa || r.caixaId === filterCaixa)
      .filter(r => {
        if (filterOp === 'Todas') return true
        if (filterOp === 'Somente Receitas') return r.operacao === 'receita'
        if (filterOp === 'Somente Despesas') return r.operacao === 'despesa'
        if (filterOp === 'Somente Aporte/Ret./Transf.') return ['aporte', 'retirada', 'transferencia'].includes(r.operacao || '')
        if (filterOp === 'Despesas e Retiradas') return ['despesa', 'retirada'].includes(r.operacao || '')
        if (filterOp === 'Receitas e Aportes') return ['receita', 'aporte'].includes(r.operacao || '')
        if (filterOp === 'Somente Aporte') return r.operacao === 'aporte'
        if (filterOp === 'Somente Retiradas') return r.operacao === 'retirada'
        if (filterOp === 'Somente Transferências') return r.operacao === 'transferencia'
        return true
      })
      .filter(r => !filterGrupo || r.grupoCompromissoId === filterGrupo)
      .filter(r => !filterCostCenter || r.agendamento?.cost_center?.id === filterCostCenter)
      .filter(r => [r.cliente, r.historico, r.compromisso, String(r.receita), String(r.despesa)].some(f => (f || '').toLowerCase().includes(search.toLowerCase())))
      .sort((a, b) => {
        const key = sort.key as keyof typeof a
        let av = a[key]
        let bv = b[key]

        if (key === 'vencimento') {
          av = a.vencimentoDate.getTime()
          bv = b.vencimentoDate.getTime()
        }

        if (av === bv) return 0
        const res = av > bv ? 1 : -1
        return sort.dir === 'asc' ? res : -res
      })

    // 0. Data for List View (Legacy Financials Logic)
    const filteredCommon = data
    const filteredByDate = filteredCommon.filter(r => within(new Date(r.vencimento)))
    const listData = filteredByDate.filter(r => r.situacao !== 2)

    const totalReceitas = listData.reduce((sum, r) => sum + r.receita, 0)
    const totalDespesas = listData.reduce((sum, r) => sum + r.despesa, 0)
    const totalRecords = listData.length

    // 1. Data for Summary (Includes Realized, respects Filters + Date)
    // When "12 Last Months" is checked in View, it will handle the date range itself using 'filteredCommon' if we pass it,
    // or we can pass 'allData' (filtered by Common Filters but ALL DATES) and 'currentData' (filtered by Common + Date).

    // MERGED DATA FOR SUMMARY (Pending Financials + Realized Transactions)
    // 1. Pending Financials (situacao === 1 from remote)
    const pendingFinancials = remote.filter((r: any) => r.situacao === 1).map((s: any) => ({
      ...s,
      vencimento: s.data_vencimento,
      valor: Number(s.valor),
      situacao: 1, // Pending
      operacao: s.operacao,
      receita: (s.operacao === 'receita' || s.operacao === 'aporte') ? Number(s.valor) : 0,
      despesa: (s.operacao === 'despesa' || s.operacao === 'retirada') ? Number(s.valor) : 0,
      caixaId: s.caixa_id,
      grupoCompromissoId: s.agendamento?.grupo?.id || s.grupo_compromisso_id,
      costCenterId: s.cost_center_id || s.agendamento?.cost_center_id
    }))

    // 2. Realized Transactions (All fetched transactions)
    const realizedTransactions = transactions.map((t: any) => ({
      ...t,
      vencimento: t.data_vencimento || t.data_lancamento,
      valor: Number(t.valor_total || (t.valor_entrada > 0 ? t.valor_entrada : t.valor_saida)),
      situacao: 2, // Realized
      operacao: t.operacao,
      // Transactions have valor_entrada/saida, or we derive from op
      receita: t.valor_entrada > 0 ? t.valor_entrada : ((t.operacao === 'receita' || t.operacao === 'aporte') ? (t.valor_total || 0) : 0),
      despesa: t.valor_saida > 0 ? t.valor_saida : ((t.operacao === 'despesa' || t.operacao === 'retirada') ? (t.valor_total || 0) : 0),
      caixaId: t.conta_id, // Transaction uses conta_id
      grupoCompromissoId: t.grupo_compromisso_id,
      costCenterId: t.cost_center_id
    }))

    // 3. Merge
    const allSummaryRaw = [...pendingFinancials, ...realizedTransactions]

    // 4. Apply Filters to Summary Data (Same filters as List)
    const filteredSummary = allSummaryRaw
      .filter((r: any) => !filterCaixa || r.caixaId === filterCaixa)
      .filter((r: any) => {
        if (filterOp === 'Todas') return true
        if (filterOp === 'Somente Receitas') return r.operacao === 'receita'
        if (filterOp === 'Somente Despesas') return r.operacao === 'despesa'
        if (filterOp === 'Somente Aporte/Ret./Transf.') return ['aporte', 'retirada', 'transferencia'].includes(r.operacao || '')
        // ... (Repeat filterOp logic or use helper, simplified here for now)
        if (filterOp === 'Despesas e Retiradas') return ['despesa', 'retirada'].includes(r.operacao || '')
        if (filterOp === 'Receitas e Aportes') return ['receita', 'aporte'].includes(r.operacao || '')
        if (filterOp === 'Somente Aporte') return r.operacao === 'aporte'
        if (filterOp === 'Somente Retiradas') return r.operacao === 'retirada'
        return true
      })
      .filter((r: any) => !filterGrupo || r.grupoCompromissoId === filterGrupo)
      .filter((r: any) => !filterCostCenter || r.costCenterId === filterCostCenter)


    return {
      data: listData,
      allData: listData, // Used for selection logic
      summaryData: filteredSummary.filter((r: any) => within(new Date(r.vencimento))), // Current View Summary
      summaryHistory: filteredSummary, // Full History (12 months view)
      current: 1,
      totalPages: 1,
      totalReceitas,
      totalDespesas,
      totalRecords
    }
  }, [remote, transactions, filter, search, filterCaixa, filterGrupo, filterOp, filterCostCenter, sort])

  async function handleSelectAll() {
    const allOnScreen = rows.data
    const isAllSelected = allOnScreen.every(r => r.conferido)

    if (isAllSelected) {
      executeBulkSelect(false)
    } else {
      setShowSelectAllConfirm(true)
    }
  }

  async function executeBulkSelect(newVal: boolean) {
    const allOnScreen = rows.data

    // Optimize: Check if there are items from different accounts if we are selecting
    if (newVal) {
      const uniqueAccounts = new Set(allOnScreen.map(r => r.caixaId))
      if (uniqueAccounts.size > 1) {
        setTestResultModal({
          open: true,
          title: 'Atenção',
          message: 'Para ações em massa, todos os itens selecionados devem pertencer ao mesmo "Caixa de Lançamento". Selecione manualmente ou filtre por Caixa.'
        })
        return
      }
    }

    // Optimistic Update
    setRemote(prev => {
      const next = prev.map(p => {
        const isOnScreen = allOnScreen.some(r => r.id === p.id)
        return isOnScreen ? { ...p, conferido: newVal } : p
      })
      return next
    })

    // DB Update
    if (hasBackend && store.activeOrganization) {
      try {
        await Promise.all(allOnScreen.map(item => updateFinancial(item.id, { conferido: newVal }, store.activeOrganization!)))
      } catch (err) {
        console.error('Failed to bulk toggle conferido', err)
        // Refresh to sync state if failed
        refresh()
      }
    }
  }

  // Items checked in the interface - USE rows.allData to get enriched fields (tipo, totalParcelas)
  const itemsReadyToLaunch = useMemo(() => rows.allData.filter(i => i.conferido), [rows.allData])

  async function handleBulkLaunch(data: { date: string, accountId: string, total: number }) {
    setShowBulkLaunchModal(false)
    setShowBulkConfirm(false)
    const itemsToLaunch = itemsReadyToLaunch

    let errorCount = 0
    let lastError = ''
    for (const item of itemsToLaunch) {
      try {
        const res = await confirmProvision(item.id, {
          valor: item.despesa || item.receita,
          data: data.date,
          cuentaId: data.accountId,
          compromisso_id: item.compromisso_id,
          grupo_compromisso_id: item.grupo_compromisso_id,
          cost_center_id: item.cost_center_id
        })

        if (res.error) {
          console.error('Error confirming item:', item.id, res.error)
          lastError = (res.error as any).message || JSON.stringify(res.error)
          errorCount++
        } else {
          // Success: Update Schedule if needed
          // Logic: 
          // 1. Fixed (fixo): Always rollover
          // 2. Variable (variavel): Only rollover if installments > 1 (meaning it's a multi-payment)
          if (item.scheduleId) {
            const isVariable = item.tipo === 'variavel'
            const isLastInstallment = isVariable && (item.parcela === item.totalParcelas)

            if (item.tipo === 'fixo' || (isVariable && !isLastInstallment)) {
              const nextDue = getNextVencimento(item.vencimento, item.periodo)

              let nextHistorico = item.historico
              if (isVariable) {
                const match = (item.historico || '').match(/\((\d+)\/(\d+)\)/)
                if (match) {
                  const cur = parseInt(match[1], 10)
                  const total = parseInt(match[2], 10)
                  if (cur < total) {
                    nextHistorico = item.historico.replace(`(${cur}/${total})`, `(${cur + 1}/${total})`)
                  }
                }
              }

              await updateSchedule(item.scheduleId, {
                proxima_vencimento: nextDue.toISOString(),
                historico: nextHistorico
              })
            } else if (isVariable && isLastInstallment) {
              await updateSchedule(item.scheduleId, { situacao: 2 })
            }
          }
        }
      } catch (e) {
        console.error(e)
        errorCount++
      }
    }

    if (errorCount > 0) {
      setTestResultModal({
        open: true,
        title: 'Atenção',
        message: `Processo finalizado com ${errorCount} erro(s). \nÚltimo erro: ${lastError}`
      })
    } else {
      // Force reload to refresh
      window.location.reload()
    }
  }


  const buttons: Array<{ id: Filter; label: string }> = [
    { id: 'vencidos', label: 'Vencidos/Dia Atual' },
    { id: '7dias', label: 'até 7 Dias' },
    { id: 'mesAtual', label: 'Mês Atual' },
    { id: 'proximoMes', label: 'Próximo Mês' },
    { id: '2meses', label: 'Até 2 Meses' },
    { id: '6meses', label: 'Até 6 Meses' },
    { id: '12meses', label: 'Até 12 Meses' },
    { id: 'fimAno', label: 'Até Final do Ano' },
  ]

  const selectionSum = useMemo(() => {
    let sum = 0
    selectedIds.forEach(id => {
      const item = rows.allData.find(r => r.id === id)
      if (item) {
        if (item.receita > 0) sum += item.receita
        if (item.despesa > 0) sum -= item.despesa
      }
    })
    return sum
  }, [selectedIds, rows])

  function handleSelect(e: React.MouseEvent, id: string) {
    if (e.ctrlKey || e.metaKey) {
      setSelectedIds(prev => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    } else {
      setSelectedIds(new Set([id]))
    }
  }

  function openModal(item: any) {


    setModal(item)
    setModalContaId(item.caixaId || '')
    setModalData(item.vencimentoDate.toISOString().split('T')[0])
    setModalDataLancamento(new Date().toISOString().split('T')[0])
    setModalValor(item.despesa || item.receita)
    setModalHistorico(item.historico)
    setModalNotaFiscal(item.notaFiscal || '')
    setModalDetalhes(item.detalhes || '')
  }

  return (
    <div className="space-y-6">

      {msg && <div className="text-sm text-green-700">{msg}</div>}

      <ConfirmModal
        isOpen={showTestConfirm}
        title="Testar Relatório"
        message="Deseja enviar o relatório diário agora para o WhatsApp?"
        onClose={() => setShowTestConfirm(false)}
        onConfirm={async () => {
          setShowTestConfirm(false)
          const res = await runNow()
          if (res && typeof res === 'object') {
            setTestResultModal({
              open: true,
              title: res.success ? 'Sucesso' : 'Atenção',
              message: res.message
            })
          }
        }}
      />

      <AlertModal
        isOpen={testResultModal.open}
        title={testResultModal.title}
        message={testResultModal.message}
        onClose={() => setTestResultModal({ ...testResultModal, open: false })}
      />

      <div className="md:hidden flex flex-col gap-2 mb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Controle</h1>
          <div className="flex gap-2">
            <button className="text-blue-600 font-medium text-sm" onClick={() => setShowTestConfirm(true)}>Testar</button>
          </div>
        </div>
        {/* Mobile Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {buttons.map(b => (
            <button
              key={b.id}
              className={`px-4 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap border ${filter === b.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600'}`}
              onClick={() => { setFilter(b.id); }}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      <div className="hidden md:flex flex-col gap-2">
        {/* Row 1: Actions, Search, Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full">
          {/* Action Buttons Removed */}
          {/* Group Expand/Collapse Buttons Moved to Tabs Row */}


          {rows.allData.some(r => r.conferido) && (
            <>
              <button
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white border dark:border-gray-700 rounded px-3 py-2 text-xs md:text-sm transition-colors whitespace-nowrap"
                onClick={() => {
                  setBulkDate(new Date().toISOString().split('T')[0])
                  const firstItem = rows.allData.find(r => r.conferido)
                  if (firstItem && firstItem.caixaId) {
                    setBulkAccount(firstItem.caixaId)
                  } else {
                    setBulkAccount('')
                  }
                  setShowBulkConfirm(true)
                }}
              >
                <Icon name="check" className="w-4 h-4" />
                Baixar ({rows.allData.filter(r => r.conferido).length})
              </button>

              <button
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white border dark:border-gray-700 rounded px-3 py-2 text-xs md:text-sm transition-colors whitespace-nowrap"
                onClick={handleSelectAll}
              >
                <Icon name={rows.data.every(r => r.conferido) ? 'close' : 'done_all'} className="w-4 h-4" />
                {rows.data.every(r => r.conferido) ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </button>
            </>
          )}

          <button
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded transition-colors shadow-sm text-xs md:text-sm whitespace-nowrap"
            onClick={() => setShowTestConfirm(true)}
            title="Testar Relatório"
          >
            <Icon name="whatsapp" className="w-4 h-4" />
            <span className="hidden sm:inline">Testar Relatório</span>
          </button>


          {/* Search Field - Grows to fill space */}
          <div className="flex-1 flex items-center gap-2 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded px-3 py-2 min-w-[200px]">
            <Icon name="search" className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <input
              className="outline-none w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 text-sm"
              placeholder="Buscar cliente, histórico ou valor"
              value={search}
              onChange={e => { setSearch(e.target.value) }}
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <div className="min-w-[150px]">
              <FloatingLabelSelect
                label="Caixa"
                id="filterCaixa"
                value={filterCaixa}
                onChange={e => { setFilterCaixa(e.target.value); }}
                bgColor="bg-background-light dark:bg-background-dark"
              >
                <option value="" className="dark:bg-gray-800">Todos</option>
                {caixas.filter(c => c.ativo !== false).map(c => (
                  <option key={c.id} value={c.id} className="dark:bg-gray-800">{c.nome}</option>
                ))}
              </FloatingLabelSelect>
            </div>

            <div className="min-w-[150px]">
              <FloatingLabelSelect
                label="Tipo"
                id="filterOp"
                value={filterOp}
                onChange={e => { setFilterOp(e.target.value); }}
                bgColor="bg-background-light dark:bg-background-dark"
              >
                <option value="Todas" className="dark:bg-gray-800">Todas</option>
                <option value="Somente Receitas" className="dark:bg-gray-800">Receitas</option>
                <option value="Somente Despesas" className="dark:bg-gray-800">Despesas</option>
                <option value="Somente Aporte/Ret./Transf." className="dark:bg-gray-800">Aporte/Ret./Transf.</option>
                <option value="Despesas e Retiradas" className="dark:bg-gray-800">Desp. e Retiradas</option>
                <option value="Receitas e Aportes" className="dark:bg-gray-800">Rec. e Aportes</option>
                <option value="Somente Aporte" className="dark:bg-gray-800">Aporte</option>
                <option value="Somente Retiradas" className="dark:bg-gray-800">Retiradas</option>
                <option value="Somente Transferências" className="dark:bg-gray-800">Transferências</option>
              </FloatingLabelSelect>
            </div>

            <div className="min-w-[150px]">
              <FloatingLabelSelect
                label="Grupo"
                id="filterGrupo"
                value={filterGrupo}
                onChange={e => { setFilterGrupo(e.target.value); setPage(1) }}
                bgColor="bg-background-light dark:bg-background-dark"
              >
                <option value="" className="dark:bg-gray-800">Todos</option>
                {grupos.map(g => (
                  <option key={g.id} value={g.id} className="dark:bg-gray-800">{g.nome}</option>
                ))}
              </FloatingLabelSelect>
            </div>

            <div className="min-w-[150px]">
              <FloatingLabelSelect
                label="Centro de Custo"
                id="filterCostCenter"
                value={filterCostCenter}
                onChange={e => { setFilterCostCenter(e.target.value); setPage(1) }}
                bgColor="bg-background-light dark:bg-background-dark"
              >
                <option value="" className="dark:bg-gray-800">Todos</option>
                {costCenters.map(cc => (
                  <option key={cc.id} value={cc.id} className="dark:bg-gray-800">{cc.descricao}</option>
                ))}
              </FloatingLabelSelect>
            </div>
          </div>

          {(search || filterCaixa || filterOp !== 'Todas' || filterGrupo || filterCostCenter) && (
            <button
              className="text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border dark:border-gray-600 rounded px-3 py-2 text-gray-700 dark:text-gray-300 whitespace-nowrap"
              onClick={() => {
                setSearch('')
                setFilterCaixa('')
                setFilterOp('Todas')
                setFilterGrupo('')
                setFilterCostCenter('')
                setPage(1)
              }}
            >
              Limpar
            </button>
          )}

          <PageInfo>
            A tela de Controle e Previsão apresenta de forma integrada os indicadores financeiros e operacionais do sistema, permitindo acompanhar em tempo real as entradas e saídas previstas.
          </PageInfo>
        </div>

        {/* Row 2: Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 overflow-x-auto">
          <div role="group" aria-label="Filtros por período" className="flex flex-nowrap gap-2">
            {buttons.map(b => (
              <button
                key={b.id}
                className={`px-4 py-2 text-sm rounded transition-colors duration-300 whitespace-nowrap border ${filter === b.id ? 'bg-fourtek-blue text-white border-fourtek-blue' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                onClick={() => { setFilter(b.id); }}
              >
                {b.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {selectedIds.size > 1 && (
              <div className="ml-2 bg-green-100 dark:bg-green-900/40 border border-green-300 dark:border-green-800 shadow-sm rounded px-3 py-1 text-center whitespace-nowrap flex flex-col justify-center h-full">
                <div className="text-[10px] font-bold text-green-800 dark:text-green-300 uppercase border-b border-green-300 dark:border-green-800 leading-tight mb-0.5">
                  SOMA ITENS ({selectedIds.size})
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Lançamentos Selecionados</div>
                <div className={`text-sm font-bold ${selectionSum >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} leading-tight`}>
                  {selectionSum < 0 ? '-' : ''}R$ {formatMoneyBr(Math.abs(selectionSum))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex items-center gap-1 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-1 rounded-t-lg">
        <button
          className={`px-4 py-2 text-xs md:text-sm font-medium rounded-t-md transition-all ${activeMainTab === 'realizar' ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm border-t border-x border-gray-200 dark:border-gray-700 relative top-1.5 pb-3' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}
          onClick={() => setActiveMainTab('realizar')}
        >
          Previsão à Realizar
        </button>
        <button
          className={`px-4 py-2 text-xs md:text-sm font-medium rounded-t-md transition-all ${activeMainTab === 'resumida' ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm border-t border-x border-gray-200 dark:border-gray-700 relative top-1.5 pb-3' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}
          onClick={() => setActiveMainTab('resumida')}
        >
          Previsão Resumida
        </button>
        <button
          className={`px-4 py-2 text-xs md:text-sm font-medium rounded-t-md transition-all ${activeMainTab === 'saldos' ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm border-t border-x border-gray-200 dark:border-gray-700 relative top-1.5 pb-3' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}
          onClick={() => setActiveMainTab('saldos')}
        >
          Saldos
        </button>

        {/* Expand/Collapse Buttons moved here */}
        {filter === 'mesAtual' && activeMainTab === 'realizar' && (
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded border dark:border-gray-700 overflow-hidden ml-auto">
            <button
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
              onClick={() => setExpanded(GROUP_TITLES.reduce((acc, t) => ({ ...acc, [t]: true }), {}))}
              title="Recolher Todos"
            >
              <Icon name="chevron-right" className="w-4 h-4" />
            </button>
            <div className="w-px bg-gray-300 dark:bg-gray-700"></div>
            <button
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
              onClick={() => setExpanded({})}
              title="Expandir Todos"
            >
              <Icon name="chevron-down" className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {
        activeMainTab === 'resumida' ? (
          <ScheduleSummaryView
            data={rows.summaryData}
            accounts={caixas}
            showHistoryOption={true}
            totalBalance={balances
              .map(b => ({ ...b, ativo: caixas.find(a => a.id === b.account_id)?.ativo }))
              .filter(b => b.ativo !== false)
              .reduce((acc, b) => acc + Number(b.saldo_atual), 0)}
          />
        ) : activeMainTab === 'saldos' ? (
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded p-4 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-xl font-normal text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Icon name="account_balance" className="w-5 h-5 text-blue-600" />
              Saldos das Contas
            </div>
            <div className="flex flex-col gap-3 max-w-lg">
              {balances
                .map(b => {
                  const acct = caixas.find(a => a.id === b.account_id)
                  return { ...b, nome: acct?.nome || b.account_id, ativo: acct?.ativo, cor: acct?.cor }
                })
                .filter(b => b.ativo !== false)
                .sort((a, b) => a.nome.localeCompare(b.nome))
                .map(b => (
                  <div key={b.account_id} className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-3 hover:shadow-md transition-all border-l-4 flex justify-between items-center" style={{ borderLeftColor: b.cor || '#e5e7eb' }}>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{b.nome}</span>
                      {Number(b.saldo_atual) !== 0 && (
                        <span className={`text-[10px] uppercase font-bold ${Number(b.saldo_atual) > 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {Number(b.saldo_atual) > 0 ? 'Saldo Positivo' : 'Saldo Negativo'}
                        </span>
                      )}
                    </div>
                    <div className={`text-lg font-bold ${Number(b.saldo_atual) > 0 ? 'text-green-600 dark:text-green-400' : Number(b.saldo_atual) < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500'}`}>
                      R$ {Number(b.saldo_atual).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {
              filter === 'mesAtual' ? (
                <div className="space-y-4">
                  {rows.data.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                      <Icon name="check-circle" className="w-10 h-10 mb-2 opacity-50" />
                      <p>Nenhum lançamento pendente para este período.</p>
                    </div>
                  )}
                  {rows.data.length > 0 && GROUP_TITLES.map(groupTitle => {
                    const today = new Date()
                    today.setHours(0, 0, 0, 0)
                    const firstDayOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1)

                    const groupData = rows.data.filter(r => {
                      const vencimento = new Date(r.vencimentoDate)
                      vencimento.setHours(0, 0, 0, 0)

                      if (groupTitle === 'Meses Anteriores') {
                        return vencimento < firstDayOfCurrentMonth
                      } else if (groupTitle === 'Vencidos') {
                        return vencimento >= firstDayOfCurrentMonth && vencimento < today
                      } else {
                        // Próximos Lançamentos (Hoje ou Futuro)
                        return vencimento >= today
                      }
                    })

                    if (groupData.length === 0) return null

                    // Calculate group total (Expenses only? Or Balance? Usually balance)
                    // Let's sum Receita - Despesa
                    const groupTotal = groupData.reduce((acc, curr) => acc + (curr.receita - curr.despesa), 0)
                    const groupReceitas = groupData.reduce((acc, curr) => acc + curr.receita, 0)
                    const groupDespesas = groupData.reduce((acc, curr) => acc + curr.despesa, 0)

                    return (
                      <div key={groupTitle} className="border dark:border-gray-700 rounded-lg overflow-hidden">
                        <div className="bg-slate-700 dark:bg-slate-800 text-white px-4 py-2 text-sm font-medium flex justify-between items-center cursor-pointer hover:bg-slate-600 dark:hover:bg-slate-700 transition-colors"
                          onClick={() => setExpanded(prev => ({ ...prev, [groupTitle]: !prev[groupTitle] }))}>
                          <div className="flex items-center gap-2">
                            <Icon name={!expanded[groupTitle] ? 'chevron-down' : 'chevron-right'} className="w-5 h-5" />
                            <span>Situação: {groupTitle}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className={groupTotal >= 0 ? 'text-green-300' : 'text-red-300'}>
                              {groupTotal < 0 ? '-' : ''}R$ {formatMoneyBr(Math.abs(groupTotal))}
                            </span>
                          </div>
                        </div>

                        {/* Default Open (expanded[title] falsy means open) */}
                        {(!expanded[groupTitle]) && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs table-fixed">
                              <thead className="hidden md:table-header-group bg-gray-50 dark:bg-gray-900 text-slate-700 dark:text-gray-300 font-semibold border-b dark:border-gray-700">
                                <tr>
                                  {[
                                    ['vencimento', 'Vencimento'],
                                    ['caixa', 'Caixa de Lançamento'],
                                    ['cliente', 'Cliente'],
                                    ['compromisso', 'Compromisso'],
                                    ['historico', 'Histórico'],
                                    ['receita', 'Receita'],
                                    ['despesa', 'Despesa'],
                                    ['parcela', 'Parcela'],
                                  ].map(([key, label]) => (
                                    <th key={key} className={`px-4 py-2 ${['receita', 'despesa'].includes(key) ? 'text-right w-28' : 'text-left'} ${key === 'vencimento' ? 'w-24' : key === 'caixa' ? 'w-[15%]' : key === 'cliente' ? 'w-[20%]' : key === 'compromisso' ? 'w-[15%]' : key === 'historico' ? 'w-[15%]' : key === 'parcela' ? 'w-16 text-center' : ''}`}>
                                      <button onClick={() => toggleSort(key)} className="flex items-center gap-1 w-full justify-start hover:text-blue-600 transition-colors">
                                        <span className={['receita', 'despesa'].includes(key) ? 'ml-auto' : ''}>{label}</span>
                                        {sort.key === key && <Icon name={sort.dir === 'asc' ? 'chevron-up' : 'chevron-down'} className="w-3 h-3" />}
                                      </button>
                                    </th>
                                  ))}
                                  <th className="px-4 py-2 text-center w-16">Conferido</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-800">
                                {groupData.map(item => (
                                  <React.Fragment key={item.id}>
                                    <tr
                                      className={`hidden md:table-row hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors ${item.conferido ? 'bg-gray-50/50 dark:bg-gray-900/30 font-bold text-blue-600 dark:text-blue-400' : ''
                                        } ${selectedIds.has(item.id) ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}
                                      onClick={(e) => handleSelect(e, item.id)}
                                      onContextMenu={(e) => {
                                        e.preventDefault()
                                        setContextMenu({ x: e.clientX, y: e.clientY, item })
                                      }}
                                      onDoubleClick={() => {
                                        openModal(item)
                                        setShowTransactionModal(true)
                                      }}
                                    >
                                      <td className="px-4 py-2 align-top whitespace-nowrap">
                                        <div className="font-medium text-slate-700 dark:text-gray-300">{item.vencimentoBr}</div>
                                        {!item.conferido && item.diasAtraso > 0 && (
                                          <div className="text-xs text-red-500 font-medium mt-0.5">
                                            Vencido há {item.diasAtraso} dia(s)...
                                          </div>
                                        )}
                                        {!item.conferido && item.diasAtraso === 0 && (
                                          <div className="text-xs text-blue-500 font-medium mt-0.5">
                                            Vencimento Hoje
                                          </div>
                                        )}
                                      </td>
                                      <td className="px-4 py-2 align-top truncate text-gray-500 dark:text-gray-400" title={item.caixa}>
                                        {item.caixa}
                                      </td>
                                      <td className="px-4 py-2 align-top truncate font-medium text-slate-700 dark:text-gray-300 transform transition-transform hover:scale-[1.02] origin-left" title={item.cliente}>
                                        {item.cliente}
                                      </td>
                                      <td className="px-4 py-2 align-top truncate text-gray-600 dark:text-gray-400" title={item.compromisso}>
                                        {item.compromisso}
                                      </td>
                                      <td className="px-4 py-2 align-top truncate text-gray-500 dark:text-gray-500" title={item.historico}>
                                        {item.historico}
                                      </td>
                                      <td className="px-4 py-2 align-top text-right text-green-600 dark:text-green-400 whitespace-nowrap">
                                        {item.receita > 0 ? `R$ ${formatMoneyBr(item.receita)} ` : '-'}
                                      </td>
                                      <td className="px-4 py-2 align-top text-right text-red-600 dark:text-red-400 whitespace-nowrap">
                                        {item.despesa > 0 ? `R$ ${formatMoneyBr(item.despesa)} ` : '-'}
                                      </td>
                                      <td className="px-4 py-2 align-top text-center text-gray-400 text-xs">
                                        {item.totalParcelas > 1 ? `${item.parcela}/${item.totalParcelas}` : ''}
                                      </td >
                                      <td className="px-4 py-2 align-top text-center" onClick={(e) => { e.stopPropagation() }}>
                                        <input
                                          type="checkbox"
                                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                                          checked={!!item.conferido}
                                          onChange={async (e) => {
                                            if (!item.conferido) {
                                              const hasDifferentAccount = rows.allData.some(r => r.conferido && r.caixaId !== item.caixaId)
                                              if (hasDifferentAccount) {
                                                setTestResultModal({
                                                  open: true,
                                                  title: 'Atenção',
                                                  message: 'Para ações em massa, todos os itens selecionados devem pertencer ao mesmo "Caixa de Lançamento".'
                                                })
                                                return
                                              }
                                            }
                                            if (hasBackend) {
                                              const newVal = !item.conferido
                                              // Optimistic Update
                                              setRemote(prev => prev.map(p => p.id === item.id ? { ...p, conferido: newVal } : p))

                                              try {
                                                if (store.activeOrganization) {
                                                  await updateFinancial(item.id, { conferido: newVal }, store.activeOrganization)
                                                }
                                              } catch (err) {
                                                console.error('Failed to toggle conferido', err)
                                                setRemote(prev => prev.map(p => p.id === item.id ? { ...p, conferido: !newVal } : p))
                                              }
                                            }
                                          }}
                                        />
                                      </td>
                                    </tr >

                                    {/* Mobile Card Layout for Table Row */}
                                    <tr className="md:hidden border-b dark:border-gray-700 last:border-0"
                                      onClick={() => {
                                        if (selectedIds.has(item.id)) {
                                          handleSelect({ ctrlKey: false } as any, item.id)
                                        } else {
                                          if (selectedIds.size > 0) {
                                            handleSelect({ ctrlKey: true } as any, item.id)
                                          } else {
                                            // Open modal
                                            openModal(item)
                                            setShowTransactionModal(true)
                                          }
                                        }
                                      }}
                                    >
                                      <td colSpan={100} className="p-3">
                                        <div className={`flex items-start gap-3 ${item.conferido ? 'opacity-80' : ''}`}>
                                          <div
                                            className={`w-5 h-5 mt-1 rounded border flex items-center justify-center shrink-0 ${item.conferido ? 'bg-blue-600 border-blue-600' : 'border-gray-300 dark:border-gray-600'}`}
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              updateFinancial(item.id, { conferido: !item.conferido }, store.activeOrganization!).then(() => refresh())
                                            }}
                                          >
                                            {item.conferido && <Icon name="check" className="w-3.5 h-3.5 text-white" />}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                              <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm line-clamp-1">{item.historico || item.compromisso || 'Sem descrição'}</span>
                                              <span className={`font-bold text-sm whitespace-nowrap ${item.receita > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {item.receita > 0 ? `R$ ${formatMoneyBr(item.receita)}` : `R$ ${formatMoneyBr(item.despesa)}`}
                                              </span>
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex flex-wrap gap-x-2">
                                              <span>{item.vencimentoBr}</span>
                                              <span>•</span>
                                              <span>{item.cliente}</span>
                                              {item.totalParcelas > 1 && (
                                                <>
                                                  <span>•</span>
                                                  <span>{item.parcela}/{item.totalParcelas}</span>
                                                </>
                                              )}
                                            </div>
                                            {!item.conferido && item.diasAtraso > 0 && (
                                              <div className="text-[10px] text-red-500 font-medium mt-1">
                                                Vencido há {item.diasAtraso} dias
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                    {item.agendamento?.parcial && item.agendamento.valor > (item.receita || item.despesa) && (
                                      <tr className="">
                                        <td colSpan={9} className="px-4 py-1 text-left font-bold text-xs text-blue-600 dark:text-blue-400 whitespace-nowrap">
                                          Valor do Compromisso Agendado {formatMoneyBr(item.agendamento.valor)} *** Valor ja Realizado {formatMoneyBr(item.agendamento.valor - (item.receita || item.despesa))}
                                        </td>
                                      </tr>
                                    )}
                                  </React.Fragment >
                                ))}
                              </tbody >
                              <tfoot className="bg-gray-50 dark:bg-gray-900 border-t dark:border-gray-700 font-semibold text-xs text-slate-700 dark:text-gray-300">
                                <tr>
                                  <td colSpan={5} className="px-4 py-2 text-right">Totais:</td>
                                  <td className="px-4 py-2 text-right text-blue-600 dark:text-blue-400">R$ {formatMoneyBr(groupReceitas)}</td>
                                  <td className="px-4 py-2 text-right text-red-600 dark:text-red-400">R$ {formatMoneyBr(groupDespesas)}</td>
                                  <td colSpan={2}></td>
                                </tr>
                              </tfoot>
                            </table >
                          </div>
                        )}
                      </div >
                    )
                  })}
                </div >
              ) : (
                // Tabela Padrão para outros filtros (não agrupada por Situação/Meses, ou simples)
                <div className="space-y-4">
                  {rows.data.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                      <Icon name="check-circle" className="w-10 h-10 mb-2 opacity-50" />
                      <p>Nenhum lançamento pendente para este período.</p>
                    </div>
                  )}
                  {rows.data.length > 0 && (
                    <div className="border dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-gray-50 dark:bg-gray-900 text-slate-700 dark:text-gray-300 font-semibold border-b dark:border-gray-700">
                            <tr>
                              {[
                                ['vencimento', 'Vencimento'],
                                ['caixa', 'Caixa de Lançamento'],
                                ['cliente', 'Cliente'],
                                ['compromisso', 'Compromisso'],
                                ['historico', 'Histórico'],
                                ['receita', 'Receita'],
                                ['despesa', 'Despesa'],
                                ['parcela', 'Parcela'],
                              ].map(([key, label]) => (
                                <th key={key} className={`px-4 py-2 ${['receita', 'despesa'].includes(key) ? 'text-right w-36' : 'text-left'} ${key === 'vencimento' ? 'w-24' : key === 'parcela' ? 'w-16 text-center' : ''}`}>
                                  <button onClick={() => toggleSort(key)} className="flex items-center gap-1 w-full justify-start hover:text-blue-600 transition-colors">
                                    <span className={['receita', 'despesa'].includes(key) ? 'ml-auto' : ''}>{label}</span>
                                    {sort.key === key && <Icon name={sort.dir === 'asc' ? 'chevron-up' : 'chevron-down'} className="w-3 h-3" />}
                                  </button>
                                </th>
                              ))}
                              <th className="px-4 py-2 text-center w-16">Conferido</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {rows.data.map(item => (
                              <React.Fragment key={item.id}>
                                <tr
                                  className={`hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors ${item.conferido ? 'bg-gray-50/50 dark:bg-gray-900/30 font-bold text-blue-600 dark:text-blue-400' : ''
                                    } ${selectedIds.has(item.id) ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}
                                  onClick={(e) => handleSelect(e, item.id)}
                                  onContextMenu={(e) => {
                                    e.preventDefault()
                                    setContextMenu({ x: e.clientX, y: e.clientY, item })
                                  }}
                                  onDoubleClick={() => {
                                    openModal(item)
                                    setShowTransactionModal(true)
                                  }}
                                >
                                  <td className="px-4 py-2 align-top whitespace-nowrap">
                                    <div className="font-medium text-slate-700 dark:text-gray-300">{item.vencimentoBr}</div>
                                    {!item.conferido && item.diasAtraso > 0 && (
                                      <div className="text-xs text-red-500 font-medium mt-0.5">
                                        Vencido há {item.diasAtraso} dia(s)...
                                      </div>
                                    )}
                                    {!item.conferido && item.diasAtraso === 0 && (
                                      <div className="text-xs text-blue-500 font-medium mt-0.5">
                                        Vencimento Hoje
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-4 py-2 text-slate-600 dark:text-gray-400 align-top max-w-[150px] truncate" title={item.caixa}>
                                    {item.caixa}
                                  </td>
                                  <td className="px-4 py-2 text-slate-700 dark:text-gray-300 font-medium align-top max-w-[150px] truncate" title={item.cliente}>
                                    {item.cliente}
                                  </td>
                                  <td className="px-4 py-2 text-slate-600 dark:text-gray-400 align-top max-w-[150px] truncate">
                                    {item.compromisso}
                                  </td>
                                  <td className="px-4 py-2 text-slate-600 dark:text-gray-400 align-top max-w-[200px] truncate" title={item.historico}>
                                    {item.historico}
                                  </td>
                                  <td className="px-4 py-2 text-right align-top">
                                    {item.receita > 0 ? (
                                      <span className="text-slate-700 dark:text-slate-300 font-medium">R$ {formatMoneyBr(item.receita)}</span>
                                    ) : '-'}
                                  </td>
                                  <td className="px-4 py-2 text-right align-top">
                                    {item.despesa > 0 ? (
                                      <span className="text-slate-700 dark:text-slate-300 font-medium">R$ {formatMoneyBr(item.despesa)}</span>
                                    ) : '-'}
                                  </td>
                                  <td className="px-4 py-2 text-center text-slate-500 dark:text-gray-500 text-[11px] align-top">
                                    {item.totalParcelas > 1 ? `${item.parcela}/${item.totalParcelas}` : ''}
                                  </td>
                                  <td className="px-4 py-2 text-center align-top" onClick={e => e.stopPropagation()}>
                                    <input
                                      type="checkbox"
                                      checked={!!item.conferido}
                                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                                      onChange={async (e) => {
                                        if (!item.conferido) {
                                          const hasDifferentAccount = rows.allData.some(r => r.conferido && r.caixaId !== item.caixaId)
                                          if (hasDifferentAccount) {
                                            setTestResultModal({
                                              open: true,
                                              title: 'Atenção',
                                              message: 'Para ações em massa, todos os itens selecionados devem pertencer ao mesmo "Caixa de Lançamento".'
                                            })
                                            return
                                          }
                                        }
                                        if (hasBackend) {
                                          const newVal = !item.conferido
                                          // Optimistic Update
                                          setRemote(prev => prev.map(p => p.id === item.id ? { ...p, conferido: newVal } : p))

                                          try {
                                            if (store.activeOrganization) {
                                              await updateFinancial(item.id, { conferido: newVal }, store.activeOrganization)
                                            }
                                          } catch (err) {
                                            console.error('Failed to toggle conferido', err)
                                            setRemote(prev => prev.map(p => p.id === item.id ? { ...p, conferido: !newVal } : p))
                                          }
                                        }
                                      }}
                                    />
                                  </td>
                                </tr>
                                {item.agendamento?.parcial && item.agendamento.valor > (item.receita || item.despesa) && (
                                  <tr className="">
                                    <td colSpan={9} className="px-4 py-1 text-left font-bold text-xs text-blue-600 dark:text-blue-400 whitespace-nowrap">
                                      Valor do Compromisso Agendado {formatMoneyBr(item.agendamento.valor)} *** Valor ja Realizado {formatMoneyBr(item.agendamento.valor - (item.receita || item.despesa))}
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            ))}
                          </tbody>
                          <tfoot className="bg-gray-50 dark:bg-gray-900 border-t dark:border-gray-700 font-semibold text-xs text-slate-700 dark:text-gray-300">
                            <tr>
                              <td colSpan={5} className="px-4 py-2 text-right">Totais:</td>
                              <td className="px-4 py-2 text-right text-blue-600 dark:text-blue-400">R$ {formatMoneyBr(rows.totalReceitas)}</td>
                              <td className="px-4 py-2 text-right text-red-600 dark:text-red-400">R$ {formatMoneyBr(rows.totalDespesas)}</td>
                              <td colSpan={2}></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )
                  }

                  {/* Context Menu e Modais movidos para o escopo principal para funcionar em todas as views */}
                </div >
              )
            }

            {/* Context Menu - Moved outside conditional */}
            {
              contextMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)}></div>
                  <div
                    className="fixed z-50 bg-white dark:bg-gray-800 shadow-lg rounded border dark:border-gray-700 p-1 w-64 text-sm"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                  >
                    <button className="w-full text-left px-4 py-1.5 whitespace-nowrap hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-200" onClick={async () => {
                      if (contextMenu.item.scheduleId) {
                        const r = await listFinancialsBySchedule(contextMenu.item.scheduleId, store.activeOrganization || undefined)
                        if (r.data) {
                          setLinkedItems(r.data)
                          setShowLinkedItemsModal(true)
                        }
                        setContextMenu(null)
                      } else {
                        alert('Este item não possui agendamento vinculado.')
                        setContextMenu(null)
                      }
                    }}>
                      <Icon name="list" className="w-4 h-4" />
                      Visualizar Itens Vinculados
                    </button>

                    <div className="border-t dark:border-gray-700 my-1"></div>
                    <button className="w-full text-left px-4 py-1.5 whitespace-nowrap hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-orange-600 dark:text-orange-400" onClick={() => {
                      setEditValueModal({ open: true, item: contextMenu.item, value: contextMenu.item.despesa || contextMenu.item.receita })
                      setContextMenu(null)
                    }}>
                      <Icon name="dollar" className="w-4 h-4" />
                      Alterar Valor Previsto
                    </button>
                    <button className="w-full text-left px-4 py-1.5 whitespace-nowrap hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-purple-600 dark:text-purple-400" onClick={() => {
                      setSkipId(contextMenu.item.id)
                      setShowSkipConfirm(true)
                      setContextMenu(null)
                    }}>
                      <Icon name="skip-forward" className="w-4 h-4" />
                      Saltar Lançamento
                    </button>
                    <button className="w-full text-left px-4 py-1.5 whitespace-nowrap hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-blue-600 dark:text-blue-400" onClick={() => {
                      const d = contextMenu.item.vencimento ? contextMenu.item.vencimento.split('T')[0] : ''
                      setEditDateModal({ open: true, item: contextMenu.item, date: d })
                      setContextMenu(null)
                    }}>
                      <Icon name="calendar" className="w-4 h-4" />
                      Alterar Data Vencimento
                    </button>

                    <div className="border-t dark:border-gray-700 my-1"></div>
                    <button className="w-full text-left px-4 py-1.5 whitespace-nowrap hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-200" onClick={() => {
                      const item = contextMenu.item
                      if (item && item.scheduleId) {
                        navigate('/schedules', { state: { selectedScheduleId: item.scheduleId } })
                      } else {
                        alert('Item sem agendamento vinculado')
                      }
                    }}>
                      <Icon name="calendar" className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      Ir ao Agendamento do Item
                    </button>
                  </div>
                </>
              )
            }

            {/* Edit Value Modal */}
            {
              editValueModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                  <div className="bg-white rounded p-4 w-[300px] shadow-lg">
                    <h3 className="font-medium mb-3">Alterar Valor Previsto</h3>
                    <input
                      type="number"
                      className="w-full border rounded px-3 py-2 mb-4"
                      value={editValueModal.value}
                      onChange={e => {
                        const val = e.target.value;
                        const truncated = val.includes('.') ? val.split('.')[0] + '.' + val.split('.')[1].slice(0, 2) : val;
                        setEditValueModal({ ...editValueModal, value: parseFloat(truncated) || 0 });
                      }}
                    />
                    <div className="flex justify-end gap-2">
                      <button className="px-3 py-1 border rounded hover:bg-gray-50" onClick={() => setEditValueModal(null)}>Cancelar</button>
                      <button className="px-3 py-1 bg-black text-white rounded hover:bg-gray-800" onClick={async () => {
                        if (hasBackend) {
                          await updateFinancial(editValueModal.item.id, { valor: editValueModal.value })
                          setEditValueModal(null)
                          listFinancials({ status: 1, orgId: store.activeOrganization! }).then(r => { if (!r.error && r.data) setRemote(r.data as any) })
                        } else {
                          alert('Backend required')
                        }
                      }}>Salvar</button>
                    </div>
                  </div>
                </div>
              )
            }

            {/* Edit Date Modal */}
            {
              editDateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                  <div className="bg-white rounded p-4 w-[300px] shadow-lg">
                    <h3 className="font-medium mb-3">Alterar Data Vencimento</h3>
                    <input
                      type="date"
                      className="w-full border rounded px-3 py-2 mb-4"
                      value={editDateModal.date}
                      onChange={e => setEditDateModal({ ...editDateModal, date: e.target.value })}
                    />
                    <div className="flex justify-end gap-2">
                      <button className="px-3 py-1 border rounded hover:bg-gray-50" onClick={() => setEditDateModal(null)}>Cancelar</button>
                      <button className="px-3 py-1 bg-black text-white rounded hover:bg-gray-800" onClick={async () => {
                        if (hasBackend) {
                          await updateFinancial(editDateModal.item.id, { data_vencimento: editDateModal.date })
                          setEditDateModal(null)
                          listFinancials({ status: 1, orgId: store.activeOrganization! }).then(r => { if (!r.error && r.data) setRemote(r.data as any) })
                        } else {
                          alert('Backend required')
                        }
                      }}>Salvar</button>
                    </div>
                  </div>
                </div>
              )
            }

            {/* Skip Confirmation Modal */}
            {
              showSkipConfirm && (
                <ConfirmModal
                  isOpen={showSkipConfirm}
                  title="Saltar Lançamento"
                  message="Tem certeza que deseja saltar este lançamento? Ele não será contabilizado nos totais."
                  onConfirm={async () => {
                    if (skipId) {
                      if (hasBackend) {
                        await skipFinancialItem(skipId)

                        // Fix: Update Schedule Proxima Vencimento logic (Rollover)
                        const itemToSkip = rows.allData.find(r => r.id === skipId)
                        if (itemToSkip && itemToSkip.scheduleId) {
                          try {
                            const nextDue = getNextVencimento(itemToSkip.vencimento, itemToSkip.periodo)
                            console.log('Skipping rollover schedule:', itemToSkip.scheduleId, 'Period:', itemToSkip.periodo, 'New Date:', nextDue.toISOString())
                            await updateSchedule(itemToSkip.scheduleId, { proxima_vencimento: nextDue.toISOString() })
                          } catch (err) {
                            console.error('Error rolling over skipped schedule:', err)
                          }
                        }

                        listFinancials({ status: 1, orgId: store.activeOrganization! }).then(r => { if (!r.error && r.data) setRemote(r.data as any) })
                      } else {
                        alert('NecessÃ¡rio backend')
                      }
                    }
                    setShowSkipConfirm(false)
                    setSkipId(null)
                  }}
                  onClose={() => { setShowSkipConfirm(false); setSkipId(null) }}
                />
              )
            }

            {/* Confirm Modal for Provision - Moved outside conditional */}
            {
              showConfirmModal && (
                <ConfirmModal
                  isOpen={showConfirmModal}
                  title="Confirmar Baixa"
                  message={`Deseja realmente baixar o lançamento "${pendingConfirmation?.item?.historico}"?`}
                  onClose={() => {
                    setShowConfirmModal(false)
                    setPendingConfirmation(null)
                  }}
                  onConfirm={async () => {
                    if (pendingConfirmation && hasBackend) {
                      await confirmProvision(pendingConfirmation.item.id, { valor: modalValor, data: modalData, cuentaId: modalContaId }, store.activeOrganization!)
                      listFinancials({ status: 1, orgId: store.activeOrganization! }).then(r => { if (!r.error && r.data) setRemote(r.data as any) })
                    }
                    setShowConfirmModal(false)
                    setPendingConfirmation(null)
                  }}
                >
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Data do Pagamento/Recebimento</label>
                      <input
                        type="date"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600"
                        value={modalData}
                        onChange={e => setModalData(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Conta/Caixa</label>
                      <select
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600"
                        value={modalContaId}
                        onChange={e => setModalContaId(e.target.value)}
                      >
                        <option value="">Selecione...</option>
                        {caixas.map(c => (
                          <option key={c.id} value={c.id}>{c.nome}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Valor Realizado</label>
                      <input
                        type="number"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600"
                        value={modalValor}
                        onChange={e => {
                          const val = e.target.value;
                          const truncated = val.includes('.') ? val.split('.')[0] + '.' + val.split('.')[1].slice(0, 2) : val;
                          setModalValor(parseFloat(truncated) || 0);
                        }}
                      />
                    </div>
                  </div>
                </ConfirmModal>
              )
            }

            {/* Bulk Confirm Modal */}
            {
              showBulkConfirm && (
                <BulkTransactionModal
                  isOpen={showBulkConfirm}
                  items={rows.allData.filter(r => r.conferido)}
                  accounts={caixas}
                  onClose={() => setShowBulkConfirm(false)}
                  onConfirm={handleBulkLaunch}
                />
              )
            }

            {
              showTransactionModal && (
                <TransactionModal
                  onClose={() => { setShowTransactionModal(false); setModal(null) }}
                  initialData={modal ? {
                    ...modal,
                    id: undefined,
                    data_lancamento: undefined,
                    valor_saida: modal.despesa || (modal.tipo === 'despesa' ? modal.valor : 0),
                    valor_entrada: modal.receita || (modal.tipo === 'receita' ? modal.valor : 0),
                    operacao: (modal.operacao || modal.tipo || 'despesa').toLowerCase(),
                    cliente_id: modal.favorecido_id || modal.cliente_id,
                    cliente: modal.favorecido_id || modal.cliente_id,
                    grupo_compromisso_id: modal.grupo_compromisso_id,
                    compromisso_id: modal.compromisso_id,
                    historico: modal.historico,
                    conta_id: modal.caixa_id,
                    cost_center_id: modal.cost_center_id,
                    data_vencimento: modal.vencimento || modal.data_vencimento
                  } : undefined}
                  financialId={modal?.id}
                  onSuccess={async () => {
                    // Check if we need to roll over schedule date
                    // Logic for manual edit/confirm via Modal:
                    // Currently checks modal.scheduleId. 'modal' here is the enriched item from rows.data or similar.
                    // We need to ensure 'modal' has type/totalParcelas or retrieve it.
                    // 'modal' is set from openModal(item), item comes from rows.data. So it HAS enriched fields.
                    if (modal && modal.scheduleId && modal.vencimento) {
                      try {
                        const shouldRollover = modal.tipo === 'fixo' || (modal.tipo === 'variavel' && modal.totalParcelas > 1)

                        if (shouldRollover) {
                          const nextDue = getNextVencimento(modal.vencimento, modal.periodo)
                          console.log('Rolling over schedule (Edit Modal):', modal.scheduleId, '(', modal.periodo, ') to', nextDue.toISOString())
                          await updateSchedule(modal.scheduleId, { proxima_vencimento: nextDue.toISOString() })
                        }
                      } catch (err) {
                        console.error('Failed to update schedule date', err)
                      }
                    }

                    setShowTransactionModal(false)
                    setModal(null)
                    if (hasBackend) {
                      window.location.reload()
                    }
                  }}
                  title={modal ? 'Confirmar/Editar Lançamento' : 'Incluir Nova Transação'}
                />
              )
            }

            {/* Linked Items Modal */}
            {showLinkedItemsModal && (
              <LinkedItemsModal
                isOpen={showLinkedItemsModal}
                items={linkedItems}
                onClose={() => setShowLinkedItemsModal(false)}
              />
            )}
            <ConfirmModal
              isOpen={showConfirmModal}
              onClose={() => { setShowConfirmModal(false); setConfirmItem(null) }}
              onConfirm={handleConfirmSingle}
              title="Confirmar Lançamento"
              message="Confirmar Lançamento no Livro Caixa?"
            />

            <ConfirmModal
              isOpen={showSelectAllConfirm}
              onClose={() => setShowSelectAllConfirm(false)}
              onConfirm={() => {
                setShowSelectAllConfirm(false)
                executeBulkSelect(true)
              }}
              title="Selecionar Todos"
              message="Deseja realmente selecionar todos os itens que estão na tela?"
            />
          </div>
        )
      }
      {showBulkLaunchModal && (
        <BulkTransactionModal
          isOpen={showBulkLaunchModal}
          onClose={() => setShowBulkLaunchModal(false)}
          onConfirm={handleBulkLaunch}
          items={itemsReadyToLaunch}
          accounts={caixas}
        />
      )}
    </div>
  )
}
