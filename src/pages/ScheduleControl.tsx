import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/AppStore'
import { hasBackend } from '../lib/runtime'
import { Icon } from '../components/ui/Icon'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { AlertModal } from '../components/ui/AlertModal'
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
  const [msg, setMsg] = useState('')

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

  // Carregar dados do Livro Financeiro (apenas Ativos/Agendados)
  useMemo(() => {
    if (hasBackend) {
      listFinancials({ status: 1, orgId: store.activeOrganization || undefined }).then(r => { if (!r.error && r.data) setRemote(r.data as any) })
    }
  }, [store.activeOrganization])

  // Refresh automaticamente ao entrar/voltar para a tela
  useMemo(() => {
    function refresh() {
      if (hasBackend) {
        listFinancials({ status: 1, orgId: store.activeOrganization || undefined }).then(r => { if (!r.error && r.data) setRemote(r.data as any) })
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
      .filter(r => within(new Date(r.vencimento)))
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

    // Calcular totais
    const totalReceitas = data.reduce((sum, r) => sum + r.receita, 0)
    const totalDespesas = data.reduce((sum, r) => sum + r.despesa, 0)
    const totalRecords = data.length

    return {
      data: data,
      current: 1,
      totalPages: 1,
      totalReceitas,
      totalDespesas,
      totalRecords,
      allData: data
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
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Controle e Previsão</h1>



      {msg && <div className="text-sm text-green-700">{msg}</div>}

      <div className="flex justify-end mb-2">
        <button
          className="flex items-center gap-2 text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded transition-colors shadow-sm"
          onClick={() => setShowTestConfirm(true)}
          title="Testar Envio WhatsApp"
        >
          <Icon name="whatsapp" className="w-4 h-4" />
          <span className="hidden sm:inline">Testar Relatório</span>
        </button>
      </div>

      <ConfirmModal
        isOpen={showTestConfirm}
        title="Testar Relatório"
        message="Deseja enviar o relatório diário agora para o WhatsApp?"
        onClose={() => setShowTestConfirm(false)}
        onConfirm={async () => {
          setShowTestConfirm(false)
          // Show loading or just wait? Better to have a loading state but for now let's just run. 
          // Ideally we could show a toast "Enviando...", but let's just wait for result.
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

      <div role="group" aria-label="Filtros por período" className="flex flex-nowrap gap-2 overflow-x-auto items-center">
        {buttons.map(b => (
          <button key={b.id} className={`px-3 py-2 rounded border transition-colors duration-300 text-xs md:text-sm whitespace-nowrap ${filter === b.id ? 'bg-fourtek-blue text-white ring-1 ring-fourtek-blue' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}`} onClick={() => { setFilter(b.id); setPage(1) }}>{b.label}</button>
        ))}
        {selectedIds.size > 1 && (
          <div className="ml-2 bg-green-100 border border-green-300 shadow-sm rounded px-3 py-1 text-center whitespace-nowrap flex flex-col justify-center h-full">
            <div className="text-[10px] font-bold text-green-800 uppercase border-b border-green-300 leading-tight mb-0.5">
              SOMA ITENS ({selectedIds.size})
            </div>
            <div className={`text-sm font-bold ${selectionSum >= 0 ? 'text-green-600' : 'text-red-600'} leading-tight`}>
              {selectionSum < 0 ? '-' : ''}R$ {formatMoneyBr(Math.abs(selectionSum))}
            </div>
          </div>
        )}
      </div>
      <div className="flex items-end gap-3 px-3 py-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700">
            <Icon name="search" className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <input className="outline-none w-64 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400" placeholder="Buscar cliente, histórico ou valor" value={search} onChange={e => { setPage(1); setSearch(e.target.value) }} />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Caixa</label>
          <select
            className="border dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 min-w-[150px]"
            value={filterCaixa}
            onChange={e => { setFilterCaixa(e.target.value); setPage(1) }}
          >
            <option value="">Todas as Caixas</option>
            {caixas.filter(c => c.ativo !== false).map(c => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Tipo Operação</label>
          <select
            className="border dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 min-w-[150px]"
            value={filterOp}
            onChange={e => { setFilterOp(e.target.value); setPage(1) }}
          >
            <option>Todas</option>
            <option>Somente Receitas</option>
            <option>Somente Despesas</option>
            <option>Somente Aporte/Ret./Transf.</option>
            <option>Despesas e Retiradas</option>
            <option>Receitas e Aportes</option>
            <option>Somente Aporte</option>
            <option>Somente Retiradas</option>
            <option>Somente Transferências</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Grupo</label>
          <select
            className="border dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 min-w-[150px]"
            value={filterGrupo}
            onChange={e => { setFilterGrupo(e.target.value); setPage(1) }}
          >
            <option value="">Todos os Grupos</option>
            {grupos.map(g => (
              <option key={g.id} value={g.id}>{g.nome}</option>
            ))}
          </select>
        </div>

        {(filterCaixa || filterGrupo || search || filterOp !== 'Todas') && (
          <div className="flex flex-col gap-1 justify-end pb-0.5">
            <button className="text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 border dark:border-gray-600 rounded px-3 py-2 text-gray-700 dark:text-gray-200" onClick={() => { setFilterCaixa(''); setFilterGrupo(''); setSearch(''); setFilterOp('Todas') }}>
              Limpar filtros
            </button>
          </div>
        )}

        {rows.allData.some(r => r.conferido) && (
          <div className="flex flex-col gap-1 justify-end pb-0.5 ml-auto">
            <button
              className="text-sm bg-black text-white hover:bg-gray-800 dark:bg-gray-900 dark:hover:bg-black border dark:border-gray-700 rounded px-3 py-2 flex items-center gap-2"
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
              Baixar {rows.allData.filter(r => r.conferido).length} Conferidos
            </button>
          </div>
        )}
      </div>


      {
        filter === 'mesAtual' ? (
          <div className="space-y-4">
            {['Meses Anteriores', 'Próximos Lançamentos'].map(groupTitle => {
              const isPast = groupTitle === 'Meses Anteriores'
              const now = new Date()
              const startMonth = new Date(now.getFullYear(), now.getMonth(), 1)

              const groupItems = rows.allData.filter(r => {
                const d = r.vencimentoDate
                d.setHours(0, 0, 0, 0)
                return isPast ? d < startMonth : d >= startMonth
              })

              if (groupItems.length === 0) return null

              const isExpanded = expanded[groupTitle] !== false // default true? or use state
              const totalRec = groupItems.reduce((sum, r) => sum + r.receita, 0)
              const totalDesp = groupItems.reduce((sum, r) => sum + r.despesa, 0)

              return (
                <div key={groupTitle} className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded">
                  <div
                    className="flex items-center gap-3 px-3 py-2 cursor-pointer bg-gray-600 dark:bg-gray-700 text-white hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors rounded-t"
                    onClick={() => setExpanded(s => ({ ...s, [groupTitle]: !s[groupTitle] }))}
                  >
                    <div className="font-medium flex items-center gap-2">
                      <span className="text-lg font-bold">{isExpanded ? '-' : '+'}</span>
                      Situação : {groupTitle}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs table-fixed text-gray-900 dark:text-gray-100">
                        <thead>
                          <tr className="text-left bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700">
                            <th className="p-2 w-[10%]">Data Vencimento</th>
                            <th className="p-2 w-[15%]">Caixa de Lançamento</th>
                            <th className="p-2 w-[20%]">Cliente</th>
                            <th className="p-2 w-[20%]">Compromisso</th>
                            <th className="p-2 w-[15%]">Histórico</th>
                            <th className="p-2 text-right w-[8%]">Receita</th>
                            <th className="p-2 text-right w-[8%]">Despesa</th>
                            <th className="p-2 text-center w-[4%]">Parcela</th>
                            <th className="p-2 text-center w-[5%]">Conferido</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupItems.map(r => (
                            <tr
                              key={r.id}
                              className={`border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${selectedIds.has(r.id) ? 'bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-400' : 'bg-white dark:bg-gray-800'}`}
                              onClick={(e) => handleSelect(e, r.id)}
                              onDoubleClick={() => openModal(r)}
                              onContextMenu={(e) => {
                                e.preventDefault()
                                setContextMenu({ x: e.clientX, y: e.clientY, item: r })
                              }}
                            >
                              <td className="p-2 truncate">
                                <div>{r.vencimentoBr}</div>
                                {r.statusMessage && (
                                  <div className={`text-xs ${r.diasAtraso > 0 ? 'text-red-600' : 'text-orange-600'} font-medium`}>
                                    {r.statusMessage}
                                  </div>
                                )}
                              </td>
                              <td className="p-2 truncate" title={r.caixa}>{r.caixa}</td>
                              <td className="p-2 truncate" title={r.cliente}>{r.cliente}</td>
                              <td className="p-2 truncate" title={r.compromisso}>{r.compromisso}</td>
                              <td className="p-2 truncate" title={r.historico}>{r.historico}</td>
                              <td className="p-2 text-right">{r.receita > 0 ? `R$ ${formatMoneyBr(r.receita)} ` : '-'}</td>
                              <td className="p-2 text-right">{r.despesa > 0 ? `R$ ${formatMoneyBr(r.despesa)} ` : '-'}</td>
                              <td className="p-2 text-center">{r.totalParcelas > 1 ? `${r.parcela}/${r.totalParcelas}` : ''}</td>
                              <td className="p-2 text-center" onClick={e => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  className="cursor-pointer w-4 h-4"
                                  checked={r.conferido}
                                  onChange={async (e) => {
                                    if (hasBackend) {
                                      await updateFinancial(r.id, { conferido: e.target.checked })
                                      listFinancials({ status: 1 }).then(res => { if (!res.error && res.data) setRemote(res.data as any) })
                                    }
                                  }}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-gray-100 dark:bg-gray-900 font-bold border-t-2 dark:border-gray-700">
                            <td className="p-2" colSpan={5}></td>
                            <td className="p-2 text-right text-green-700">R$ {formatMoneyBr(totalRec)}</td>
                            <td className="p-2 text-right text-red-700">R$ {formatMoneyBr(totalDesp)}</td>
                            <td className="p-2"></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded">
            <div className="overflow-x-auto">
              <table className="w-full text-xs table-fixed text-gray-900 dark:text-gray-100">
                <thead>
                  <tr className="text-left bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700">
                    <th className="p-2 w-[10%]">Data Vencimento</th>
                    <th className="p-2 w-[15%]">Caixa de Lançamento</th>
                    <th className="p-2 w-[20%]">Cliente</th>
                    <th className="p-2 w-[20%]">Compromisso</th>
                    <th className="p-2 w-[15%]">Histórico</th>
                    <th className="p-2 text-right w-[8%]">Receita</th>
                    <th className="p-2 text-right w-[8%]">Despesa</th>
                    <th className="p-2 text-center w-[4%]">Parcela</th>
                    <th className="p-2 text-center w-[5%]">Conferido</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.data.map(r => (
                    <tr
                      key={r.id}
                      className={`border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${selectedIds.has(r.id) ? 'bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-400' : 'bg-white dark:bg-gray-800'}`}
                      onClick={(e) => handleSelect(e, r.id)}
                      onDoubleClick={() => openModal(r)}
                      onContextMenu={(e) => {
                        e.preventDefault()
                        setContextMenu({ x: e.pageX, y: e.pageY, item: r })
                      }}
                    >
                      <td className="p-2 truncate">
                        <div>{r.vencimentoBr}</div>
                        {r.statusMessage && (
                          <div className={`text-xs ${r.diasAtraso > 0 ? 'text-red-600' : 'text-orange-600'} font-medium`}>
                            {r.statusMessage}
                          </div>
                        )}
                      </td>
                      <td className="p-2 truncate" title={r.caixa}>{r.caixa}</td>
                      <td className="p-2 truncate" title={r.cliente}>{r.cliente}</td>
                      <td className="p-2 truncate" title={r.compromisso}>{r.compromisso}</td>
                      <td className="p-2 truncate" title={r.historico}>{r.historico}</td>
                      <td className="p-2 text-right">{r.receita > 0 ? `R$ ${formatMoneyBr(r.receita)} ` : '-'}</td>
                      <td className="p-2 text-right">{r.despesa > 0 ? `R$ ${formatMoneyBr(r.despesa)} ` : '-'}</td>

                      <td className="p-2 text-center">{r.totalParcelas > 1 ? `${r.parcela}/${r.totalParcelas}` : ''}</td>
                      <td className="p-2 text-center" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="cursor-pointer w-4 h-4"
                          checked={r.conferido}
                          onChange={async (e) => {
                            if (hasBackend) {
                              await updateFinancial(r.id, { conferido: e.target.checked })
                              listFinancials({ status: 1 }).then(res => { if (!res.error && res.data) setRemote(res.data as any) })
                            }
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 dark:bg-gray-900 font-bold border-t-2 dark:border-gray-700">
                    <td className="p-2" colSpan={5}>TOTAIS ({rows.totalRecords} registros)</td>
                    <td className="p-2 text-right text-green-700">R$ {formatMoneyBr(rows.totalReceitas)}</td>
                    <td className="p-2 text-right text-red-700">R$ {formatMoneyBr(rows.totalDespesas)}</td>
                    <td className="p-2"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )
      }

      {
        modal && (
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModal(null)} aria-hidden="true"></div>
            <div className="absolute left-1/2 top-10 -translate-x-1/2 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded w-[90%] max-w-2xl p-6 max-h-[90vh] overflow-y-auto text-xs text-gray-900 dark:text-gray-100 shadow-xl">
              <div className="font-medium mb-4 text-lg border-b dark:border-gray-700 pb-2">Lançamento para o Livro Caixa</div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Row 1: Operação | Espécie */}
                <div>
                  <label className="text-xs block text-gray-600 dark:text-gray-300 font-medium">Operação</label>
                  <input className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-gray-50 dark:bg-gray-700 capitalize text-xs text-gray-900 dark:text-gray-100" value={modal.operacao} disabled />
                </div>
                <div>
                  <label className="text-xs block text-gray-600 dark:text-gray-300 font-medium">Espécie</label>
                  <input className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-gray-50 dark:bg-gray-700 capitalize text-xs text-gray-900 dark:text-gray-100" value={modal.especie} disabled />
                </div>

                {/* Row 2: Cliente (Full) */}
                <div className="md:col-span-2">
                  <label className="text-xs block text-gray-600 dark:text-gray-300 font-medium">Cliente</label>
                  <input className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-gray-50 dark:bg-gray-700 text-xs text-gray-900 dark:text-gray-100" value={modal.cliente} disabled />
                </div>

                {/* Row 3: Grupo Compromisso | Compromisso */}
                <div>
                  <label className="text-xs block text-gray-600 dark:text-gray-300 font-medium">Grupo Compromisso</label>
                  <input className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-gray-50 dark:bg-gray-700 text-xs text-gray-900 dark:text-gray-100" value={modal.grupoCompromisso} disabled />
                </div>
                <div>
                  <label className="text-xs block text-gray-600 dark:text-gray-300 font-medium">Compromisso</label>
                  <input className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-gray-50 dark:bg-gray-700 text-xs text-gray-900 dark:text-gray-100" value={modal.compromisso} disabled />
                </div>

                {/* Row 4: Histórico (Full) */}
                <div className="md:col-span-2">
                  <label className="text-xs block text-gray-600 dark:text-gray-300 font-medium">Histórico</label>
                  <input className="w-full border dark:border-gray-600 rounded px-3 py-2 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" value={modalHistorico} onChange={e => setModalHistorico(e.target.value)} />
                </div>

                {/* Row 5: Detalhe | Nota Fiscal */}
                <div>
                  <label className="text-xs block text-gray-600 dark:text-gray-300 font-medium">Detalhe</label>
                  <input className="w-full border dark:border-gray-600 rounded px-3 py-2 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" value={modalDetalhes} onChange={e => setModalDetalhes(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs block text-gray-600 dark:text-gray-300 font-medium">Nota Fiscal</label>
                  <input className="w-full border dark:border-gray-600 rounded px-3 py-2 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" value={modalNotaFiscal} onChange={e => setModalNotaFiscal(e.target.value)} />
                </div>

                {/* Row 6: Data Vencimento | Data Lançamento */}
                <div>
                  <label className="text-xs block text-gray-600 dark:text-gray-300 font-medium">Data Vencimento</label>
                  <input type="date" className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-gray-50 dark:bg-gray-700 text-xs text-gray-900 dark:text-gray-100" value={modalData} disabled />
                </div>
                <div>
                  <label className="text-xs block text-gray-600 dark:text-gray-300 font-medium">Data Pagamento</label>
                  <input type="date" className="w-full border dark:border-gray-600 rounded px-3 py-2 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" value={modalDataLancamento} onChange={e => setModalDataLancamento(e.target.value)} />
                </div>

                {/* Row 7: Valor | Caixa Lançamento */}
                <div>
                  <label className="text-xs block text-gray-600 dark:text-gray-300 font-medium">Valor (R$)</label>
                  <input type="number" step="0.01" className="w-full border dark:border-gray-600 rounded px-3 py-2 font-semibold text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" value={modalValor} onChange={e => setModalValor(Number(e.target.value))} />
                </div>
                <div>
                  <label className="text-xs block text-gray-600 dark:text-gray-300 font-medium">Caixa Lançamento</label>
                  <select className="w-full border dark:border-gray-600 rounded px-3 py-2 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" value={modalContaId} onChange={e => setModalContaId(e.target.value)}>
                    <option value="">Selecione...</option>
                    {caixas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                <button className="rounded border dark:border-gray-600 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200" onClick={() => setModal(null)}>Cancelar</button>
                <button className="bg-black text-white rounded px-4 py-2 hover:bg-gray-800 dark:bg-gray-900 dark:hover:bg-black" onClick={() => {
                  if (!modalContaId) { alert('Selecione uma conta'); return }
                  setShowConfirmModal(true)
                }}>Confirmar Lançamento</button>
              </div>
            </div>
            {/* Custom Confirmation Modal */}
            {showConfirmModal && (
              <div className="absolute inset-0 z-60 flex items-center justify-center bg-black/20 backdrop-blur-sm rounded">
                <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded shadow-lg p-6 w-[300px] text-center">
                  <h3 className="font-semibold text-lg mb-4 text-gray-800 dark:text-gray-100">Confirmação</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">Deseja confirmar o lançamento deste item no Livro Caixa?</p>
                  <div className="flex justify-center gap-3">
                    <button
                      className="px-4 py-2 rounded border dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-200"
                      onClick={() => setShowConfirmModal(false)}
                    >
                      Não
                    </button>
                    <button
                      className="px-4 py-2 rounded bg-black text-white hover:bg-gray-800 text-sm"
                      onClick={async () => {
                        const originalValue = modal.despesa || modal.receita || 0

                        // Check if value changed AND it is a fixed schedule (tipo === 'fixo')
                        if (Math.abs(modalValor - originalValue) > 0.01 && modal.agendamento?.id && modal.agendamento?.tipo === 'fixo') {
                          // Diferente do original e tem agendamento pai do tipo FIXO
                          setPendingConfirmation({
                            id: modal.id,
                            valor: modalValor,
                            data: modalDataLancamento,
                            cuentaId: modalContaId,
                            scheduleId: modal.agendamento.id,
                            vencimento: modal.vencimento // Capture original due date
                          })
                          setShowConfirmModal(false)
                          setShowUpdateScheduleModal(true)
                          return
                        }

                        // Normal flow
                        if (hasBackend) {
                          try {
                            const { data, error } = await confirmProvision(modal.id, {
                              valor: modalValor,
                              data: modalDataLancamento,
                              cuentaId: modalContaId
                            })

                            if (error) {
                              alert('Erro de comunicação: ' + error.message)
                              return
                            }

                            // Check RPC application-level error
                            if (data && !data.success) {
                              alert('Erro ao confirmar: ' + data.message)
                              return
                            }

                            setMsg('Lançamento confirmado com sucesso!')
                            setShowConfirmModal(false)
                            setModal(null)
                            // Refresh list
                            listFinancials({ status: 1 }).then(r => { if (!r.error && r.data) setRemote(r.data as any) })
                          } catch (e: any) {
                            alert('Erro: ' + e.message)
                          }
                        } else {
                          alert('Funcionalidade disponível apenas com Backend Supabase')
                        }
                      }}
                    >
                      Sim
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Update Schedule Confirmation Modal */}
            {showUpdateScheduleModal && (
              <div className="absolute inset-0 z-60 flex items-center justify-center bg-black/20 backdrop-blur-sm rounded">
                <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded shadow-lg p-6 w-[350px] text-center">
                  <h3 className="font-semibold text-lg mb-4 text-gray-800 dark:text-gray-100">Atualizar Agendamento?</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">O valor informado é diferente do previsto. Deseja atualizar o valor fixo para os próximos lançamentos deste agendamento?</p>
                  <div className="flex justify-center gap-3">
                    <button
                      className="px-4 py-2 rounded border dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-200"
                      onClick={async () => {
                        // NÃO: Confirma apenas este, mantendo agendamento igual
                        if (!pendingConfirmation) return

                        // 1. Update this item's value first to ensure consistency/RPC success
                        await updateFinancial(pendingConfirmation.id, { valor: pendingConfirmation.valor })

                        // 2. Confirm
                        const { data, error } = await confirmProvision(pendingConfirmation.id, {
                          valor: pendingConfirmation.valor,
                          data: pendingConfirmation.data,
                          cuentaId: pendingConfirmation.cuentaId
                        })

                        if (error || (data && !data.success)) {
                          alert('Erro ao confirmar: ' + (error?.message || data?.message))
                        } else {
                          setMsg('Lançamento confirmado (Agendamento mantido).')
                        }
                        setModal(null)
                        listFinancials({ status: 1 }).then(r => { if (!r.error && r.data) setRemote(r.data as any) })
                        setShowUpdateScheduleModal(false)
                        setPendingConfirmation(null)
                      }}
                    >
                      Não
                    </button>
                    <button
                      className="px-4 py-2 rounded bg-black text-white hover:bg-gray-800 text-sm"
                      onClick={async () => {
                        // SIM: Atualiza agendamento e confirma este
                        if (!pendingConfirmation) return

                        const originalId = pendingConfirmation.id
                        const originalDate = pendingConfirmation.vencimento
                        const scheduleId = pendingConfirmation.scheduleId
                        const newVal = pendingConfirmation.valor

                        // 1. Update this item's value first (ensure consistent value for history)
                        await updateFinancial(originalId, { valor: newVal })

                        // 2. Confirm this provision (Status -> 2)
                        const { data, error } = await confirmProvision(originalId, {
                          valor: newVal,
                          data: pendingConfirmation.data,
                          cuentaId: pendingConfirmation.cuentaId
                        })

                        if (error || (data && !data.success)) {
                          alert('Erro ao confirmar: ' + (error?.message || data?.message))
                          return
                        }

                        // 3. Update Master Schedule (triggers DB regeneration)
                        // We use updateSchedule directly to just update 'valor' on master.
                        // Expectation: Trigger will regenerate future pending items.
                        // Risk: Trigger might create a DUPLICATE pending item for the CURRENT month (originalDate).
                        const { error: upErr } = await updateSchedule(scheduleId, { valor: newVal })

                        if (upErr) {
                          console.error('Erro ao atualizar agendamento:', upErr)
                          alert('Lançamento confirmado, mas erro ao atualizar agendamento mestre: ' + upErr.message)
                        } else {
                          // 4. CLEANUP: Check if a duplicate pending item was created for the confirmed date
                          const { data: dupItem } = await getFinancialItemByScheduleAndDate(scheduleId, originalDate)
                          if (dupItem && dupItem.id !== originalId) {
                            console.log('Detected duplicate pending item created by trigger. Deleting:', dupItem.id)
                            await deleteFinancial(dupItem.id)
                          }

                          setMsg('Lançamento confirmado e Agendamento atualizado!')
                        }

                        setModal(null)
                        listFinancials({ status: 1 }).then(r => { if (!r.error && r.data) setRemote(r.data as any) })
                        setShowUpdateScheduleModal(false)
                        setPendingConfirmation(null)
                      }}
                    >
                      Sim
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      }

      {/* Linked Items Modal */}
      {showLinkedItemsModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/20 backdrop-blur-sm rounded">
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded shadow-lg p-0 w-[95%] max-w-[1000px] max-h-[90vh] flex flex-col text-xs text-gray-900 dark:text-gray-100">
            <div className="flex items-center justify-between p-2 bg-[#f0f9eb] dark:bg-green-900/30 border-b dark:border-gray-700">
              <div className="flex items-center gap-2 font-bold text-gray-800 dark:text-gray-100 text-sm">
                <Icon name="check" className="w-5 h-5 text-green-600" />
                Itens do Agendamento
              </div>
              <div className="flex gap-2">
                <button className="flex items-center gap-1 px-3 py-1 bg-white border rounded hover:bg-gray-100" onClick={() => window.print()}>
                  <Icon name="printer" className="w-4 h-4" /> Imprimir
                </button>
                <button className="flex items-center gap-1 px-3 py-1 bg-white border rounded hover:bg-gray-100" onClick={() => setShowLinkedItemsModal(false)}>
                  <Icon name="x" className="w-4 h-4" /> Fechar
                </button>
              </div>
            </div>

            <div className="overflow-auto flex-1 p-0">
              <table className="w-full text-left border-collapse text-gray-900 dark:text-gray-100">
                <thead className="bg-[#e0e0e0] dark:bg-gray-700 sticky top-0 z-10 font-bold border-b border-gray-300 dark:border-gray-600">
                  <tr>
                    <th className="px-2 py-1 border-r border-gray-300 dark:border-gray-600">Situação</th>
                    <th className="px-2 py-1 border-r border-gray-300 dark:border-gray-600">Data Prevista</th>
                    <th className="px-2 py-1 border-r border-gray-300 dark:border-gray-600">Valor Previsto</th>
                    <th className="px-2 py-1 border-r border-gray-300 dark:border-gray-600">Compromisso</th>
                    <th className="px-2 py-1 border-r border-gray-300 dark:border-gray-600">Histórico</th>
                    <th className="px-2 py-1 border-r border-gray-300 dark:border-gray-600">Data Pagamento</th>
                    <th className="px-2 py-1 border-r border-gray-300 dark:border-gray-600">Valor Realizado</th>
                    <th className="px-2 py-1">Parcela</th>
                  </tr>
                </thead>
                <tbody>
                  {linkedItems.map((item, idx) => {
                    const isPaid = item.situacao === 2
                    const isSkipped = item.situacao === 4
                    const isTime = item.situacao === 1 || !item.situacao

                    let statusIcon = 'clock'
                    let statusText = 'Aguardando Realização'
                    let statusClass = 'text-blue-700'

                    if (isPaid) {
                      statusIcon = 'check'
                      statusText = 'Realizado'
                      statusClass = 'text-green-700 font-bold'
                    } else if (isSkipped) {
                      statusIcon = 'skip'
                      statusText = 'Saltado/Cancelado'
                      statusClass = 'text-gray-500 italic line-through'
                    }
                    const rowClass = idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-[#f9f9f9] dark:bg-gray-700'

                    // Formatting
                    const valorPrevisto = formatMoneyBr(item.valor)
                    const valorRealizado = isPaid ? formatMoneyBr(item.valor_pago || item.valor) : ''
                    const dataPagamento = isPaid && item.data_pagamento ? toBr(item.data_pagamento) : ''
                    const compromisso = item.agendamento?.compromisso?.nome || ''
                    // Parse '1/12' from history if possible, or just item history
                    // The user screenshot shows "1/48" appended to history or in a separate column. 
                    // Our backend usually stores "Parcela X/Y" or we can derive it.
                    // Ideally, we'd have parcel_current / parcel_total. 
                    // For now, let's display what we have.
                    // Based on screenshot, "Parcela" is a column "8/48".
                    // Our data structure might vary. If item.agendamento.parcelas > 1, show item index+1 / total?
                    // Need to be careful. The list is ordered by date.
                    // We can infer parcela if not stored: (idx + 1) / totalItems

                    // Actually, let's check if we have it in history or details.
                    // For now rendering generic.
                    const parcelaDisplay = (item.agendamento?.parcelas > 1) ? `${idx + 1}/${item.agendamento.parcelas}` : ''

                    return (
                      <tr key={item.id} className={`${rowClass} hover:bg-yellow-50 dark:hover:bg-gray-600 border-b border-gray-200 dark:border-gray-700 text-[#000000] dark:text-gray-100 ${isSkipped ? 'opacity-60 bg-gray-50 dark:bg-gray-800' : ''}`}>
                        <td className={`px-2 py-1 border-r border-gray-200 dark:border-gray-700 whitespace-nowrap ${statusClass}`}>
                          <div className="flex items-center gap-1">
                            <Icon name={statusIcon} className="w-3 h-3" />
                            {statusText}
                          </div>
                        </td>
                        <td className="px-2 py-1 border-r border-gray-200 dark:border-gray-700">{toBr(item.data_vencimento)}</td>
                        <td className="px-2 py-1 border-r border-gray-200 dark:border-gray-700 text-red-600 dark:text-red-400 font-medium whitespace-nowrap">R$ {valorPrevisto}</td>
                        <td className="px-2 py-1 border-r border-gray-200 dark:border-gray-700 text-green-700 dark:text-green-400">{compromisso}</td>
                        <td className="px-2 py-1 border-r border-gray-200 dark:border-gray-700 text-blue-700 dark:text-blue-400 uppercase font-medium">{item.historico}</td>
                        <td className="px-2 py-1 border-r border-gray-200 dark:border-gray-700">{dataPagamento}</td>
                        <td className="px-2 py-1 border-r border-gray-200 dark:border-gray-700 text-right whitespace-nowrap">{valorRealizado ? `R$ ${valorRealizado}` : ''}</td>
                        <td className="px-2 py-1 text-right">{parcelaDisplay}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Confirm Modal */}
      {showBulkConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/20 backdrop-blur-sm rounded">
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded shadow-lg p-6 w-[800px] max-h-[90vh] flex flex-col text-xs text-gray-900 dark:text-gray-100">
            <h3 className="font-semibold text-lg mb-4 text-gray-800 dark:text-gray-100 border-b dark:border-gray-700 pb-2">Confirmação de Registro em Lote</h3>

            <div className="grid grid-cols-4 gap-4 mb-4 bg-gray-50 dark:bg-gray-700 p-4 rounded border dark:border-gray-600">
              <div>
                <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Data de Pagamento</label>
                <input
                  type="date"
                  className="w-full border dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  value={bulkDate}
                  onChange={e => setBulkDate(e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Caixa de Lançamento</label>
                <select
                  className="w-full border dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  value={bulkAccount}
                  onChange={e => setBulkAccount(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {caixas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Total Selecionado</label>
                <div className="w-full border dark:border-gray-600 rounded px-2 py-1 bg-gray-100 dark:bg-gray-900 font-bold text-right text-gray-900 dark:text-gray-100">
                  R$ {formatMoneyBr(rows.allData.filter(r => r.conferido).reduce((acc, curr) => acc + (curr.receita || curr.despesa || 0), 0))}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto border dark:border-gray-700 rounded mb-4">
              <table className="w-full text-left text-gray-900 dark:text-gray-100">
                <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
                  <tr>
                    <th className="p-2 border-b dark:border-gray-600">Favorecido / Cliente</th>
                    <th className="p-2 border-b dark:border-gray-600">Compromisso</th>
                    <th className="p-2 border-b dark:border-gray-600">Vencimento</th>
                    <th className="p-2 border-b dark:border-gray-600 text-right">Valor Item</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.allData.filter(r => r.conferido).map(item => (
                    <tr key={item.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                      <td className="p-2 truncate max-w-[200px]">{item.cliente}</td>
                      <td className="p-2 truncate max-w-[200px]">{item.compromisso}</td>
                      <td className="p-2">{toBr(item.vencimento)}</td>
                      <td className="p-2 text-right">R$ {formatMoneyBr(item.receita || item.despesa || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t">
              <button
                className="px-4 py-2 rounded border hover:bg-gray-50 text-sm"
                onClick={() => setShowBulkConfirm(false)}
              >
                Cancelar
              </button>
              <button
                className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 text-sm flex items-center gap-2"
                onClick={async () => {
                  if (!bulkDate) { alert('Informe a Data de Pagamento'); return }
                  if (!bulkAccount) { alert('Informe o Caixa de Lançamento'); return }

                  const items = rows.allData.filter(r => r.conferido)
                  let successCount = 0
                  let errorCount = 0

                  for (const item of items) {
                    const val = item.receita || item.despesa || 0

                    const { data, error } = await confirmProvision(item.id, {
                      valor: val,
                      data: bulkDate,
                      cuentaId: bulkAccount
                    })

                    if (error || (data && !data.success)) {
                      console.error('Falha ao baixar item:', item.id, error || data)
                      errorCount++
                    } else {
                      successCount++
                    }
                  }

                  let msg = `Processado! ${successCount} confirmados.`
                  if (errorCount > 0) msg += ` ${errorCount} erros.`
                  setMsg(msg)
                  setShowBulkConfirm(false)
                  setBulkDate('')
                  setBulkAccount('')

                  // Refresh list and keep checkbox state in sync (reload will clear them though if mapped from DB)
                  // Ideally, DB update should clear 'conferido' flag? 
                  // confirmProvision usually moves status to 2 (Pago), so they will disappear from the list (status=1)

                  listFinancials({ status: 1 }).then(r => { if (!r.error && r.data) setRemote(r.data as any) })
                }}
              >
                <Icon name="check" className="w-4 h-4" />
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {
        contextMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)}></div>
            <div
              className="fixed z-50 bg-white border rounded shadow-lg py-1 text-xs font-medium w-64"
              style={{ top: contextMenu.y, left: contextMenu.x }}
            >
              <button className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-gray-700" onClick={async () => {
                if (hasBackend) {
                  await updateFinancial(contextMenu.item.id, { situacao: 4 }) // 4 = Saltado/Cancelado
                  setContextMenu(null)
                  // Refresh
                  listFinancials({ status: 1 }).then(r => { if (!r.error && r.data) setRemote(r.data as any) })
                } else {
                  alert('Disponível apenas com backend')
                }
              }}>
                <Icon name="skip" className="w-4 h-4 text-gray-500" />
                Saltar Lançamento
              </button>
              <div className="border-t my-1"></div>
              <button className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-gray-700" onClick={async () => {
                setContextMenu(null)
                const item = contextMenu.item
                if (!item || !item.scheduleId) {
                  alert('Este item não possui um agendamento vinculado.')
                  return
                }

                // Note: listFinancialsBySchedule needs update to support orgId?
                // Actually it filters by scheduleId, which is unique.
                // But for robust RLS, we should prob pass context or ensure RLS covers it.
                // RLS on financials: has_access(user_id)
                // If the item exists and I can see it, I have access.
                // fetching by scheduleId should define filtered records.
                // But wait, listFinancialsBySchedule calculates userId internaly.
                // It needs to support orgId too if used in shared context.
                // Let's check db.ts again.
                // I forgot to refactor listFinancialsBySchedule.
                // I will do it later or rely on RLS not blocking if queried correctly?
                // No, the function explicitly does .eq('user_id', userId).
                // It needs to be refactored. I will assume it accepts orgId or I need to fix it.
                // For now, I'll pass it if I fix the signature.
                // Assuming I will fix it:
                // Wait, I can't pass orgId if signature doesn't take it.
                // I should assume the basic implementation first.
                // The current implementation of listFinancialsBySchedule USES active user ID.
                // If I am browsing delegated data, userId will be ME, but data belongs to OWNER.
                // So .eq('user_id', my_id) will return NOTHING.
                // I MUST refactor listFinancialsBySchedule.
                // For now I'll just leave this call as is and FIX the backend function.
                const r = await listFinancialsBySchedule(item.scheduleId)
                if (r.error) {
                  alert('Erro ao carregar itens vinculados: ' + (r.error as any).message)
                } else {
                  setLinkedItems(r.data || [])
                  setShowLinkedItemsModal(true)
                }
              }}>
                <Icon name="list" className="w-4 h-4 text-gray-500" />
                <span className="whitespace-nowrap">Visualizar Itens Vinculados</span>
              </button>
              <div className="border-t my-1"></div>
              <button className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-blue-600" onClick={() => {
                const val = contextMenu.item.valor_parcela ? Number(contextMenu.item.valor_parcela) : (contextMenu.item.receita || contextMenu.item.despesa || 0)
                setEditValueModal({ open: true, item: contextMenu.item, value: val })
                setContextMenu(null)
              }}>
                <Icon name="dollar" className="w-4 h-4" />
                Alterar Valor Previsto
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
    </div >
  )
}
