import { useEffect, useState } from 'react'
import { createAccount, listAccountBalances, listAccounts, deleteAccountValidated, setAccountPrincipal, updateAccountFields, getAccountById } from '../services/db'
import { hasBackend } from '../lib/runtime'
import { useAppStore } from '../store/AppStore'
import { Icon } from '../components/ui/Icon'

export default function Accounts() {
  const store = useAppStore()
  const [accounts, setAccounts] = useState<any[]>([])
  const [balances, setBalances] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState('banco')
  const [saldoInicial, setSaldoInicial] = useState<number>(0)
  const [observacoes, setObservacoes] = useState('')
  const [bancoCodigo, setBancoCodigo] = useState('')
  const [agencia, setAgencia] = useState('')
  const [conta, setConta] = useState('')
  const [errors] = useState<Record<string, string>>({})
  const [situacao, setSituacao] = useState<'ativo' | 'inativo'>('ativo')
  const [diaVencimento, setDiaVencimento] = useState<number | ''>('')
  const [diaBom, setDiaBom] = useState<number | ''>('')
  const [cor, setCor] = useState('#000000')
  const [principal, setPrincipal] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [editId, setEditId] = useState<string>('')
  const [editOpen, setEditOpen] = useState(false)
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | ''; text: string }>({ type: '', text: '' })

  const [selectedId, setSelectedId] = useState<string | null>(null)

  async function load() {
    if (hasBackend) {
      if (!store.activeOrganization) return
      const orgId = store.activeOrganization
      const a = await listAccounts(orgId)
      const b = await listAccountBalances(orgId)
      console.log('listAccounts', a)
      console.log('listAccountBalances', b)
      if (a.error) setNotice({ type: 'error', text: a.error.message })
      setAccounts(a.data || [])
      setBalances(b.data || [])
    } else {
      setAccounts(store.accounts)
      const bal = store.accounts.map(a => ({ account_id: a.id, saldo_atual: Number(a.saldo_inicial) + store.transactions.filter(t => t.conta_id === a.id && (t.status === 'pago' || t.status === 'recebido')).reduce((acc, t) => acc + (t.valor_entrada - t.valor_saida), 0) }))
      setBalances(bal)
    }
  }

  useEffect(() => { load() }, [store.activeOrganization])

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    console.log('Attempt create account', { nome, tipo, saldoInicial, bancoCodigo, agencia, conta, diaVencimento, diaBom })
    if (!nome.trim()) { setNotice({ type: 'error', text: 'Nome é obrigatório' }); return }
    if (!['banco', 'carteira', 'cartao'].includes(tipo)) { setNotice({ type: 'error', text: 'Tipo inválido' }); return }
    if (tipo === 'cartao' && !diaVencimento) { setNotice({ type: 'error', text: 'Dia de vencimento é obrigatório para Cartão' }); return }
    if (tipo === 'banco') {
      if (bancoCodigo && !/^\d{3}$/.test(bancoCodigo)) { setNotice({ type: 'error', text: 'Banco deve ter 3 dígitos' }); return }
      if (agencia && !/^\d{1,4}$/.test(agencia)) { setNotice({ type: 'error', text: 'Agência inválida (máx 4 dígitos)' }); return }
      if (conta && !/^\d{1,8}$/.test(conta)) { setNotice({ type: 'error', text: 'Conta inválida (máx 8 dígitos)' }); return }
    }
    if (hasBackend) {
      if (!store.activeOrganization) {
        setNotice({ type: 'error', text: 'Nenhuma empresa selecionada' })
        return
      }
      const r = await createAccount({ nome, tipo, saldo_inicial: saldoInicial, observacoes, banco_codigo: bancoCodigo ? bancoCodigo.trim() : null, agencia: agencia ? agencia.trim() : null, conta: conta ? conta.trim() : null, dia_vencimento: tipo === 'cartao' && diaVencimento ? Number(diaVencimento) : null, dia_bom: tipo === 'cartao' && diaBom ? Number(diaBom) : null, cor, principal, organization_id: store.activeOrganization })
      console.log('createAccount result', r)
      if ((r as any).error) {
        setNotice({ type: 'error', text: (r as any).error.message })
      } else {
        setNotice({ type: 'success', text: 'Conta criada com sucesso' })
      }
    } else {
      store.createAccount({ nome, tipo, saldo_inicial: saldoInicial, observacoes, banco_codigo: bancoCodigo || undefined, agencia: agencia || undefined, conta: conta || undefined, ativo: situacao === 'ativo', dia_vencimento: tipo === 'cartao' && diaVencimento ? Number(diaVencimento) : undefined, dia_bom: tipo === 'cartao' && diaBom ? Number(diaBom) : undefined, cor, principal })
      setNotice({ type: 'success', text: 'Conta criada com sucesso' })
    }
    setNome('')
    setSaldoInicial(0)
    setObservacoes('')
    setBancoCodigo('')
    setAgencia('')
    setConta('')
    setSituacao('ativo')
    setDiaVencimento('')
    setDiaBom('')
    setCor('#000000')
    setPrincipal(false)
    setShowForm(false)
    setDirty(false)
    await load()
  }

  async function openEdit(a: any) {
    console.log('Editar click', a?.id)
    setEditId(a.id)
    if (hasBackend) {
      const res = await getAccountById(a.id)
      console.log('getAccountById', res)
      if (res.error) { setNotice({ type: 'error', text: res.error.message }); return }
      const row: any = res.data
      setNome(row.nome); setTipo(row.tipo); setSaldoInicial(Number(row.saldo_inicial || 0))
      setObservacoes(row.observacoes || '')
      setBancoCodigo(row.banco_codigo || '')
      setAgencia(row.agencia || '')
      setConta(row.conta || '')
      setSituacao(row.ativo === false ? 'inativo' : 'ativo')
      setDiaVencimento(row.dia_vencimento ?? '')
      setDiaBom(row.dia_bom ?? '')
      setCor(row.cor || '#000000')
      setPrincipal(!!row.principal)
    } else {
      setNome(a.nome)
      setTipo(a.tipo)
      setSaldoInicial(Number(a.saldo_inicial || 0))
      setObservacoes(a.observacoes || '')
      setBancoCodigo(a.banco_codigo || '')
      setAgencia(a.agencia || '')
      setConta(a.conta || '')
      setSituacao(a.ativo === false ? 'inativo' : 'ativo')
      setDiaVencimento(a.dia_vencimento ?? '')
      setDiaBom(a.dia_bom ?? '')
      setCor(a.cor || '#000000')
      setPrincipal(!!a.principal)
    }
    setEditOpen(true)
  }

  async function handleToolbarEdit() {
    if (!selectedId) return
    const a = accounts.find(acc => acc.id === selectedId)
    if (a) await openEdit(a)
  }

  async function handleToolbarDelete() {
    if (!selectedId) return
    const a = accounts.find(acc => acc.id === selectedId)
    if (!a) return

    if (!confirm('Tem certeza que deseja excluir este registro de caixa?')) return
    console.log('Excluir click', a?.id)
    if (hasBackend) {
      deleteAccountValidated(a.id).then(r => {
        console.log('deleteAccountValidated', r)
        if ((r as any).error) setNotice({ type: 'error', text: (r as any).error.message })
        else { setNotice({ type: 'success', text: 'Registro excluído' }); setSelectedId(null); load() }
      })
    } else {
      const res = store.deleteAccount(a.id)
      if (!res.ok) setNotice({ type: 'error', text: res.reason || 'Falha ao excluir' })
      else { setNotice({ type: 'success', text: 'Registro excluído' }); setSelectedId(null); load() }
    }
  }

  function saveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editId) return
    if (tipo === 'banco') {
      if (bancoCodigo && !/^\d{3}$/.test(bancoCodigo)) { setNotice({ type: 'error', text: 'Banco deve ter 3 dígitos' }); return }
      if (agencia && !/^\d{1,4}$/.test(agencia)) { setNotice({ type: 'error', text: 'Agência inválida' }); return }
      if (conta && !/^\d{1,8}$/.test(conta)) { setNotice({ type: 'error', text: 'Conta inválida' }); return }
    }
    const patch: any = { nome, tipo, saldo_inicial: saldoInicial, observacoes, banco_codigo: bancoCodigo || undefined, agencia: agencia || null, conta: conta || null, ativo: situacao === 'ativo', dia_vencimento: tipo === 'cartao' ? (diaVencimento || null) : null, dia_bom: tipo === 'cartao' ? (diaBom || null) : null, cor, principal }
    if (hasBackend) {
      updateAccountFields(editId, patch).then(res => {
        console.log('updateAccountFields', res)
        if (res.error) setNotice({ type: 'error', text: res.error.message })
        else setNotice({ type: 'success', text: 'Registro atualizado com sucesso' })
        setEditOpen(false)
        setNome(''); setObservacoes(''); setBancoCodigo(''); setAgencia(''); setConta('')
        load()
      })
    } else {
      store.updateAccount(editId, patch)
      setNotice({ type: 'success', text: 'Registro atualizado com sucesso' })
      setEditOpen(false)
      setNome(''); setObservacoes(''); setBancoCodigo(''); setAgencia(''); setConta('')
      load()
    }
  }

  function maskAgencia(v: string) {
    return v.replace(/\D/g, '').slice(0, 4)
  }
  function maskConta(v: string) {
    return v.replace(/\D/g, '').slice(0, 8)
  }

  return (
    <div className="space-y-6">

      {notice.text && (
        <div className={`p-3 rounded border ${notice.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>{notice.text}</div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 w-full">
        {!showForm && (
          <button
            className="flex items-center gap-2 bg-black dark:bg-gray-900 text-white rounded px-3 py-2 hover:bg-gray-800 dark:hover:bg-black transition-colors"
            onClick={() => setShowForm(true)}
            aria-label="Inserir"
          >
            <Icon name="add" className="w-4 h-4" /> Incluir
          </button>
        )}

        <button
          className="flex items-center gap-2 bg-blue-600 text-white rounded px-3 py-2 disabled:opacity-50 transition-colors"
          disabled={!selectedId}
          onClick={handleToolbarEdit}
        >
          <Icon name="edit" className="w-4 h-4" /> Alterar
        </button>

        <button
          className="flex items-center gap-2 bg-red-600 text-white rounded px-3 py-2 disabled:opacity-50 transition-colors"
          disabled={!selectedId}
          onClick={handleToolbarDelete}
        >
          <Icon name="trash" className="w-4 h-4" /> Excluir
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Form Logic (Keep existing toggle behavior for now, usually it pushes grid down but user asked for toolbar. 
            The existing layout was grid-cols-2 with form on left/top. Let's keep it but toolbar controls visibility.) 
        */}
        {showForm && (
          <div className="col-span-1 md:col-span-2">
            <form onSubmit={onCreate} className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded p-4 space-y-3">
              <div className="font-medium text-gray-900 dark:text-gray-100">Nova conta</div>
              <label className="text-sm text-gray-700 dark:text-gray-300" htmlFor="tipo">Tipo</label>
              <select id="tipo" className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" value={tipo} onChange={e => { setTipo(e.target.value); setDirty(true) }}>
                <option value="banco">Banco</option>
                <option value="carteira">Carteira</option>
                <option value="cartao">Cartão</option>
              </select>
              {tipo === 'cartao' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-gray-700 dark:text-gray-300" htmlFor="dia_venc">Dia de Vencimento (DD)</label>
                    <input id="dia_venc" className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" inputMode="numeric" placeholder="DD" value={diaVencimento as any} onChange={e => {
                      const v = e.target.value.replace(/\D/g, '').slice(0, 2)
                      const n = v ? Math.max(1, Math.min(31, parseInt(v))) : ''
                      setDiaVencimento(n as any); setDirty(true)
                    }} />
                  </div>
                  <div>
                    <label className="text-sm text-gray-700 dark:text-gray-300" htmlFor="dia_bom">Dia BOM (DD)</label>
                    <input id="dia_bom" className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" inputMode="numeric" placeholder="DD" value={diaBom as any} onChange={e => {
                      const v = e.target.value.replace(/\D/g, '').slice(0, 2)
                      const n = v ? Math.max(1, Math.min(31, parseInt(v))) : ''
                      setDiaBom(n as any); setDirty(true)
                    }} />
                  </div>
                </div>
              )}
              <label className="text-sm text-gray-700 dark:text-gray-300" htmlFor="nome">Nome</label>
              <input id="nome" className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" value={nome} onChange={e => { setNome(e.target.value); setDirty(true) }} />
              <label className="text-sm text-gray-700 dark:text-gray-300" htmlFor="cor">Cor</label>
              <input id="cor" type="color" className="w-full h-10 border dark:border-gray-600 rounded px-1 py-1 bg-white dark:bg-gray-700" value={cor} onChange={e => { setCor(e.target.value); setDirty(true) }} />
              <label className="text-sm text-gray-700 dark:text-gray-300" htmlFor="principal">Conta Principal</label>
              <div className="flex items-center gap-2">
                <input id="principal" type="checkbox" checked={principal} onChange={e => { setPrincipal(e.target.checked); setDirty(true) }} />
                <span className="text-sm text-gray-600 dark:text-gray-400">Marcar como conta principal</span>
              </div>
              <label className="text-sm text-gray-700 dark:text-gray-300" htmlFor="situacao">Situação</label>
              <select id="situacao" className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" value={situacao} onChange={e => { setSituacao(e.target.value as any); setDirty(true) }}>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
              {tipo === 'banco' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-sm text-gray-700 dark:text-gray-300" htmlFor="banco_codigo">Banco (código)</label>
                    <input id="banco_codigo" className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" inputMode="numeric" pattern="[0-9]*" placeholder="000" value={bancoCodigo} onChange={e => { setBancoCodigo(e.target.value.replace(/\D/g, '').slice(0, 3)); setDirty(true) }} />
                  </div>
                  <div>
                    <label className="text-sm text-gray-700 dark:text-gray-300" htmlFor="agencia">Agência</label>
                    <input id="agencia" className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" inputMode="numeric" pattern="[0-9]*" placeholder="0000" value={agencia} onChange={e => { setAgencia(maskAgencia(e.target.value)); setDirty(true) }} />
                  </div>
                  <div>
                    <label className="text-sm text-gray-700 dark:text-gray-300" htmlFor="conta">Conta</label>
                    <input id="conta" className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" inputMode="numeric" pattern="[0-9]*" placeholder="00000000" value={conta} onChange={e => { setConta(maskConta(e.target.value)); setDirty(true) }} />
                  </div>
                </div>
              )}
              <label className="text-sm text-gray-700 dark:text-gray-300" htmlFor="saldo_inicial">Saldo inicial</label>
              <input id="saldo_inicial" className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" type="number" step="0.01" value={saldoInicial} onChange={e => { setSaldoInicial(parseFloat(e.target.value)); setDirty(true) }} />
              <label className="text-sm text-gray-700 dark:text-gray-300" htmlFor="observacoes">Observações</label>
              <input id="observacoes" className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" value={observacoes} onChange={e => { setObservacoes(e.target.value); setDirty(true) }} />
              <div className="flex justify-end gap-2">
                <button type="button" className="rounded border dark:border-gray-600 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200" onClick={() => {
                  if (dirty && !confirm('Cancelar alterações pendentes?')) return
                  setNome(''); setTipo('banco'); setSaldoInicial(0); setObservacoes(''); setBancoCodigo(''); setAgencia(''); setConta(''); setSituacao('ativo'); setDiaVencimento(''); setDiaBom(''); setCor('#000000'); setPrincipal(false); setDirty(false); setShowForm(false)
                }}>Cancelar</button>
                <button className="bg-black text-white rounded px-3 py-2 hover:bg-gray-800 dark:bg-gray-900 dark:hover:bg-black" type="submit">Salvar</button>
              </div>
            </form>
          </div>
        )}

        {/* Only show Saldos and Table usually... but in grid cols 2 they were side by side. 
            However, when showForm is true, they might reshuffle. original used `!showForm && ...` for button. 
            I'll keep Saldos and Table always visible or reflow them.
            Original structure:
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {!showForm && <div>Button</div>}
               {showForm && <form... />}
               <div>Saldos...</div>
            </div>
            <div>Table...</div>  <-- Table was outside the grid-cols-2? No wait.
            Line 244 in original was OUTSIDE the grid-cols-2 (Line 157).
            So form/saldos are top, table is bottom.
            Since I moved Toolbar UP, I should remove the `{!showForm && button}` logic from the grid.
        */}

        <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded p-4 h-fit">
          <div className="font-medium mb-2 text-gray-900 dark:text-gray-100">Saldos</div>
          {!hasBackend && accounts.length === 0 && (
            <div className="text-sm text-gray-600 dark:text-gray-400">Nenhuma conta cadastrada (modo local). Use "Incluir" para adicionar.</div>
          )}
          <ul className="space-y-2 text-gray-900 dark:text-gray-100">
            {balances
              .map(b => {
                const acct = accounts.find(a => a.id === b.account_id)
                return { ...b, nome: acct?.nome || b.account_id, ativo: acct?.ativo }
              })
              .filter(b => b.ativo !== false)
              .sort((a, b) => a.nome.localeCompare(b.nome))
              .map(b => (
                <li key={b.account_id} className="flex justify-between"><span>{b.nome}</span><span>R$ {Number(b.saldo_atual).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></li>
              ))}
          </ul>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded p-4">
        {/* <div className="font-medium mb-2 text-gray-900 dark:text-gray-100">Contas</div> --> REMOVED as requested */}
        <table className="w-full text-sm text-gray-900 dark:text-gray-100">
          <thead>
            <tr className="text-left">
              <th className="p-2">Nome</th>
              <th className="p-2">Banco</th>
              <th className="p-2">Agência</th>
              <th className="p-2">Conta</th>
              <th className="p-2">Tipo</th>
              <th className="p-2">Situação</th>
              <th className="p-2">Conta Principal</th>
              <th className="p-2">Data Vencimento</th>
              <th className="p-2">Dia Bom</th>
            </tr>
          </thead>
          <tbody>
            {accounts
              .sort((a, b) => a.nome.localeCompare(b.nome))
              .map(a => (
                <tr
                  key={a.id}
                  className={`border-t dark:border-gray-700 cursor-pointer ${a.ativo === false ? 'text-gray-400 dark:text-gray-500' : 'text-black dark:text-gray-100'} ${selectedId === a.id ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                  onClick={() => setSelectedId(selectedId === a.id ? null : a.id)}
                  onDoubleClick={() => { setSelectedId(a.id); openEdit(a) }}
                >
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: a.cor || '#000000' }}></div>
                      {a.nome}
                    </div>
                  </td>
                  <td className="p-2">{a.banco_codigo || '-'}</td>
                  <td className="p-2">{a.agencia || '-'}</td>
                  <td className="p-2">{a.conta || '-'}</td>
                  <td className="p-2">{a.tipo.charAt(0).toUpperCase() + a.tipo.slice(1).replace('cartao', 'Cartão')}</td>
                  <td className="p-2">{a.ativo === false ? 'Inativo' : 'Ativo'}</td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <input id="principal" type="checkbox" checked={!!a.principal}
                        onChange={async () => {
                          const next = !a.principal

                          if (hasBackend) {
                            const res = await setAccountPrincipal(a.id, next)
                            if (res.error) {
                              alert(res.error.message)
                            }
                            // Reload to get updated state from backend
                            await load()
                          } else {
                            // Local storage only
                            setAccounts(prev => prev.map(x => x.id === a.id ? { ...x, principal: next } : x))
                            store.updateAccount(a.id, { principal: next })
                          }
                        }}
                        aria-label={`Conta Principal ${a.nome}`} />
                    </div>
                  </td>
                  <td className="p-2">{a.tipo === 'cartao' ? (a.dia_vencimento ?? '-') : '-'}</td>
                  <td className="p-2">{a.tipo === 'cartao' ? (a.dia_bom ?? '-') : '-'}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {editOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditOpen(false)} aria-hidden="true"></div>
          <div className="absolute left-1/2 top-20 -translate-x-1/2 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded w-[90%] max-w-md p-4 max-h-[80vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="font-medium text-gray-900 dark:text-gray-100">Editar Conta</div>
              <button className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200" onClick={() => setEditOpen(false)}>Fechar</button>
            </div>
            <form onSubmit={saveEdit} className="space-y-3">
              <label className="text-sm text-gray-700 dark:text-gray-300">Tipo</label>
              <select className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" value={tipo} onChange={e => setTipo(e.target.value)}>
                <option value="banco">Banco</option>
                <option value="carteira">Carteira</option>
                <option value="cartao">Cartão</option>
              </select>
              {tipo === 'cartao' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-gray-700 dark:text-gray-300">Dia de Vencimento (DD)</label>
                    <input className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" inputMode="numeric" placeholder="DD" value={diaVencimento as any} onChange={e => {
                      const v = e.target.value.replace(/\D/g, '').slice(0, 2)
                      const n = v ? Math.max(1, Math.min(31, parseInt(v))) : ''
                      setDiaVencimento(n as any)
                    }} />
                  </div>
                  <div>
                    <label className="text-sm text-gray-700 dark:text-gray-300">Dia BOM (DD)</label>
                    <input className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" inputMode="numeric" placeholder="DD" value={diaBom as any} onChange={e => {
                      const v = e.target.value.replace(/\D/g, '').slice(0, 2)
                      const n = v ? Math.max(1, Math.min(31, parseInt(v))) : ''
                      setDiaBom(n as any)
                    }} />
                  </div>
                </div>
              )}
              <label className="text-sm text-gray-700 dark:text-gray-300">Nome</label>
              <input className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" value={nome} onChange={e => setNome(e.target.value)} />
              <label className="text-sm text-gray-700 dark:text-gray-300">Cor</label>
              <input type="color" className="w-full h-10 border dark:border-gray-600 rounded px-1 py-1 bg-white dark:bg-gray-700" value={cor} onChange={e => setCor(e.target.value)} />
              <label className="text-sm text-gray-700 dark:text-gray-300">Conta Principal</label>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={principal} onChange={e => setPrincipal(e.target.checked)} />
                <span className="text-sm text-gray-600 dark:text-gray-400">Marcar como conta principal</span>
              </div>
              <label className="text-sm text-gray-700 dark:text-gray-300">Situação</label>
              <select className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" value={situacao} onChange={e => setSituacao(e.target.value as any)}>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
              {tipo === 'banco' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-sm text-gray-700 dark:text-gray-300">Banco (código)</label>
                    <input className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" inputMode="numeric" pattern="[0-9]*" placeholder="000" value={bancoCodigo} onChange={e => setBancoCodigo(e.target.value.replace(/\D/g, '').slice(0, 3))} />
                  </div>
                  <div>
                    <label className="text-sm text-gray-700 dark:text-gray-300">Agência</label>
                    <input className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" inputMode="numeric" pattern="[0-9]*" placeholder="0000" value={agencia} onChange={e => setAgencia(maskAgencia(e.target.value))} />
                  </div>
                  <div>
                    <label className="text-sm text-gray-700 dark:text-gray-300">Conta</label>
                    <input className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" inputMode="numeric" pattern="[0-9]*" placeholder="00000000" value={conta} onChange={e => setConta(maskConta(e.target.value))} />
                  </div>
                </div>
              )}
              <label className="text-sm text-gray-700 dark:text-gray-300">Saldo inicial</label>
              <input className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" type="number" step="0.01" value={saldoInicial} onChange={e => setSaldoInicial(parseFloat(e.target.value))} />
              <label className="text-sm text-gray-700 dark:text-gray-300">Observações</label>
              <input className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" value={observacoes} onChange={e => setObservacoes(e.target.value)} />
              <div className="flex justify-end gap-2">
                <button type="button" className="rounded border dark:border-gray-600 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200" onClick={() => setEditOpen(false)}>Cancelar</button>
                <button className="bg-black text-white rounded px-3 py-2 hover:bg-gray-800 dark:bg-gray-900 dark:hover:bg-black" type="submit">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
