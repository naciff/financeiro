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
    if (hasBackend) {
      const orgId = store.activeOrganization || ''
      listAccounts(orgId).then(r => setAccounts(r.data || []))
    }
    else setAccounts(store.accounts)

    // Set default date to today
    const today = new Date().toISOString().split('T')[0]
    setDate(today)
  }, [store.activeOrganization])

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
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Transferências</h1>
      <form onSubmit={onSubmit} className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded p-4 space-y-3 max-w-xl">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Conta de Origem</label>
          <select
            className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            value={source}
            onChange={e => setSource(e.target.value)}
          >
            <option value="">Selecione a conta de origem</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Conta de Destino</label>
          <select
            className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            value={dest}
            onChange={e => setDest(e.target.value)}
          >
            <option value="">Selecione a conta de destino</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Valor</label>
          <input
            className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            type="number"
            step="0.01"
            value={amount}
            onChange={e => {
              const val = e.target.value;
              const truncated = val.includes('.') ? val.split('.')[0] + '.' + val.split('.')[1].slice(0, 2) : val;
              setAmount(parseFloat(truncated) || 0);
            }}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Data</label>
          <input
            className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Descrição</label>
          <input
            className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            placeholder="Ex: Transferência para Poupança"
            value={descricao}
            onChange={e => setDescricao(e.target.value)}
          />
        </div>
        <button className="bg-black dark:bg-gray-900 text-white rounded px-3 py-2 hover:bg-gray-800 dark:hover:bg-black transition-colors">Transferir</button>
        {result && <div className="text-sm dark:text-gray-300">{result}</div>}
      </form>
    </div>
  )
}
