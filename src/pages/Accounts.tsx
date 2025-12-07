import { useEffect, useState } from 'react'
import { createAccount, listAccountBalances, listAccounts, deleteAccountValidated, setAccountPrincipal, updateAccountFields, getAccountById } from '../services/db'
import { hasBackend } from '../lib/runtime'
import { useAppStore } from '../store/AppStore'

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
  const [cor, setCor] = useState('#000000')
  const [principal, setPrincipal] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [editId, setEditId] = useState<string>('')
  const [editOpen, setEditOpen] = useState(false)
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | ''; text: string }>({ type: '', text: '' })

  async function load() {
    if (hasBackend) {
      const a = await listAccounts()
      const b = await listAccountBalances()
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

  useEffect(() => { load() }, [])

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    console.log('Attempt create account', { nome, tipo, saldoInicial, bancoCodigo, agencia, conta, diaVencimento })
    if (!nome.trim()) { setNotice({ type: 'error', text: 'Nome é obrigatório' }); return }
    if (!['banco', 'carteira', 'cartao'].includes(tipo)) { setNotice({ type: 'error', text: 'Tipo inválido' }); return }
    if (tipo === 'cartao' && !diaVencimento) { setNotice({ type: 'error', text: 'Dia de vencimento é obrigatório para Cartão' }); return }
    if (tipo === 'banco') {
      if (bancoCodigo && !/^\d{3}$/.test(bancoCodigo)) { setNotice({ type: 'error', text: 'Banco deve ter 3 dígitos' }); return }
      if (agencia && !/^\d{5}$/.test(agencia)) { setNotice({ type: 'error', text: 'Agência deve ter 5 dígitos' }); return }
      if (conta && !/^\d{6}$/.test(conta)) { setNotice({ type: 'error', text: 'Conta deve ter 6 dígitos' }); return }
    }
    if (hasBackend) {
      const r = await createAccount({ nome, tipo, saldo_inicial: saldoInicial, observacoes, banco_codigo: bancoCodigo ? bancoCodigo.trim() : null, agencia: agencia && /^\d{5}$/.test(agencia) ? agencia.trim() : null, conta: conta && /^\d{6}$/.test(conta) ? conta.trim() : null, dia_vencimento: tipo === 'cartao' && diaVencimento ? Number(diaVencimento) : null, cor, principal })
      console.log('createAccount result', r)
      if ((r as any).error) {
        setNotice({ type: 'error', text: (r as any).error.message })
      } else {
        setNotice({ type: 'success', text: 'Conta criada com sucesso' })
      }
    } else {
      store.createAccount({ nome, tipo, saldo_inicial: saldoInicial, observacoes, banco_codigo: bancoCodigo || undefined, agencia: agencia || undefined, conta: conta || undefined, ativo: situacao === 'ativo', dia_vencimento: tipo === 'cartao' && diaVencimento ? Number(diaVencimento) : undefined, cor, principal })
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
      setCor(a.cor || '#000000')
      setPrincipal(!!a.principal)
    }
    setEditOpen(true)
  }
  function saveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editId) return
    if (tipo === 'banco') {
      if (bancoCodigo && !/^\d{3}$/.test(bancoCodigo)) { setNotice({ type: 'error', text: 'Banco deve ter 3 dígitos' }); return }
      if (agencia && !/^\d{5}$/.test(agencia)) { setNotice({ type: 'error', text: 'Agência deve ter 5 dígitos' }); return }
      if (conta && !/^\d{6}$/.test(conta)) { setNotice({ type: 'error', text: 'Conta deve ter 6 dígitos' }); return }
    }
    const patch: any = { nome, tipo, saldo_inicial: saldoInicial, observacoes, banco_codigo: bancoCodigo || undefined, agencia: agencia && /^\d{5}$/.test(agencia) ? agencia : null, conta: conta && /^\d{6}$/.test(conta) ? conta : null, ativo: situacao === 'ativo', dia_vencimento: tipo === 'cartao' ? (diaVencimento || null) : null, cor, principal }
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
    return v.replace(/\D/g, '').slice(0, 5)
  }
  function maskConta(v: string) {
    return v.replace(/\D/g, '').slice(0, 6)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Contas</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {!showForm && (
          <div className="bg-white border rounded p-4">
            <button className="bg-black text-white rounded px-3 py-2" onClick={() => setShowForm(true)} aria-label="Inserir">Incluir</button>
          </div>
        )}
        {showForm && (
          <form onSubmit={onCreate} className="bg-white border rounded p-4 space-y-3">
            <div className="font-medium">Nova conta</div>
            <label className="text-sm" htmlFor="tipo">Tipo</label>
            <select id="tipo" className="w-full border rounded px-3 py-2" value={tipo} onChange={e => { setTipo(e.target.value); setDirty(true) }}>
              <option value="banco">Banco</option>
              <option value="carteira">Carteira</option>
              <option value="cartao">Cartão</option>
            </select>
            {tipo === 'cartao' && (
              <div>
                <label className="text-sm" htmlFor="dia_venc">Data de vencimento (DD)</label>
                <input id="dia_venc" className="w-full border rounded px-3 py-2" inputMode="numeric" placeholder="DD" value={diaVencimento as any} onChange={e => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 2)
                  const n = v ? Math.max(1, Math.min(31, parseInt(v))) : ''
                  setDiaVencimento(n as any); setDirty(true)
                }} />
              </div>
            )}
            <label className="text-sm" htmlFor="nome">Nome</label>
            <input id="nome" className="w-full border rounded px-3 py-2" value={nome} onChange={e => { setNome(e.target.value); setDirty(true) }} />
            <label className="text-sm" htmlFor="cor">Cor</label>
            <input id="cor" type="color" className="w-full h-10 border rounded px-1 py-1" value={cor} onChange={e => { setCor(e.target.value); setDirty(true) }} />
            <label className="text-sm" htmlFor="principal">Conta Principal</label>
            <div className="flex items-center gap-2">
              <input id="principal" type="checkbox" checked={principal} onChange={e => { setPrincipal(e.target.checked); setDirty(true) }} />
              <span className="text-sm text-gray-600">Marcar como conta principal</span>
            </div>
            <label className="text-sm" htmlFor="situacao">Situação</label>
            <select id="situacao" className="w-full border rounded px-3 py-2" value={situacao} onChange={e => { setSituacao(e.target.value as any); setDirty(true) }}>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
            {tipo === 'banco' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm" htmlFor="banco_codigo">Banco (código)</label>
                  <input id="banco_codigo" className="w-full border rounded px-3 py-2" inputMode="numeric" pattern="[0-9]*" placeholder="000" value={bancoCodigo} onChange={e => { setBancoCodigo(e.target.value.replace(/\D/g, '').slice(0, 3)); setDirty(true) }} />
                </div>
                <div>
                  <label className="text-sm" htmlFor="agencia">Agência</label>
                  <input id="agencia" className="w-full border rounded px-3 py-2" inputMode="numeric" pattern="[0-9]*" placeholder="00000" value={agencia} onChange={e => { setAgencia(maskAgencia(e.target.value)); setDirty(true) }} />
                </div>
                <div>
                  <label className="text-sm" htmlFor="conta">Conta</label>
                  <input id="conta" className="w-full border rounded px-3 py-2" inputMode="numeric" pattern="[0-9]*" placeholder="000000" value={conta} onChange={e => { setConta(maskConta(e.target.value)); setDirty(true) }} />
                </div>
              </div>
            )}
            <label className="text-sm" htmlFor="saldo_inicial">Saldo inicial</label>
            <input id="saldo_inicial" className="w-full border rounded px-3 py-2" type="number" step="0.01" value={saldoInicial} onChange={e => { setSaldoInicial(parseFloat(e.target.value)); setDirty(true) }} />
            <label className="text-sm" htmlFor="observacoes">Observações</label>
            <input id="observacoes" className="w-full border rounded px-3 py-2" value={observacoes} onChange={e => { setObservacoes(e.target.value); setDirty(true) }} />
            <div className="flex justify-end gap-2">
              <button type="button" className="rounded border px-3 py-2" onClick={() => {
                if (dirty && !confirm('Cancelar alterações pendentes?')) return
                setNome(''); setTipo('banco'); setSaldoInicial(0); setObservacoes(''); setBancoCodigo(''); setAgencia(''); setConta(''); setSituacao('ativo'); setDiaVencimento(''); setCor('#000000'); setPrincipal(false); setDirty(false); setShowForm(false)
              }}>Cancelar</button>
              <button className="bg-black text-white rounded px-3 py-2" type="submit">Salvar</button>
            </div>
          </form>
        )}
        <div className="bg-white border rounded p-4">
          <div className="font-medium mb-2">Saldos</div>
          {!hasBackend && accounts.length === 0 && (
            <div className="text-sm text-gray-600">Nenhuma conta cadastrada (modo local). Use "Incluir" para adicionar.</div>
          )}
          <ul className="space-y-2">
            {balances
              .map(b => ({ ...b, nome: accounts.find(a => a.id === b.account_id)?.nome || b.account_id }))
              .sort((a, b) => a.nome.localeCompare(b.nome))
              .map(b => (
                <li key={b.account_id} className="flex justify-between"><span>{b.nome}</span><span>R$ {Number(b.saldo_atual).toFixed(2)}</span></li>
              ))}
          </ul>
        </div>
      </div>
      <div className="bg-white border rounded p-4">
        <div className="font-medium mb-2">Contas</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="p-2">Nome</th>
              <th className="p-2">Tipo</th>
              <th className="p-2">Situação</th>
              <th className="p-2">Conta Principal</th>
              <th className="p-2">Data Vencimento</th>
              <th className="p-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {accounts
              .sort((a, b) => a.nome.localeCompare(b.nome))
              .map(a => (
                <tr key={a.id} className={`border-t cursor-pointer hover:bg-gray-50 ${a.ativo === false ? 'text-gray-400' : 'text-black'}`} onDoubleClick={() => openEdit(a)}>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: a.cor || '#000000' }}></div>
                      {a.nome}
                    </div>
                  </td>
                  <td className="p-2">{a.tipo.charAt(0).toUpperCase() + a.tipo.slice(1).replace('cartao', 'Cartão')}</td>
                  <td className="p-2">{a.ativo === false ? 'Inativo' : 'Ativo'}</td>
                  <td className="p-2">
                    <input type="checkbox" checked={!!a.principal}
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
                  </td>
                  <td className="p-2">{a.tipo === 'cartao' ? (a.dia_vencimento ?? '-') : '-'}</td>
                  <td className="p-2 flex gap-2">
                    <button className="px-2 py-1 rounded border hover:bg-gray-50" onClick={() => openEdit(a)} aria-label={`Editar ${a.nome}`}>Editar</button>
                    <button className="px-2 py-1 rounded border hover:bg-gray-50" onClick={() => {
                      if (!confirm('Tem certeza que deseja excluir este registro de caixa?')) return
                      console.log('Excluir click', a?.id)
                      if (hasBackend) {
                        deleteAccountValidated(a.id).then(r => {
                          console.log('deleteAccountValidated', r)
                          if ((r as any).error) setNotice({ type: 'error', text: (r as any).error.message })
                          else { setNotice({ type: 'success', text: 'Registro excluído' }); load() }
                        })
                      } else {
                        const res = store.deleteAccount(a.id)
                        if (!res.ok) setNotice({ type: 'error', text: res.reason || 'Falha ao excluir' })
                        else { setNotice({ type: 'success', text: 'Registro excluído' }); load() }
                      }
                    }} aria-label={`Excluir ${a.nome}`}>Excluir</button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {notice.text && (
        <div className={`mt-3 ${notice.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>{notice.text}</div>
      )}
      {editOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditOpen(false)} aria-hidden="true"></div>
          <div className="absolute left-1/2 top-20 -translate-x-1/2 bg-white border rounded w-[90%] max-w-md p-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="font-medium">Editar Conta</div>
              <button onClick={() => setEditOpen(false)}>Fechar</button>
            </div>
            <form onSubmit={saveEdit} className="space-y-3">
              <label className="text-sm">Tipo</label>
              <select className="w-full border rounded px-3 py-2" value={tipo} onChange={e => setTipo(e.target.value)}>
                <option value="banco">Banco</option>
                <option value="carteira">Carteira</option>
                <option value="cartao">Cartão</option>
              </select>
              {tipo === 'cartao' && (
                <div>
                  <label className="text-sm">Data de vencimento (DD)</label>
                  <input className="w-full border rounded px-3 py-2" inputMode="numeric" placeholder="DD" value={diaVencimento as any} onChange={e => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 2)
                    const n = v ? Math.max(1, Math.min(31, parseInt(v))) : ''
                    setDiaVencimento(n as any)
                  }} />
                </div>
              )}
              <label className="text-sm">Nome</label>
              <input className="w-full border rounded px-3 py-2" value={nome} onChange={e => setNome(e.target.value)} />
              <label className="text-sm">Cor</label>
              <input type="color" className="w-full h-10 border rounded px-1 py-1" value={cor} onChange={e => setCor(e.target.value)} />
              <label className="text-sm">Conta Principal</label>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={principal} onChange={e => setPrincipal(e.target.checked)} />
                <span className="text-sm text-gray-600">Marcar como conta principal</span>
              </div>
              <label className="text-sm">Situação</label>
              <select className="w-full border rounded px-3 py-2" value={situacao} onChange={e => setSituacao(e.target.value as any)}>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
              {tipo === 'banco' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-sm">Banco (código)</label>
                    <input className="w-full border rounded px-3 py-2" inputMode="numeric" pattern="[0-9]*" placeholder="000" value={bancoCodigo} onChange={e => setBancoCodigo(e.target.value.replace(/\D/g, '').slice(0, 3))} />
                  </div>
                  <div>
                    <label className="text-sm">Agência</label>
                    <input className="w-full border rounded px-3 py-2" inputMode="numeric" pattern="[0-9]*" placeholder="00000" value={agencia} onChange={e => setAgencia(maskAgencia(e.target.value))} />
                  </div>
                  <div>
                    <label className="text-sm">Conta</label>
                    <input className="w-full border rounded px-3 py-2" inputMode="numeric" pattern="[0-9]*" placeholder="000000" value={conta} onChange={e => setConta(maskConta(e.target.value))} />
                  </div>
                </div>
              )}
              <label className="text-sm">Saldo inicial</label>
              <input className="w-full border rounded px-3 py-2" type="number" step="0.01" value={saldoInicial} onChange={e => setSaldoInicial(parseFloat(e.target.value))} />
              <label className="text-sm">Observações</label>
              <input className="w-full border rounded px-3 py-2" value={observacoes} onChange={e => setObservacoes(e.target.value)} />
              <div className="flex justify-end gap-2">
                <button type="button" className="rounded border px-3 py-2" onClick={() => setEditOpen(false)}>Cancelar</button>
                <button className="bg-black text-white rounded px-3 py-2" type="submit">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
