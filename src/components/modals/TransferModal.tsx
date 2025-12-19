import { useEffect, useState } from 'react'
import { listAccounts, transfer } from '../../services/db'
import { hasBackend } from '../../lib/runtime'
import { useAppStore } from '../../store/AppStore'
import { Icon } from '../ui/Icon'
import { FloatingLabelInput } from '../ui/FloatingLabelInput'
import { FloatingLabelSelect } from '../ui/FloatingLabelSelect'

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
        if (hasBackend) {
            if (store.activeOrganization) {
                listAccounts(store.activeOrganization).then(r => {
                    const activeAccounts = (r.data || []).filter((a: any) => a.ativo)
                    setAccounts(activeAccounts)
                })
            }
        } else {
            setAccounts(store.accounts.filter(a => a.ativo))
        }

        // Set default date to today
        const today = new Date().toISOString().split('T')[0]
        setDate(today)
    }, [store.activeOrganization])

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded p-6 shadow-xl w-full max-w-md text-gray-900 dark:text-gray-100">
                <div className="flex justify-between items-center mb-6 border-b dark:border-gray-700 pb-2">
                    <h2 className="text-xl font-semibold">Nova Transferência</h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <Icon name="x" className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>
                <form onSubmit={onSubmit} className="space-y-4">
                    <FloatingLabelSelect
                        label="Conta de Origem"
                        id="source"
                        value={source}
                        onChange={e => setSource(e.target.value)}
                    >
                        <option value="" className="dark:bg-gray-800">Selecione a conta de origem</option>
                        {accounts.map(a => <option key={a.id} value={a.id} className="dark:bg-gray-800">{a.nome}</option>)}
                    </FloatingLabelSelect>

                    <FloatingLabelSelect
                        label="Conta de Destino"
                        id="dest"
                        value={dest}
                        onChange={e => setDest(e.target.value)}
                    >
                        <option value="" className="dark:bg-gray-800">Selecione a conta de destino</option>
                        {accounts.filter(a => a.id !== source).map(a => <option key={a.id} value={a.id} className="dark:bg-gray-800">{a.nome}</option>)}
                    </FloatingLabelSelect>

                    <FloatingLabelInput
                        label="Valor"
                        id="amount"
                        type="number"
                        step="0.01"
                        value={amount}
                        onChange={e => setAmount(parseFloat(e.target.value))}
                    />

                    <FloatingLabelInput
                        label="Data"
                        id="date"
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                    />

                    <FloatingLabelInput
                        label="Descrição"
                        id="description"
                        value={descricao}
                        onChange={e => setDescricao(e.target.value)}
                    />

                    {result && <div className={`text-sm ${result.includes('sucesso') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{result}</div>}

                    <div className="flex justify-end gap-2 mt-6">
                        <button type="button" onClick={onClose} className="px-4 py-2 border dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors">Cancelar</button>
                        <button type="submit" disabled={loading} className="bg-black dark:bg-gray-900 text-white rounded px-4 py-2 hover:bg-gray-800 dark:hover:bg-gray-950 disabled:opacity-50 transition-colors shadow-sm">
                            {loading ? 'Processando...' : 'Transferir'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
