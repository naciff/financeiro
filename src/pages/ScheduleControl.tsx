import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/AppStore'
import { hasBackend } from '../lib/runtime'
import { Icon } from '../components/ui/Icon'
import { PageInfo } from '../components/ui/PageInfo'
import { ScheduleSummaryView } from '../components/schedule/ScheduleSummaryView'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { AlertModal } from '../components/ui/AlertModal'
import { TransactionModal } from '../components/modals/TransactionModal'
import { listFinancials, listAccounts, listCommitmentGroups, confirmProvision, updateFinancial, updateScheduleAndFutureFinancials, getFinancialItemByScheduleAndDate, updateSchedule, deleteFinancial, listFinancialsBySchedule } from '../services/db'
import { formatMoneyBr } from '../utils/format'
import { useDailyAutomation } from '../hooks/useDailyAutomation'

type Filter = 'vencidos' | '7dias' | 'mesAtual' | 'proximoMes' | '2meses' | '6meses' | '12meses' | 'fimAno'

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
  const store = useAppStore()
  const [remote, setRemote] = useState<any[]>([])
  const [modal, setModal] = useState<any | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<Filter>('mesAtual')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 12
  const [activeMainTab, setActiveMainTab] = useState<'realizar' | 'resumida'>('realizar')
  const [msg, setMsg] = useState('')
  const [showTransactionModal, setShowTransactionModal] = useState(false)

  // Filtros adicionais
  const [filterCaixa, setFilterCaixa] = useState('')
  const [filterOp, setFilterOp] = useState('Todas')
  const [filterGrupo, setFilterGrupo] = useState('')
  const [caixas, setCaixas] = useState<any[]>([])
  const [grupos, setGrupos] = useState<any[]>([])

  // Estados do Modal
  const [modalContaId, setModalContaId] = useState('')
  const [modalData, setModalData] = useState('')
  const [modalDataLancamento, setModalDataLancamento] = useState('')
  const [modalValor, setModalValor] = useState(0)
  const [modalHistorico, setModalHistorico] = useState('')
  const [modalNotaFiscal, setModalNotaFiscal] = useState('')
  const [modalDetalhes, setModalDetalhes] = useState('')
  const [showConfirmModal, setShowConfirmModal] = useState(false)
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
  const [bulkDate, setBulkDate] = useState('')
  const [bulkAccount, setBulkAccount] = useState('')

  const [showLinkedItemsModal, setShowLinkedItemsModal] = useState(false)
  const [linkedItems, setLinkedItems] = useState<any[]>([])

  const { runNow } = useDailyAutomation()

  useEffect(() => {
    if (hasBackend) {
      const orgId = store.activeOrganization || undefined
      listAccounts(orgId).then(r => { if (!r.error && r.data) setCaixas(r.data as any) })
      listCommitmentGroups(orgId).then(r => { if (!r.error && r.data) setGrupos(r.data as any) })
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

  // Carregar dados do Livro Financeiro (Todos para permitir histórico no resumo)
  useMemo(() => {
    if (hasBackend) {
      listFinancials({ orgId: store.activeOrganization || undefined }).then(r => { if (!r.error && r.data) setRemote(r.data as any) })
    }
  }, [store.activeOrganization])

  // Refresh automaticamente ao entrar/voltar para a tela
  useMemo(() => {
    function refresh() {
      if (hasBackend) {
        listFinancials({ orgId: store.activeOrganization || undefined }).then(r => { if (!r.error && r.data) setRemote(r.data as any) })
      }
    }
    refresh()
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [store.activeOrganization])


  const rows = useMemo(() => {
    // Se estiver usando store local, não temos tabela livro_financeiro, então fallback ou vazio?
    // User pediu para usar a tabela nova. Vamos assumir backend apenas para essa feature ou adaptar.
    // Como a migration é backend only, store.schedules não vai funcionar aqui.
    // Vamos usar 'remote' apenas.
    const src = remote
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

    const data = src.map((s: any) => {
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
      // id_livro é a PK, usamos como id

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
        scheduleId: s.id_agendamento,
        tipo: s.agendamento?.tipo,
        periodo: s.agendamento?.periodo,
        conferido: s.conferido || false
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
      .filter(r => [r.cliente, r.historico, r.compromisso, String(r.receita), String(r.despesa)].some(f => (f || '').toLowerCase().includes(search.toLowerCase())))
      .sort((a, b) => a.vencimentoDate.getTime() - b.vencimentoDate.getTime())

    // 1. Data for Summary (Includes Realized, respects Filters + Date)
    // When "12 Last Months" is checked in View, it will handle the date range itself using 'filteredCommon' if we pass it,
    // or we can pass 'allData' (filtered by Common Filters but ALL DATES) and 'currentData' (filtered by Common + Date).

    // filteredCommon: All dates, but respects Caixa/Op/Grupo Search
    const filteredCommon = data

    // filteredByDate: filteredCommon + Date Range
    const filteredByDate = filteredCommon.filter(r => within(new Date(r.vencimento)))

    // 2. Data for List (Pending Only? Or follow previous logic?)
    // Previously: listFinancials({ status: 1 }) -> Only Pending.
    // So 'data' (List View) should filter 'filteredByDate' to exclude realized (unless we want to show them now).
    // Let's preserve "Previsão A Realizar" meaning: Open Items.
    // However, if we filter strictly !conferido, items we JUST marked as conferido might disappear instantly?
    // User might want to see them briefly. But 'remote' update usually forces refresh.
    // Let's filter !conferido for the List View to match legacy behavior.
    const listData = filteredByDate.filter(r => !r.conferido)

    // Apply strict search on listData?
    // Search is already applied in 'data' map/filter chain above? 
    // Wait, the map/filter chain above returns 'data' which is ALREADY filtered by 'within' and 'search'.
    // I need to split the 'within' and 'search' out if I want to pass "All Time" to Summary.

    // Let's refactor the chain.

    // Calculate totals based on displayed list
    const totalReceitas = listData.reduce((sum, r) => sum + r.receita, 0)
    const totalDespesas = listData.reduce((sum, r) => sum + r.despesa, 0)
    const totalRecords = listData.length

    return {
      data: listData,
      allData: listData, // Used for selection logic
      summaryData: filteredByDate,
      summaryHistory: filteredCommon,
      current: 1,
      totalPages: 1,
      totalReceitas,
      totalDespesas,
      totalRecords
    }
  }, [remote, store.schedules, filter, search, page, filterCaixa, filterGrupo, filterOp])

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

      <div className="flex flex-col gap-2">
        {/* Row 1: Actions, Search, Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full">
          {/* Action Buttons */}
          <button
            className="flex items-center gap-2 bg-black text-white rounded px-3 py-2 text-xs md:text-sm transition-colors whitespace-nowrap"
            onClick={() => setShowTransactionModal(true)}
            title="Incluir Nova Transação"
          >
            <Icon name="add" className="w-4 h-4" /> Incluir
          </button>

          {rows.allData.some(r => r.conferido) && (
            <button
              className="flex items-center gap-2 bg-black text-white hover:bg-gray-800 dark:bg-gray-900 dark:hover:bg-black border dark:border-gray-700 rounded px-3 py-2 text-xs md:text-sm transition-colors whitespace-nowrap"
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
              onChange={e => { setPage(1); setSearch(e.target.value) }}
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2">
              <select
                className="bg-transparent text-sm py-1.5 focus:outline-none dark:text-gray-100 min-w-[100px]"
                value={filterCaixa}
                onChange={e => { setFilterCaixa(e.target.value); setPage(1) }}
              >
                <option value="">Caixa: Todos</option>
                {caixas.filter(c => c.ativo !== false).map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2">
              <select
                className="bg-transparent text-sm py-1.5 focus:outline-none dark:text-gray-100 min-w-[150px]"
                value={filterOp}
                onChange={e => { setFilterOp(e.target.value); setPage(1) }}
              >
                <option>Tipo: Todas</option>
                <option>Somente Receitas</option>
                <option>Somente Despesas</option>
                <option>Somente Aporte/Ret./Transf.</option>
                <option>Despesas e Retiradas</option>
                <option>Receitas e Aportes</option>
                <option>Somente Aporte</option>
                <option>Somente Retiradas</option>
                <option>Somente Transferências</option>
              </select>
              <Icon name="filter" className="w-3 h-3 text-gray-400 ml-1" />
            </div>

            <div className="flex items-center bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2">
              <select
                className="bg-transparent text-sm py-1.5 focus:outline-none dark:text-gray-100 min-w-[150px]"
                value={filterGrupo}
                onChange={e => { setFilterGrupo(e.target.value); setPage(1) }}
              >
                <option value="">Grupo: Todos</option>
                {grupos.map(g => (
                  <option key={g.id} value={g.id}>{g.nome}</option>
                ))}
              </select>
              <Icon name="filter" className="w-3 h-3 text-gray-400 ml-1" />
            </div>
          </div>

          {(search || filterCaixa || filterOp !== 'Todas' || filterGrupo) && (
            <button
              className="text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border dark:border-gray-600 rounded px-3 py-2 text-gray-700 dark:text-gray-300 whitespace-nowrap"
              onClick={() => {
                setSearch('')
                setFilterCaixa('')
                setFilterOp('Todas')
                setFilterGrupo('')
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
                className={`px-3 py-1 text-sm rounded transition-colors duration-300 whitespace-nowrap border ${filter === b.id ? 'bg-fourtek-blue text-white border-fourtek-blue' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                onClick={() => { setFilter(b.id); setPage(1) }}
              >
                {b.label}
              </button>
            ))}
          </div>

          {selectedIds.size > 1 && (
            <div className="ml-2 bg-green-100 dark:bg-green-900/40 border border-green-300 dark:border-green-800 shadow-sm rounded px-3 py-1 text-center whitespace-nowrap flex flex-col justify-center h-full">
              <div className="text-[10px] font-bold text-green-800 dark:text-green-300 uppercase border-b border-green-300 dark:border-green-800 leading-tight mb-0.5">
                SOMA ITENS ({selectedIds.size})
              </div>
              <div className={`text-sm font-bold ${selectionSum >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} leading-tight`}>
                {selectionSum < 0 ? '-' : ''}R$ {formatMoneyBr(Math.abs(selectionSum))}
              </div>
            </div>
          )}
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
      </div>

      {activeMainTab === 'resumida' ? (
        <ScheduleSummaryView
          data={rows.summaryData}
          history={rows.summaryHistory}
          showHistoryOption={true}
          accounts={caixas}
        />
      ) : (
        <div className="space-y-4">
          {
            filter === 'mesAtual' ? (
              <div className="space-y-4">
                {['Meses Anteriores', 'Vencidos', 'Próximos Lançamentos'].map(groupTitle => {
                  const today = new Date()
                  today.setHours(0, 0, 0, 0)
                  const firstDayOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1)

                  const groupData = rows.data.filter(r => {
                    const vencimento = new Date(r.vencimentoDate)
                    vencimento.setHours(0, 0, 0, 0)

                    if (groupTitle === 'Meses Anteriores') {
                      return vencimento < firstDayOfCurrentMonth && !r.conferido
                    } else if (groupTitle === 'Vencidos') {
                      return vencimento >= firstDayOfCurrentMonth && vencimento < today && !r.conferido
                    } else {
                      // Próximos Lançamentos
                      return (vencimento >= today || r.conferido)
                    }
                  })

                  if (groupData.length === 0) return null

                  // Calculate group total (Expenses only? Or Balance? Usually balance)
                  // Let's sum Receita - Despesa
                  const groupTotal = groupData.reduce((acc, curr) => acc + (curr.receita - curr.despesa), 0)

                  return (
                    <div key={groupTitle} className="border dark:border-gray-700 rounded-lg overflow-hidden">
                      <div className="bg-slate-700 dark:bg-slate-800 text-white px-4 py-2 text-sm font-medium flex justify-between items-center cursor-pointer"
                        onClick={() => setExpanded(prev => ({ ...prev, [groupTitle]: !prev[groupTitle] }))}>
                        <div className="flex items-center gap-2">
                          <span>- Situação : {groupTitle}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={groupTotal >= 0 ? 'text-green-300' : 'text-red-300'}>
                            {groupTotal < 0 ? '-' : ''}R$ {formatMoneyBr(Math.abs(groupTotal))}
                          </span>
                        </div>
                      </div>

                      {/* Always show, or toggle? User image shows expanded. Let's default expand or respect state. 
                          I'll default expand in state init or just render if not in expanded dict (default open) */}
                      {(!expanded[groupTitle]) && ( // Default Open: logic inverted or init empty? Let's assume !expanded means OPEN if we change logic, but here likely means CLOSED. 
                        // Let's fix state: expanded defaults to {}. If not present, is it open? 
                        // Implementation: onClick toggles. 
                        // Let's treat undefined as OPEN.
                        // So if expanded[groupTitle] === false -> Closed. === true -> Open?
                        // Actually in code usually: expanded[id] ? Open : Closed.
                        // Let's assume we want them OPEN by default.
                        // So logic: expanded[groupTitle] !== false (undefined is true)
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead className="bg-gray-50 dark:bg-gray-900 text-slate-700 dark:text-gray-300 font-semibold border-b dark:border-gray-700">
                              <tr>
                                <th className="px-4 py-2 text-left w-24">Data Vencimento</th>
                                <th className="px-4 py-2 text-left">Caixa de Lançamento</th>
                                <th className="px-4 py-2 text-left">Cliente</th>
                                <th className="px-4 py-2 text-left">Compromisso</th>
                                <th className="px-4 py-2 text-left">Histórico</th>
                                <th className="px-4 py-2 text-right w-24">Receita</th>
                                <th className="px-4 py-2 text-right w-24">Despesa</th>
                                <th className="px-4 py-2 text-center w-16">Parcela</th>
                                <th className="px-4 py-2 text-center w-16">Conferido</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-800">
                              {groupData.map(item => (
                                <tr
                                  key={item.id}
                                  className={`hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors ${item.conferido ? 'bg-gray-50/50 dark:bg-gray-900/30' : ''
                                    } ${selectedIds.has(item.id) ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}
                                  onClick={(e) => handleSelect(e, item.id)}
                                  onContextMenu={(e) => {
                                    e.preventDefault()
                                    setContextMenu({ x: e.clientX, y: e.clientY, item })
                                  }}
                                >
                                  <td className="px-4 py-2 align-top">
                                    <div className="font-medium text-slate-700 dark:text-gray-300">{item.vencimentoBr}</div>
                                    {!item.conferido && item.diasAtraso > 0 && (
                                      <div className="text-[10px] text-red-500 font-medium mt-0.5">
                                        Vencido há {item.diasAtraso} dia(s)...
                                      </div>
                                    )}
                                    {!item.conferido && item.diasAtraso === 0 && (
                                      <div className="text-[10px] text-blue-500 font-medium mt-0.5">
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
                                      checked={item.conferido}
                                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                                      onChange={async (e) => {
                                        const checked = e.target.checked
                                        if (checked) {
                                          // Abrir modal de confirmação para baixa
                                          setModalContaId(item.caixaId)
                                          setModalData(new Date().toISOString().split('T')[0])
                                          setModalValor(item.despesa || item.receita)
                                          setPendingConfirmation({ item, checked: true })
                                          setShowConfirmModal(true)
                                        } else {
                                          // Desmarcar direto?
                                          if (hasBackend) {
                                            await updateFinancial(item.id, { situacao: 1, conferido: false })
                                            listFinancials({ status: 1 }).then(r => { if (!r.error && r.data) setRemote(r.data as any) })
                                          }
                                        }
                                      }}
                                    />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              // Tabela Padrão para outros filtros (não agrupada por Situação/Meses, ou simples)
              // The user layout seems to prefer the Grouped view for "Mes Atual" which splits "Previous" vs "Next"
              // For other filters like "Next Month", maybe just one table?
              // Existing code uses `rows.data.map...` directly. Let's keep that structure for non-'mesAtual'.
              <div className="border dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 dark:bg-gray-900 text-slate-700 dark:text-gray-300 font-semibold border-b dark:border-gray-700">
                      <tr>
                        <th className="px-4 py-2 text-left w-24">Data Vencimento</th>
                        <th className="px-4 py-2 text-left">Caixa de Lançamento</th>
                        <th className="px-4 py-2 text-left">Cliente</th>
                        <th className="px-4 py-2 text-left">Compromisso</th>
                        <th className="px-4 py-2 text-left">Histórico</th>
                        <th className="px-4 py-2 text-right w-24">Receita</th>
                        <th className="px-4 py-2 text-right w-24">Despesa</th>
                        <th className="px-4 py-2 text-center w-16">Parcela</th>
                        <th className="px-4 py-2 text-center w-16">Conferido</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {rows.data.map(item => (
                        <tr
                          key={item.id}
                          className={`hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors ${item.conferido ? 'bg-gray-50/50 dark:bg-gray-900/30' : ''
                            } ${selectedIds.has(item.id) ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}
                          onClick={(e) => handleSelect(e, item.id)}
                          onContextMenu={(e) => {
                            e.preventDefault()
                            setContextMenu({ x: e.clientX, y: e.clientY, item })
                          }}
                        >
                          <td className="px-4 py-2 align-top">
                            <div className="font-medium text-slate-700 dark:text-gray-300">{item.vencimentoBr}</div>
                            {!item.conferido && item.diasAtraso > 0 && (
                              <div className="text-[10px] text-red-500 font-medium mt-0.5">
                                Vencido há {item.diasAtraso} dia(s)...
                              </div>
                            )}
                            {!item.conferido && item.diasAtraso === 0 && (
                              <div className="text-[10px] text-blue-500 font-medium mt-0.5">
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
                              checked={item.conferido}
                              className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                              onChange={async (e) => {
                                const checked = e.target.checked
                                if (checked) {
                                  // Abrir modal de confirmação para baixa
                                  setModalContaId(item.caixaId)
                                  setModalData(new Date().toISOString().split('T')[0])
                                  setModalValor(item.despesa || item.receita)
                                  setPendingConfirmation({ item, checked: true })
                                  setShowConfirmModal(true)
                                } else {
                                  // Desmarcar direto?
                                  if (hasBackend) {
                                    await updateFinancial(item.id, { situacao: 1, conferido: false })
                                    listFinancials({ status: 1 }).then(r => { if (!r.error && r.data) setRemote(r.data as any) })
                                  }
                                }
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          }

          {/* Context Menu */}
          {
            contextMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)}></div>
                <div
                  className="fixed z-50 bg-white shadow-lg rounded border p-1 w-48 text-sm"
                  style={{ top: contextMenu.y, left: contextMenu.x }}
                >
                  <button className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-blue-600" onClick={() => {
                    setContextMenu(null)
                    openModal(contextMenu.item)
                  }}>
                    <Icon name="edit" className="w-4 h-4" />
                    Alterar
                  </button>
                  <button className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-green-600" onClick={() => {
                    // Duplicar logic
                    const newItem = { ...contextMenu.item, id: undefined, id_livro: undefined }
                    // ... implementation of duplicate ...
                    setContextMenu(null)
                    // For now just alert or open modal with copy
                    setModal({ ...contextMenu.item, id: undefined })
                  }}>
                    <Icon name="copy" className="w-4 h-4" />
                    Duplicar
                  </button>
                  <button className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-red-600" onClick={async () => {
                    if (confirm('Tem certeza que deseja excluir este lançamento?')) {
                      if (contextMenu.item.scheduleId) {
                        if (confirm('Este item pertence a um agendamento. Deseja excluir apenas este lançamento (OK) ou o agendamento completo (Cancel)?')) {
                          await deleteFinancial(contextMenu.item.id)
                        } else {
                          // delete schedule logic is tricky here, usually we just link to schedule page
                        }
                      } else {
                        await deleteFinancial(contextMenu.item.id)
                      }
                      setContextMenu(null)
                      // Refresh
                      listFinancials({ status: 1 }).then(r => { if (!r.error && r.data) setRemote(r.data as any) })
                    }
                  }}>
                    <Icon name="trash" className="w-4 h-4" />
                    Excluir
                  </button>

                  <div className="border-t my-1"></div>
                  <button className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-orange-600" onClick={() => {
                    setEditValueModal({ open: true, item: contextMenu.item, value: contextMenu.item.despesa || contextMenu.item.receita })
                    setContextMenu(null)
                  }}>
                    <Icon name="dollar-sign" className="w-4 h-4" />
                    Alterar Valor Previsto
                  </button>
                  <button className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-purple-600" onClick={() => {
                    setSkipId(contextMenu.item.id)
                    setShowSkipConfirm(true)
                    setContextMenu(null)
                  }}>
                    <Icon name="skip-forward" className="w-4 h-4" />
                    Saltar Lançamento
                  </button>
                  <button className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-blue-600" onClick={() => {
                    const d = contextMenu.item.vencimento ? contextMenu.item.vencimento.split('T')[0] : ''
                    setEditDateModal({ open: true, item: contextMenu.item, date: d })
                    setContextMenu(null)
                  }}>
                    <Icon name="calendar" className="w-4 h-4" />
                    Alterar Data Vencimento
                  </button>

                  <div className="border-t my-1"></div>
                  <button className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-gray-700" onClick={() => {
                    const item = contextMenu.item
                    if (item && item.scheduleId) {
                      navigate('/schedules', { state: { selectedScheduleId: item.scheduleId } })
                    } else {
                      alert('Item sem agendamento vinculado')
                    }
                  }}>
                    <Icon name="calendar" className="w-4 h-4 text-gray-500" />
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
                    onChange={e => setEditValueModal({ ...editValueModal, value: parseFloat(e.target.value) })}
                  />
                  <div className="flex justify-end gap-2">
                    <button className="px-3 py-1 border rounded hover:bg-gray-50" onClick={() => setEditValueModal(null)}>Cancelar</button>
                    <button className="px-3 py-1 bg-black text-white rounded hover:bg-gray-800" onClick={async () => {
                      if (hasBackend) {
                        await updateFinancial(editValueModal.item.id, { valor: editValueModal.value })
                        setEditValueModal(null)
                        listFinancials({ status: 1 }).then(r => { if (!r.error && r.data) setRemote(r.data as any) })
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
                        listFinancials({ status: 1 }).then(r => { if (!r.error && r.data) setRemote(r.data as any) })
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
                      await updateFinancial(skipId, { situacao: 4 })
                      listFinancials({ status: 1 }).then(r => { if (!r.error && r.data) setRemote(r.data as any) })
                    } else {
                      alert('Necessário backend')
                    }
                  }
                  setShowSkipConfirm(false)
                  setSkipId(null)
                }}
                onClose={() => { setShowSkipConfirm(false); setSkipId(null) }}
              />
            )
          }

          {/* Confirm Modal for Provision */}
          {showConfirmModal && (
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
                  // We need to confirm provision
                  // Check if we need to set specific account/date?
                  // Using default logic from confirmProvision
                  await confirmProvision(pendingConfirmation.item.id, { valor: modalValor, data: modalData, cuentaId: modalContaId })
                  listFinancials({ status: 1 }).then(r => { if (!r.error && r.data) setRemote(r.data as any) })
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
                    onChange={e => setModalValor(parseFloat(e.target.value))}
                  />
                </div>
              </div>
            </ConfirmModal>
          )}

          {/* Bulk Confirm Modal */}
          {showBulkConfirm && (
            <ConfirmModal
              isOpen={showBulkConfirm}
              title="Baixar Lançamentos Conferidos"
              message={`Deseja baixar ${rows.allData.filter(r => r.conferido).length} lançamentos selecionados?`}
              onClose={() => setShowBulkConfirm(false)}
              onConfirm={async () => {
                const checkedItems = rows.allData.filter(r => r.conferido)
                if (hasBackend) {
                  for (const item of checkedItems) {
                    await confirmProvision(item.id, { valor: item.despesa || item.receita, data: bulkDate, cuentaId: bulkAccount })
                  }
                  listFinancials({ status: 1 }).then(r => { if (!r.error && r.data) setRemote(r.data as any) })
                }
                setShowBulkConfirm(false)
              }}
            >
              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Data da Baixa em Lote</label>
                  <input
                    type="date"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600"
                    value={bulkDate}
                    onChange={e => setBulkDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Conta/Caixa Padrão</label>
                  <select
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600"
                    value={bulkAccount}
                    onChange={e => setBulkAccount(e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {caixas.map(c => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>
              </div>
            </ConfirmModal>
          )}
        </div>
      )}

      {showTransactionModal && (
        <TransactionModal
          onClose={() => setShowTransactionModal(false)}
          onSuccess={() => {
            setShowTransactionModal(false)
            setModal(null)
            window.location.reload()
          }}
          title="Incluir Nova Transação"
        />
      )}
    </div >
  )
}
