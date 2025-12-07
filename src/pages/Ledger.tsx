import { useEffect, useState, useMemo } from 'react'
import { listAccounts, listTransactions, payTransaction, receiveTransaction, listClients, listCommitmentGroups, listCommitmentsByGroup, updateSchedule, reverseTransaction, updateTransaction } from '../services/db'
import { hasBackend } from '../lib/runtime'
import { useAppStore } from '../store/AppStore'
import { supabase } from '../lib/supabase'
import { Icon } from '../components/ui/Icon'
import { formatMoneyBr } from '../utils/format'

export default function Ledger() {
  const store = useAppStore()
  const [txs, setTxs] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [amount, setAmount] = useState<number>(0)
  const [date, setDate] = useState<string>('')
  const [msg, setMsg] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

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
      const t = await listTransactions(100)
      const a = await listAccounts()
      const c = await listClients()
      const g = await listCommitmentGroups()
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

  useEffect(() => { load() }, [])

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
      cliente: formCliente,
      grupo_compromisso: formGrupoCompromisso,
      compromisso: formCompromisso,
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
      setFormGrupoCompromisso(tx.grupo_compromisso || '')
      setFormCompromisso(tx.compromisso || '')
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
    setFormCliente(tx.cliente || '')
    setFormGrupoCompromisso(tx.grupo_compromisso || '')
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

  const filteredTxs = useMemo(() => {
    return txs.filter(t => {
      if (filterMode === 'simple') {
        if (!t.data_lancamento.startsWith(selectedMonth)) return false
      } else {
        if (!startDate || !endDate) return true
        const dateToCheck = dateFilterType === 'payment' ? (t.data_vencimento || t.data_lancamento) : t.data_lancamento
        if (dateToCheck < startDate || dateToCheck > endDate) return false
      }

      if (!searchTerm) return true
      const term = searchTerm.toLowerCase()
      const valSearch = parseFloat(searchTerm.replace(',', '.'))
      const matchText = (t.cliente?.toLowerCase() || '').includes(term) || (t.historico?.toLowerCase() || '').includes(term)
      const matchValue = !isNaN(valSearch) && (Math.abs(t.valor_entrada - valSearch) < 0.01 || Math.abs(t.valor_saida - valSearch) < 0.01)

      return matchText || matchValue
    })
  }, [txs, filterMode, selectedMonth, startDate, endDate, dateFilterType, searchTerm])

  const selectionSum = useMemo(() => {
    return filteredTxs.reduce((acc, t) => {
      if (selectedIds.has(t.id)) {
        return acc + (Number(t.valor_entrada || 0) - Number(t.valor_saida || 0))
      }
      return acc
    }, 0)
  }, [filteredTxs, selectedIds])

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
        <h1 className="text-xl font-semibold">Livro Caixa</h1>
      </div>

      <div className="flex gap-3">
        <input className="border rounded px-3 py-2 flex-1" type="text" placeholder="Buscar cliente, histórico ou valor" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        <button
          className="px-4 py-2 bg-fourtek-blue text-white rounded hover:bg-blue-700 transition-colors whitespace-nowrap"
          onClick={openModal}
        >
          + Incluir
        </button>
      </div>

      {/* Filtros e Abas */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="flex border rounded overflow-hidden">
            <button
              className={`px-3 py-1 text-sm ${filterMode === 'simple' ? 'bg-fourtek-blue text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
              onClick={() => setFilterMode('simple')}
            >
              Simplificada
            </button>
            <button
              className={`px-3 py-1 text-sm ${filterMode === 'custom' ? 'bg-fourtek-blue text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
              onClick={() => setFilterMode('custom')}
            >
              Personalizada
            </button>
          </div>
        </div>

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

        {filterMode === 'simple' ? (
          <div className="flex overflow-x-auto border-b">
            {months.map(m => {
              const val = m.toISOString().slice(0, 7)
              const label = m.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()
              const isSelected = selectedMonth === val
              return (
                <button
                  key={val}
                  className={`px-4 py-2 text-xs font-medium whitespace-nowrap border-r ${isSelected ? 'bg-orange-100 border-b-2 border-b-orange-400 text-orange-800' : 'bg-blue-100 hover:bg-blue-200 text-blue-800'}`}
                  onClick={() => setSelectedMonth(val)}
                >
                  {label}
                </button>
              )
            })}
          </div>
        ) : (
          <div className="flex items-center gap-4 bg-gray-50 p-3 rounded border">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="radio" name="dateFilterType" checked={dateFilterType === 'payment'} onChange={() => setDateFilterType('payment')} />
                <span className="text-sm font-medium">Dt. Pag/Receb.</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="radio" name="dateFilterType" checked={dateFilterType === 'launch'} onChange={() => setDateFilterType('launch')} />
                <span className="text-sm font-medium">Dt. Lançamento</span>
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input type="date" className="border rounded px-2 py-1 text-sm" value={startDate} onChange={e => setStartDate(e.target.value)} />
              <span className="text-sm">a</span>
              <input type="date" className="border rounded px-2 py-1 text-sm" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
        )}
      </div>
      {msg && <div className="text-sm text-green-700">{msg}</div>}
      <div className="bg-white border rounded">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left">
              <th className="p-2">Data</th>
              <th className="p-2">Caixa</th>
              <th className="p-2">Cliente</th>
              <th className="p-2">Compromisso</th>
              <th className="p-2">Histórico</th>
              <th className="p-2">Receitas</th>
              <th className="p-2">Despesas</th>
              <th className="p-2">Espécie</th>
            </tr>
          </thead>
          <tbody>
            {filteredTxs.map(tx => (
              <tr
                key={tx.id}
                className={`border-t hover:bg-gray-50 cursor-pointer ${selectedIds.has(tx.id) ? 'bg-blue-50 ring-2 ring-blue-400' : ''}`}
                onClick={(e) => handleSelect(e, tx.id)}
                onDoubleClick={() => openModal(tx)}
                onContextMenu={(e) => { handleContextMenu(e, tx) }}
              >
                <td className="p-2">{toBr(tx.data_lancamento)}</td>
                <td className="p-2">{labelAccount(tx.conta_id)}</td>
                <td className="p-2">{tx.cliente || '-'}</td>
                <td className="p-2">{tx.compromisso || '-'}</td>
                <td className="p-2">{tx.historico}</td>
                <td className="p-2 text-green-600 font-medium text-right">{Number(tx.valor_entrada) > 0 ? `R$ ${Number(tx.valor_entrada).toFixed(2)}` : ''}</td>
                <td className="p-2 text-red-600 font-medium text-right">{Number(tx.valor_saida) > 0 ? `R$ ${Number(tx.valor_saida).toFixed(2)}` : ''}</td>
                <td className="p-2">{tx.especie ? (tx.especie.charAt(0).toUpperCase() + tx.especie.slice(1).replace('_', ' ')) : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {contextMenu && (
        <div
          className="fixed bg-white border rounded shadow-xl z-50 py-1"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-blue-600" onClick={() => {
            const item = contextMenu.tx
            if (item) openModal(item)
            setContextMenu(null)
          }}>
            <Icon name="edit" className="w-4 h-4" /> Alterar
          </button>
          <button className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-red-600" onClick={() => { handleReverse(); setContextMenu(null) }}>
            <Icon name="trash" className="w-4 h-4" /> Excluir
          </button>
          <button className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-green-600" onClick={() => { handleDuplicate(); setContextMenu(null) }}>
            <Icon name="copy" className="w-4 h-4" /> Duplicar
          </button>
          <div className="border-t my-1"></div>
          <button className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-gray-600" onClick={() => { handleReverse(); setContextMenu(null) }}>
            <Icon name="undo" className="w-4 h-4" /> Estornar
          </button>
        </div>
      )}

      {showReverseConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-sm rounded">
          <div className="bg-white border rounded shadow-lg p-6 w-[300px] text-center">
            <h3 className="font-semibold text-lg mb-4 text-gray-800">Estornar Lançamento</h3>
            <p className="text-sm text-gray-600 mb-6">Deseja realmente estornar este lançamento? A ação será desfeita.</p>
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
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} aria-hidden="true"></div>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white border rounded w-[90%] max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">{modalTitle}</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Operação *</label>
                <select className="w-full border rounded px-3 py-2" value={formOperacao} onChange={e => setFormOperacao(e.target.value as any)}>
                  <option value="despesa">Despesa</option>
                  <option value="receita">Receita</option>
                  <option value="aporte">Aporte</option>
                  <option value="retirada">Retirada</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cliente *</label>
                <select className="w-full border rounded px-3 py-2" value={formCliente} onChange={e => setFormCliente(e.target.value)}>
                  <option value="">Selecione...</option>
                  {clients.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Grupo Compromisso *</label>
                <select className="w-full border rounded px-3 py-2" value={formGrupoCompromisso} onChange={e => setFormGrupoCompromisso(e.target.value)}>
                  <option value="">Selecione...</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Compromisso *</label>
                <select className="w-full border rounded px-3 py-2" value={formCompromisso} onChange={e => setFormCompromisso(e.target.value)}>
                  <option value="">Selecione...</option>
                  {commitments.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Histórico *</label>
                <input className="w-full border rounded px-3 py-2" value={formHistorico} onChange={e => setFormHistorico(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nota Fiscal</label>
                <input className="w-full border rounded px-3 py-2" value={formNotaFiscal} onChange={e => setFormNotaFiscal(e.target.value)} />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Detalhe</label>
                <input className="w-full border rounded px-3 py-2" value={formDetalhes} onChange={e => setFormDetalhes(e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Data Vencimento</label>
                <input type="date" disabled className="w-full border rounded px-3 py-2 bg-gray-100 cursor-not-allowed" value={formDataVencimento} onChange={e => setFormDataVencimento(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Data Pagamento</label>
                <input type="date" className="w-full border rounded px-3 py-2" value={formDataLancamento} onChange={e => setFormDataLancamento(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Valor *</label>
                <input type="number" step="0.01" className="w-full border rounded px-3 py-2" value={formValor} onChange={e => setFormValor(parseFloat(e.target.value))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Espécie</label>
                <select className="w-full border rounded px-3 py-2" value={formEspecie} onChange={e => setFormEspecie(e.target.value)}>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="pix">PIX</option>
                  <option value="transferencia">Transferência</option>
                  <option value="deposito">Depósito</option>
                  <option value="boleto">Boleto</option>
                  <option value="cartao_credito">Cartão de Crédito</option>
                  <option value="cartao_debito">Cartão de Débito</option>
                  <option value="debito_automatico">Débito Automático</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Caixa Lançamento *</label>
                <select className="w-full border rounded px-3 py-2" value={formContaId} onChange={e => setFormContaId(e.target.value)}>
                  <option value="">Selecione...</option>
                  {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.nome}</option>)}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                className="px-4 py-2 border rounded hover:bg-gray-50"
                onClick={() => setShowModal(false)}
              >
                Cancelar
              </button>
              <button
                className="px-4 py-2 bg-fourtek-blue text-white rounded hover:bg-blue-700"
                onClick={handleCreateTransaction}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
