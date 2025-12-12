import { useEffect, useState, useMemo } from 'react'
import { listAccounts, listTransactions, payTransaction, receiveTransaction, listClients, listCommitmentGroups, listCommitmentsByGroup, updateSchedule, reverseTransaction, updateTransaction } from '../services/db'
import { hasBackend } from '../lib/runtime'
import { useAppStore } from '../store/AppStore'
import { supabase } from '../lib/supabase'
import { Icon } from '../components/ui/Icon'
import { formatMoneyBr } from '../utils/format'
import { TransactionModal } from '../components/modals/TransactionModal'

export default function Ledger() {
  const store = useAppStore()
  const [txs, setTxs] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [amount, setAmount] = useState<number>(0)
  const [date, setDate] = useState<string>('')
  const [msg, setMsg] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [opFilter, setOpFilter] = useState('Todas')
  const [accountFilter, setAccountFilter] = useState('')

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tx: any } | null>(null)
  const [showReverseConfirm, setShowReverseConfirm] = useState(false)
  const [pendingTx, setPendingTx] = useState<any>(null)
  const [modalTitle, setModalTitle] = useState('Incluir Nova Transação')
  const [editingId, setEditingId] = useState<string | null>(null)

  // Filtros Avançados
  const [filterMode, setFilterMode] = useState<'simple' | 'custom'>('simple')
  const [dateFilterType, setDateFilterType] = useState<'payment' | 'launch'>('payment')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Dados para dropdowns
  const [clients, setClients] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [commitments, setCommitments] = useState<any[]>([])

  // Form states para criar nova transação
  const [formContaId, setFormContaId] = useState('')
  const [formOperacao, setFormOperacao] = useState<'despesa' | 'receita' | 'aporte' | 'retirada'>('despesa')
  const [formEspecie, setFormEspecie] = useState('dinheiro')
  const [formHistorico, setFormHistorico] = useState('')
  const [formValor, setFormValor] = useState(0)
  const [formDataVencimento, setFormDataVencimento] = useState('')
  const [formDataLancamento, setFormDataLancamento] = useState('')
  const [formStatus, setFormStatus] = useState<'pendente' | 'pago' | 'recebido'>('pendente')

  // Novos campos do modal
  const [formCliente, setFormCliente] = useState('')
  const [formGrupoCompromisso, setFormGrupoCompromisso] = useState('')
  const [formCompromisso, setFormCompromisso] = useState('')
  const [formNotaFiscal, setFormNotaFiscal] = useState('')
  const [formDetalhes, setFormDetalhes] = useState('')

  // Abas de Meses
  const months = useMemo(() => {
    const arr = []
    const now = new Date()
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      arr.push(d)
    }
    return arr
  }, [])
  const [selectedMonth, setSelectedMonth] = useState(months[0].toISOString().slice(0, 7)) // YYYY-MM

  // Close context menu on click elsewhere
  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [])

  function toBr(iso: string) {
    if (!iso) return ''
    const dateStr = iso.split('T')[0]
    if (!dateStr) return ''
    const [yyyy, mm, dd] = dateStr.split('-')
    if (!yyyy || !mm || !dd) return ''
    return `${dd}/${mm}/${yyyy}`
  }

  async function load() {
    if (hasBackend) {
      const orgId = store.activeOrganization || undefined
      const t = await listTransactions(2000, orgId)
      const a = await listAccounts(orgId)
      const c = await listClients(orgId)
      const g = await listCommitmentGroups(orgId)
      setTxs(t.data || [])
      setAccounts(a.data || [])
      setClients(c.data || [])
      setGroups(g.data || [])
    } else {
      setTxs(store.transactions)
      setAccounts(store.accounts)
      setClients(store.clients)
      setGroups(store.commitment_groups)
    }
  }

  useEffect(() => { load() }, [store.activeOrganization])

  useEffect(() => {
    if (!formGrupoCompromisso) {
      setCommitments([])
      return
    }
    if (hasBackend) {
      listCommitmentsByGroup(formGrupoCompromisso).then(r => setCommitments(r.data || []))
    } else {
      setCommitments(store.commitments.filter(c => c.grupo_id === formGrupoCompromisso))
    }
  }, [formGrupoCompromisso])

  async function onPay(tx: any) {
    const contaId = accounts[0]?.id
    if (!contaId) return
    if (hasBackend) {
      const r = await payTransaction(tx.id, contaId, amount || tx.valor_saida || 0, date)
      if (r.error) setMsg(r.error.message)
      else { setMsg('Pago'); load() }
    } else {
      store.payTransaction(tx.id, contaId, amount || tx.valor_saida || 0, date)
      setMsg('Pago'); load()
    }
  }

  async function onReceive(tx: any) {
    const contaId = accounts[0]?.id
    if (!contaId) return
    if (hasBackend) {
      const r = await receiveTransaction(tx.id, contaId, amount || tx.valor_entrada || 0, date)
      if (r.error) setMsg(r.error.message)
      else { setMsg('Recebido'); load() }
    } else {
      store.receiveTransaction(tx.id, contaId, amount || tx.valor_entrada || 0, date)
      setMsg('Recebido'); load()
    }
  }

  async function handleCreateTransaction() {
    if (!formContaId || !formValor || !formDataLancamento || !formOperacao || !formCliente || !formGrupoCompromisso || !formCompromisso || !formHistorico) {
      setMsg('Preencha todos os campos obrigatórios')
      return
    }

    const isEntrada = formOperacao === 'receita' || formOperacao === 'aporte'
    const newTransaction: any = {
      conta_id: formContaId,
      operacao: formOperacao,
      especie: formEspecie,
      historico: formHistorico,
      data_vencimento: formDataVencimento || formDataLancamento,
      data_lancamento: formDataLancamento,
      valor_entrada: isEntrada ? formValor : 0,
      valor_saida: !isEntrada ? formValor : 0,
      status: formStatus,
      cliente_id: formCliente, // Correctly mapped to database column
      grupo_compromisso_id: formGrupoCompromisso, // Use correct FK column
      compromisso_id: formCompromisso, // Use correct FK column
      nota_fiscal: formNotaFiscal,
      detalhes: formDetalhes
    }

    if (hasBackend && supabase) {
      const userId = (await supabase.auth.getUser()).data.user?.id
      let r
      if (editingId) {
        r = await updateTransaction(editingId, newTransaction)
      } else {
        r = await supabase.from('transactions').insert([{ user_id: userId, ...newTransaction }])
      }

      if (r.error) {
        setMsg('Erro ao salvar transação: ' + r.error.message)
      } else {
        setMsg(editingId ? 'Transação atualizada com sucesso!' : 'Transação criada com sucesso!')
        resetForm()
        setShowModal(false)
        load()
      }
    } else {
      if (editingId) {
        // store.updateTransaction(editingId, newTransaction) // Assuming store supports it, if not, fallback or ignore for now as backend is primary
        console.warn('Update via local store not implemented')
        setMsg('Transação atualizada com sucesso!')
      } else {
        store.createTransaction(newTransaction as any)
        setMsg('Transação criada com sucesso!')
      }
      resetForm()
      setShowModal(false)
      load()
    }
  }

  function resetForm() {
    setEditingId(null)
    setFormContaId('')
    setFormOperacao('despesa')
    setFormEspecie('dinheiro')
    setFormHistorico('')
    setFormValor(0)
    setFormDataVencimento('')
    setFormDataLancamento('')
    setFormStatus('pendente')
    setFormCliente('')
    setFormGrupoCompromisso('')
    setFormCompromisso('')
    setFormNotaFiscal('')
    setFormDetalhes('')
  }

  function openModal(tx?: any) {
    resetForm()
    if (tx) {
      setEditingId(tx.id)
      setModalTitle('Editar Transação')
      setFormOperacao(tx.operacao)
      setFormContaId(tx.conta_id || tx.caixa_id || '')
      setFormEspecie(tx.especie || 'dinheiro')
      setFormHistorico(tx.historico)
      setFormValor(Number(tx.valor_saida || tx.valor_entrada || 0))
      const today = new Date().toISOString().split('T')[0]
      setFormDataVencimento(tx.data_vencimento ? tx.data_vencimento.split('T')[0] : today)
      setFormDataLancamento(tx.data_lancamento ? tx.data_lancamento.split('T')[0] : today)
      setFormStatus(tx.status || 'pendente')
      setFormCliente(tx.cliente || '')
      setFormCliente(tx.cliente_id || tx.cliente || '')
      // Fix: Check various likely column names (schedule uses grupo_id)
      setFormGrupoCompromisso(tx.grupo_compromisso || tx.grupo_compromisso_id || tx.grupo_id || '')
      setFormCompromisso(tx.compromisso || tx.compromisso_id || '')
      setFormNotaFiscal(tx.nota_fiscal || '')
      setFormDetalhes(tx.detalhes ? (typeof tx.detalhes === 'string' ? tx.detalhes : JSON.stringify(tx.detalhes)) : '')
    } else {
      setModalTitle('Incluir Nova Transação')
      const today = new Date().toISOString().split('T')[0]
      setFormDataLancamento(today)
      setFormDataVencimento(today)
    }
    setShowModal(true)
  }

  function labelAccount(id: string) {
    const a = accounts.find(x => x.id === id)
    return a ? a.nome : id
  }

  function handleContextMenu(e: React.MouseEvent, tx: any) {
    e.preventDefault()
    setContextMenu({ x: e.pageX, y: e.pageY, tx })
  }

  function handleDuplicate() {
    if (!contextMenu) return
    const { tx } = contextMenu

    setFormOperacao(tx.operacao)
    setFormContaId(tx.conta_id || tx.caixa_id || '')
    setFormEspecie(tx.especie || 'dinheiro')
    setFormHistorico(tx.historico + ' (Cópia)')
    setFormValor(Number(tx.valor_saida || tx.valor_entrada || 0))
    const today = new Date().toISOString().split('T')[0]
    setFormDataVencimento(today)
    setFormDataLancamento(today)
    setFormDataLancamento(today)
    setFormCliente(tx.cliente || '')
    setFormGrupoCompromisso(tx.grupo_compromisso || tx.grupo_compromisso_id || '')
    setFormCompromisso(tx.compromisso || '')
    setFormNotaFiscal(tx.nota_fiscal || '')
    setFormDetalhes(tx.detalhes ? (typeof tx.detalhes === 'string' ? tx.detalhes : JSON.stringify(tx.detalhes)) : '')

    setModalTitle('Duplicando Lançamento')
    setShowModal(true)
  }

  function handleReverse() {
    if (!contextMenu) return
    setPendingTx(contextMenu.tx)
    setShowReverseConfirm(true)
    setContextMenu(null)
  }

  async function confirmReverse() {
    if (!pendingTx) return
    const tx = pendingTx
    setShowReverseConfirm(false)

    // Ensure schedule_id or agendamento_id is used
    const scheduleId = tx.schedule_id || tx.agendamento_id

    try {
      if (hasBackend && supabase) {
        // Use RPC for safe reversal (handles livro_financeiro)
        const { data, error } = await reverseTransaction(tx.id)

        if (error) throw error
        if (data && !data.success) throw new Error(data.message)

        await load()
        setMsg('Transação estornada com sucesso')
      } else {
        if (scheduleId) {
          store.updateSchedule(scheduleId, { situacao: 1 })
        }
        store.deleteTransaction(tx.id)
        await load()
        setMsg('Transação estornada com sucesso')
      }
      setTimeout(() => setMsg(''), 3000)
    } catch (error: any) {
      alert('Erro ao estornar: ' + error.message)
    } finally {
      setPendingTx(null)
    }
  }

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const today = new Date().toISOString().split('T')[0]
  const [appliedDates, setAppliedDates] = useState({ start: today, end: today })

  const filteredTxs = useMemo(() => {
    return txs.filter(t => {
      if (filterMode === 'simple') {
        if (!t.data_lancamento.startsWith(selectedMonth)) return false
      } else {
        if (!appliedDates.start || !appliedDates.end) return true
        const dateToCheck = dateFilterType === 'payment' ? (t.data_vencimento || t.data_lancamento) : t.data_lancamento
        if (dateToCheck < appliedDates.start || dateToCheck > appliedDates.end) return false
      }

      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        const valSearch = parseFloat(searchTerm.replace(',', '.'))
        const matchText = (t.cliente?.toLowerCase() || '').includes(term) || (t.historico?.toLowerCase() || '').includes(term)
        const matchValue = !isNaN(valSearch) && (Math.abs(t.valor_entrada - valSearch) < 0.01 || Math.abs(t.valor_saida - valSearch) < 0.01)

        const matchesSearch = matchText || matchValue
        if (!matchesSearch) return false
      }

      // Operation Filter Logic
      // console.log('Filter Check:', { op: t.operacao, filter: opFilter })
      const op = (t.operacao || '').toLowerCase().trim()

      // Account Filter Logic
      if (accountFilter && t.conta_id !== accountFilter) return false

      if (opFilter === 'Todas') return true
      if (opFilter === 'Somente Receitas') return op === 'receita'
      if (opFilter === 'Somente Despesas') return op === 'despesa'
      if (opFilter === 'Somente Aporte/Ret./Transf.') return ['aporte', 'retirada', 'transferencia'].includes(op)
      if (opFilter === 'Despesas e Retiradas') return ['despesa', 'retirada'].includes(op)
      if (opFilter === 'Receitas e Aportes') return ['receita', 'aporte'].includes(op)
      if (opFilter === 'Somente Aporte') return op === 'aporte'
      if (opFilter === 'Somente Retiradas') return op === 'retirada'
      if (opFilter === 'Somente Transferências') return op === 'transferencia'

      return true
    })
  }, [txs, filterMode, selectedMonth, appliedDates, dateFilterType, searchTerm, opFilter, accountFilter])

  const selectionSum = useMemo(() => {
    return filteredTxs.reduce((acc, t) => {
      if (selectedIds.has(t.id)) {
        return acc + (Number(t.valor_entrada || 0) - Number(t.valor_saida || 0))
      }
      return acc
    }, 0)
  }, [filteredTxs, selectedIds])

  const filteredTotals = useMemo(() => {
    return filteredTxs.reduce((acc, t) => {
      return {
        receitas: acc.receitas + (Number(t.valor_entrada) || 0),
        despesas: acc.despesas + (Number(t.valor_saida) || 0)
      }
    }, { receitas: 0, despesas: 0 })
  }, [filteredTxs])

  function handleSelect(e: React.MouseEvent, id: string) {
    if (e.ctrlKey || e.metaKey) {
      setSelectedIds(prev => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    } else {
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Livro Caixa</h1>
      </div>

      <div className="flex gap-3">
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-xs font-medium text-gray-700 invisible">Busca</label>
          <input className="border dark:border-gray-600 rounded px-3 py-2 w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" type="text" placeholder="Buscar cliente, histórico ou valor" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Caixa</label>
          <div className="relative">
            <select
              className="border dark:border-gray-600 rounded px-3 py-2 appearance-none pr-8 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer min-w-[150px] text-gray-900 dark:text-gray-100"
              value={accountFilter}
              onChange={e => setAccountFilter(e.target.value)}
            >
              <option value="">Todos</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.nome}</option>
              ))}
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Tipo Operação</label>
          <div className="relative">
            <select
              className="border dark:border-gray-600 rounded px-3 py-2 appearance-none pr-8 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer min-w-[200px] text-gray-900 dark:text-gray-100"
              value={opFilter}
              onChange={e => setOpFilter(e.target.value)}
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
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-700 invisible">Ação</label>
          <button
            className="px-4 py-2 bg-black dark:bg-gray-900 text-white rounded hover:bg-gray-800 dark:hover:bg-black transition-colors whitespace-nowrap"
            onClick={openModal}
          >
            + Incluir
          </button>
        </div>
      </div>

      {/* Filtros e Abas */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="flex border dark:border-gray-600 rounded overflow-hidden">
            <button
              className={`px-3 py-1 text-sm ${filterMode === 'simple' ? 'bg-fourtek-blue text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
              onClick={() => setFilterMode('simple')}
            >
              Simplificada
            </button>
            <button
              className={`px-3 py-1 text-sm ${filterMode === 'custom' ? 'bg-fourtek-blue text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
              onClick={() => setFilterMode('custom')}
            >
              Personalizada
            </button>
          </div>
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

        {filterMode === 'simple' ? (
          <div className="flex overflow-x-auto border-b dark:border-gray-700">
            {months.map(m => {
              const val = m.toISOString().slice(0, 7)
              const label = m.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()
              const isSelected = selectedMonth === val
              return (
                <button
                  key={val}
                  className={`px-4 py-2 text-xs font-medium whitespace-nowrap border-r dark:border-gray-700 ${isSelected ? 'bg-orange-100 dark:bg-orange-900/40 border-b-2 border-b-orange-400 dark:border-b-orange-500 text-orange-800 dark:text-orange-200' : 'bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-800 dark:text-blue-200'}`}
                  onClick={() => setSelectedMonth(val)}
                >
                  {label}
                </button>
              )
            })}
          </div>
        ) : (
          <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-800 p-3 rounded border dark:border-gray-700">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="radio" name="dateFilterType" checked={dateFilterType === 'payment'} onChange={() => setDateFilterType('payment')} />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Data Vencimento</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="radio" name="dateFilterType" checked={dateFilterType === 'launch'} onChange={() => setDateFilterType('launch')} />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Data Pagamento</span>
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input type="date" max="9999-12-31" className="border dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" value={startDate} onChange={e => setStartDate(e.target.value)} />
              <span className="text-sm text-gray-700 dark:text-gray-300">a</span>
              <input type="date" max="9999-12-31" className="border dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" value={endDate} onChange={e => setEndDate(e.target.value)} />
              <button
                onClick={() => {
                  if (startDate && startDate.length > 10) return alert('Data Inicial inválida. Verifique o ano.')
                  if (endDate && endDate.length > 10) return alert('Data Final inválida. Verifique o ano.')
                  setAppliedDates({ start: startDate, end: endDate })
                }}
                className="bg-fourtek-blue text-white px-3 py-1 rounded text-sm hover:bg-blue-700 ml-2"
              >
                Pesquisar
              </button>
            </div>
          </div>
        )}
      </div>
      {msg && <div className="text-sm text-green-700">{msg}</div>}
      <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded text-gray-900 dark:text-gray-100">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr className="text-left">
              <th className="p-2 font-semibold text-gray-700 dark:text-gray-200">Data</th>
              <th className="p-2 font-semibold text-gray-700 dark:text-gray-200">Caixa</th>
              <th className="p-2 font-semibold text-gray-700 dark:text-gray-200">Cliente</th>
              <th className="p-2 font-semibold text-gray-700 dark:text-gray-200">Compromisso</th>
              <th className="p-2 font-semibold text-gray-700 dark:text-gray-200">Histórico</th>
              <th className="p-2 text-right font-semibold text-gray-700 dark:text-gray-200">Receitas</th>
              <th className="p-2 text-right font-semibold text-gray-700 dark:text-gray-200">Despesas</th>
              <th className="p-2 font-semibold text-gray-700 dark:text-gray-200">Espécie</th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-gray-700">
            {filteredTxs.map(tx => (
              <tr
                key={tx.id}
                className={`border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${selectedIds.has(tx.id) ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-400' : ''}`}
                onClick={(e) => handleSelect(e, tx.id)}
                onDoubleClick={() => openModal(tx)}
                onContextMenu={(e) => { handleContextMenu(e, tx) }}
              >
                <td className="p-2">{toBr(tx.data_lancamento)}</td>
                <td className="p-2">{labelAccount(tx.conta_id)}</td>
                <td className="p-2">{tx.cliente?.nome || clients.find(c => c.id === tx.cliente_id)?.nome || '-'}</td>
                <td className="p-2">{tx.compromisso?.nome || tx.compromisso_id || '-'}</td>
                <td className="p-2">{tx.historico}</td>
                <td className="p-2 text-green-600 dark:text-green-400 font-medium text-right">{Number(tx.valor_entrada) > 0 ? `R$ ${formatMoneyBr(Number(tx.valor_entrada))}` : ''}</td>
                <td className="p-2 text-red-600 dark:text-red-400 font-medium text-right">{Number(tx.valor_saida) > 0 ? `R$ ${formatMoneyBr(Number(tx.valor_saida))}` : ''}</td>
                <td className="p-2">{tx.especie ? (tx.especie.charAt(0).toUpperCase() + tx.especie.slice(1).replace('_', ' ')) : '-'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-100 dark:bg-gray-800 font-bold border-t-2 dark:border-gray-600">
            <tr>
              <td className="p-2" colSpan={5}>TOTAIS ({filteredTxs.length} registros)</td>
              <td className="p-2 text-right text-green-700 dark:text-green-400">R$ {formatMoneyBr(filteredTotals.receitas)}</td>
              <td className="p-2 text-right text-red-700 dark:text-red-400">R$ {formatMoneyBr(filteredTotals.despesas)}</td>
              <td className="p-2"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {contextMenu && (
        <div
          className="fixed bg-white dark:bg-gray-800 border dark:border-gray-700 rounded shadow-xl z-50 py-1"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-blue-600 dark:text-blue-400" onClick={() => {
            const item = contextMenu.tx
            if (item) openModal(item)
            setContextMenu(null)
          }}>
            <Icon name="edit" className="w-4 h-4" /> Alterar
          </button>
          <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-red-600 dark:text-red-400" onClick={() => { handleReverse(); setContextMenu(null) }}>
            <Icon name="trash" className="w-4 h-4" /> Excluir
          </button>
          <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-green-600 dark:text-green-400" onClick={() => { handleDuplicate(); setContextMenu(null) }}>
            <Icon name="copy" className="w-4 h-4" /> Duplicar
          </button>
          <div className="border-t dark:border-gray-700 my-1"></div>
          <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-600 dark:text-gray-400" onClick={() => { handleReverse(); setContextMenu(null) }}>
            <Icon name="undo" className="w-4 h-4" /> Estornar
          </button>
        </div>
      )}

      {showReverseConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-sm rounded">
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded shadow-lg p-6 w-[300px] text-center">
            <h3 className="font-semibold text-lg mb-4 text-gray-800 dark:text-gray-100">Estornar Lançamento</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Deseja realmente estornar este lançamento? A ação será desfeita.</p>
            <div className="flex justify-center gap-3">
              <button
                className="px-4 py-2 rounded border hover:bg-gray-50 text-sm"
                onClick={() => setShowReverseConfirm(false)}
              >
                Não
              </button>
              <button
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 text-sm"
                onClick={confirmReverse}
              >
                Sim
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <TransactionModal
          onClose={() => {
            setShowModal(false)
            setEditingId(null)
          }}
          onSuccess={() => {
            setShowModal(false)
            setEditingId(null)
            load()
          }}
          initialData={editingId ? txs.find(t => t.id === editingId) : undefined}
          title={modalTitle}
        />
      )}
    </div>
  )
}
