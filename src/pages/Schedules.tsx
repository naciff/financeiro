import { useEffect, useMemo, useRef, useState } from 'react'
import { formatIntBr, formatMoneyBr } from '../utils/format'
import { createSchedule, generateSchedule, listClients, createClient, listCommitmentGroups, listCommitmentsByGroup, listCashboxes, listSchedules, updateSchedule as updateSched, deleteSchedule as deleteSched, listAccounts, searchAccounts, checkScheduleDependencies, deactivateSchedule } from '../services/db'
import { hasBackend } from '../lib/runtime'
import { useAppStore } from '../store/AppStore'
import { Icon } from '../components/ui/Icon'
import { Tabs } from '../components/ui/Tabs'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { AlertModal } from '../components/ui/AlertModal'

type Sort = { key: string; dir: 'asc' | 'desc' }

export default function Schedules() {
  const store = useAppStore()
  const [activeTab, setActiveTab] = useState<'despesa' | 'receita' | 'retirada' | 'aporte' | 'concluidos'>('despesa')
  const [showForm, setShowForm] = useState<'none' | 'create' | 'edit'>('none')
  const [selectedId, setSelectedId] = useState<string>('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false)
  const [deactivateId, setDeactivateId] = useState<string | null>(null)
  const [alertInfo, setAlertInfo] = useState({ open: false, msg: '' })
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<Sort>({ key: 'ano_mes_inicial', dir: 'asc' })
  const [page, setPage] = useState(1)
  const pageSize = 10000

  const [operacao, setOperacao] = useState('despesa')
  const [tipo, setTipo] = useState('fixo')
  const [especie, setEspecie] = useState('dinheiro')
  const [anoMesInicial, setAnoMesInicial] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [clienteBusca, setClienteBusca] = useState('')
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([])
  const [clienteNome, setClienteNome] = useState('')
  const [clientModal, setClientModal] = useState(false)
  const [novoClienteNome, setNovoClienteNome] = useState('')
  const [cpfCnpj, setCpfCnpj] = useState('')
  const [docError, setDocError] = useState('')
  const [docStatus, setDocStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [razaoSocial, setRazaoSocial] = useState('')
  const [enderecoEmpresa, setEnderecoEmpresa] = useState('')
  const [atividadePrincipal, setAtividadePrincipal] = useState('')
  const [novoClienteEmail, setNovoClienteEmail] = useState('')
  const [novoClienteTelefone, setNovoClienteTelefone] = useState('')
  const [historico, setHistorico] = useState('')
  const [valor, setValor] = useState<number>(0)
  const [proxima, setProxima] = useState('')
  const [dateDisplay, setDateDisplay] = useState('')
  const [periodoFix, setPeriodoFix] = useState<'mensal' | 'anual'>('mensal')
  const [parcelas, setParcelas] = useState<number>(1)
  const [preview, setPreview] = useState<Array<{ date: string; valor: number }>>([])
  const [changesLog, setChangesLog] = useState<string[]>([])
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState<'success' | 'error' | ''>('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [notaFiscal, setNotaFiscal] = useState<string>('')
  const [tipoPessoa, setTipoPessoa] = useState<'pf' | 'pj'>('pf')
  const [grupoId, setGrupoId] = useState('')
  const [grupos, setGrupos] = useState<{ id: string; nome: string; operacao?: string }[]>([])
  const [compromissoId, setCompromissoId] = useState('')
  const [compromissos, setCompromissos] = useState<{ id: string; nome: string; grupo_id?: string }[]>([])
  const [caixaId, setCaixaId] = useState('')
  const [caixas, setCaixas] = useState<{ id: string; nome: string }[]>([])
  const [contas, setContas] = useState<{ id: string; nome: string; ativo?: boolean; principal?: boolean; tipo?: string; dia_vencimento?: number }[]>([])
  const [contaBusca, setContaBusca] = useState('')
  const [detalhes, setDetalhes] = useState('')
  const [refChoice, setRefChoice] = useState<'vencimento' | 'anterior'>('vencimento')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; id: string } | null>(null)

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
  const [periodFilter, setPeriodFilter] = useState<'mensal' | 'anual' | 'determinado' | ''>('')
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
        caixa_cor: caixaCor
      }
    })
    const byTab = arr.filter(r => {
      const isConcluido = r.status === 'Concluído'
      if (activeTab === 'concluidos') return isConcluido
      // Active tabs should NOT show concluded items
      return r.operacao === activeTab && !isConcluido
    })
    // Debug log removed
    const byType = typeFilter ? byTab.filter(r => r.tipo === typeFilter) : byTab
    const byPeriod = periodFilter ? byType.filter(r => (r.tipo === 'variavel' ? 'determinado' : r.periodo) === periodFilter) : byType
    const filt = byPeriod.filter(r => [r.cliente, r.historico, r.especie, r.caixa, String(r.valor_total), String(r.valor_parcela)].some(f => (f || '').toLowerCase().includes(search.toLowerCase())))
    const sorted = [...filt].sort((a, b) => {
      const av = (a as any)[sort.key]
      const bv = (b as any)[sort.key]
      return (sort.dir === 'asc' ? 1 : -1) * (av > bv ? 1 : av < bv ? -1 : 0)
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
    setOperacao(map[activeTab] || 'despesa'); setTipo('fixo'); setEspecie('dinheiro'); setAnoMesInicial(''); setClienteId(''); setClienteNome(''); setClienteBusca(''); setHistorico(''); setValor(0); setProxima(''); setDateDisplay(''); setPeriodoFix('mensal'); setParcelas(1); setGrupoId(''); setCompromissoId('');
    // Auto-select principal account
    const principalAccount = contas.find(c => c.principal === true)
    setCaixaId(principalAccount?.id || '')
    setDetalhes(''); setErrors({}); setRefChoice('vencimento')
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
        const orgId = store.activeOrganization || undefined
        if (hasBackend) {
          const [cRes, gRes, accRes, cbRes, sRes] = await Promise.all([
            listClients(orgId),
            listCommitmentGroups(orgId),
            listAccounts(orgId),
            listCashboxes(orgId),
            listSchedules(10000, { includeConcluded: true, orgId })
          ])
          if (cRes.error) throw cRes.error
          if (gRes.error) throw gRes.error
          if (accRes.error) throw accRes.error
          if (cbRes.error) throw cbRes.error
          if (sRes.error) throw sRes.error
          setClientes((cRes.data as any) || [])
          setGrupos((gRes.data as any) || [])
          setContas((accRes.data as any) || [])
          setCaixas((cbRes.data as any) || [])

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
  function validarCPF(v: string) {
    const d = digits(v)
    if (d.length !== 11 || /^([0-9])\1+$/.test(d)) return false
    let s = 0; for (let i = 0; i < 9; i++) s += parseInt(d[i]) * (10 - i); let r = (s * 10) % 11; if (r === 10) r = 0; if (r !== parseInt(d[9])) return false
    s = 0; for (let i = 0; i < 10; i++) s += parseInt(d[i]) * (11 - i); r = (s * 10) % 11; if (r === 10) r = 0; return r === parseInt(d[10])
  }
  function validarCNPJ(v: string) {
    const d = digits(v)
    if (d.length !== 14 || /^([0-9])\1+$/.test(d)) return false
    const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2], w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    let s = 0; for (let i = 0; i < 12; i++) s += parseInt(d[i]) * w1[i]; let r = s % 11; const dv1 = r < 2 ? 0 : 11 - r
    s = 0; for (let i = 0; i < 13; i++) s += parseInt(d[i]) * w2[i]; r = s % 11; const dv2 = r < 2 ? 0 : 11 - r
    return dv1 === parseInt(d[12]) && dv2 === parseInt(d[13])
  }
  async function consultarReceita(cnpj: string) {
    try {
      setDocStatus('loading')
      const d = digits(cnpj)
      const res = await fetch(`https://www.receitaws.com.br/v1/cnpj/${d}`)
      if (!res.ok) throw new Error('Erro')
      const j = await res.json()
      if (j.status === 'ERROR') throw new Error(j.message || 'Erro')
      setRazaoSocial(j.nome || '')
      setEnderecoEmpresa([j.logradouro, j.numero, j.bairro, j.municipio, j.uf].filter(Boolean).join(', '))
      setAtividadePrincipal((j.atividade_principal && j.atividade_principal[0]?.text) || '')
      if (!novoClienteNome) setNovoClienteNome(j.nome || '')
      setDocStatus('success')
    } catch (e) {
      setDocStatus('error')
    }
  }
  useEffect(() => {
    const v = cpfCnpj.trim()
    if (!v) { setDocError(''); setDocStatus('idle'); return }
    const d = digits(v)
    if (tipoPessoa === 'pf') {
      const ok = d.length === 11 && validarCPF(v)
      setDocError(ok ? '' : 'CPF inválido')
      setDocStatus(ok ? 'success' : 'idle')
    } else {
      const ok = d.length === 14 && validarCNPJ(v)
      setDocError(ok ? '' : 'CNPJ inválido')
      if (ok) consultarReceita(v)
      else setDocStatus('idle')
    }
  }, [cpfCnpj, tipoPessoa])

  async function fetchRemoteSchedules() {
    if (hasBackend) {
      setLoadError('')
      const r = await listSchedules(10000, { includeConcluded: true, orgId: store.activeOrganization || undefined })
      if (r.error) {
        setLoadError(r.error.message)
      } else {
        setRemoteSchedules(r.data as any)
      }
    }
  }

  useEffect(() => {
    fetchRemoteSchedules()
  }, [])

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
      const periodo = tipo === 'fixo' ? periodoFix : 'mensal'
      const valor2 = Math.round(valor * 100) / 100
      const r = await createSchedule({ operacao, tipo, especie, ano_mes_inicial: todayIso, favorecido_id: clienteId || null, grupo_compromisso_id: grupoId || null, compromisso_id: compromissoId || null, historico, caixa_id: caixaId || null, detalhes, valor: valor2, proxima_vencimento: proxima || todayIso, periodo, parcelas: tipo === 'variavel' ? parcelas : 1, nota_fiscal: notaFiscal ? Number(notaFiscal) : null, situacao: 1 })
      if (r.error) { setMsg(r.error.message); setMsgType('error') }
      else { setMsg('Registro salvo com sucesso'); setMsgType('success'); resetForm(); setNotaFiscal(''); await fetchRemoteSchedules(); setShowForm('none'); setTimeout(() => setMsg(''), 2500); operacaoRef.current?.focus() }
    } else {
      const periodo = tipo === 'fixo' ? periodoFix : 'mensal'
      const valor2 = Math.round(valor * 100) / 100
      store.createSchedule({ operacao: operacao as any, tipo: tipo as any, especie, ano_mes_inicial: todayIso, cliente: clienteNome || '', cliente_id: clienteId || '', grupo_compromisso_id: grupoId || undefined, compromisso_id: compromissoId || undefined, caixa_id: caixaId || undefined, detalhes, historico, valor: valor2, proxima_vencimento: proxima || todayIso, periodo: periodo as any, parcelas: tipo === 'variavel' ? parcelas : 1, situacao: 1 })
      setMsg('Registro salvo com sucesso'); setMsgType('success'); resetForm(); setNotaFiscal(''); setShowForm('none'); setTimeout(() => setMsg(''), 2500); operacaoRef.current?.focus()
    }
  }

  function onEditOpen() {
    const s = hasBackend ? remoteSchedules.find((x: any) => x.id === selectedId) : store.schedules.find(x => x.id === selectedId)
    if (!s) return
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
    setPeriodoFix((s.periodo as any) || 'mensal'); setParcelas(s.parcelas); setGrupoId(s.grupo_compromisso_id || ''); setCompromissoId(s.compromisso_id || ''); setCaixaId(s.caixa_id || ''); setDetalhes(s.detalhes || '')
    setShowForm('edit')
  }

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

    setHistorico(s.historico || ''); setValor(s.valor);

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

    setPeriodoFix((s.periodo as any) || 'mensal'); setParcelas(s.parcelas); setGrupoId(s.grupo_compromisso_id || ''); setCompromissoId(s.compromisso_id || ''); setCaixaId(s.caixa_id || ''); setDetalhes(s.detalhes || '')

    // Open in CREATE mode
    setShowForm('create')
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
        setAlertInfo({ open: true, msg: 'Exclusão nao permitida. Já existe pagamentos vinculados ao mesmo!!!' })
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
      updateSched(selectedId, { operacao, tipo, especie, ano_mes_inicial: anoMesInicial, favorecido_id: clienteId, grupo_compromisso_id: grupoId, compromisso_id: compromissoId, historico, caixa_id: caixaId, detalhes, valor: valor2, proxima_vencimento: proxima, periodo, parcelas: tipo === 'variavel' ? parcelas : 1 }).then(() => fetchRemoteSchedules())
    } else {
      const periodo = tipo === 'fixo' ? periodoFix : 'mensal'
      const valor2 = Math.round(valor * 100) / 100
      store.updateSchedule(selectedId, { operacao: operacao as any, tipo: tipo as any, especie, ano_mes_inicial: anoMesInicial, cliente: clientes.find(c => c.id === clienteId)?.nome || '', cliente_id: clienteId, grupo_compromisso_id: grupoId, compromisso_id: compromissoId, caixa_id: caixaId, detalhes, historico, valor: valor2, proxima_vencimento: proxima, periodo: periodo as any, parcelas: tipo === 'variavel' ? parcelas : 1 })
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
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Agendamentos</h1>
      {loadError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 flex items-center justify-between">
          <span>Erro ao carregar: {loadError}</span>
          <button className="px-2 py-1 rounded border" onClick={() => { setLoadError(''); (async () => { try { if (hasBackend) { const [cRes, gRes, accRes, cbRes, sRes] = await Promise.all([listClients(), listCommitmentGroups(), listAccounts(), listCashboxes(), listSchedules()]); if (cRes.error) throw cRes.error; if (gRes.error) throw gRes.error; if (accRes.error) throw accRes.error; if (cbRes.error) throw cbRes.error; if (sRes.error) throw sRes.error; setClientes((cRes.data as any) || []); setGrupos((gRes.data as any) || []); setContas((accRes.data as any) || []); setCaixas((cbRes.data as any) || []); setRemoteSchedules((sRes.data as any) || []); } else { setClientes(store.clients.map(c => ({ id: c.id, nome: c.nome }))); setGrupos(store.commitment_groups); setCompromissos(store.commitments); setContas(store.accounts.map(a => ({ id: a.id, nome: a.nome, ativo: a.ativo !== false, principal: !!a.principal }))); setCaixas(store.cashboxes.map(c => ({ id: c.id, nome: c.nome }))); } console.log('Schedules: retry carregado com sucesso') } catch (err: any) { setLoadError(err?.message || 'Falha ao carregar dados'); console.error('Schedules: erro no retry', err) } })() }}>Tentar novamente</button>
        </div>
      )}

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

      <div role="toolbar" aria-label="Ações" className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-white border rounded px-3 py-2">
          <Icon name="search" className="w-4 h-4" />
          <input className="outline-none w-64" placeholder="Buscar cliente, histórico ou valor" value={search} onChange={e => { setPage(1); setSearch(e.target.value) }} />
        </div>
        <div className="flex items-center gap-2 bg-white border rounded px-3 py-2">
          <label className="text-sm" htmlFor="typeFilter">Tipo</label>
          <select id="typeFilter" className="border rounded px-2 py-1" value={typeFilter} onChange={e => { setTypeFilter(e.target.value as any); setPage(1) }}>
            <option value="">Todos</option>
            <option value="fixo">Fixo</option>
            <option value="variavel">Variável</option>
          </select>
        </div>
        <div className="flex items-center gap-2 bg-white border rounded px-3 py-2">
          <label className="text-sm" htmlFor="periodFilter">Período</label>
          <select id="periodFilter" className="border rounded px-2 py-1" value={periodFilter} onChange={e => { setPeriodFilter(e.target.value as any); setPage(1) }}>
            <option value="">Todos</option>
            <option value="mensal">Mensal</option>
            <option value="anual">Anual</option>
            <option value="determinado">Prazo Determinado</option>
          </select>
        </div>
        {(search || typeFilter || periodFilter) && (
          <button className="text-sm bg-gray-100 hover:bg-gray-200 border rounded px-3 py-2 text-gray-700" onClick={() => { setSearch(''); setTypeFilter(''); setPeriodFilter(''); setPage(1) }}>
            Limpar filtros
          </button>
        )}

        {selectedIds.size > 1 && (
          <div className="ml-2 bg-green-100 border border-green-300 shadow-sm rounded px-3 py-1 text-center whitespace-nowrap flex flex-col justify-center h-full">
            <div className="text-[10px] font-bold text-green-800 uppercase border-b border-green-300 leading-tight mb-0.5">
              SOMA ITENS ({selectedIds.size})
            </div>
            <div className={`text-sm font-bold ${data.selectionSum >= 0 ? 'text-green-600' : 'text-red-600'} leading-tight`}>
              {data.selectionSum < 0 ? '-' : ''}R$ {formatMoneyBr(Math.abs(data.selectionSum))}
            </div>
          </div>
        )}
        <button className="flex items-center gap-2 bg-black text-white rounded px-3 py-2" onClick={() => { resetForm(); const d = new Date(); const yyyy = d.getFullYear(); const mm = String(d.getMonth() + 1).padStart(2, '0'); const dd = String(d.getDate()).padStart(2, '0'); setAnoMesInicial(`${yyyy}-${mm}-${dd}`); setShowForm('create') }} aria-label="Incluir">
          <Icon name="add" className="w-4 h-4" /> Incluir
        </button>
        <button className="flex items-center gap-2 bg-blue-600 text-white rounded px-3 py-2 disabled:opacity-50" onClick={onEditOpen} disabled={!selectedId} aria-label="Alterar">
          <Icon name="edit" className="w-4 h-4" /> Alterar
        </button>

        {activeTab === 'concluidos' && selectedId && (
          <button className="flex items-center gap-2 bg-green-600 text-white rounded px-3 py-2" onClick={onReactivate} aria-label="Reativar">
            <Icon name="undo" className="w-4 h-4" /> Reativar
          </button>
        )}

        <button className="flex items-center gap-2 bg-red-600 text-white rounded px-3 py-2 disabled:opacity-50" onClick={onDelete} disabled={!selectedId} aria-label="Excluir">
          <Icon name="trash" className="w-4 h-4" /> Excluir
        </button>
        <button className="flex items-center justify-center bg-white border border-gray-300 rounded p-2 text-gray-700 hover:bg-gray-50" onClick={() => {
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
          const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n')
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `agendamentos_${new Date().toISOString().split('T')[0]}.csv`
          a.click()
          URL.revokeObjectURL(url)
        }} title="Exportar CSV" aria-label="Exportar CSV">
          <Icon name="excel" className="w-5 h-5" />
        </button>
        <button className="flex items-center justify-center bg-white border border-gray-300 rounded p-2 text-gray-700 hover:bg-gray-50" onClick={() => window.print()} title="Exportar PDF" aria-label="Exportar PDF">
          <Icon name="pdf" className="w-5 h-5" />
        </button>
      </div>

      {showForm !== 'none' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl my-8">
            <div className="sticky top-0 bg-white border-b px-6 py-4 rounded-t-lg flex items-center justify-between z-10">
              <div className="font-semibold text-lg">{showForm === 'create' ? 'Novo Agendamento' : 'Editar Agendamento'}</div>
              <button className="text-gray-500 hover:text-black" onClick={() => setShowForm('none')}>
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <form onSubmit={showForm === 'create' ? onCreate : onUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className="text-sm font-medium text-gray-700" htmlFor="operacao">Operação</label>
                    <select id="operacao" ref={operacaoRef} className="w-full border rounded px-3 py-2 text-sm bg-gray-50" value={operacao} disabled>
                      <option value="despesa">Despesa</option>
                      <option value="receita">Receita</option>
                      <option value="aporte">Aporte</option>
                      <option value="retirada">Retirada</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Tipo</label>
                    <select className="w-full border rounded px-3 py-2 text-sm" value={tipo} onChange={e => { setTipo(e.target.value) }}>
                      <option value="fixo">Fixo</option>
                      <option value="variavel">Variável</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Espécie</label>
                    <select className="w-full border rounded px-3 py-2 text-sm" value={especie} onChange={e => { setEspecie(e.target.value) }}>
                      <option value="dinheiro">Dinheiro</option>
                      <option value="pix">PIX</option>
                      <option value="cartao">Cartão</option>
                      <option value="boleto">Boleto</option>
                      <option value="transferencia">Transferência</option>
                      <option value="debito_automatico">Débito Automático</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Ano/Mês</label>
                    <select className="w-full border rounded px-3 py-2 text-sm" value={refChoice} onChange={e => { setRefChoice(e.target.value as any) }}>
                      <option value="vencimento">Ano/Mês Vencimento</option>
                      <option value="anterior">Ano/Mês Anterior</option>
                    </select>
                  </div>
                </div>

                <div className="md:col-span-2 relative">
                  <label className="text-sm font-medium text-gray-700">Cliente <span className="text-red-600">*</span></label>
                  <div className="flex gap-2">
                    <div className="flex-1 border rounded px-3 py-2 bg-white">
                      <input className="w-full outline-none" placeholder="Digite pelo menos 3 letras para buscar" value={clienteBusca} onChange={async e => {
                        const v = e.target.value
                        setClienteBusca(v)
                        if (v.length >= 3) {
                          if (hasBackend) {
                            const r = await (await import('../services/db')).searchClients(v)
                            if (!r.error && r.data) setClientes(r.data as any)
                          } else {
                            setClientes(store.clients.filter(c => c.nome.toLowerCase().includes(v.toLowerCase())).map(c => ({ id: c.id, nome: c.nome })))
                          }
                        }
                      }} />
                    </div>
                    <button type="button" className="flex items-center gap-2 bg-black text-white rounded px-3 py-2 hover:bg-gray-800" onClick={() => setClientModal(true)} title="Novo Cliente">
                      <Icon name="add" className="w-4 h-4" />
                    </button>
                  </div>
                  {clienteBusca.length >= 3 && clientes.length > 0 && (
                    <ul className="absolute z-20 bg-white border rounded mt-1 w-full max-h-48 overflow-auto shadow-lg">
                      {clientes.map(c => (
                        <li key={c.id} className="px-3 py-2 hover:bg-gray-50 cursor-pointer" onClick={() => { setClienteId(c.id); setClienteNome(c.nome); setClienteBusca(c.nome); setClientes([]); validate() }}>{c.nome}</li>
                      ))}
                    </ul>
                  )}
                  {errors.clienteId && <div className="text-xs text-red-600 mt-1">{errors.clienteId}</div>}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Grupo de Compromisso <span className="text-red-600">*</span></label>
                  <select className={`w-full border rounded px-3 py-2 ${errors.grupoId ? 'border-red-500 bg-red-50' : ''}`} value={grupoId} onChange={e => { setGrupoId(e.target.value); setCompromissoId(''); setErrors({ ...errors, grupoId: '' }) }}>
                    <option value="">Selecione</option>
                    {grupos.filter(g => (g.operacao || (g as any).tipo) === activeTab).map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
                  </select>
                  {errors.grupoId && <div className="text-xs text-red-600 mt-1">{errors.grupoId}</div>}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Compromisso <span className="text-red-600">*</span></label>
                  <select className={`w-full border rounded px-3 py-2 ${errors.compromissoId ? 'border-red-500 bg-red-50' : ''}`} value={compromissoId} onChange={e => { const id = e.target.value; setCompromissoId(id); const c = compromissos.find(x => x.id === id); if (c && showForm === 'create') setHistorico(c.nome); setErrors({ ...errors, compromissoId: '' }) }}>
                    <option value="">Selecione</option>
                    {compromissos.filter(c => !c.grupo_id || c.grupo_id === grupoId).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                  {errors.compromissoId && <div className="text-xs text-red-600 mt-1">{errors.compromissoId}</div>}
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Histórico <span className="text-red-600">*</span></label>
                  <input className={`w-full border rounded px-3 py-2 ${errors.historico ? 'border-red-500 bg-red-50' : ''}`} placeholder="Descrição" value={historico} onChange={e => { setHistorico(e.target.value); setErrors({ ...errors, historico: '' }) }} />
                  {errors.historico && <div className="text-xs text-red-600 mt-1">{errors.historico}</div>}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Caixa Lançamento <span className="text-red-600">*</span></label>
                  <select className={`w-full border rounded px-3 py-2 ${errors.caixaId ? 'border-red-500 bg-red-50' : ''}`} value={caixaId} onChange={e => {
                    const selectedId = e.target.value
                    setCaixaId(selectedId)
                    setErrors({ ...errors, caixaId: '' })
                    const selectedAccount = contas.find(c => c.id === selectedId)
                    if (selectedAccount && selectedAccount.tipo === 'cartao' && (selectedAccount as any).dia_vencimento) {
                      const dueDay = (selectedAccount as any).dia_vencimento
                      const now = new Date()
                      const year = now.getFullYear()
                      const month = now.getMonth() + 1
                      const dueDate = `${String(dueDay).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
                      setDateDisplay(dueDate)
                      setProxima(`${year}-${String(month).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`)
                    }
                  }}>
                    <option value="">Selecione</option>
                    {contas.filter(c => c.ativo !== false).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                  {errors.caixaId && <div className="text-xs text-red-600 mt-1">{errors.caixaId}</div>}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Detalhes</label>
                  <input className="w-full border rounded px-3 py-2" value={detalhes} onChange={e => setDetalhes(e.target.value)} />
                </div>

                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Valor <span className="text-red-600">*</span></label>
                    <input className={`w-full border rounded px-3 py-2 ${(!valor || valor <= 0) ? 'border-red-500 bg-red-50' : ''}`} type="number" inputMode="decimal" min={0.01} step="0.01" value={valor} onChange={e => { setValor(parseFloat(e.target.value) || 0) }} />
                    {(!valor || valor <= 0) && <div className="text-xs text-red-600 mt-1">Valor deve ser maior que 0</div>}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Data Vencimento <span className="text-red-600">*</span></label>
                    <div className="relative">
                      <input
                        className="w-full border rounded px-3 py-2 pr-10"
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
                      <label className="absolute right-2 top-1/2 -translate-y-1/2 p-1 cursor-pointer text-gray-400 hover:text-gray-600">
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
                    <label className="text-sm font-medium text-gray-700">{tipo === 'variavel' ? 'Parcelas' : 'Período'}</label>
                    {tipo === 'variavel' ? (
                      <input className="w-full border rounded px-3 py-2" type="number" min={1} max={48} value={parcelas} onChange={e => { const n = Math.min(48, Math.max(1, parseInt(e.target.value) || 1)); setParcelas(n) }} />
                    ) : (
                      <select className="w-full border rounded px-3 py-2" value={periodoFix} onChange={e => { setPeriodoFix(e.target.value as any) }}>
                        <option value="mensal">Mensal</option>
                        <option value="semestral">Semestral</option>
                        <option value="anual">Anual</option>
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Nota Fiscal</label>
                    <input className="w-full border rounded px-3 py-2" inputMode="numeric" placeholder="Somente números" value={notaFiscal} onChange={e => setNotaFiscal(e.target.value.replace(/\D/g, '').slice(0, 15))} />
                  </div>
                </div>

                <div className="md:col-span-2 flex justify-end gap-3 mt-4 pt-4 border-t">
                  <button className="bg-gray-100 hover:bg-gray-200 text-black border border-gray-300 rounded px-4 py-2 font-medium transition-colors" type="button" onClick={() => setShowForm('none')}>Cancelar</button>
                  <button className="bg-black hover:bg-gray-800 text-white rounded px-4 py-2 font-medium transition-colors shadow-sm" type="submit">{showForm === 'create' ? 'Salvar Agendamento' : 'Salvar Alterações'}</button>
                </div>
              </form>

              {msg && <div className={`mt-4 p-3 rounded ${msgType === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>{msg}</div>}

              {preview.length > 0 && (
                <div className="mt-6 bg-gray-50 border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3 border-b pb-2">
                    <div className="font-semibold text-gray-700">Cronograma de Pagamentos</div>
                    <div className="flex gap-2">
                      <button className="text-xs bg-white border rounded px-2 py-1 hover:bg-gray-100" onClick={() => {
                        const csv = 'Parcela;Data;Valor\n' + preview.map((r, i) => `${i + 1};${r.date};${r.valor.toFixed(2)}`).join('\n')
                        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a'); a.href = url; a.download = 'cronograma.csv'; a.click(); URL.revokeObjectURL(url)
                      }}>CSV</button>
                    </div>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          <th className="px-2 py-1 text-left">Parcela</th>
                          <th className="px-2 py-1 text-left">Data</th>
                          <th className="px-2 py-1 text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((r, i) => (
                          <tr key={i} className="border-t hover:bg-white">
                            <td className="px-2 py-1">{i + 1}</td>
                            <td className="px-2 py-1">{toBr(r.date)}</td>
                            <td className="px-2 py-1 text-right">R$ {formatMoneyBr(r.valor)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="font-bold bg-gray-100 sticky bottom-0 border-t">
                        <tr>
                          <td colSpan={2} className="px-2 py-1 text-right">Total:</td>
                          <td className="px-2 py-1 text-right">R$ {formatMoneyBr(preview.reduce((acc, c) => acc + c.valor, 0))}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {
        changesLog.length > 0 && (
          <div className="mt-4 bg-white border rounded p-4">
            <div className="font-medium mb-2">Histórico de alterações</div>
            <ul className="list-disc pl-5 text-sm">
              {changesLog.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          </div>
        )
      }


      <div className="bg-white border rounded">
        <div className="flex items-center justify-between p-2">
          <div className="font-medium">Caixas</div>
          <div className="flex gap-2">
            <button className="flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded p-2" onClick={() => {
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
            <button className="flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded p-2" onClick={() => {
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
                <div key={k} className="mb-4 border rounded">
                  <div className="flex items-center gap-3 px-3 py-2 cursor-pointer bg-gray-100" onClick={() => setAccountExpanded(s => ({ ...s, [k]: !s[k] }))}>
                    <Icon name={isExpanded ? 'chevron-down' : 'chevron-right'} className="w-4 h-4" />
                    {(() => {
                      // Get color from the first item in the list (they all have the same caixa)
                      const color = list[0]?.caixa_cor || '#3b82f6' // default blue-500
                      return (
                        <svg className="w-5 h-5" fill="none" stroke={color} viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
                        </svg>
                      )
                    })()}
                    <div className="font-medium">Caixa Lançamento: {k}</div>
                    <div className="ml-auto text-sm text-gray-600">{list.length} itens</div>
                    <button className="px-2 py-1 rounded border" onClick={e => { e.stopPropagation(); setAccountExpanded(s => ({ ...s, [k]: !isExpanded })) }} aria-label="Expandir/Colapsar">
                      <Icon name={isExpanded ? 'minus' : 'add'} className="w-4 h-4" />
                    </button>
                  </div>
                  {isExpanded && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left">
                            {[
                              ['data_referencia', 'Data Referência'],
                              ['cliente', 'Cliente'],
                              ['historico', 'Histórico'],
                              ['vencimento', 'Vencimento'],
                              ['periodo', 'Período'],
                              ['data_final', 'Data Final'],
                              ['valor_parcela', 'Valor Parcela'],
                              ['qtd', 'Qtd'],
                              ['valor_total', 'Valor Total'],
                            ].map(([key, label]) => (
                              <th key={key} className={`p-2 ${['valor_parcela', 'qtd', 'valor_total'].includes(key as string) ? 'text-right' : ''} ${key === 'data_referencia' ? 'w-[100px]' : key === 'cliente' ? 'w-[180px]' : key === 'historico' ? 'w-[200px]' : key === 'vencimento' ? 'w-[100px]' : key === 'periodo' ? 'w-[120px]' : key === 'data_final' ? 'w-[100px]' : key === 'valor_parcela' ? 'w-[110px]' : key === 'qtd' ? 'w-[60px]' : key === 'valor_total' ? 'w-[110px]' : ''}`}>
                                <button onClick={() => toggleSort(key as string)} aria-label={`Ordenar por ${label}`}>{label}</button>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {list.map(r => (
                            <tr key={r.id} className={`border-t cursor-pointer ${selectedIds.has(r.id) ? 'bg-blue-50 ring-2 ring-blue-400' : 'hover:bg-gray-50'}`} onClick={(e) => { handleSelect(e, r.id); setSelectedId(r.id) }} onDoubleClick={() => { setSelectedId(r.id); onEditOpen() }} onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, id: r.id }) }} title="Clique com botão direito para opções">
                              <td className="p-2 w-[100px]">{r.data_referencia}</td>
                              <td className="p-2 w-[180px] break-words whitespace-normal" title={r.cliente}>{r.cliente}</td>
                              <td className="p-2 w-[200px] break-words whitespace-normal" title={r.historico}>{r.historico}</td>
                              <td className="p-2 w-[100px]">{r.vencimento}</td>
                              <td className="p-2 w-[120px] capitalize">{r.tipo === 'variavel' ? 'Prazo determinado' : r.periodo}</td>
                              <td className="p-2 w-[100px]">{r.data_final}</td>
                              <td className="p-2 w-[110px] text-right">R$ {formatMoneyBr(Number(r.valor_parcela))}</td>
                              <td className="p-2 w-[60px] text-right">{formatIntBr(Number(r.qtd))}</td>
                              <td className="p-2 w-[110px] text-right font-semibold">R$ {formatMoneyBr(Number(r.valor_total))}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-gray-50 font-medium">
                            <td className="p-2 text-right" colSpan={6}>Total do Caixa</td>
                            <td className="p-2 text-right">R$ {formatMoneyBr(list.reduce((sum, r) => sum + Number(r.valor_parcela), 0))}</td>
                            <td className="p-2 text-right"></td>
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
          <div className="sticky bottom-0 bg-gradient-to-r from-blue-50 to-blue-100 border-t-2 border-blue-300 text-xs font-bold">
            <div className="flex justify-end p-2 items-center">
              <div className="mr-2 text-gray-700 uppercase">Totais Gerais:</div>
              <div className="w-[110px] text-right text-blue-700">
                R$ {formatMoneyBr(data.data.reduce((sum, r) => sum + Number(r.valor_parcela), 0))}
              </div>
              <div className="w-[60px]"></div>
              <div className="w-[110px] text-right text-green-700">
                R$ {formatMoneyBr(data.data.reduce((sum, r) => sum + Number(r.valor_total), 0))}
              </div>
            </div>
          </div>
        </>)
        }
      </div >
      {
        clientModal && (
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/40" onClick={() => setClientModal(false)} aria-hidden="true"></div>
            <div className="absolute left-1/2 top-20 -translate-x-1/2 bg-white border rounded w-[90%] max-w-lg max-h-[80vh] overflow-auto p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="font-medium">Novo Cliente</div>
                <button onClick={() => setClientModal(false)}>Fechar</button>
              </div>
              <form onSubmit={async e => {
                e.preventDefault()
                if (cpfCnpj && docError) return
                if (!novoClienteNome && !razaoSocial) return
                if (hasBackend) {
                  const r = await createClient({ nome: novoClienteNome || razaoSocial, documento: cpfCnpj || undefined, email: novoClienteEmail || undefined, telefone: novoClienteTelefone || undefined, razao_social: razaoSocial || undefined, endereco: enderecoEmpresa || undefined, atividade_principal: atividadePrincipal || undefined })
                  if (!r.error && r.data?.id) {
                    setClientes(prev => [{ id: r.data.id, nome: novoClienteNome || razaoSocial }, ...prev])
                    setClienteId(r.data.id)
                  }
                } else {
                  const id = store.createClient({ nome: novoClienteNome || razaoSocial, documento: cpfCnpj || undefined, email: novoClienteEmail || undefined, telefone: novoClienteTelefone || undefined, razao_social: razaoSocial || undefined, endereco: enderecoEmpresa || undefined, atividade_principal: atividadePrincipal || undefined })
                  setClientes(prev => [{ id, nome: novoClienteNome || razaoSocial }, ...prev])
                  setClienteId(id)
                }
                setClientModal(false)
                setNovoClienteNome(''); setCpfCnpj(''); setRazaoSocial(''); setEnderecoEmpresa(''); setAtividadePrincipal(''); setNovoClienteEmail(''); setNovoClienteTelefone(''); setDocError(''); setDocStatus('idle')
              }} className="space-y-3">
                <div>
                  <label className="text-sm">Nome</label>
                  <input className="w-full border rounded px-3 py-2" value={novoClienteNome} onChange={e => setNovoClienteNome(e.target.value)} />
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <input id="tp_pf" type="radio" name="tp" checked={tipoPessoa === 'pf'} onChange={() => setTipoPessoa('pf')} />
                    <label htmlFor="tp_pf" className="text-sm">Pessoa Física</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input id="tp_pj" type="radio" name="tp" checked={tipoPessoa === 'pj'} onChange={() => setTipoPessoa('pj')} />
                    <label htmlFor="tp_pj" className="text-sm">Pessoa Jurídica</label>
                  </div>
                </div>
                <div>
                  <label className="text-sm">CPF/CNPJ <span className="text-gray-500">(Opcional)</span></label>
                  <input className="w-full border rounded px-3 py-2" value={cpfCnpj} onChange={e => setCpfCnpj(maskCpfCnpj(e.target.value))} aria-invalid={!!docError} />
                  {docStatus === 'loading' && <div className="text-xs">Consultando Receita...</div>}
                  {docStatus === 'success' && <div className="text-xs text-green-700">Documento válido</div>}
                  {docStatus === 'error' && <div className="text-xs text-red-600">Erro na consulta</div>}
                  {docError && <div className="text-xs text-red-600">{docError}</div>}
                </div>
                <div>
                  <label className="text-sm">Razão Social</label>
                  <input className="w-full border rounded px-3 py-2" value={razaoSocial} onChange={e => setRazaoSocial(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm">Endereço</label>
                  <input className="w-full border rounded px-3 py-2" value={enderecoEmpresa} onChange={e => setEnderecoEmpresa(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm">Atividade Principal</label>
                  <input className="w-full border rounded px-3 py-2" value={atividadePrincipal} onChange={e => setAtividadePrincipal(e.target.value)} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm">Email</label>
                    <input className="w-full border rounded px-3 py-2" value={novoClienteEmail} onChange={e => setNovoClienteEmail(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm">Telefone</label>
                    <input className="w-full border rounded px-3 py-2" value={novoClienteTelefone} onChange={e => setNovoClienteTelefone(e.target.value)} />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" className="bg-gray-200 rounded px-3 py-2" onClick={() => setClientModal(false)}>Cancelar</button>
                  <button className="bg-black text-white rounded px-3 py-2 disabled:opacity-50" type="submit" disabled={!!docError}>Salvar</button>
                </div>
              </form>
            </div>
          </div>
        )
      }
      {showDeleteConfirm && (
        <ConfirmModal
          isOpen={showDeleteConfirm}
          title="Excluir Agendamento"
          onConfirm={confirmDelete}
          onClose={() => setShowDeleteConfirm(false)}
          message="Tem certeza que deseja excluir este agendamento?"
        />
      )}

      {showDeactivateConfirm && (
        <ConfirmModal
          isOpen={showDeactivateConfirm}
          title="Desativar Agendamento"
          onConfirm={confirmDeactivate}
          onClose={() => { setShowDeactivateConfirm(false); setDeactivateId(null) }}
          message="Tem certeza que deseja desativar este agendamento? Os lançamentos futuros serão cancelados."
        />
      )}

      <AlertModal
        isOpen={alertInfo.open}
        message={alertInfo.msg}
        onClose={() => setAlertInfo({ open: false, msg: '' })}
      />

      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)}></div>
          <div className="fixed z-50 bg-white border rounded shadow-lg py-1 text-sm font-medium" style={{ top: contextMenu.y, left: contextMenu.x }}>
            <button className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-blue-600" onClick={() => { onEditOpen(); setContextMenu(null) }}>
              <Icon name="edit" className="w-4 h-4" /> Alterar
            </button>
            <button className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-red-600" onClick={() => { onDelete(); setContextMenu(null) }}>
              <Icon name="trash" className="w-4 h-4" /> Excluir
            </button>
            <button className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-green-600" onClick={() => { onDuplicate(contextMenu.id); setContextMenu(null) }}>
              <Icon name="copy" className="w-4 h-4" /> Duplicar
            </button>
            {activeTab !== 'concluidos' && (
              <>
                <div className="border-t my-1"></div>
                <button className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-orange-600" onClick={() => { onDeactivate(contextMenu.id); setContextMenu(null) }}>
                  <Icon name="x" className="w-4 h-4" /> Desativar Agendamento Selecionado
                </button>
              </>
            )}
            {activeTab === 'concluidos' && (
              <>
                <div className="border-t my-1"></div>
                <button className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-green-600" onClick={() => { onReactivate(contextMenu.id); setContextMenu(null) }}>
                  <Icon name="undo" className="w-4 h-4" /> Reativar Agendamento Selecionado
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
