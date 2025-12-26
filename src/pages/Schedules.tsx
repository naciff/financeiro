import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { formatIntBr, formatMoneyBr } from '../utils/format'
import { createSchedule, generateSchedule, listClients, createClient, listCommitmentGroups, listCommitmentsByGroup, listCashboxes, listSchedules, updateSchedule as updateSched, deleteSchedule as deleteSched, listAccounts, searchAccounts, checkScheduleDependencies, deactivateSchedule, saveClientDefault, getClientDefault, listAllCommitments, listCostCenters, saveScheduleCostCenters, getScheduleCostCenters } from '../services/db'
import { supabase } from '../lib/supabase'
import { hasBackend } from '../lib/runtime'
import { useAppStore } from '../store/AppStore'
import { Icon } from '../components/ui/Icon'
import { PageInfo } from '../components/ui/PageInfo'
import { Tabs } from '../components/ui/Tabs'
import { ClientModal } from '../components/modals/ClientModal'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { AlertModal } from '../components/ui/AlertModal'
import { FloatingLabelInput } from '../components/ui/FloatingLabelInput'
import { FloatingLabelSelect } from '../components/ui/FloatingLabelSelect'
import { CommitmentGroupModal } from '../components/modals/CommitmentGroupModal'
import { CommitmentModal } from '../components/modals/CommitmentModal'

type Sort = { key: string; dir: 'asc' | 'desc' }

import { SharedCostCenterModal } from '../components/modals/SharedCostCenterModal'

export default function Schedules() {
  const location = useLocation()
  const navigate = useNavigate()
  const store = useAppStore()
  const [activeTab, setActiveTab] = useState<'despesa' | 'receita' | 'retirada' | 'aporte' | 'concluidos'>('despesa')
  const [showForm, setShowForm] = useState<'none' | 'create' | 'edit'>('none')
  const [selectedId, setSelectedId] = useState<string>('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false)
  const [showSaveDefaultConfirm, setShowSaveDefaultConfirm] = useState(false)
  const [saveDefaultMessage, setSaveDefaultMessage] = useState('')
  const [clientIndex, setClientIndex] = useState(-1)
  const [deactivateId, setDeactivateId] = useState<string | null>(null)
  const [alertInfo, setAlertInfo] = useState({ open: false, msg: '' })

  // Shared Cost Center 
  const [sharedCostCenterModal, setSharedCostCenterModal] = useState<{ open: boolean; value: number; onConfirm?: (ids: string[], share: number) => Promise<void> }>({ open: false, value: 0 })
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<Sort>({ key: 'ano_mes_inicial', dir: 'asc' })
  const [page, setPage] = useState(1)
  const pageSize = 10000

  const [operacao, setOperacao] = useState('despesa')
  const [tipo, setTipo] = useState('fixo')
  const [especie, setEspecie] = useState('pix')
  const [anoMesInicial, setAnoMesInicial] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [clienteBusca, setClienteBusca] = useState('')
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([])
  const [clienteNome, setClienteNome] = useState('')
  const [clientModal, setClientModal] = useState(false)
  const [groupModal, setGroupModal] = useState(false)
  const [commitmentModal, setCommitmentModal] = useState(false)
  const [historico, setHistorico] = useState('')
  const [valor, setValor] = useState<number>(0)
  const [valorFocused, setValorFocused] = useState(false)
  const [proxima, setProxima] = useState('')
  const [dateDisplay, setDateDisplay] = useState('')
  const [periodoFix, setPeriodoFix] = useState<'mensal' | 'anual'>('mensal')
  const [parcelas, setParcelas] = useState<number>(1)
  const [preview, setPreview] = useState<Array<{ date: string; valor: number }>>([])
  const [changesLog, setChangesLog] = useState<string[]>([])
  const [isDuplicating, setIsDuplicating] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState<'success' | 'error' | ''>('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [notaFiscal, setNotaFiscal] = useState<string>('')
  const [tipoPessoa, setTipoPessoa] = useState<'pf' | 'pj'>('pf')
  const [grupoId, setGrupoId] = useState('')
  const [grupos, setGrupos] = useState<{ id: string; nome: string; operacao?: string }[]>([])
  const [compromissoId, setCompromissoId] = useState('')
  const [grupoCompromissoFilter, setGrupoCompromissoFilter] = useState('')
  const [allCommitmentGroups, setAllCommitmentGroups] = useState<{ id: string; nome: string }[]>([])
  const [allCommitments, setAllCommitments] = useState<{ id: string; nome: string }[]>([])
  const [compromissos, setCompromissos] = useState<{ id: string; nome: string; grupo_id?: string }[]>([])

  // Auto-select Principal Account


  const [caixaId, setCaixaId] = useState('')
  const [caixas, setCaixas] = useState<{ id: string; nome: string }[]>([])
  const [contas, setContas] = useState<{ id: string; nome: string; ativo?: boolean; principal?: boolean; tipo?: string; dia_vencimento?: number; dia_bom?: number }[]>([])
  const [contaBusca, setContaBusca] = useState('')
  const [detalhes, setDetalhes] = useState('')
  const [parcial, setParcial] = useState(false)
  const [refChoice, setRefChoice] = useState<'vencimento' | 'anterior'>('vencimento')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; id: string } | null>(null)
  const [costCenterId, setCostCenterId] = useState('')
  const [costCenters, setCostCenters] = useState<{ id: string; descricao: string; principal?: boolean; compartilhado?: boolean }[]>([])
  const [selectedSharedCCs, setSelectedSharedCCs] = useState<string[]>([])

  // Auto-select Principal Account
  useEffect(() => {
    // Only auto-select if creating new or if user changes option in create mode
    // In edit mode, we want to keep what was saved, unless user changes 'especie' manually? 
    // Ideally, we should only trigger this if 'especie' changes AND we are not just opening the form.
    // The problem is openEditForm sets 'especie' which triggers this.

    // We can check if showForm just became 'create'.
    // Or we rely on the fact that openEditForm sets values. 
    // If showForm is 'edit', we should probably NOT auto-select unless the user actively changes 'especie' dropdown.
    // But we don't know if the change comes from 'openEditForm' (programmatic) or user.

    // Simple fix: Only run if showForm === 'create'. 
    // If user changes currency in edit mode, maybe they want auto-select? 
    // If so, we'd need more complex logic. 
    // For now, let's restrict to 'create' to solve the bug.

    if (showForm === 'create' && contas.length > 0) {
      // Check if we already have a caixaId selected (e.g. from duplication)
      // If we do, we preserve it. Auto-select only applies if caixaId is empty.
      if (caixaId) return

      const filteredAccounts = contas.filter(c => {
        if (c.ativo === false) return false
        if (especie === 'cartao') return c.tipo === 'cartao'
        if (especie === 'dinheiro') return c.tipo === 'carteira'
        if (['boleto', 'pix', 'transferencia', 'debito_automatico'].includes(especie)) return c.tipo === 'banco'
        return true
      })

      const principal = filteredAccounts.find(c => c.principal)
      if (principal) {
        setCaixaId(principal.id)
      }
    }
  }, [especie, showForm, contas]) // DO NOT add caixaId to deps, or it loops or prevents reset? 
  // If we add caixaId, then when user clears it, it might auto-select again? 
  // Ideally, we want this to run when 'showForm' becomes 'create' OR 'especie' changes.
  // If 'caixaId' is set, we skip.
  // We need to be careful: if user changes 'especie', we DO want to re-select principal for that new especie, EVEN IF it was set before?
  // User changes Espécie -> clear current caixaId or keep it?
  // Current logic: if I change especie, I expect the account options to change. If the current selected account is invalid for the new especie, it should be cleared/changed.
  // The 'contas' list doesn't change, but options displayed in select are filtered.
  // We should probably force update if the current 'caixaId' is not valid for the new species? 

  // Revised logic:
  // If showForm JUST became create (or we are in create):
  // 1. If kind changed, we likely want to pick a default for that kind.
  // 2. If kind is same (duplication), we keep existing value.

  // Implementation below only skips if caixaId is present.
  // When duplicating, caixaId IS present. So it skips. Correct.
  // When changing species manually: 'caixaId' might still be set to the OLD account.
  // We should properly clear caixaId when species changes if it mismatches?
  // Or simply, if I change Species, I want the default for that Species.
  // But wait, if I duplicate, I get species + caixa set. Effect runs. Caixa is set. It skips.
  // If I then change Species manually? Caixa is still set. It skips.
  // But the dropdown options will filter out the old caixa. So the value is invalid effectively.
  // We should auto-select if current caixaId is NOT valid for current species?

  /*
    Let's refine:
    If Duplicating: species & caixa are set together. We want to KEEP them.
    If Creating New: species is default, caixa is empty. We select default.
    If Changing Species: we want to select default for new species.
    
    The tricky part: How to distinguish "Duplication setting Species" vs "User changing Species"?
    Duplication sets everything at once.
    React updates might batch.
    
    If checking 'caixaId' existence:
    - Duplication: caixaId exists. Skip. OK.
    - User change Species: caixaId exists (from previous species). Skip. BAD. User sees empty field (if filtered out) or old value.
    
    We need to check if the current 'caixaId' is VALID for the new 'especie'.
    If valid, we keep it (covers duplication).
    If invalid (or empty), we auto-select principal.
  */


  // Calculate sum of selected items
  const selectionSum = useMemo(() => {
    let sum = 0
    if (selectedIds.size === 0) return 0

    // We need to find the items in the current view (rows) or remoteSchedules
    // Since rows calculation is complex and inside the render/memo, we should probably access the source data
    // tailored to the current view. However, sticking to the pattern used in ScheduleControl is best.

    // For now, let's look at remoteSchedules if visible, or iterate whatever is displayed.
    // Ideally we filter from the displayed rows.
    // Let's defer calculation to where 'rows' is available or memoize 'rows' outside.
    return 0
  }, [selectedIds]) // Placeholder, will implement full logic or move it down where 'rows' exists

  function handleSelect(e: React.MouseEvent, id: string) {
    if (e.ctrlKey || e.metaKey) {
      setSelectedIds(prev => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    } else {
      // If clicking without ctrl, maybe we don't want to clear unless we click a clear button? 
      // Or standard behavior: select only this one.
      setSelectedIds(prev => {
        const next = new Set(prev)
        if (next.has(id)) {
          next.delete(id)
          return next
        } else {
          return new Set([id])
        }
      })
    }
  }

  const [remoteSchedules, setRemoteSchedules] = useState<any[]>([])
  const nativeDateRef = useRef<HTMLInputElement>(null)
  const [typeFilter, setTypeFilter] = useState<'fixo' | 'variavel' | ''>('')
  const [periodFilter, setPeriodFilter] = useState<'mensal' | 'semestral' | 'anual' | 'determinado' | ''>('')
  const [gridCollapsed, setGridCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem('schedules.gridCollapsed') === '1' } catch { return false }
  })
  const [accountExpanded, setAccountExpanded] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem('schedules.accountExpanded')
      return raw ? JSON.parse(raw) : {}
    } catch { return {} }
  })
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    try { localStorage.setItem('schedules.gridCollapsed', gridCollapsed ? '1' : '0') } catch { }
  }, [gridCollapsed])

  useEffect(() => {
    try { localStorage.setItem('schedules.accountExpanded', JSON.stringify(accountExpanded)) } catch { }
  }, [accountExpanded])

  function toBr(iso: string) {
    if (!iso) return ''
    // Fix: Parse date without timezone conversion
    const dateStr = iso.split('T')[0] // Get YYYY-MM-DD
    if (!dateStr) return ''
    const [yyyy, mm, dd] = dateStr.split('-')
    if (!yyyy || !mm || !dd) return ''
    return `${dd}/${mm}/${yyyy}`
  }
  function fromBr(br: string) {
    const m = br.match(/^([0-9]{2})\/([0-9]{2})\/([0-9]{4})$/)
    if (!m) return ''
    const iso = `${m[3]}-${m[2]}-${m[1]}`
    const d = new Date(iso)
    return Number.isNaN(d.getTime()) ? '' : iso
  }

  const data = useMemo(() => {
    const source = hasBackend ? remoteSchedules : store.schedules
    console.log('DEBUG: Source Schedules Length:', source.length)
    const arr = source.map((s: any) => {
      const start = new Date(s.ano_mes_inicial)
      const end = new Date(s.ano_mes_inicial)
      if (s.periodo === 'mensal') end.setMonth(end.getMonth() + (s.parcelas || 1))
      else if (s.periodo === 'semestral') end.setMonth(end.getMonth() + (6 * (s.parcelas || 1)))
      else end.setFullYear(end.getFullYear() + (s.parcelas || 1))
      const valorParcela = Number(s.parcelas || 1) > 1 ? Math.round((Number(s.valor) / Number(s.parcelas)) * 100) / 100 : Number(s.valor)
      // Valor total deve ser o valor original da compra, não a soma das parcelas arredondadas
      const valorTotal = Number(s.valor)

      // Fix: Fixed schedules (recurrent) should VALIDATE TIME (never auto-conclude by date), only by status=2
      // Variable schedules (installments) auto-conclude when the end date passes.
      const isFixed = s.tipo === 'fixo'
      const timeConcluded = new Date() > end
      const concluido = isFixed ? false : timeConcluded

      const clienteNome = (typeof s.cliente === 'object' ? s.cliente?.nome : s.cliente) || (clientes.find(c => c.id === (s.favorecido_id || s.cliente_id))?.nome) || ''
      const caixaNome = (typeof s.caixa === 'object' ? s.caixa?.nome : s.caixa) || (contas.find(c => c.id === s.caixa_id)?.nome) || ''
      const caixaCor = (typeof s.caixa === 'object' ? s.caixa?.cor : null) || (contas.find(c => c.id === s.caixa_id) as any)?.cor || '#3b82f6'

      let dataFinal = ''
      if (s.tipo === 'variavel' && s.proxima_vencimento && s.parcelas > 1) {
        // ... (keep existing logic)
        const dateStr = s.proxima_vencimento.split('T')[0] // YYYY-MM-DD
        const [year, month, day] = dateStr.split('-').map(Number)

        let finalMonth = month + (s.parcelas - 1)
        let finalYear = year

        while (finalMonth > 12) {
          finalMonth -= 12
          finalYear += 1
        }

        const yyyy = finalYear
        const mm = String(finalMonth).padStart(2, '0')
        const dd = String(day).padStart(2, '0')
        dataFinal = toBr(`${yyyy}-${mm}-${dd}`)
      }

      const match = (s.historico || '').match(/\((\d+)\/(\d+)\)/)
      let cur = 1
      if (match) cur = parseInt(match[1], 10)

      return {
        id: s.id,
        data_referencia: toBr(s.ano_mes_inicial || s.created_at),
        cliente: clienteNome,
        historico: s.historico || '',
        vencimento: toBr(s.proxima_vencimento),
        periodo: s.periodo,
        data_final: dataFinal,
        qtd: s.parcelas || 1,
        valor_total: valorTotal,
        valor_parcela: valorParcela,
        especie: s.especie,
        status: (s.situacao && s.situacao >= 2) ? 'Concluído' : (concluido ? 'Concluído' : 'Ativo'),
        operacao: s.operacao,
        tipo: s.tipo,
        caixa: caixaNome,
        caixa_cor: caixaCor,
        raw_vencimento: s.proxima_vencimento, // Hidden field for sorting
        parcial: s.parcial || false,
        qtd_restante: s.tipo === 'fixo' ? '' : (s.parcelas - cur + 1),
      }
    })
    const byTab = arr.filter(r => {
      const isConcluido = r.status === 'Concluído'
      if (activeTab === 'concluidos') return isConcluido
      // Active tabs should NOT show concluded items
      const opMatch = (r.operacao || '').toLowerCase() === activeTab.toLowerCase()
      if (!isConcluido && !opMatch && activeTab === 'despesa') {
        // Debug: Check if we are losing items here
        if (r.historico?.toLowerCase().includes('dízimo') || r.historico?.toLowerCase().includes('dizimo')) {
          console.warn('DEBUG: Item found but filtered out:', r, { activeTab, itemOp: r.operacao, isConcluido })
        }
      }
      return opMatch && !isConcluido
    })
    // Debug log removed
    const byType = typeFilter ? byTab.filter(r => r.tipo === typeFilter) : byTab
    const byPeriod = periodFilter ? byType.filter(r => (r.tipo === 'variavel' ? 'determinado' : r.periodo) === periodFilter) : byType
    const filt = byPeriod.filter(r => [r.cliente, r.historico, r.especie, r.caixa, String(r.valor_total), String(r.valor_parcela)].some(f => (f || '').toLowerCase().includes(search.toLowerCase())))
    const sorted = [...filt].sort((a, b) => {
      const isDate = sort.key === 'vencimento'
      const av = isDate ? ((a as any).raw_vencimento || '') : (a as any)[sort.key]
      const bv = isDate ? ((b as any).raw_vencimento || '') : (b as any)[sort.key]
      if (av === bv) return 0
      return (sort.dir === 'asc' ? 1 : -1) * (av > bv ? 1 : -1)
    })
    const totalRecords = sorted.length
    const totalPages = Math.ceil(totalRecords / pageSize)
    const paginated = sorted.slice((page - 1) * pageSize, page * pageSize)

    const totalDespesas = filt.reduce((acc, s) => acc + (s.operacao === 'despesa' || s.operacao === 'retirada' ? Number(s.valor_total) : 0), 0)
    const totalReceitas = filt.reduce((acc, s) => acc + (s.operacao === 'receita' || s.operacao === 'aporte' ? Number(s.valor_total) : 0), 0)

    const selectionSum = filt.reduce((acc, s) => {
      if (selectedIds.has(s.id)) {
        const val = Number(s.valor_total)
        if (s.operacao === 'receita' || s.operacao === 'aporte') return acc + val
        if (s.operacao === 'despesa' || s.operacao === 'retirada') return acc - val
      }
      return acc
    }, 0)

    return {
      data: paginated,
      totalPages,
      totalRecords,
      totalDespesas,
      totalReceitas,
      selectionSum // Export sum
    }
  }, [store.schedules, remoteSchedules, search, sort, page, pageSize, contas, typeFilter, periodFilter, activeTab, clientes, selectedIds])

  function toggleSort(key: string) {
    setSort(s => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })
  }

  function resetForm() {
    const map: any = { despesa: 'despesa', receita: 'receita', retirada: 'retirada', aporte: 'aporte' }
    setOperacao(map[activeTab] || 'despesa'); setTipo('fixo'); setEspecie('pix'); setAnoMesInicial(''); setClienteId(''); setClienteNome(''); setClienteBusca(''); setHistorico(''); setValor(0); setProxima(''); setDateDisplay(''); setPeriodoFix('mensal'); setParcelas(1); setGrupoId(''); setCompromissoId('');
    // Auto-select principal account
    const principalAccount = contas.find(c => c.principal === true)
    setCaixaId(principalAccount?.id || '')
    const principalCostCenter = costCenters.find(c => c.principal === true)
    setCostCenterId(principalCostCenter?.id || '')
    setSelectedSharedCCs([])
    setDetalhes(''); setErrors({}); setRefChoice('vencimento'); setParcial(false)
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!operacao) e.operacao = 'Obrigatório'
    if (!tipo) e.tipo = 'Obrigatório'
    if (!anoMesInicial) e.anoMesInicial = 'Obrigatório'
    if (!refChoice) e.refChoice = 'Selecione o Ano/Mês'
    if (!proxima) e.proxima = 'Informe a data de vencimento'
    if (!clienteId) e.clienteId = 'Obrigatório'
    if (!grupoId) e.grupoId = 'Obrigatório'
    if (!compromissoId) e.compromissoId = 'Obrigatório'
    if (!historico) e.historico = 'Obrigatório'
    if (!caixaId) e.caixaId = 'Obrigatório'
    else {
      const acc = contas.find(a => a.id === caixaId)
      if (acc && acc.ativo === false) e.caixaId = 'Conta inativa'
    }
    if (!valor || valor <= 0) e.valor = 'Informe um valor válido'
    if (tipo === 'variavel' && (!parcelas || parcelas <= 0)) e.parcelas = 'Informe parcelas válidas'
    if (tipo === 'fixo' && !periodoFix) e.periodoFix = 'Obrigatório'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  useEffect(() => {
    async function load() {
      try {
        console.log('Schedules: navegou para /schedules')
        setLoadError('')
        if (hasBackend) {
          if (!store.activeOrganization) {
            console.log('Schedules: no active organization')
            setLoadError('') // Should we clear or show empty?
            return
          }
          const orgId = store.activeOrganization
          const [cRes, gRes, accRes, cbRes, sRes, ccRes] = await Promise.all([
            listClients(orgId),
            listCommitmentGroups(orgId),
            listAccounts(orgId),
            listCashboxes(orgId),
            listSchedules(10000, { includeConcluded: true, orgId }),
            listCostCenters(orgId),
          ])
          if (cRes.error) throw cRes.error
          if (gRes.error) throw gRes.error
          if (accRes.error) throw accRes.error
          if (cbRes.error) throw cbRes.error
          if (sRes.error) throw sRes.error

          setGrupos((gRes.data as any) || [])
          setContas((accRes.data as any) || [])
          setCaixas((cbRes.data as any) || [])
          setCostCenters((ccRes?.data as any) || [])

          setRemoteSchedules((sRes.data as any) || [])
          console.log('Schedules: dados carregados', {
            clientes: (cRes.data as any)?.length || 0,
            grupos: (gRes.data as any)?.length || 0,
            contas: (accRes.data as any)?.length || 0,
            caixas: (cbRes.data as any)?.length || 0,
            agendamentos: (sRes.data as any)?.length || 0,
          })
        } else {
          setClientes(store.clients.map(c => ({ id: c.id, nome: c.nome })))
          setGrupos(store.commitment_groups)
          setCompromissos(store.commitments)
          setContas(store.accounts.map(a => ({ id: a.id, nome: a.nome, ativo: a.ativo !== false, principal: !!a.principal })))
          setCaixas(store.cashboxes.map(c => ({ id: c.id, nome: c.nome })))
          console.log('Schedules: backend indisponível, carregando dados locais')
        }
        setLoadError('')
      } catch (err: any) {
        setLoadError(err?.message || 'Falha ao carregar dados')
        console.error('Schedules: erro ao carregar', err)
      }
    }
    load()
  }, [activeTab, store.activeOrganization])

  useEffect(() => {
    const map: any = { despesa: 'despesa', receita: 'receita', retirada: 'retirada', aporte: 'aporte' }
    if (map[activeTab as any]) setOperacao(map[activeTab as any])
  }, [activeTab])

  function digits(v: string) { return v.replace(/\D/g, '') }
  function maskCpfCnpj(v: string) {
    const d = digits(v)
    if (d.length <= 11) {
      return d
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    }
    return d
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
  }


  async function fetchRemoteSchedules() {
    if (hasBackend && store.activeOrganization) {
      setLoadError('')
      const r = await listSchedules(10000, { includeConcluded: true, orgId: store.activeOrganization, grupoCompromissoId: grupoCompromissoFilter || undefined })
      if (r.error) {
        setLoadError(r.error.message)
      } else {
        setRemoteSchedules(r.data as any)
      }
    }
  }

  // Fetch filter options
  useEffect(() => {
    if (hasBackend && store.activeOrganization) {
      listAllCommitments(store.activeOrganization).then(r => {
        if (r.data) setAllCommitments(r.data)
      })
    }
  }, [store.activeOrganization])

  // Fetch filter options (Groups)
  useEffect(() => {
    if (hasBackend && store.activeOrganization) {
      listCommitmentGroups(store.activeOrganization).then(r => {
        if (r.data) setAllCommitmentGroups(r.data.map(g => ({ id: g.id, nome: g.nome })))
      })
    }
  }, [store.activeOrganization])

  useEffect(() => {
    fetchRemoteSchedules()
  }, [grupoCompromissoFilter])

  useEffect(() => {
    if (!proxima) return
    const d = new Date(proxima)
    const base = new Date(d.getFullYear(), d.getMonth(), 1)
    const ref = refChoice === 'vencimento' ? base : new Date(d.getFullYear(), d.getMonth() - 1, 1)
    const yyyy = ref.getFullYear()
    const mm = String(ref.getMonth() + 1).padStart(2, '0')
    const dd = String(ref.getDate()).padStart(2, '0')
    setAnoMesInicial(`${yyyy}-${mm}-${dd}`)
  }, [proxima, refChoice])

  useEffect(() => {
    if (tipo === 'variavel' && operacao === 'despesa' && valor > 0 && parcelas >= 1 && proxima) {
      const per = Math.round((valor / parcelas) * 100) / 100
      const rows: Array<{ date: string; valor: number }> = []
      const start = new Date(proxima)
      let sum = 0
      for (let i = 0; i < parcelas; i++) {
        const d = new Date(start)
        d.setMonth(d.getMonth() + i)
        const v = i === parcelas - 1 ? Math.round((valor - sum) * 100) / 100 : per
        sum = Math.round((sum + v) * 100) / 100
        rows.push({ date: d.toISOString().slice(0, 10), valor: v })
      }
      setPreview(rows)
    } else {
      setPreview([])
    }
  }, [tipo, operacao, valor, parcelas, proxima])

  useEffect(() => {
    async function loadCommitments() {
      if (!grupoId) { if (hasBackend) setCompromissos([]); return }
      const r = await listCommitmentsByGroup(grupoId)
      if (!r.error && r.data) setCompromissos(r.data as any)
    }
    loadCommitments()
  }, [grupoId])

  const operacaoRef = useRef<HTMLSelectElement>(null)

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    setMsg('')
    setMsgType('')

    // Validate all required fields
    if (!validate()) {
      setMsg('Preencha todos os campos obrigatórios')
      setMsgType('error')
      return
    }

    if (!valor || valor <= 0 || !Number.isFinite(valor)) { setMsg('Valor deve ser maior que 0'); setMsgType('error'); return }
    const todayIso = (() => { const d = new Date(); const yyyy = d.getFullYear(); const mm = String(d.getMonth() + 1).padStart(2, '0'); const dd = String(d.getDate()).padStart(2, '0'); return `${yyyy}-${mm}-${dd}` })()
    if (hasBackend) {
      if (!store.activeOrganization) { setMsg('Para salvar, selecione uma organização'); setMsgType('error'); return }
      const periodo = tipo === 'fixo' ? periodoFix : 'mensal'
      const valor2 = Math.round(valor * 100) / 100

      const r = await createSchedule({
        operacao, tipo, especie, ano_mes_inicial: todayIso,
        favorecido_id: clienteId || null, grupo_compromisso_id: grupoId || null,
        compromisso_id: compromissoId || null, historico, caixa_id: caixaId || null,
        detalhes, valor: valor2, proxima_vencimento: proxima || todayIso,
        periodo, parcelas: tipo === 'variavel' ? parcelas : 1,
        nota_fiscal: notaFiscal ? Number(notaFiscal) : null, situacao: 1,
        parcial, cost_center_id: costCenterId || null
      }, store.activeOrganization)
      if (r.error) { setMsg(r.error.message); setMsgType('error') }
      else {
        // Save Shared Cost Centers if any
        if (selectedSharedCCs.length > 0 && r.data?.id) {
          await saveScheduleCostCenters(r.data.id, selectedSharedCCs, store.activeOrganization)
        }
        setMsg('Registro salvo com sucesso'); setMsgType('success'); resetForm(); setNotaFiscal(''); await fetchRemoteSchedules(); setShowForm('none'); setTimeout(() => setMsg(''), 2500); operacaoRef.current?.focus()
      }
    } else {
      const periodo = tipo === 'fixo' ? periodoFix : 'mensal'
      const valor2 = Math.round(valor * 100) / 100
      store.createSchedule({ operacao: operacao as any, tipo: tipo as any, especie, ano_mes_inicial: todayIso, cliente: clienteNome || '', cliente_id: clienteId || '', grupo_compromisso_id: grupoId || undefined, compromisso_id: compromissoId || undefined, caixa_id: caixaId || undefined, detalhes, historico, valor: valor2, proxima_vencimento: proxima || todayIso, periodo: periodo as any, parcelas: tipo === 'variavel' ? parcelas : 1, situacao: 1, parcial })
      setMsg('Registro salvo com sucesso'); setMsgType('success'); resetForm(); setNotaFiscal(''); setShowForm('none'); setTimeout(() => setMsg(''), 2500); operacaoRef.current?.focus()
    }
  }

  function openEditForm(id: string) {
    const s = hasBackend ? remoteSchedules.find((x: any) => x.id === id) : store.schedules.find(x => x.id === id)
    if (!s) return
    setSelectedId(id)
    setOperacao(s.operacao); setTipo(s.tipo); setEspecie(s.especie); setAnoMesInicial(s.ano_mes_inicial);
    setClienteId(s.favorecido_id || s.cliente_id || '');
    // Fix client binding - handle object from backend
    const cliName = (typeof s.cliente === 'object' && s.cliente?.nome) ? s.cliente.nome : (typeof s.cliente === 'string' ? s.cliente : (hasBackend ? '' : store.clients.find(c => c.id === s.cliente_id)?.nome || ''))
    setClienteNome(cliName); setClienteBusca(cliName); setClientes([]);

    setHistorico(s.historico || ''); setValor(s.valor); setProxima(s.proxima_vencimento);
    if (s.proxima_vencimento) {
      // Fix date display to avoid timezone issues
      const dateStr = s.proxima_vencimento.split('T')[0] // Get YYYY-MM-DD
      const [year, month, day] = dateStr.split('-')
      setDateDisplay(`${day}/${month}/${year}`)
    } else {
      setDateDisplay('')
    }
    setPeriodoFix((s.periodo as any) || 'mensal'); setParcelas(s.parcelas); setGrupoId(s.grupo_compromisso_id || ''); setCompromissoId(s.compromisso_id || '');
    // Handle caixa_id which might be object or string depending on query
    const cId = (typeof s.caixa_id === 'object' && s.caixa_id?.id) ? s.caixa_id.id : (s.caixa_id || '')
    setCaixaId(cId);

    setDetalhes(s.detalhes || ''); setParcial(s.parcial || false); setCostCenterId(s.cost_center_id || '')

    // Load Shared Cost Centers
    if (hasBackend && s.cost_center_id) {
      const cc = costCenters.find(c => c.id === s.cost_center_id)
      if (cc?.compartilhado) {
        getScheduleCostCenters(s.id).then(r => {
          if (r.data) setSelectedSharedCCs(r.data.map((x: any) => x.cost_center_id))
        })
      } else {
        setSelectedSharedCCs([])
      }
    } else {
      setSelectedSharedCCs([])
    }

    setShowForm('edit')
  }

  function onEditOpen() {
    openEditForm(selectedId)
  }

  // Handle Deep Linking
  useEffect(() => {
    if (location.state && location.state.selectedScheduleId) {
      // Wait for data to be loaded?
      if (hasBackend && remoteSchedules.length > 0) {
        const id = location.state.selectedScheduleId
        // Find the item to see which tab it belongs to, or just switch tabs?
        // The tabs filter the view, but the form can open anyway.
        // However, it's nice to switch the tab to the item's operation.
        const item = remoteSchedules.find((x: any) => x.id === id)
        if (item) {
          // Map operation to tab
          const map: any = { despesa: 'despesa', receita: 'receita', retirada: 'retirada', aporte: 'aporte' }
          if (item.situacao === 2) {
            setActiveTab('concluidos')
          } else if (map[item.operacao]) {
            setActiveTab(map[item.operacao])
          }

          // Highlight the item instead of opening the form
          setSelectedIds(new Set([id]))

          // Clear state so it doesn't reopen on refresh/re-nav
          navigate(location.pathname, { replace: true, state: {} })
        }
      } else if (!hasBackend && store.schedules.length > 0) {
        // Local store logic
        const id = location.state.selectedScheduleId
        const item = store.schedules.find(x => x.id === id)
        if (item) {
          const map: any = { despesa: 'despesa', receita: 'receita', retirada: 'retirada', aporte: 'aporte' }
          if (item.situacao === 2) {
            setActiveTab('concluidos')
          } else if (map[item.operacao]) {
            setActiveTab(map[item.operacao])
          }
          setSelectedIds(new Set([id]))
          navigate(location.pathname, { replace: true, state: {} })
        }
      }
    }
  }, [location.state, remoteSchedules, store.schedules])

  function onDeactivate(id: string) {
    if (!id) return
    setDeactivateId(id)
    setShowDeactivateConfirm(true)
  }

  async function confirmDeactivate() {
    if (!deactivateId) return
    setShowDeactivateConfirm(false)

    if (hasBackend) {
      const { error } = await deactivateSchedule(deactivateId)
      if (error) {
        setMsg(`Erro ao desativar: ${error.message}`)
        setMsgType('error')
      } else {
        setMsg('Agendamento desativado com sucesso')
        setMsgType('success')
        fetchRemoteSchedules()
      }
    } else {
      setMsg('Funcionalidade disponível apenas online')
    }
    setDeactivateId(null)
    setTimeout(() => setMsg(''), 3000)
  }

  function onDuplicate(targetId: string | null = null) {
    const idToUse = targetId || selectedId
    const s = hasBackend ? remoteSchedules.find((x: any) => x.id === idToUse) : store.schedules.find(x => x.id === idToUse)
    if (!s) return

    // Copy data exactly like edit, but reset specific fields for creation
    setOperacao(s.operacao); setTipo(s.tipo); setEspecie(s.especie);

    // Set initial month to today or keep original? Usually duplicate means "copy config", maybe user wants same data. 
    // Let's set to today to be safe or keep original? 
    // User often wants to create similar expense for NEXT month or SAME month. 
    // Let's keep original date for now, user can change.
    setAnoMesInicial(s.ano_mes_inicial);

    setClienteId(s.favorecido_id || s.cliente_id || '');
    const cliName = (typeof s.cliente === 'object' && s.cliente?.nome) ? s.cliente.nome : (typeof s.cliente === 'string' ? s.cliente : (hasBackend ? '' : store.clients.find(c => c.id === s.cliente_id)?.nome || ''))
    setClienteNome(cliName); setClienteBusca(cliName); setClientes([]);

    setHistorico(s.historico || ''); setValor(s.valor); setParcial(s.parcial || false);

    // Reset proximity/due-date to today or keep? 
    // If it's a new entry, maybe we want to set it fresh.
    // Let's keep consistency with creating new: set to logic default or keep duplicated?
    // Let's keep duplicated data to minimize re-entry, user can adjust.
    setProxima(s.proxima_vencimento);
    if (s.proxima_vencimento) {
      const dateStr = s.proxima_vencimento.split('T')[0]
      const [year, month, day] = dateStr.split('-')
      setDateDisplay(`${day}/${month}/${year}`)
    } else {
      setDateDisplay('')
    }

    setPeriodoFix((s.periodo as any) || 'mensal');
    // Reset installments to 1 when duplicating, especially if it was variable, as user likely wants to start fresh.
    setParcelas(s.tipo === 'variavel' ? 1 : (s.parcelas || 1));
    setGrupoId(s.grupo_compromisso_id || ''); setCompromissoId(s.compromisso_id || ''); setCaixaId(s.caixa_id || ''); setDetalhes(s.detalhes || ''); setCostCenterId(s.cost_center_id || '')

    // Open in CREATE mode
    setShowForm('create')
    setIsDuplicating(true)
    setMsg('Dados copiados. Ajuste e salve o novo agendamento.')
    setTimeout(() => setMsg(''), 3000)
  }

  async function onDelete() {
    if (!selectedId) {
      setMsg('Selecione um agendamento para excluir')
      setMsgType('error')
      return
    }

    if (hasBackend) {
      const deps = await checkScheduleDependencies(selectedId)
      if (deps.count > 0) {
        setAlertInfo({ open: true, msg: 'Exclusão não permitida. Existem pagamentos CONFIRMADOS vinculados!' })
        return
      }
    }

    setShowDeleteConfirm(true)
  }

  async function confirmDelete() {
    setShowDeleteConfirm(false)
    try {
      if (hasBackend) {
        const result = await deleteSched(selectedId)
        if (result.error) {
          setMsg(`Erro ao excluir: ${result.error.message}`)
          setMsgType('error')
          return
        }
        await fetchRemoteSchedules()
      } else {
        store.deleteSchedule(selectedId)
      }
      setMsg('Agendamento excluído com sucesso')
      setMsgType('success')
      setSelectedId('')
      setTimeout(() => setMsg(''), 3000)
    } catch (error: any) {
      setMsg(`Erro ao excluir agendamento: ${error.message || error}`)
      setMsgType('error')
    }
  }

  function onUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedId) return
    if (!validate()) return
    if (hasBackend) {
      const periodo = tipo === 'fixo' ? periodoFix : 'mensal'
      const valor2 = Math.round(valor * 100) / 100
      updateSched(selectedId, { operacao, tipo, especie, ano_mes_inicial: anoMesInicial, favorecido_id: clienteId, grupo_compromisso_id: grupoId, compromisso_id: compromissoId, historico, caixa_id: caixaId, detalhes, valor: valor2, proxima_vencimento: proxima, periodo, parcelas: tipo === 'variavel' ? parcelas : 1, parcial, cost_center_id: costCenterId || null }).then(() => {
        if (store.activeOrganization) {
          saveScheduleCostCenters(selectedId, selectedSharedCCs, store.activeOrganization)
        }
        fetchRemoteSchedules()
      })
    } else {
      const periodo = tipo === 'fixo' ? periodoFix : 'mensal'
      const valor2 = Math.round(valor * 100) / 100
      store.updateSchedule(selectedId, { operacao: operacao as any, tipo: tipo as any, especie, ano_mes_inicial: anoMesInicial, cliente: clientes.find(c => c.id === clienteId)?.nome || '', cliente_id: clienteId, grupo_compromisso_id: grupoId, compromisso_id: compromissoId, caixa_id: caixaId, detalhes, historico, valor: valor2, proxima_vencimento: proxima, periodo: periodo as any, parcelas: tipo === 'variavel' ? parcelas : 1, parcial })
    }
    setShowForm('none'); resetForm()
  }

  async function onReactivate(targetId?: string) {
    const idToUse = typeof targetId === 'string' ? targetId : selectedId
    if (!idToUse) return
    const s = hasBackend ? remoteSchedules.find((x: any) => x.id === idToUse) : store.schedules.find(x => x.id === idToUse)
    // Only reactivate if status is 2 (manually concluded/deactivated)
    if (!s || s.situacao !== 2) {
      setMsg('Apenas agendamentos cancelados/desativados manualmente podem ser reativados.')
      setMsgType('error')
      return // Don't proceed if it's auto-concluded by date
    }

    if (hasBackend) {
      const { error } = await updateSched(selectedId, { situacao: 1 })
      if (error) {
        setMsg(`Erro ao reativar: ${error.message}`)
        setMsgType('error')
      } else {
        setMsg('Agendamento reativado com sucesso')
        setMsgType('success')
        fetchRemoteSchedules()
      }
    } else {
      // local store handling if needed
      if (s) { s.situacao = 1; store.updateSchedule(s.id, s); }
      setMsg('Agendamento reativado com sucesso')
      setMsgType('success')
    }
    setTimeout(() => setMsg(''), 3000)
  }

  return (
    <div className="space-y-4">
      {loadError && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded p-3 flex items-center justify-between">
          <span>Erro ao carregar: {loadError}</span>
          <button className="px-2 py-1 rounded border dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900/50" onClick={() => { setLoadError(''); (async () => { try { if (hasBackend) { if (!store.activeOrganization) return; const orgId = store.activeOrganization; const [cRes, gRes, accRes, cbRes, sRes] = await Promise.all([listClients(orgId), listCommitmentGroups(orgId), listAccounts(orgId), listCashboxes(orgId), listSchedules(10000, { includeConcluded: true, orgId })]); if (cRes.error) throw cRes.error; if (gRes.error) throw gRes.error; if (accRes.error) throw accRes.error; if (cbRes.error) throw cbRes.error; if (sRes.error) throw sRes.error; setClientes((cRes.data as any) || []); setGrupos((gRes.data as any) || []); setContas((accRes.data as any) || []); setCaixas((cbRes.data as any) || []); setRemoteSchedules((sRes.data as any) || []); } else { setClientes(store.clients.map(c => ({ id: c.id, nome: c.nome }))); setGrupos(store.commitment_groups); setCompromissos(store.commitments); setContas(store.accounts.map(a => ({ id: a.id, nome: a.nome, ativo: a.ativo !== false, principal: !!a.principal }))); setCaixas(store.cashboxes.map(c => ({ id: c.id, nome: c.nome }))); } console.log('Schedules: retry carregado com sucesso') } catch (err: any) { setLoadError(err?.message || 'Falha ao carregar dados'); console.error('Schedules: erro no retry', err) } })() }}>Tentar novamente</button>
        </div>
      )}

      {/* Mobile Header and Tabs */}
      <div className="md:hidden flex flex-col gap-2">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Agendamentos</h1>
          <button
            onClick={() => { resetForm(); const d = new Date(); const yyyy = d.getFullYear(); const mm = String(d.getMonth() + 1).padStart(2, '0'); const dd = String(d.getDate()).padStart(2, '0'); setAnoMesInicial(`${yyyy}-${mm}-${dd}`); setShowForm('create') }}
            className="text-blue-600 font-medium text-sm"
          >
            Incluir
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {['Todos', 'Despesas', 'Receitas', 'Concluídos'].map(tabLabel => {
            if (tabLabel === 'Todos') return null // Skip for now as discussed
            const map: any = { 'Despesas': 'despesa', 'Receitas': 'receita', 'Concluídos': 'concluidos' }
            const id = map[tabLabel]
            return (
              <button
                key={tabLabel}
                onClick={() => { setActiveTab(id); setPage(1) }}
                className={`px-4 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeTab === id ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}
              >
                {tabLabel}
              </button>
            )
          })}
        </div>
      </div>

      <div className="hidden md:flex flex-col gap-2">

        <button
          onClick={() => { resetForm(); const d = new Date(); const yyyy = d.getFullYear(); const mm = String(d.getMonth() + 1).padStart(2, '0'); const dd = String(d.getDate()).padStart(2, '0'); setAnoMesInicial(`${yyyy}-${mm}-${dd}`); setShowForm('create') }}
          className="text-blue-600 font-medium text-sm"
        >
          Incluir
        </button>
      </div>




      {/* Row 1: Actions, Search, Filters, Exports (Desktop) */}
      <div className="hidden md:flex flex-wrap items-center gap-2 w-full">
        {/* Action Buttons */}
        <button className="flex items-center gap-2 bg-black text-white rounded px-3 py-2 text-xs md:text-sm transition-colors whitespace-nowrap" onClick={() => { resetForm(); const d = new Date(); const yyyy = d.getFullYear(); const mm = String(d.getMonth() + 1).padStart(2, '0'); const dd = String(d.getDate()).padStart(2, '0'); setAnoMesInicial(`${yyyy}-${mm}-${dd}`); setShowForm('create') }} aria-label="Incluir">
          <Icon name="add" className="w-4 h-4" /> Incluir
        </button>

        <button className="flex items-center gap-2 bg-blue-600 text-white rounded px-3 py-2 disabled:opacity-50 text-xs md:text-sm transition-colors whitespace-nowrap" onClick={onEditOpen} disabled={!selectedId} aria-label="Alterar">
          <Icon name="edit" className="w-4 h-4" /> Alterar
        </button>

        {activeTab === 'concluidos' && selectedId && (
          <button className="flex items-center gap-2 bg-green-600 text-white rounded px-3 py-2 text-xs md:text-sm transition-colors whitespace-nowrap" onClick={() => onReactivate()} aria-label="Reativar">
            <Icon name="undo" className="w-4 h-4" /> Reativar
          </button>
        )}

        <button className="flex items-center gap-2 bg-red-600 text-white rounded px-3 py-2 disabled:opacity-50 text-xs md:text-sm transition-colors whitespace-nowrap" onClick={onDelete} disabled={!selectedId} aria-label="Excluir">
          <Icon name="trash" className="w-4 h-4" /> Excluir
        </button>

        {/* Search Field - Grows to fill space */}
        <div className="flex-1 flex items-center gap-2 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded px-3 py-2 min-w-[200px]">
          <Icon name="search" className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <input className="outline-none w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 text-sm" placeholder="Buscar cliente, histórico ou valor" value={search} onChange={e => { setPage(1); setSearch(e.target.value) }} />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <div className="min-w-[150px]">
            <FloatingLabelSelect
              label="Tipo"
              value={typeFilter}
              onChange={e => { setTypeFilter(e.target.value as any); setPage(1) }}
              bgColor="bg-background-light dark:bg-background-dark"
            >
              <option value="" className="dark:bg-gray-800">Todos</option>
              <option value="fixo" className="dark:bg-gray-800">Fixo</option>
              <option value="variavel" className="dark:bg-gray-800">Variável (Parcelado)</option>
            </FloatingLabelSelect>
          </div>

          <div className="min-w-[150px]">
            <FloatingLabelSelect
              label="Período"
              value={periodFilter}
              onChange={e => { setPeriodFilter(e.target.value as any); setPage(1) }}
              bgColor="bg-background-light dark:bg-background-dark"
            >
              <option value="" className="dark:bg-gray-800">Todos</option>
              <option value="mensal" className="dark:bg-gray-800">Mensal</option>
              <option value="semanal" className="dark:bg-gray-800">Semanal</option>
              <option value="anual" className="dark:bg-gray-800">Anual</option>
              <option value="unico" className="dark:bg-gray-800">Único</option>
              <option value="semestral" className="dark:bg-gray-800">Semestral</option>
            </FloatingLabelSelect>
          </div>

          <div className="min-w-[150px]">
            <FloatingLabelSelect
              label="Grupo"
              value={grupoCompromissoFilter}
              onChange={e => { setGrupoCompromissoFilter(e.target.value); setPage(1) }}
              bgColor="bg-background-light dark:bg-background-dark"
            >
              <option value="" className="dark:bg-gray-800">Todos</option>
              {allCommitmentGroups.map(g => (
                <option className="dark:bg-gray-800" key={g.id} value={g.id}>{g.nome}</option>
              ))}
            </FloatingLabelSelect>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button className="flex items-center justify-center bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded p-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors" onClick={() => {
            // Generate simplistic PDF 
            window.print()
          }} title="Imprimir / Salvar PDF">
            <Icon name="pdf" className="w-6 h-6 text-red-500" />
          </button>

          <button className="flex items-center justify-center bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded p-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors" onClick={() => {
            // Export CSV
            const headers = ['Data Referência', 'Cliente', 'Histórico', 'Vencimento', 'Período', 'Data Final', 'Valor Parcela', 'Qtd', 'Valor Total']
            const rows = data.data.map(r => [
              r.data_referencia,
              r.cliente,
              r.historico,
              r.vencimento,
              r.tipo === 'variavel' ? 'Prazo determinado' : r.periodo,
              r.data_final,
              `R$ ${formatMoneyBr(Number(r.valor_parcela))}`,
              r.qtd,
              `R$ ${formatMoneyBr(Number(r.valor_total))}`
            ])
            const csvContent = [
              headers.join(';'),
              ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))
            ].join('\n')

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
            const link = document.createElement('a')
            if (link.download !== undefined) {
              const url = URL.createObjectURL(blob)
              link.setAttribute('href', url)
              link.setAttribute('download', `agendamentos_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`)
              link.style.visibility = 'hidden'
              document.body.appendChild(link)
              link.click()
              document.body.removeChild(link)
            }
          }} title="Exportar CSV">
            <Icon name="excel" className="w-6 h-6 text-green-600" />
          </button>
        </div>

        {(search || typeFilter || periodFilter) && (
          <button className="text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border dark:border-gray-600 rounded px-3 py-2 text-gray-700 dark:text-gray-300 whitespace-nowrap" onClick={() => { setSearch(''); setTypeFilter(''); setPeriodFilter(''); setPage(1) }}>
            Limpar
          </button>
        )}
        <PageInfo>
          A tela de Agendamento foi desenvolvida para organizar compromissos financeiros e prazos importantes de forma prática. Nela pode ser criado agendamentos em diferentes formatos, como mensal, semanal ou diário, permitindo ao usuário planejar suas atividades com clareza.
        </PageInfo>

      </div>


      {/* Row 2: Tabs */}
      <div className="hidden md:flex flex-wrap items-center justify-between gap-2">
        <Tabs
          tabs={[
            { id: 'despesa', label: 'Despesas' },
            { id: 'receita', label: 'Receitas' },
            { id: 'retirada', label: 'Retirada' },
            { id: 'aporte', label: 'Aporte' },
            { id: 'concluidos', label: 'Concluídos' },
          ]}
          activeId={activeTab}
          onChange={id => { setActiveTab(id as any); setPage(1) }}
          disabled={showForm !== 'none'}
        />

        {selectedIds.size > 1 && (
          <div className="bg-green-100 dark:bg-green-900/40 border border-green-300 dark:border-green-800 shadow-sm rounded px-3 py-1 flex items-center gap-2">
            <div className="text-[10px] font-bold text-green-800 dark:text-green-300 uppercase">
              SOMA ITENS ({selectedIds.size}):
            </div>
            <div className={`text-sm font-bold ${data.selectionSum >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {data.selectionSum < 0 ? '-' : ''}R$ {formatMoneyBr(Math.abs(data.selectionSum))}
            </div>
          </div>
        )}
      </div>


      {/* Desktop Table Container */}
      < div className="hidden md:block bg-white dark:bg-gray-800 rounded border dark:border-gray-700 overflow-hidden" >

        {
          showForm !== 'none' && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl border dark:border-gray-700 flex flex-col max-h-[95vh]">
                <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-6 py-4 rounded-t-lg flex items-center justify-between shrink-0">
                  <div className="font-semibold text-lg text-gray-900 dark:text-gray-100">{showForm === 'create' ? (isDuplicating ? 'Duplicando Novo Agendamento' : 'Novo Agendamento') : 'Editar Agendamento'}</div>
                  <button className="text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-gray-200" onClick={() => { setShowForm('none'); resetForm() }}>
                    <Icon name="x" className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto">
                  <form onSubmit={showForm === 'create' ? onCreate : onUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                      <div>
                        <FloatingLabelSelect
                          label="Operação"
                          id="operacao"
                          ref={operacaoRef}
                          value={operacao}
                          disabled
                          onChange={() => { }}
                          className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-400"
                        >
                          <option value="despesa">Despesa</option>
                          <option value="receita">Receita</option>
                          <option value="aporte">Aporte</option>
                          <option value="retirada">Retirada</option>
                        </FloatingLabelSelect>
                      </div>
                      <div>
                        <FloatingLabelSelect
                          label="Tipo"
                          id="tipo"
                          value={tipo}
                          onChange={e => { setTipo(e.target.value) }}
                        >
                          <option value="fixo">Fixo</option>
                          <option value="variavel">Variável</option>
                        </FloatingLabelSelect>
                      </div>
                      <div>
                        <FloatingLabelSelect
                          label="Espécie"
                          id="especie"
                          value={especie}
                          onChange={e => { setEspecie(e.target.value) }}
                        >
                          <option value="dinheiro">Dinheiro</option>
                          <option value="pix">PIX</option>
                          <option value="cartao">Cartão de Crédito</option>
                          <option value="boleto">Boleto</option>
                          <option value="transferencia">Transferência</option>
                          <option value="debito_automatico">Débito Automático</option>
                        </FloatingLabelSelect>
                      </div>
                      <div>
                        <FloatingLabelSelect
                          label="Ano/Mês"
                          id="refChoice"
                          value={refChoice}
                          onChange={e => { setRefChoice(e.target.value as any) }}
                        >
                          <option value="vencimento">Ano/Mês Vencimento</option>
                          <option value="anterior">Ano/Mês Anterior</option>
                        </FloatingLabelSelect>
                      </div>
                    </div>

                    {/* Auto-select Principal Account Effect - Moved to component body */}

                    <div className="md:col-span-2 relative">
                      <div className="flex gap-2 items-start">
                        <div className="flex-1">
                          <FloatingLabelInput
                            label="Cliente *"
                            id="cliente"
                            placeholder="Digite pelo menos 3 letras para buscar"
                            value={clienteBusca}
                            onKeyDown={async (e) => {
                              if (e.key === 'ArrowDown') {
                                e.preventDefault()
                                setClientIndex(prev => (prev < clientes.length - 1 ? prev + 1 : prev))
                              } else if (e.key === 'ArrowUp') {
                                e.preventDefault()
                                setClientIndex(prev => (prev > 0 ? prev - 1 : prev))
                              } else if (e.key === 'Enter') {
                                e.preventDefault()
                                if (clientIndex >= 0 && clientIndex < clientes.length) {
                                  const c = clientes[clientIndex]
                                  setClienteId(c.id); setClienteNome(c.nome); setClienteBusca(c.nome); setClientes([]);
                                  setClientIndex(-1)
                                  // Load defaults
                                  if (hasBackend) {
                                    const { data: def } = await getClientDefault(c.id, store.activeOrganization!)
                                    if (def) {
                                      if (def.grupo_compromisso_id) setGrupoId(def.grupo_compromisso_id)
                                      if (def.compromisso_id) setCompromissoId(def.compromisso_id)
                                      if (def.historico) setHistorico(def.historico)
                                    }
                                  }
                                }
                              }
                            }}
                            onChange={async e => {
                              const v = e.target.value
                              setClienteBusca(v)
                              setClienteId('') // Force clear ID on change
                              setClientIndex(-1)
                              if (v.length >= 3) {
                                if (hasBackend) {
                                  if (store.activeOrganization) {
                                    const r = await (await import('../services/db')).searchClients(v, store.activeOrganization)
                                    if (!r.error && r.data) setClientes(r.data as any)
                                  }
                                } else {
                                  setClientes(store.clients.filter(c => c.nome.toLowerCase().includes(v.toLowerCase())).map(c => ({ id: c.id, nome: c.nome })))
                                }
                              } else {
                                setClientes([])
                              }
                            }}
                          />
                        </div>
                        <button type="button" className="flex items-center justify-center bg-black dark:bg-gray-900 text-white rounded px-3 h-[48px] hover:bg-gray-800 dark:hover:bg-black transition-colors" onClick={() => setClientModal(true)} title="Novo Cliente" style={{ marginTop: '0px' }}>
                          <Icon name="add" className="w-4 h-4" />
                        </button>
                      </div>
                      {clienteBusca.length >= 3 && clientes.length > 0 && (
                        <ul className="absolute z-20 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded mt-1 w-full max-h-48 overflow-auto shadow-lg text-gray-900 dark:text-gray-100">
                          {clientes.map((c, i) => (
                            <li key={c.id} className={`px-3 py-2 cursor-pointer ${i === clientIndex ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`} onClick={async () => {
                              setClienteId(c.id); setClienteNome(c.nome); setClienteBusca(c.nome); setClientes([]);
                              setClientIndex(-1)
                              // Load defaults
                              if (hasBackend) {
                                const { data: def } = await getClientDefault(c.id, store.activeOrganization!)
                                if (def) {
                                  if (def.grupo_compromisso_id) setGrupoId(def.grupo_compromisso_id)
                                  if (def.compromisso_id) setCompromissoId(def.compromisso_id)
                                  if (def.historico) setHistorico(def.historico)
                                }
                              }
                            }}>{c.nome}</li>
                          ))}
                        </ul>
                      )}
                      {errors.clienteId && <div className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.clienteId}</div>}
                    </div>

                    <div className="flex gap-2 items-start">
                      <div className="flex-1">
                        <FloatingLabelSelect
                          label="Grupo de Compromisso *"
                          id="grupoId"
                          value={grupoId}
                          onChange={e => { setGrupoId(e.target.value); setCompromissoId(''); setErrors({ ...errors, grupoId: '' }) }}
                          className={errors.grupoId ? 'border-red-500' : ''}
                        >
                          <option value="">Selecione</option>
                          {grupos.filter(g => (g.operacao || (g as any).tipo) === operacao).map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
                        </FloatingLabelSelect>
                      </div>
                      <button type="button" className="flex items-center justify-center bg-black dark:bg-gray-900 text-white rounded px-3 h-[48px] hover:bg-gray-800 dark:hover:bg-black transition-colors" onClick={() => setGroupModal(true)} title="Novo Grupo" style={{ marginTop: '0px' }}>
                        <Icon name="add" className="w-4 h-4" />
                      </button>
                      {errors.grupoId && <div className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.grupoId}</div>}
                    </div>

                    <div className="flex gap-2 items-start">
                      <div className="flex-1">
                        <FloatingLabelSelect
                          label="Compromisso *"
                          id="compromissoId"
                          value={compromissoId}
                          onChange={e => { const id = e.target.value; setCompromissoId(id); const c = compromissos.find(x => x.id === id); if (c && showForm === 'create') setHistorico(c.nome); setErrors({ ...errors, compromissoId: '' }) }}
                          className={errors.compromissoId ? 'border-red-500' : ''}
                        >
                          <option value="">Selecione</option>
                          {compromissos.filter(c => !c.grupo_id || c.grupo_id === grupoId).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                        </FloatingLabelSelect>
                      </div>
                      <button type="button" className="flex items-center justify-center bg-black dark:bg-gray-900 text-white rounded px-3 h-[48px] hover:bg-gray-800 dark:hover:bg-black transition-colors" onClick={() => setCommitmentModal(true)} title="Novo Compromisso" style={{ marginTop: '0px' }}>
                        <Icon name="add" className="w-4 h-4" />
                      </button>
                      {errors.compromissoId && <div className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.compromissoId}</div>}
                    </div>

                    <div className="md:col-span-2">
                      <div className="flex gap-2 items-start">
                        <div className="flex-1">
                          <FloatingLabelInput
                            label="Histórico *"
                            id="historico"
                            placeholder="Descrição"
                            value={historico}
                            onChange={e => { setHistorico(e.target.value); setErrors({ ...errors, historico: '' }) }}
                            className={errors.historico ? 'border-red-500' : ''}
                          />
                        </div>
                        <button type="button" className="bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:hover:bg-yellow-900/50 border border-yellow-200 dark:border-yellow-700 rounded px-3 h-[48px] flex items-center justify-center gap-2 transition-colors" title="Gravar em Histórico Padrão" onClick={async (e) => {
                          e.preventDefault()
                          if (!clienteId || !grupoId || !compromissoId || !historico) {
                            setAlertInfo({ open: true, msg: 'Para salvar um padrão, preencha: Cliente, Grupo, Compromisso e Histórico.' })
                            return
                          }

                          let msg = `Deseja definir a combinação atual (Grupo: ${grupos.find(g => g.id === grupoId)?.nome}, Compromisso: ${compromissos.find(c => c.id === compromissoId)?.nome}, Histórico: ${historico}) como PADRÃO para este cliente?`

                          if (hasBackend) {
                            const { data: existing } = await getClientDefault(clienteId, store.activeOrganization!)
                            if (existing) {
                              msg = `Já existe um padrão salvo para este cliente (Histórico: ${existing.historico}).\n\nDeseja SUBSTITUIR pelo novo (Histórico: ${historico})?`
                            }
                          }

                          setSaveDefaultMessage(msg)
                          setShowSaveDefaultConfirm(true)
                        }} style={{ marginTop: '0px' }}>
                          <Icon name="star" className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                        </button>
                      </div>
                      {errors.historico && <div className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.historico}</div>}
                    </div>

                    <div>
                      <FloatingLabelSelect
                        label="Caixa Lançamento *"
                        id="caixaId"
                        value={caixaId}
                        onChange={e => {
                          const selectedId = e.target.value
                          setCaixaId(selectedId)
                          setErrors({ ...errors, caixaId: '' })
                          const selectedAccount = contas.find(c => c.id === selectedId)
                          if (selectedAccount && selectedAccount.tipo === 'cartao' && selectedAccount.dia_vencimento) {
                            const today = new Date()
                            const currentDay = today.getDate()
                            let targetMonth = today.getMonth()
                            let targetYear = today.getFullYear()
                            if (selectedAccount.dia_bom && currentDay > selectedAccount.dia_bom) {
                              targetMonth++
                              if (targetMonth > 11) {
                                targetMonth = 0
                                targetYear++
                              }
                            }
                            const lastDayOfMonth = new Date(targetYear, targetMonth + 1, 0).getDate()
                            const finalDay = Math.min(selectedAccount.dia_vencimento, lastDayOfMonth)
                            const dueDate = `${String(finalDay).padStart(2, '0')}/${String(targetMonth + 1).padStart(2, '0')}/${targetYear}`
                            const proximaIso = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(finalDay).padStart(2, '0')}`
                            setProxima(proximaIso)
                            setDateDisplay(dueDate)
                          } else {
                            setProxima('')
                            setDateDisplay('')
                          }
                        }}
                        className={errors.caixaId ? 'border-red-500' : ''}
                      >
                        <option value="">Selecione</option>
                        {contas.filter(c => {
                          if (c.ativo === false) return false
                          if (especie === 'cartao') return c.tipo === 'cartao'
                          if (especie === 'dinheiro') return c.tipo === 'carteira'
                          if (especie === 'pix' || especie === 'transferencia') return c.tipo === 'banco'
                          return true
                        }).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                      </FloatingLabelSelect>
                      {errors.caixaId && <div className="text-xs text-red-600 mt-1">{errors.caixaId}</div>}
                    </div>
                    <div>
                      <FloatingLabelSelect
                        label="Centro de Custo"
                        id="costCenterId"
                        value={costCenterId}
                        onChange={e => {
                          const id = e.target.value
                          setCostCenterId(id)
                          const cc = costCenters.find(c => c.id === id)
                          if (cc?.compartilhado) {
                            setSharedCostCenterModal({
                              open: true,
                              value: valor,
                              onConfirm: async (ids) => {
                                setSelectedSharedCCs(ids)
                              }
                            })
                          } else {
                            setSelectedSharedCCs([])
                          }
                        }}
                      >
                        <option value="">Selecione</option>
                        {costCenters.map(c => <option key={c.id} value={c.id}>{c.descricao}</option>)}
                      </FloatingLabelSelect>
                    </div>

                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                      <div>
                        <FloatingLabelInput
                          label="Valor (R$) *"
                          id="valor"
                          type="number"
                          inputMode="decimal"
                          min={0.01}
                          step="0.01"
                          value={valorFocused ? valor : valor.toFixed(2)}
                          onFocus={() => setValorFocused(true)}
                          onBlur={() => setValorFocused(false)}
                          onChange={e => {
                            const val = e.target.value;
                            const truncated = val.includes('.') ? val.split('.')[0] + '.' + val.split('.')[1].slice(0, 2) : val;
                            setValor(parseFloat(truncated) || 0);
                          }}
                          className={(!valor || valor <= 0) ? 'border-red-500' : ''}
                        />
                        {(!valor || valor <= 0) && <div className="text-xs text-red-600 dark:text-red-400 mt-1">Valor deve ser maior que 0</div>}
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="parcial"
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            checked={parcial}
                            onChange={e => setParcial(e.target.checked)}
                          />
                          <label htmlFor="parcial" className="text-sm font-bold text-[#00665c] dark:text-teal-400 cursor-pointer">Registro Parcial</label>
                        </div>
                      </div>
                      <div>
                        <div className="relative">
                          <FloatingLabelInput
                            label="Data Vencimento *"
                            id="vencimento"
                            placeholder="DD/MM/AAAA"
                            value={dateDisplay}
                            onChange={e => {
                              let v = e.target.value
                              v = v.replace(/\D/g, '')
                              if (v.length > 8) v = v.slice(0, 8)
                              if (v.length > 4) v = `${v.slice(0, 2)}/${v.slice(2, 4)}/${v.slice(4)}`
                              else if (v.length > 2) v = `${v.slice(0, 2)}/${v.slice(2)}`
                              setDateDisplay(v)
                              if (v.length === 10) {
                                const m = v.match(/^([0-9]{2})\/([0-9]{2})\/([0-9]{4})$/)
                                if (m) {
                                  const iso = `${m[3]}-${m[2]}-${m[1]}`
                                  const d = new Date(iso)
                                  if (!Number.isNaN(d.getTime())) {
                                    setProxima(iso)
                                    setErrors(prev => { const { proxima, ...rest } = prev; return rest })
                                  }
                                }
                              } else {
                                setProxima('')
                              }
                            }}
                          />
                          {/* Hidden native Date Picker trigger could go here if we want to keep the calendar icon functionality, 
                            but FloatingLabelInput does not support 'right icon' slot easily without modifications. 
                            However, the original code had an absolute positioned label with an icon. 
                            Let's add the icon absolutely positioned on top of the FloatingLabelInput wrapper container.
                        */}
                          <label className="absolute right-3 top-[18px] cursor-pointer text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 z-10">
                            <Icon name="calendar" className="w-5 h-5" />
                            <input
                              type="date"
                              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                              onChange={e => {
                                if (e.target.value) {
                                  const selectedDate = e.target.value
                                  setProxima(selectedDate)
                                  const [year, month, day] = selectedDate.split('-')
                                  setDateDisplay(`${day}/${month}/${year}`)
                                  setErrors(prev => { const { proxima, ...rest } = prev; return rest })
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>
                      <div>
                        {tipo === 'variavel' ? (
                          <FloatingLabelInput
                            label="Parcelas"
                            id="parcelas"
                            type="number"
                            min={1}
                            max={48}
                            value={parcelas}
                            onChange={e => { const n = Math.min(48, Math.max(1, parseInt(e.target.value) || 1)); setParcelas(n) }}
                          />
                        ) : (
                          <FloatingLabelSelect
                            label="Período"
                            id="periodo"
                            value={periodoFix}
                            onChange={e => { setPeriodoFix(e.target.value as any) }}
                          >
                            <option value="mensal">Mensal</option>
                            <option value="semestral">Semestral</option>
                            <option value="anual">Anual</option>
                          </FloatingLabelSelect>
                        )}
                      </div>
                      <div>
                        <FloatingLabelInput
                          label="Nota Fiscal"
                          id="notaFiscal"
                          inputMode="numeric"
                          placeholder="Somente números"
                          value={notaFiscal}
                          onChange={e => setNotaFiscal(e.target.value.replace(/\D/g, '').slice(0, 15))}
                        />
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <FloatingLabelInput
                        label="Detalhes"
                        id="detalhes"
                        value={detalhes}
                        onChange={e => setDetalhes(e.target.value)}
                      />
                    </div>

                    <div className="md:col-span-2 flex justify-end gap-3 mt-4 pt-4 border-t dark:border-gray-700">
                      <button className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-black dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded px-4 py-2 font-medium transition-colors" type="button" onClick={() => { setShowForm('none'); resetForm() }}>Cancelar</button>
                      <button className="bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 font-medium transition-colors shadow-sm" type="submit">{showForm === 'create' ? 'Salvar Agendamento' : 'Salvar Alterações'}</button>
                    </div>
                  </form>

                  {msg && <div className={`mt-4 p-3 rounded ${msgType === 'error' ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800' : 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'}`}>{msg}</div>}

                  {preview.length > 1 && (
                    <div className="mt-6 bg-gray-50 dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3 border-b dark:border-gray-700 pb-2">
                        <div className="font-semibold text-gray-700 dark:text-gray-200">Cronograma de Pagamentos</div>
                        <div className="flex gap-2">
                          <button className="text-xs bg-white dark:bg-gray-700 dark:text-gray-200 border dark:border-gray-600 rounded px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => {
                            const csv = 'Parcela;Data;Valor\n' + preview.map((r, i) => `${i + 1};${r.date};${r.valor.toFixed(2)}`).join('\n')
                            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                            const url = URL.createObjectURL(blob)
                            const a = document.createElement('a'); a.href = url; a.download = 'cronograma.csv'; a.click(); URL.revokeObjectURL(url)
                          }}>CSV</button>
                        </div>
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        <table className="w-full text-sm text-gray-900 dark:text-gray-100">
                          <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
                            <tr>
                              <th className="px-2 py-1 text-left">Parcela</th>
                              <th className="px-2 py-1 text-left">Data</th>
                              <th className="px-2 py-1 text-right">Valor</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y dark:divide-gray-700">
                            {preview.map((r, i) => (
                              <tr key={i} className="border-t dark:border-gray-700 hover:bg-white dark:hover:bg-gray-700">
                                <td className="px-2 py-1">{i + 1}</td>
                                <td className="px-2 py-1">{toBr(r.date)}</td>
                                <td className="px-2 py-1 text-right">R$ {formatMoneyBr(r.valor)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="font-bold bg-gray-100 dark:bg-gray-700 sticky bottom-0 border-t dark:border-gray-600">
                            <tr>
                              <td colSpan={2} className="px-2 py-1 text-right">Total:</td>
                              <td className="px-2 py-1 text-right">R$ {formatMoneyBr(preview.reduce((acc, c) => acc + c.valor, 0))}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}

                  {selectedSharedCCs.length > 0 && (
                    <div className="mt-4 bg-gray-50 dark:bg-gray-800/50 border dark:border-gray-700 rounded-lg p-4">
                      <div className="font-semibold text-gray-700 dark:text-gray-200 mb-3 border-b dark:border-gray-700 pb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon name="database" className="w-4 h-4 text-blue-500" />
                          Divisão por Centro de Custo
                        </div>
                        <button className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium" type="button" onClick={() => {
                          setSharedCostCenterModal({
                            open: true,
                            value: valor,
                            onConfirm: async (ids) => {
                              setSelectedSharedCCs(ids)
                            }
                          })
                        }}>Editar Divisão</button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {selectedSharedCCs.map(ccId => {
                          const cc = costCenters.find(c => c.id === ccId)
                          const share = valor / selectedSharedCCs.length
                          return (
                            <div key={ccId} className="flex items-center justify-between p-2 rounded bg-white dark:bg-gray-800 border dark:border-gray-700 text-sm">
                              <span className="text-gray-600 dark:text-gray-400">{cc?.descricao || 'Desconhecido'}</span>
                              <span className="font-bold text-gray-900 dark:text-gray-100">R$ {formatMoneyBr(share)}</span>
                            </div>
                          )
                        })}
                      </div>
                      <div className="mt-3 pt-2 border-t dark:border-gray-700 flex justify-between text-xs font-medium text-gray-500">
                        <span>Total da Divisão:</span>
                        <span>R$ {formatMoneyBr(valor)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div >
          )
        }

        {
          changesLog.length > 0 && (
            <div className="mt-4 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded p-4">
              <div className="font-medium mb-2 text-gray-900 dark:text-gray-100">Histórico de alterações</div>
              <ul className="list-disc pl-5 text-sm text-gray-700 dark:text-gray-300">
                {changesLog.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          )
        }


        <div className="pb-4">
          {/* Grid Content */}
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded">
            {/* ... grid header and loop ... */}
            <div className="flex items-center justify-between p-2">
              <div className="font-medium">Caixas</div>
              <div className="flex gap-2">
                <button className="flex items-center justify-center bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100 rounded p-2" onClick={() => {
                  const groups = new Map<string, typeof data.data>()
                  data.data.forEach(r => {
                    const k = r.caixa || 'Sem caixa'
                    groups.set(k, [])
                  })
                  const newState: Record<string, boolean> = {}
                  Array.from(groups.keys()).forEach(k => { newState[k] = false })
                  setAccountExpanded(newState)
                }} title="Recolher Todos" aria-label="Recolher Todos">
                  <Icon name="chevron-right" className="w-5 h-5" />
                </button>
                <button className="flex items-center justify-center bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100 rounded p-2" onClick={() => {
                  const groups = new Map<string, typeof data.data>()
                  data.data.forEach(r => {
                    const k = r.caixa || 'Sem caixa'
                    groups.set(k, [])
                  })
                  const newState: Record<string, boolean> = {}
                  Array.from(groups.keys()).forEach(k => { newState[k] = true })
                  setAccountExpanded(newState)
                }} title="Expandir Todos" aria-label="Expandir Todos">
                  <Icon name="chevron-down" className="w-5 h-5" />
                </button>
              </div>
            </div>
            {!gridCollapsed && (<>
              {(() => {
                const groups = new Map<string, typeof data.data>()
                data.data.forEach(r => {
                  const k = r.caixa || 'Sem caixa'
                  const list = groups.get(k) || []
                  list.push(r)
                  groups.set(k, list)
                })
                // Sort groups alphabetically by key (caixa name)
                const sortedEntries = Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]))
                return sortedEntries.map(([k, list]) => {
                  const isExpanded = accountExpanded[k] !== false // default to true
                  const totalCaixa = list.reduce((sum, r) => sum + Number(r.valor_total), 0)
                  return (
                    <div key={k} className="mb-4 border rounded dark:border-gray-700">
                      <div className="flex items-center gap-3 px-3 py-2 cursor-pointer bg-gray-100 dark:bg-gray-800 dark:text-gray-200" onClick={() => setAccountExpanded(s => ({ ...s, [k]: !s[k] }))}>
                        <Icon name={isExpanded ? 'chevron-down' : 'chevron-right'} className="w-4 h-4" />
                        {(() => {
                          const color = list[0]?.caixa_cor || '#3b82f6'
                          return (
                            <svg className="w-5 h-5" fill="none" stroke={color} viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
                            </svg>
                          )
                        })()}
                        <div className="font-medium">Caixa Lançamento: {k}</div>
                        <div className="ml-auto text-sm text-gray-600 dark:text-gray-400">{list.length} itens</div>
                        <button className="px-2 py-1 rounded border dark:border-gray-600 dark:hover:bg-gray-700" onClick={e => { e.stopPropagation(); setAccountExpanded(s => ({ ...s, [k]: !isExpanded })) }} aria-label="Expandir/Colapsar">
                          <Icon name={isExpanded ? 'minus' : 'add'} className="w-4 h-4" />
                        </button>
                      </div>
                      {isExpanded && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-gray-900 dark:text-gray-100">
                            <thead>
                              <tr className="text-left bg-white dark:bg-gray-900">
                                {[
                                  ['data_referencia', 'Data Referência'],
                                  ['cliente', 'Cliente'],
                                  ['historico', 'Histórico'],
                                  ['vencimento', 'Vencimento'],
                                  ['periodo', 'Período'],
                                  ['data_final', 'Data Final'],
                                  ['valor_parcela', 'Valor Parcela'],
                                  ['qtd', 'Qtd'],
                                  ['especie', 'Espécie'],
                                  ['qtd_restante', 'Qtd Restante'],
                                  ['valor_total', 'Valor Total'],
                                ].map(([key, label]) => (
                                  <th key={key} className={`p-2 font-semibold ${['valor_parcela', 'qtd', 'qtd_restante', 'valor_total'].includes(key as string) ? 'text-right' : ''} ${key === 'data_referencia' ? 'w-[100px]' : key === 'cliente' ? 'w-[180px]' : key === 'historico' ? 'w-[200px]' : key === 'vencimento' ? 'w-[100px]' : key === 'periodo' ? 'w-[120px]' : key === 'data_final' ? 'w-[100px]' : key === 'valor_parcela' ? 'w-[110px]' : key === 'qtd' ? 'w-[60px]' : key === 'especie' ? 'w-[100px]' : key === 'qtd_restante' ? 'w-[100px]' : key === 'valor_total' ? 'w-[110px]' : ''}`}>
                                    <button onClick={() => toggleSort(key as string)} aria-label={`Ordenar por ${label}`}>{label}</button>
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {list.map(r => (
                                <tr key={r.id} className={`border-t border-gray-200 dark:border-gray-700 cursor-pointer ${selectedIds.has(r.id) ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'}`} onClick={(e) => { handleSelect(e, r.id); setSelectedId(r.id) }} onDoubleClick={() => { setSelectedId(r.id); onEditOpen() }} onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, id: r.id }) }} title="Clique com botão direito para opções">
                                  <td className="p-2 w-[100px]">{r.data_referencia}</td>
                                  <td className="p-2 w-[180px] break-words whitespace-normal" title={r.cliente}>{r.cliente}</td>
                                  <td className="p-2 w-[200px] break-words whitespace-normal" title={r.historico}>{r.historico}</td>
                                  <td className="p-2 w-[100px]">{r.vencimento}</td>
                                  <td className="p-2 w-[120px] capitalize">{r.tipo === 'variavel' ? 'Prazo determinado' : r.periodo}</td>
                                  <td className="p-2 w-[100px]">{r.data_final}</td>
                                  <td className="p-2 w-[110px] text-right">R$ {formatMoneyBr(Number(r.valor_parcela))}</td>
                                  <td className="p-2 w-[60px] text-right">{formatIntBr(Number(r.qtd))}</td>
                                  <td className="p-2 w-[100px] capitalize">{r.especie ? (r.especie.charAt(0).toUpperCase() + r.especie.slice(1).replace('_', ' ')) : '-'}</td>
                                  <td className="p-2 w-[100px] text-right">{r.qtd_restante}</td>
                                  <td className="p-2 w-[110px] text-right font-semibold">R$ {formatMoneyBr(Number(r.valor_total))}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="bg-gray-50 dark:bg-gray-800 font-medium border-t dark:border-gray-700">
                                <td className="p-2 text-right" colSpan={6}>Total do Caixa</td>
                                <td className="p-2 text-right">R$ {formatMoneyBr(list.reduce((sum, r) => sum + Number(r.valor_parcela), 0))}</td>
                                <td className="p-2 text-right"></td>
                                <td className="p-2"></td>
                                <td className="p-2"></td>
                                <td className="p-2 text-right">R$ {formatMoneyBr(totalCaixa)}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}
                    </div>
                  )
                })
              })()}
            </>)
            }
          </div >

          {/* Static Footer */}
          {
            !gridCollapsed && (
              <div className="mt-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 border-t-2 border-blue-300 dark:border-gray-700 text-xs font-bold text-gray-900 dark:text-gray-100 rounded">
                <div className="flex justify-end p-2 items-center">
                  <div className="mr-4 text-gray-700 dark:text-gray-300 uppercase">Totais Gerais:</div>
                  <div className="w-[110px] text-right px-2 text-blue-700 dark:text-blue-400">
                    R$ {formatMoneyBr(data.data.reduce((sum, r) => sum + Number(r.valor_parcela), 0))}
                  </div>
                  <div className="w-[60px] px-2 text-center text-gray-500 hidden sm:block">
                    {/* Empty spacer for Qtd column */}
                  </div>
                  <div className="w-[100px] px-2 text-center text-gray-500 hidden sm:block">
                    {/* Empty spacer for Espécie column */}
                  </div>
                  <div className="w-[100px] px-2 text-center text-gray-500 hidden sm:block">
                    {/* Empty spacer for Qtd Restante column */}
                  </div>
                  <div className="w-[110px] text-right px-2 text-green-700 dark:text-green-400">
                    R$ {formatMoneyBr(data.data.reduce((sum, r) => sum + Number(r.valor_total), 0))}
                  </div>
                </div>
              </div>
            )
          }
        </div>
      </div>

      {/* Mobile Card List */}
      <div className="md:hidden space-y-3 pb-20">
        {data.data.map(item => (
          <div key={item.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border dark:border-gray-700 relative" onClick={() => { setSelectedId(item.id); onEditOpen() }}>
            <div className="flex justify-between items-start mb-2">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.receita > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {item.receita > 0 ? 'Receita' : 'Despesa'}
              </span>
              <span className="font-bold text-gray-900 dark:text-gray-100">
                {item.receita > 0 ? `R$ ${formatMoneyBr(Number(item.valor_total))}` : `R$ ${formatMoneyBr(Number(item.valor_total))}`}
              </span>
            </div>
            <div className="font-semibold text-sm mb-1 text-gray-900 dark:text-gray-100 line-clamp-2">{item.historico || 'Sem histórico'}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2"> {item.cliente || 'Sem cliente'} </div>
            <div className="flex justify-between items-center text-[10px] text-gray-500 uppercase tracking-wider">
              <div className="flex items-center gap-1">
                <Icon name="calendar" className="w-3 h-3" />
                <span>{item.vencimento}</span>
              </div>
              <div className="flex items-center gap-1">
                <Icon name="clock" className="w-3 h-3" />
                <span>{item.tipo === 'variavel' ? `Parcelado (${item.qtd})` : item.periodo}</span>
              </div>
            </div>
          </div>
        ))}
        {data.data.length === 0 && (
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg border dark:border-gray-700 text-center text-gray-500 dark:text-gray-400 italic">
            Nenhum agendamento encontrado para este filtro.
          </div>
        )}
      </div>
      {
        < ClientModal
          isOpen={clientModal}
          onClose={() => setClientModal(false)
          }
          onSuccess={(client) => {
            setClientes([])
            setClienteId(client.id)
            setClienteNome(client.nome)
            setClienteBusca(client.nome)
          }}
        />
      }
      {
        <CommitmentGroupModal
          isOpen={groupModal}
          onClose={() => setGroupModal(false)}
          onSuccess={(group) => {
            const enrichedGroup = { ...group, operacao: group.operacao || operacao }
            setGrupos(prev => [...prev, enrichedGroup])
            setAllCommitmentGroups(prev => [...prev, { id: enrichedGroup.id, nome: enrichedGroup.nome }])
            setGrupoId(enrichedGroup.id)
          }}
          initialOperation={operacao}
        />
      }
      {
        <CommitmentModal
          isOpen={commitmentModal}
          onClose={() => setCommitmentModal(false)}
          onSuccess={(comp) => {
            setCompromissos(prev => [...prev, comp])
            setAllCommitments(prev => [...prev, { id: comp.id, nome: comp.nome }])
            setCompromissoId(comp.id)
            if (showForm === 'create') setHistorico(comp.nome)
          }}
          groups={grupos.filter(g => (g.operacao || (g as any).tipo) === operacao).map(g => ({ id: g.id, nome: g.nome }))}
          initialGroupId={grupoId}
        />
      }
      {
        showDeleteConfirm && (
          <ConfirmModal
            isOpen={showDeleteConfirm}
            title="Excluir Agendamento"
            onConfirm={confirmDelete}
            onClose={() => setShowDeleteConfirm(false)}
            message="Tem certeza que deseja excluir este agendamento?"
          />
        )
      }

      {
        showDeactivateConfirm && (
          <ConfirmModal
            isOpen={showDeactivateConfirm}
            title="Desativar Agendamento"
            onConfirm={confirmDeactivate}
            onClose={() => { setShowDeactivateConfirm(false); setDeactivateId(null) }}
            message="Tem certeza que deseja desativar este agendamento? Os lançamentos futuros serão cancelados."
          />
        )
      }

      {
        showSaveDefaultConfirm && (
          <ConfirmModal
            isOpen={showSaveDefaultConfirm}
            title="Salvar Padrão"
            message={saveDefaultMessage}
            onConfirm={async () => {
              setShowSaveDefaultConfirm(false)
              if (hasBackend) {
                const r = await saveClientDefault({ client_id: clienteId, grupo_compromisso_id: grupoId, compromisso_id: compromissoId, historico, organization_id: store.activeOrganization! })
                if (r.error) {
                  setAlertInfo({ open: true, msg: 'Erro ao salvar padrão: ' + r.error.message })
                } else {
                  setMsg('Histórico padrão salvo com sucesso!')
                  setMsgType('success')
                  setTimeout(() => setMsg(''), 3000)
                }
              } else {
                setAlertInfo({ open: true, msg: 'Funcionalidade disponível apenas online.' })
              }
            }}
            onClose={() => setShowSaveDefaultConfirm(false)}
          />
        )
      }

      <AlertModal
        isOpen={alertInfo.open}
        message={alertInfo.msg}
        onClose={() => setAlertInfo({ open: false, msg: '' })}
      />

      {/* Shared Cost Center Modal */}
      {
        sharedCostCenterModal.open && (
          <SharedCostCenterModal
            totalValue={sharedCostCenterModal.value}
            onClose={() => setSharedCostCenterModal({ open: false, value: 0 })}
            onConfirm={async (selectedIds) => {
              const count = selectedIds.length
              if (count === 0) return
              const share = Number((sharedCostCenterModal.value / count).toFixed(2)) // Round to 2 decimals

              // We need to create multiple schedules
              // Based on the current form state (which is in closure scope of onCreate/onUpdate... wait, form state is state)
              // But onCreate is a function submit handler.
              // We need to trigger the actual creation here?
              // Or we store the selectedIds and then trigger 'onCreate' again?
              // Better: 'onCreate' pauses if shared center selected.
              // Then this callback continues the creation.

              // Let's invoke the continuation function
              if (sharedCostCenterModal.onConfirm) {
                await sharedCostCenterModal.onConfirm(selectedIds, share)
              }
              setSharedCostCenterModal({ open: false, value: 0 })
            }}
          />
        )
      }

      {
        contextMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)}></div>
            <div className="fixed z-50 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded shadow-lg py-1 text-sm font-medium" style={{ top: contextMenu.y, left: contextMenu.x }}>
              <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-blue-600 dark:text-blue-400" onClick={() => { onEditOpen(); setContextMenu(null) }}>
                <Icon name="edit" className="w-4 h-4" /> Alterar
              </button>
              <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-red-600 dark:text-red-400" onClick={() => { onDelete(); setContextMenu(null) }}>
                <Icon name="trash" className="w-4 h-4" /> Excluir
              </button>
              <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-green-600 dark:text-green-400" onClick={() => { onDuplicate(contextMenu.id); setContextMenu(null) }}>
                <Icon name="copy" className="w-4 h-4" /> Duplicar
              </button>
              {activeTab !== 'concluidos' && (
                <>
                  <div className="border-t dark:border-gray-700 my-1"></div>
                  <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-orange-600 dark:text-orange-400" onClick={() => { onDeactivate(contextMenu.id); setContextMenu(null) }}>
                    <Icon name="x" className="w-4 h-4" /> Desativar Agendamento Selecionado
                  </button>
                </>
              )}
              {activeTab === 'concluidos' && (
                <>
                  <div className="border-t dark:border-gray-700 my-1"></div>
                  <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-green-600 dark:text-green-400" onClick={() => { onReactivate(contextMenu.id); setContextMenu(null) }}>
                    <Icon name="undo" className="w-4 h-4" /> Reativar Agendamento Selecionado
                  </button>
                </>
              )}
            </div>
          </>
        )
      }
    </div>
  )
}
