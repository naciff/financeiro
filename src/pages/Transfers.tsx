import { useEffect, useState } from 'react'
import { listAccounts, transfer } from '../services/db'
import { hasBackend } from '../lib/runtime'
import { useAppStore } from '../store/AppStore'

export default function Transfers() {
  const store = useAppStore()
  const [accounts, setAccounts] = useState<any[]>([])
  const [source, setSource] = useState<string>('')
  const [dest, setDest] = useState<string>('')
  const [amount, setAmount] = useState<number>(0)
  const [date, setDate] = useState<string>('')
  const [descricao, setDescricao] = useState('')
  const [result, setResult] = useState<string>('')

  useEffect(() => {
    if (hasBackend) listAccounts().then(r => setAccounts(r.data || []))
    else setAccounts(store.accounts)

    // Set default date to today
    const today = new Date().toISOString().split('T')[0]
    setDate(today)
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (hasBackend) {
      const r = await transfer({ source, dest, amount, date, descricao })
      if (r.error) setResult(r.error.message)
      else setResult('OK')
    } else {
      store.transfer(source, dest, amount, date, descricao)
      setResult('OK')
    }
    setAmount(0)
    setDescricao('')
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Transferências</h1>
      <form onSubmit={onSubmit} className="bg-white border rounded p-4 space-y-3 max-w-xl">
        <div>
          <label className="block text-sm font-medium mb-1">Conta de Origem</label>
          <select className="w-full border rounded px-3 py-2" value={source} onChange={e => setSource(e.target.value)}>
            <option value="">Selecione a conta de origem</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Conta de Destino</label>
          <select className="w-full border rounded px-3 py-2" value={dest} onChange={e => setDest(e.target.value)}>
            <option value="">Selecione a conta de destino</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Valor</label>
          <input className="w-full border rounded px-3 py-2" type="number" step="0.01" placeholder="0,00" value={amount} onChange={e => setAmount(parseFloat(e.target.value))} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Data</label>
          <input className="w-full border rounded px-3 py-2" type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Descrição</label>
          <input className="w-full border rounded px-3 py-2" placeholder="Ex: Transferência para Poupança" value={descricao} onChange={e => setDescricao(e.target.value)} />
        </div>
        <button className="bg-black text-white rounded px-3 py-2">Transferir</button>
        {result && <div className="text-sm">{result}</div>}
      </form>
    </div>
  )
}
