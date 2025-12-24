import { useEffect, useState } from 'react'
import { listAccounts, transfer } from '../../services/db'
import { hasBackend } from '../../lib/runtime'
import { useAppStore } from '../../store/AppStore'
import { Icon } from '../ui/Icon'
import { FloatingLabelInput } from '../ui/FloatingLabelInput'
import { FloatingLabelSelect } from '../ui/FloatingLabelSelect'

type Props = {
    onClose: () => void
    initialData?: any[] // Support editing/viewing existing transfer
}

export function TransferModal({ onClose, initialData }: Props) {
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
                    const activeAccounts = (r.data || []).filter((a: any) => a.ativo || (initialData && (a.id === source || a.id === dest)))
                    setAccounts(activeAccounts)
                })
            }
        } else {
            setAccounts(store.accounts.filter(a => a.ativo))
        }

        // Set default date to today if not editing
        if (!initialData) {
            const today = new Date().toISOString().split('T')[0]
            setDate(today)
        }
    }, [store.activeOrganization])

    useEffect(() => {
        if (initialData && initialData.length >= 2) {
            const outflow = initialData.find(t => Number(t.valor_saida) > 0)
            const inflow = initialData.find(t => Number(t.valor_entrada) > 0)
            if (outflow) {
                setSource(outflow.conta_id)
                setAmount(Number(outflow.valor_saida))
                setDate(outflow.data_lancamento ? outflow.data_lancamento.split('T')[0] : '')
                setDescricao(outflow.historico || '')
            }
            if (inflow) {
                setDest(inflow.conta_id)
            }
        }
    }, [initialData])

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!descricao.trim()) {
            setResult('O campo Descrição é obrigatório')
            return
        }
        if (!source || !dest || !amount || !date) {
            setResult('Preencha todos os campos')
            return
        }

        setLoading(true)
        if (hasBackend) {
            // If editing, we might need a different logic, but for now user just wanted to OPEN the modal.
            // Let's keep it simple: if it's new, use transfer RPC.
            // If it's existing, maybe we only allow viewing for now or we update both sides.
            // User didn't specify UPDATE logic, just "open the screen".
            if (initialData) {
                setResult('Edição de transferência em breve...')
                setLoading(false)
                return
            }

            const r = await transfer({ source, dest, amount, date, descricao })
            if (r.error) setResult(r.error.message)
            else {
                setResult('Transferência realizada com sucesso!')
                setTimeout(onClose, 1500)
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
                    <h2 className="text-xl font-semibold">{initialData ? 'Editando Transferência' : 'Nova Transferência'}</h2>
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
                        onChange={e => {
                            const val = e.target.value;
                            const truncated = val.includes('.') ? val.split('.')[0] + '.' + val.split('.')[1].slice(0, 2) : val;
                            setAmount(parseFloat(truncated) || 0);
                        }}
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
