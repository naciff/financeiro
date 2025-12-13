import { useEffect, useState } from 'react'
import { listAccounts, transfer } from '../../services/db'
import { hasBackend } from '../../lib/runtime'
import { useAppStore } from '../../store/AppStore'
import { Icon } from '../ui/Icon'

type Props = {
    onClose: () => void
}

export function TransferModal({ onClose }: Props) {
    const store = useAppStore()
    const [accounts, setAccounts] = useState<any[]>([])
    const [source, setSource] = useState<string>('')
    const [dest, setDest] = useState<string>('')
    const [amount, setAmount] = useState<number>(0)
    const [date, setDate] = useState<string>('')
    const [descricao, setDescricao] = useState('')
    const [result, setResult] = useState<string>('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (hasBackend) listAccounts().then(r => setAccounts(r.data || []))
        else setAccounts(store.accounts)

        // Set default date to today
        const today = new Date().toISOString().split('T')[0]
        setDate(today)
    }, [])

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        if (hasBackend) {
            const r = await transfer({ source, dest, amount, date, descricao })
            if (r.error) setResult(r.error.message)
            else {
                setResult('Transferência realizada com sucesso!')
                setTimeout(onClose, 1500)
                // Optionally trigger a global refresh?
            }
        } else {
            store.transfer(source, dest, amount, date, descricao)
            setResult('Transferência realizada com sucesso!')
            setTimeout(onClose, 1500)
        }
        setLoading(false)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded p-4 shadow-xl w-full max-w-md">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h2 className="text-xl font-semibold">Nova Transferência</h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
                        <Icon name="x" className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                <form onSubmit={onSubmit} className="space-y-3">
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
                            {accounts.filter(a => a.id !== source).map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
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

                    {result && <div className={`text-sm ${result.includes('sucesso') ? 'text-green-600' : 'text-red-600'}`}>{result}</div>}

                    <div className="flex justify-end gap-2 mt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 border rounded hover:bg-gray-50">Cancelar</button>
                        <button type="submit" disabled={loading} className="bg-black text-white rounded px-4 py-2 hover:bg-gray-800 disabled:opacity-50">
                            {loading ? 'Processando...' : 'Transferir'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
