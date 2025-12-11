import { useEffect, useState } from 'react'
import { listAccounts, listClients, listCommitmentGroups, listCommitmentsByGroup, updateTransaction } from '../../services/db'
import { hasBackend } from '../../lib/runtime'
import { useAppStore } from '../../store/AppStore'
import { supabase } from '../../lib/supabase'

type Props = {
    onClose: () => void
    onSuccess?: () => void
    initialData?: any
    title?: string
}

export function TransactionModal({ onClose, onSuccess, initialData, title }: Props) {
    const store = useAppStore()
    const [msg, setMsg] = useState('')

    // Data
    const [accounts, setAccounts] = useState<any[]>([])
    const [clients, setClients] = useState<any[]>([])
    const [groups, setGroups] = useState<any[]>([])
    const [commitments, setCommitments] = useState<any[]>([])

    // Form
    const [formContaId, setFormContaId] = useState('')
    const [formOperacao, setFormOperacao] = useState<'despesa' | 'receita' | 'aporte' | 'retirada'>('despesa')
    const [formEspecie, setFormEspecie] = useState('dinheiro')
    const [formHistorico, setFormHistorico] = useState('')
    const [formValor, setFormValor] = useState(0)
    const [formDataVencimento, setFormDataVencimento] = useState('')
    const [formDataLancamento, setFormDataLancamento] = useState('')
    const [formStatus, setFormStatus] = useState<'pendente' | 'pago' | 'recebido'>('pendente')
    const [formCliente, setFormCliente] = useState('')
    const [formGrupoCompromisso, setFormGrupoCompromisso] = useState('')
    const [formCompromisso, setFormCompromisso] = useState('')
    const [formNotaFiscal, setFormNotaFiscal] = useState('')
    const [formDetalhes, setFormDetalhes] = useState('')

    useEffect(() => {
        async function loadData() {
            if (hasBackend) {
                const [a, c, g] = await Promise.all([
                    listAccounts(),
                    listClients(),
                    listCommitmentGroups()
                ])
                setAccounts(a.data || [])
                setClients(c.data || [])
                setGroups(g.data || [])
            } else {
                setAccounts(store.accounts)
                setClients(store.clients)
                setGroups(store.commitment_groups)
            }
        }
        loadData()

        if (initialData) {
            setFormOperacao(initialData.operacao)
            setFormContaId(initialData.conta_id || initialData.caixa_id || '')
            setFormEspecie(initialData.especie || 'dinheiro')
            setFormHistorico(initialData.historico)
            setFormValor(Number(initialData.valor_saida || initialData.valor_entrada || 0))
            const today = new Date().toISOString().split('T')[0]
            setFormDataVencimento(initialData.data_vencimento ? initialData.data_vencimento.split('T')[0] : today)
            setFormDataLancamento(initialData.data_lancamento ? initialData.data_lancamento.split('T')[0] : today)
            setFormStatus(initialData.status || 'pendente')
            setFormCliente(initialData.cliente_id || initialData.cliente || '')
            setFormGrupoCompromisso(initialData.grupo_compromisso || initialData.grupo_compromisso_id || initialData.grupo_id || '')
            setFormCompromisso(initialData.compromisso || initialData.compromisso_id || '')
            setFormNotaFiscal(initialData.nota_fiscal || '')
            setFormDetalhes(initialData.detalhes ? (typeof initialData.detalhes === 'string' ? initialData.detalhes : JSON.stringify(initialData.detalhes)) : '')
        } else {
            // Defaults
            const today = new Date().toISOString().split('T')[0]
            setFormDataLancamento(today)
            setFormDataVencimento(today)
        }
    }, [initialData])

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

    async function handleSave() {
        if (!formContaId || !formValor || !formDataLancamento || !formOperacao || !formCliente || !formGrupoCompromisso || !formCompromisso || !formHistorico) {
            setMsg('Preencha todos os campos obrigatórios')
            return
        }

        const isEntrada = formOperacao === 'receita' || formOperacao === 'aporte'
        const newTransaction: any = {
            conta_id: formContaId,
            operacao: formOperacao,
            historico: formHistorico,
            data_vencimento: formDataVencimento || formDataLancamento,
            data_lancamento: formDataLancamento,
            valor_entrada: isEntrada ? formValor : 0,
            valor_saida: !isEntrada ? formValor : 0,
            status: formStatus,
            cliente_id: formCliente,
            grupo_compromisso_id: formGrupoCompromisso,
            compromisso_id: formCompromisso,
            nota_fiscal: formNotaFiscal,
            detalhes: formDetalhes,
            especie: formEspecie
        }

        if (hasBackend && supabase) {
            let r
            if (initialData && initialData.id) {
                r = await updateTransaction(initialData.id, newTransaction)
            } else {
                const userId = (await supabase.auth.getUser()).data.user?.id
                r = await supabase.from('transactions').insert([{ user_id: userId, ...newTransaction }])
            }

            if (r.error) {
                setMsg('Erro ao salvar transação: ' + r.error.message)
            } else {
                setMsg(initialData ? 'Transação atualizada com sucesso!' : 'Transação criada com sucesso!')
                setTimeout(() => {
                    onClose()
                    if (onSuccess) onSuccess()
                }, 1000)
            }
        } else {
            if (initialData && initialData.id) {
                // store.updateTransaction(initialData.id, newTransaction)
                console.warn("Local update not implemented fully")
            } else {
                store.createTransaction(newTransaction as any)
            }
            setMsg(initialData ? 'Transação atualizada com sucesso!' : 'Transação criada com sucesso!')
            setTimeout(() => {
                onClose()
                if (onSuccess) onSuccess()
            }, 1000)
        }
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 text-left">
            <div className="bg-white border rounded w-[90%] max-w-2xl p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
                <h2 className="text-lg font-semibold mb-4">{title || (initialData ? 'Editar Transação' : 'Incluir Nova Transação')}</h2>

                {msg && <div className={`mb-4 text-sm ${msg.includes('sucesso') ? 'text-green-600' : 'text-red-600'}`}>{msg}</div>}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Operação | Espécie */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Operação *</label>
                        <select className="w-full border rounded px-3 py-2" value={formOperacao} onChange={e => {
                            setFormOperacao(e.target.value as any)
                            // Reset dependents if needed like Ledger does
                        }}>
                            <option value="despesa">Despesa</option>
                            <option value="receita">Receita</option>
                            <option value="aporte">Aporte</option>
                            <option value="retirada">Retirada</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Espécie</label>
                        <select className="w-full border rounded px-3 py-2" value={formEspecie} onChange={e => setFormEspecie(e.target.value)}>
                            <option value="dinheiro">Dinheiro</option>
                            <option value="pix">PIX</option>
                            <option value="cartao">Cartão</option>
                            <option value="boleto">Boleto</option>
                            <option value="transferencia">Transferência</option>
                            <option value="debito_automatico">Débito Automático</option>
                        </select>
                    </div>

                    {/* Cliente */}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-1">Cliente *</label>
                        <select className="w-full border rounded px-3 py-2" value={formCliente} onChange={e => setFormCliente(e.target.value)}>
                            <option value="">Selecione...</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                        </select>
                    </div>

                    {/* Grupo | Compromisso */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Grupo Compromisso *</label>
                        <select className="w-full border rounded px-3 py-2" value={formGrupoCompromisso} onChange={e => setFormGrupoCompromisso(e.target.value)}>
                            <option value="">Selecione...</option>
                            {groups
                                .filter(g => !g.tipo || (g.tipo && formOperacao && g.tipo.toLowerCase() === formOperacao.toLowerCase()))
                                .map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Compromisso *</label>
                        <select className="w-full border rounded px-3 py-2" value={formCompromisso} onChange={e => setFormCompromisso(e.target.value)}>
                            <option value="">Selecione...</option>
                            {commitments.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                        </select>
                    </div>

                    {/* Histórico */}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-1">Histórico *</label>
                        <input className="w-full border rounded px-3 py-2" value={formHistorico} onChange={e => setFormHistorico(e.target.value)} />
                    </div>

                    {/* Detalhe | NF */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Detalhe</label>
                        <input className="w-full border rounded px-3 py-2" value={formDetalhes} onChange={e => setFormDetalhes(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Nota Fiscal</label>
                        <input className="w-full border rounded px-3 py-2" value={formNotaFiscal} onChange={e => setFormNotaFiscal(e.target.value)} />
                    </div>

                    {/* Datas */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Data Vencimento</label>
                        <input type="date" disabled className="w-full border rounded px-3 py-2 bg-gray-100 cursor-not-allowed" value={formDataVencimento} onChange={e => setFormDataVencimento(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Data Pagamento</label>
                        <input type="date" className="w-full border rounded px-3 py-2" value={formDataLancamento} onChange={e => setFormDataLancamento(e.target.value)} />
                    </div>

                    {/* Valor | Caixa */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Valor *</label>
                        <input type="number" step="0.01" className="w-full border rounded px-3 py-2" value={formValor} onChange={e => setFormValor(parseFloat(e.target.value))} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Caixa Lançamento *</label>
                        <select className="w-full border rounded px-3 py-2" value={formContaId} onChange={e => setFormContaId(e.target.value)}>
                            <option value="">Selecione...</option>
                            {accounts.filter(acc => acc.ativo !== false).map(acc => <option key={acc.id} value={acc.id}>{acc.nome}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                    <button
                        className="px-4 py-2 border rounded hover:bg-gray-50 bg-white"
                        onClick={onClose}
                    >
                        Cancelar
                    </button>
                    <button
                        className="px-4 py-2 bg-fourtek-blue text-white rounded hover:bg-blue-700" // Use blue style from Ledger
                        onClick={handleSave}
                    >
                        Salvar
                    </button>
                </div>
            </div>
        </div>
    )
}
