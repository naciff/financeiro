import { useEffect, useState, useMemo } from 'react'
import { listAccounts, listTransactions, payTransaction, receiveTransaction, listClients, listCommitmentGroups, listCommitmentsByGroup, updateSchedule, reverseTransaction, updateTransaction, searchTransactions, getTransaction, deleteTransaction, updateFinancial, createFavorite } from '../services/db'
import { hasBackend } from '../lib/runtime'
import { useAppStore } from '../store/AppStore'
import { supabase } from '../lib/supabase'
import { Icon } from '../components/ui/Icon'
import { PageInfo } from '../components/ui/PageInfo'
import { formatMoneyBr } from '../utils/format'
import { TransactionModal } from '../components/modals/TransactionModal'

import { TransactionAttachments } from '../components/TransactionAttachments'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { AlertModal } from '../components/ui/AlertModal'
import { FloatingLabelSelect } from '../components/ui/FloatingLabelSelect'

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

  const [editingTx, setEditingTx] = useState<any>(null)

  // Delete Confirmation State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<any>(null)

  // Filtros Avançados
  const [filterMode, setFilterMode] = useState<'simple' | 'custom' | 'attachments'>('simple')
  const [dateFilterType, setDateFilterType] = useState<'payment' | 'launch'>('payment')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // New Alert Modal state
  const [alertModal, setAlertModal] = useState({ open: false, title: '', message: '' })
  const [showFavoriteConfirm, setShowFavoriteConfirm] = useState(false)

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
      if (!store.activeOrganization) {
        console.log('Ledger: skipping load, no active organization')
        return
      }
      const orgId = store.activeOrganization
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
      // status field removed
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
        r = await supabase.from('transactions').insert([{ user_id: userId, organization_id: store.activeOrganization, ...newTransaction }])
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
      setModalTitle('Carregando...') // Show loading state
      setShowModal(true)

      if (hasBackend) {
        getTransaction(tx.id).then(r => {
          if (r.data) {
            const fullTx = r.data
            setEditingTx(fullTx)
            setModalTitle('Editar Transação')
            // Only populate local form state as backup (TransactionModal uses initialData)
            setFormOperacao(fullTx.operacao)
            // ... other sets if needed for local logic, but TransactionModal is primary
          }
        })
      } else {
        // Local mode
        setEditingTx(tx)
        setModalTitle('Editar Transação')
      }
    } else {
      setModalTitle('Incluir Nova Transação')
      const today = new Date().toISOString().split('T')[0]
      setFormDataLancamento(today)
      setFormDataVencimento(today)
      setShowModal(true)
    }
  }

  function labelAccount(id: string) {
    const a = accounts.find(x => x.id === id)
    return a ? a.nome : id
  }
  function handleContextMenu(e: React.MouseEvent, tx: any) {
    if (e.ctrlKey || e.metaKey || e.shiftKey) return;
    e.preventDefault()
    setContextMenu({ x: e.pageX, y: e.pageY, tx })
  }

  async function handleDefineFavorite() {
    if (!contextMenu) return
    setShowFavoriteConfirm(true)
  }

  async function confirmFavorite() {
    if (!contextMenu) return
    const { tx } = contextMenu
    setShowFavoriteConfirm(false)
    setContextMenu(null)

    if (hasBackend && supabase) {
      const data = {
        organization_id: store.activeOrganization,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        operacao: tx.operacao,
        especie: tx.especie,
        cliente_id: tx.cliente_id,
        grupo_compromisso_id: tx.grupo_compromisso_id,
        compromisso_id: tx.compromisso_id,
        historico: tx.historico,
        detalhes: typeof tx.detalhes === 'object' ? JSON.stringify(tx.detalhes) : tx.detalhes,
        conta_id: tx.conta_id || tx.caixa_id,
        valor: tx.valor_entrada || tx.valor_saida || 0
      }

      const res = await createFavorite(data)
      if (res.error) {
        setAlertModal({ open: true, title: 'Erro', message: 'Erro ao salvar favorito: ' + res.error.message })
      } else {
        setAlertModal({ open: true, title: 'Sucesso', message: 'Favorito salvo com sucesso!' })
      }
    }
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


        // Restoration of Financial Item Status (if linked)
        if (tx.financial_id) {
          await updateFinancial(tx.financial_id, { situacao: 1 })
          console.log('Restored financial item status to 1:', tx.financial_id)
        }

        await load()
        setMsg('Transação estornada com sucesso')
      } else {
        if (scheduleId) {
          store.updateSchedule(scheduleId, { situacao: 1 })
        }

        // Fix for Offline/Fallback Mode: Restore Financial Status
        if (tx.financial_id) {
          console.log('Restoring financial item status (Offline/Store):', tx.financial_id)
          // If updateFinancial supports offline, use it, otherwise use store
          // store.updateFinancial(tx.financial_id, { situacao: 1 }) // Assuming store has this
          // For now, let's try calling the service function which might handle it or just log it
          await updateFinancial(tx.financial_id, { situacao: 1 })
        }

        store.deleteTransaction(tx.id)
        await load()
        setMsg('Transação estornada com sucesso')
      }
      setTimeout(() => setMsg(''), 3000)
    } catch (error: any) {
      setAlertModal({ open: true, title: 'Erro ao Estornar', message: error.message })
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

        // Safety check: Ensure fields are strings before calling toLowerCase
        const clientName = (typeof t.cliente === 'object' ? t.cliente?.nome : t.cliente) || ''
        const hist = (typeof t.historico === 'object' ? t.historico?.nome : t.historico) || '' // Historico usually string but be safe

        const matchText = String(clientName).toLowerCase().includes(term) || String(hist).toLowerCase().includes(term)
        const matchValue = !isNaN(valSearch) && (Math.abs((t.valor_entrada || 0) - valSearch) < 0.01 || Math.abs((t.valor_saida || 0) - valSearch) < 0.01)

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
      <div className="flex flex-col gap-2">
        {/* Row 1: Actions, Search, Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full">
          {/* Action Buttons */}
          <button
            className="flex items-center gap-2 bg-black text-white rounded px-3 py-2 text-xs md:text-sm transition-colors whitespace-nowrap"
            onClick={() => openModal()}
          >
            <Icon name="add" className="w-4 h-4" /> Incluir
          </button>

          <button
            className="flex items-center gap-2 bg-blue-600 text-white rounded px-3 py-2 disabled:opacity-50 text-xs md:text-sm transition-colors whitespace-nowrap"
            onClick={() => {
              const id = Array.from(selectedIds)[0]
              const tx = txs.find(t => t.id === id)
              if (tx) openModal(tx)
            }}
            disabled={selectedIds.size !== 1}
          >
            <Icon name="edit" className="w-4 h-4" /> Alterar
          </button>

          <button
            className="flex items-center gap-2 bg-red-600 text-white rounded px-3 py-2 disabled:opacity-50 text-xs md:text-sm transition-colors whitespace-nowrap"
            onClick={() => {
              const id = Array.from(selectedIds)[0]
              const tx = txs.find(t => t.id === id)
              if (tx) {
                // Check if item is linked to Schedule/Financial
                if (tx.financial_id || tx.agendamento_id || tx.schedule_id) {
                  setAlertModal({
                    open: true,
                    title: 'Atenção',
                    message: "Item de Agendamento e/ou Faturamento não pode ser excluído.\n\nEstorne e/ou Cancele o Item!!!"
                  })
                  return
                }

                setItemToDelete(tx)
                setShowDeleteConfirm(true)
              }
            }}
            disabled={selectedIds.size !== 1}
          >
            <Icon name="trash" className="w-4 h-4" /> Excluir
          </button>

          {/* Search Field - Grows to fill space */}
          <div className="flex-1 flex items-center gap-2 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded px-3 py-2 min-w-[200px]">
            <Icon name="search" className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <input
              className="outline-none w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 text-sm"
              placeholder="Buscar cliente, histórico ou valor"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <div className="min-w-[150px]">
              <FloatingLabelSelect
                label="Caixa"
                value={accountFilter}
                onChange={e => setAccountFilter(e.target.value)}
                bgColor="bg-background-light dark:bg-background-dark"
              >
                <option value="" className="dark:bg-gray-800">Todos</option>
                {accounts.map(acc => (
                  <option className="dark:bg-gray-800" key={acc.id} value={acc.id}>{acc.nome}</option>
                ))}
              </FloatingLabelSelect>
            </div>

            <div className="min-w-[200px]">
              <FloatingLabelSelect
                label="Tipo"
                value={opFilter}
                onChange={e => setOpFilter(e.target.value)}
                bgColor="bg-background-light dark:bg-background-dark"
              >
                <option value="Todas" className="dark:bg-gray-800">Todas</option>
                <option className="dark:bg-gray-800">Somente Receitas</option>
                <option className="dark:bg-gray-800">Somente Despesas</option>
                <option className="dark:bg-gray-800">Somente Aporte/Ret./Transf.</option>
                <option className="dark:bg-gray-800">Despesas e Retiradas</option>
                <option className="dark:bg-gray-800">Receitas e Aportes</option>
                <option className="dark:bg-gray-800">Somente Aporte</option>
                <option className="dark:bg-gray-800">Somente Retiradas</option>
                <option className="dark:bg-gray-800">Somente Transferências</option>
              </FloatingLabelSelect>
            </div>
          </div>

          {(searchTerm || accountFilter || opFilter !== 'Todas') && (
            <button
              className="text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border dark:border-gray-600 rounded px-3 py-2 text-gray-700 dark:text-gray-300 whitespace-nowrap"
              onClick={() => {
                setSearchTerm('')
                setAccountFilter('')
                setOpFilter('Todas')
              }}
            >
              Limpar
            </button>
          )}

          <PageInfo>
            Na tela de Livro Caixa, o usuário encontra o registro detalhado de todas as movimentações financeiras diárias, incluindo entradas e saídas.
          </PageInfo>
        </div>
      </div>

      {/* Filtros e Abas */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-2">
            <button
              className={`px-4 py-2 text-sm rounded transition-colors border ${filterMode === 'simple' ? 'bg-fourtek-blue text-white border-fourtek-blue' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
              onClick={() => { setFilterMode('simple'); load() }}
            >
              Movimentação
            </button>
            <button
              className={`px-4 py-2 text-sm rounded transition-colors border ${filterMode === 'custom' ? 'bg-fourtek-blue text-white border-fourtek-blue' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
              onClick={() => setFilterMode('custom')}
            >
              Personalizada
            </button>
            <button
              className={`px-4 py-2 text-sm rounded transition-colors border ${filterMode === 'attachments' ? 'bg-fourtek-blue text-white border-fourtek-blue' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
              onClick={() => setFilterMode('attachments')}
            >
              Comprovantes Digitalizados
            </button>
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

        {filterMode === 'simple' ? (
          <div className="flex overflow-x-auto border-b dark:border-gray-700">
            {months.map(m => {
              const val = m.toISOString().slice(0, 7)
              const label = m.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()
              const isSelected = selectedMonth === val
              return (
                <button
                  key={val}
                  className={`px-4 py-2 text-xs md:text-sm font-medium whitespace-nowrap border-r dark:border-gray-700 transition-all ${isSelected ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm border-t border-x border-gray-200 dark:border-gray-700 relative top-0.5 pb-2.5 z-10' : 'bg-gray-50 dark:bg-gray-900 text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}
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
                onClick={async () => {
                  if (startDate && startDate.length > 10) return setAlertModal({ open: true, title: 'Data Inválida', message: 'Data Inicial inválida. Verifique o ano.' })
                  if (endDate && endDate.length > 10) return setAlertModal({ open: true, title: 'Data Inválida', message: 'Data Final inválida. Verifique o ano.' })

                  setAppliedDates({ start: startDate, end: endDate })

                  if (hasBackend) {
                    const field = dateFilterType === 'payment' ? 'data_vencimento' : 'data_lancamento'
                    if (!store.activeOrganization) return
                    const res = await searchTransactions(startDate, endDate, field, store.activeOrganization)
                    if (res.data) setTxs(res.data)
                  }
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


      <div className={`flex gap-4 items-start ${filterMode === 'attachments' ? 'h-[calc(100vh-250px)]' : ''}`}>
        <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded text-gray-900 dark:text-gray-100 flex-1 h-full overflow-hidden flex flex-col">
          <div className="overflow-auto flex-1">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
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
        </div>

        {filterMode === 'attachments' && (
          <div className="w-[450px] h-full flex flex-col bg-white dark:bg-gray-800 border dark:border-gray-700 rounded overflow-hidden shadow-lg">
            <div className="p-2 bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600 font-medium text-sm flex justify-between items-center">
              <span>Comprovantes</span>
              {selectedIds.size === 0 && <span className="text-gray-400 text-xs font-normal">Selecione um item</span>}
            </div>
            <div className="flex-1 overflow-hidden">
              <TransactionAttachments
                transactionId={selectedIds.size === 1 ? Array.from(selectedIds)[0] : null}
                readOnly={false}
              />
            </div>
          </div>
        )}
      </div>

      {
        contextMenu && (
          <div
            className="fixed bg-white dark:bg-gray-800 border dark:border-gray-700 rounded shadow-xl z-50 py-1"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-yellow-600 dark:text-yellow-400" onClick={handleDefineFavorite}>
              <Icon name="star" className="w-4 h-4" /> Definir Item Lançamento Favorito
            </button>
            <div className="border-t dark:border-gray-700 my-1"></div>
            <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-blue-600 dark:text-blue-400" onClick={() => {
              const item = contextMenu.tx
              if (item) openModal(item)
              setContextMenu(null)
            }}>
              <Icon name="edit" className="w-4 h-4" /> Alterar
            </button>
            <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-red-600 dark:text-red-400" onClick={() => {
              const item = contextMenu.tx
              if (item.financial_id || item.agendamento_id || item.schedule_id) {
                setAlertModal({
                  open: true,
                  title: 'Atenção',
                  message: "Item de Agendamento e/ou Faturamento não pode ser excluído.\n\nEstorne e/ou Cancele o Item!!!"
                })
              } else {
                setItemToDelete(item)
                setShowDeleteConfirm(true)
              }
              setContextMenu(null)
            }}>
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
        )
      }

      {
        showReverseConfirm && (
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
        )
      }

      {
        showModal && (
          <TransactionModal
            onClose={() => {
              setShowModal(false)
              setEditingId(null)
              setEditingTx(null)
            }}
            onSuccess={() => {
              setShowModal(false)
              setEditingId(null)
              setEditingTx(null)
              load()
            }}
            initialData={editingTx}
            title={modalTitle}
          />
        )
      }


      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => { setShowDeleteConfirm(false); setItemToDelete(null) }}
        onConfirm={async () => {
          if (!itemToDelete) return
          setShowDeleteConfirm(false)

          if (hasBackend) {
            const r = await deleteTransaction(itemToDelete.id)
            if (r.error) setAlertModal({ open: true, title: 'Erro ao excluir', message: r.error.message })
            else {
              load()
              setMsg('Lançamento excluído com sucesso')
              setTimeout(() => setMsg(''), 3000)
            }
          } else {
            store.deleteTransaction(itemToDelete.id)
            load()
            setMsg('Lançamento excluído com sucesso')
            setTimeout(() => setMsg(''), 3000)
          }
          setSelectedIds(new Set())
          setItemToDelete(null)
        }}
        title="Excluir Lançamento"
        message="Deseja realmente excluir este lançamento manual?"
      />

      <ConfirmModal
        isOpen={showFavoriteConfirm}
        onClose={() => setShowFavoriteConfirm(false)}
        onConfirm={confirmFavorite}
        title="Salvar Favorito"
        message="Deseja salvar este lançamento como Favorito?"
      />

      <AlertModal
        isOpen={alertModal.open}
        title={alertModal.title}
        message={alertModal.message}
        onClose={() => setAlertModal({ ...alertModal, open: false })}
      />
    </div>
  )
}
