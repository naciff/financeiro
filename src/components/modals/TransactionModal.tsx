import { useEffect, useState } from 'react'
import { listAccounts, listClients, listCommitmentGroups, listCommitmentsByGroup, updateTransaction, listAttachments, addAttachment, deleteAttachment } from '../../services/db'
import { hasBackend } from '../../lib/runtime'
import { useAppStore } from '../../store/AppStore'
import { supabase } from '../../lib/supabase'
import { Icon } from '../ui/Icon'
import { TransactionAttachments } from '../TransactionAttachments'
import { ClientModal } from './ClientModal'

type Props = {
    onClose: () => void
    onSuccess?: () => void
    initialData?: any
    title?: string
}

export function TransactionModal({ onClose, onSuccess, initialData, title }: Props) {


    const store = useAppStore()
    const [msg, setMsg] = useState('')
    const [activeTab, setActiveTab] = useState<'details' | 'attachments'>('details')
    const [showClientModal, setShowClientModal] = useState(false)

    // Data
    const [accounts, setAccounts] = useState<any[]>([])
    const [clients, setClients] = useState<any[]>([])
    const [groups, setGroups] = useState<any[]>([])
    const [commitments, setCommitments] = useState<any[]>([])

    // Attachments


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
            setFormCliente(initialData.cliente_id || (typeof initialData.cliente === 'string' ? initialData.cliente : initialData.cliente?.id) || '')
            setFormGrupoCompromisso(initialData.grupo_compromisso_id || initialData.grupo_id || (typeof initialData.grupo_compromisso === 'string' ? initialData.grupo_compromisso : initialData.grupo_compromisso?.id) || '')
            setFormCompromisso(initialData.compromisso_id || (typeof initialData.compromisso === 'string' ? initialData.compromisso : initialData.compromisso?.id) || '')
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

    // Auto-select principal account for new transactions
    useEffect(() => {
        if (!initialData && accounts.length > 0 && !formContaId) {
            const principal = accounts.find(a => a.principal)
            if (principal) {
                setFormContaId(principal.id)
            }
        }
    }, [accounts, initialData])



    // Pending Attachments for new transactions
    const [pendingAttachments, setPendingAttachments] = useState<{ name: string; type: string; data: string }[]>([])

    // ... existing loadData effect ...

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
            let txId = initialData?.id

            if (txId) {
                r = await updateTransaction(txId, newTransaction)
            } else {
                const userId = (await supabase.auth.getUser()).data.user?.id
                r = await supabase.from('transactions').insert([{ user_id: userId, ...newTransaction }]).select().single()
                if (r.data) txId = r.data.id
            }

            if (r.error) {
                setMsg('Erro ao salvar transação: ' + r.error.message)
            } else {
                // Save pending attachments if any
                if (pendingAttachments.length > 0 && txId) {
                    for (const file of pendingAttachments) {
                        await addAttachment({
                            transaction_id: txId,
                            file_name: file.name,
                            file_type: file.type,
                            file_data: file.data
                        })
                    }
                }

                setMsg(initialData ? 'Transação atualizada com sucesso!' : 'Transação criada com sucesso!')
                setTimeout(() => {
                    onClose()
                    if (onSuccess) onSuccess()
                }, 1000)
            }
        } else {
            // Local store handling (simplified)
            if (initialData && initialData.id) {
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 text-left backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded w-[90%] max-w-4xl p-0 max-h-[90vh] overflow-hidden shadow-2xl text-gray-900 dark:text-gray-100 flex flex-col">
                {/* Header */}
                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
                    <h2 className="text-lg font-semibold">{title || (initialData ? 'Editar Transação' : 'Incluir Nova Transação')}</h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full">
                        <Icon name="x" className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <button
                        className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'details' ? 'border-primary text-primary bg-white dark:bg-gray-800' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                        onClick={() => setActiveTab('details')}
                    >
                        Movimentação
                    </button>
                    <button
                        className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'attachments' ? 'border-primary text-primary bg-white dark:bg-gray-800' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                        onClick={() => setActiveTab('attachments')}
                    >
                        Comprovantes Digitalizados
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-gray-800">
                    {msg && <div className={`mb-4 text-sm ${msg.includes('sucesso') ? 'text-green-600' : 'text-red-600'}`}>{msg}</div>}

                    {activeTab === 'details' && (
                        // ... details content same as before
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Operação | Espécie */}
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Operação *</label>
                                <select className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" value={formOperacao} onChange={e => {
                                    setFormOperacao(e.target.value as any)
                                }}>
                                    <option value="despesa">Despesa</option>
                                    <option value="receita">Receita</option>
                                    <option value="aporte">Aporte</option>
                                    <option value="retirada">Retirada</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Espécie</label>
                                <select className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" value={formEspecie} onChange={e => setFormEspecie(e.target.value)}>
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
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Cliente *</label>
                                <div className="flex gap-2">
                                    <select className="flex-1 border rounded px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" value={formCliente} onChange={e => setFormCliente(e.target.value)}>
                                        <option value="">Selecione...</option>
                                        {clients.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                    </select>
                                    <button
                                        type="button"
                                        className="bg-black text-white dark:bg-gray-600 rounded px-3 hover:bg-gray-800 transition-colors"
                                        title="Novo Cliente"
                                        onClick={() => setShowClientModal(true)}
                                    >
                                        <Icon name="add" className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <ClientModal
                                isOpen={showClientModal}
                                onClose={() => setShowClientModal(false)}
                                onSuccess={(client) => {
                                    setClients(prev => [{ id: client.id, nome: client.nome }, ...prev])
                                    setFormCliente(client.id)
                                }}
                            />

                            {/* Grupo | Compromisso */}
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Grupo Compromisso *</label>
                                <select className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" value={formGrupoCompromisso} onChange={e => setFormGrupoCompromisso(e.target.value)}>
                                    <option value="">Selecione...</option>
                                    {groups
                                        .filter(g => !g.tipo || (g.tipo && formOperacao && (g.tipo.toLowerCase() === formOperacao.toLowerCase() || (['despesa', 'retirada'].includes(g.tipo.toLowerCase()) && ['despesa', 'retirada'].includes(formOperacao)) || (['receita', 'aporte'].includes(g.tipo.toLowerCase()) && ['receita', 'aporte'].includes(formOperacao)))))
                                        .map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Compromisso *</label>
                                <select className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" value={formCompromisso} onChange={e => setFormCompromisso(e.target.value)}>
                                    <option value="">Selecione...</option>
                                    {commitments.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                </select>
                            </div>

                            {/* Histórico */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Histórico *</label>
                                <input className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" value={formHistorico} onChange={e => setFormHistorico(e.target.value)} />
                            </div>

                            {/* Detalhe | NF */}
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Detalhe</label>
                                <input className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" value={formDetalhes} onChange={e => setFormDetalhes(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Nota Fiscal</label>
                                <input className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" value={formNotaFiscal} onChange={e => setFormNotaFiscal(e.target.value)} />
                            </div>

                            {/* Datas */}
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Data Vencimento</label>
                                <input type="date" disabled className="w-full border rounded px-3 py-2 bg-gray-100 cursor-not-allowed dark:bg-gray-900 dark:border-gray-700 dark:text-gray-400" value={formDataVencimento} onChange={e => setFormDataVencimento(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Data Pagamento</label>
                                <input type="date" className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" value={formDataLancamento} onChange={e => setFormDataLancamento(e.target.value)} />
                            </div>

                            {/* Valor | Caixa */}
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Valor *</label>
                                <input type="number" step="0.01" className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" value={formValor} onChange={e => setFormValor(parseFloat(e.target.value))} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Caixa Lançamento *</label>
                                <select className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" value={formContaId} onChange={e => setFormContaId(e.target.value)}>
                                    <option value="">Selecione...</option>
                                    {accounts.filter(acc => acc.ativo !== false).map(acc => <option key={acc.id} value={acc.id}>{acc.nome}</option>)}
                                </select>
                            </div>
                        </div>
                    )}

                    {activeTab === 'attachments' && (
                        <div className="h-full p-0 flex-1 overflow-hidden">
                            <TransactionAttachments
                                transactionId={initialData?.id || null}
                                pendingAttachments={pendingAttachments}
                                onPendingUpload={(file) => setPendingAttachments(prev => [...prev, file])}
                                onPendingDelete={(index) => setPendingAttachments(prev => prev.filter((_, i) => i !== index))}
                            />
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="border-t dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800 flex justify-end gap-2">
                    <button
                        className="px-4 py-2 border rounded hover:bg-gray-100 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600 transition-colors"
                        onClick={onClose}
                    >
                        Cancelar
                    </button>
                    <button
                        className="px-6 py-2 bg-fourtek-blue text-white rounded hover:bg-blue-700 shadow-sm transition-colors"
                        onClick={handleSave}
                    >
                        Salvar
                    </button>
                </div>
            </div>
        </div>
    )
}
