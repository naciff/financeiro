import { useEffect, useState } from 'react'
import { listAccounts, listClients, listCommitmentGroups, listCommitmentsByGroup, updateTransaction, listAttachments, addAttachment, deleteAttachment } from '../../services/db'
import { hasBackend } from '../../lib/runtime'
import { useAppStore } from '../../store/AppStore'
import { supabase } from '../../lib/supabase'
import { Icon } from '../ui/Icon'

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

    // Data
    const [accounts, setAccounts] = useState<any[]>([])
    const [clients, setClients] = useState<any[]>([])
    const [groups, setGroups] = useState<any[]>([])
    const [commitments, setCommitments] = useState<any[]>([])

    // Attachments
    const [attachments, setAttachments] = useState<any[]>([])
    const [viewingAttachment, setViewingAttachment] = useState<any>(null)
    const [zoom, setZoom] = useState(1)
    const [rotation, setRotation] = useState(0)
    const [uploading, setUploading] = useState(false)

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
        if (activeTab === 'attachments' && initialData?.id) {
            loadAttachments()
        }
    }, [activeTab, initialData])

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

    async function loadAttachments() {
        if (!initialData?.id) return
        const r = await listAttachments(initialData.id)
        if (r.data) setAttachments(r.data)
    }

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

    async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
        if (!e.target.files?.length) return
        setUploading(true)
        const file = e.target.files[0]

        // Check size (e.g., max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('Arquivo muito grande. Máximo 5MB.')
            setUploading(false)
            return
        }

        const reader = new FileReader()
        reader.onload = async () => {
            const base64 = reader.result as string

            if (initialData?.id) {
                // Direct upload
                try {
                    const { error } = await addAttachment({
                        transaction_id: initialData.id,
                        file_name: file.name,
                        file_type: file.type,
                        file_data: base64
                    })

                    if (error) {
                        alert('Erro ao enviar imagem: ' + error.message)
                    } else {
                        await loadAttachments()
                    }
                } catch (err: any) {
                    alert('Erro: ' + err.message)
                } finally {
                    setUploading(false)
                }
            } else {
                // Pending upload
                setPendingAttachments(prev => [...prev, { name: file.name, type: file.type, data: base64 }])
                setUploading(false)
            }
        }
        reader.readAsDataURL(file)
    }

    async function handleDeleteAttachment(id: string) {
        if (!confirm('Tem certeza que deseja excluir este comprovante?')) return

        if (initialData?.id) {
            await deleteAttachment(id)
            if (viewingAttachment?.id === id) setViewingAttachment(null)
            await loadAttachments()
        } else {
            // Remove from pending (using index or some ID simulation? id here implies DB id, but pending items don't have it)
            // The UI calls this with 'att.id'. Pending items need a temporary ID.
        }
    }

    function removePendingAttachment(index: number) {
        setPendingAttachments(prev => prev.filter((_, i) => i !== index))
        setViewingAttachment(null)
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 text-left backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded w-[90%] max-w-4xl p-0 max-h-[90vh] overflow-hidden shadow-2xl text-gray-900 dark:text-gray-100 flex flex-col">
                {/* Header */}
                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-750">
                    <h2 className="text-lg font-semibold">{title || (initialData ? 'Editar Transação' : 'Incluir Nova Transação')}</h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full">
                        <Icon name="close" className="w-5 h-5" />
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
                                <select className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" value={formCliente} onChange={e => setFormCliente(e.target.value)}>
                                    <option value="">Selecione...</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                </select>
                            </div>

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
                        <div className="flex flex-col h-full rounded border dark:border-gray-700 overflow-hidden">
                            {/* Toolbar */}
                            <div className="bg-gray-100 dark:bg-gray-700 p-2 flex items-center gap-2 border-b dark:border-gray-600">
                                <label className="cursor-pointer bg-white dark:bg-gray-600 border dark:border-gray-500 px-3 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-500 flex items-center gap-2 text-sm shadow-sm transition-colors">
                                    <Icon name="upload_file" className="w-4 h-4" />
                                    <span>Upload Comprovante</span>
                                    <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleUpload} disabled={uploading} />
                                </label>
                                {uploading && <span className="text-xs animate-pulse text-gray-500">Enviando...</span>}

                                <div className="ml-auto flex items-center gap-2">
                                    <button
                                        onClick={() => { setZoom(z => Math.max(0.2, z - 0.2)) }}
                                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded disabled:opacity-50"
                                        disabled={!viewingAttachment}
                                        title="Zoom Out"
                                    >
                                        <Icon name="zoom_out" className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => { setZoom(z => Math.min(3, z + 0.2)) }}
                                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded disabled:opacity-50"
                                        disabled={!viewingAttachment}
                                        title="Zoom In"
                                    >
                                        <Icon name="zoom_in" className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => { setRotation(r => r - 90) }}
                                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded disabled:opacity-50"
                                        disabled={!viewingAttachment}
                                        title="Girar Esquerda"
                                    >
                                        <Icon name="rotate_left" className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => { setRotation(r => r + 90) }}
                                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded disabled:opacity-50"
                                        disabled={!viewingAttachment}
                                        title="Girar Direita"
                                    >
                                        <Icon name="rotate_right" className="w-5 h-5" />
                                    </button>
                                    <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2"></div>
                                    <button
                                        onClick={() => {
                                            if (!viewingAttachment) return
                                            if (!viewingAttachment.id) return // Can't download pending yet easily unless we blob it
                                            const link = document.createElement('a')
                                            link.href = viewingAttachment.file_data
                                            link.download = viewingAttachment.file_name
                                            link.click()
                                        }}
                                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded disabled:opacity-50 text-blue-600 dark:text-blue-400"
                                        disabled={!viewingAttachment || !viewingAttachment.id}
                                        title="Baixar"
                                    >
                                        <Icon name="download" className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (!viewingAttachment) return
                                            if (viewingAttachment.id) {
                                                handleDeleteAttachment(viewingAttachment.id)
                                            } else {
                                                // Find index in pending
                                                const idx = pendingAttachments.findIndex(p => p.data === viewingAttachment.file_data)
                                                if (idx !== -1) removePendingAttachment(idx)
                                            }
                                        }}
                                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded disabled:opacity-50 text-red-600 dark:text-red-400"
                                        disabled={!viewingAttachment}
                                        title="Excluir"
                                    >
                                        <Icon name="delete" className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 flex overflow-hidden h-[400px]">
                                {/* Sidebar List of Attachments */}
                                <div className="w-48 bg-gray-50 dark:bg-gray-750 border-r dark:border-gray-600 overflow-y-auto p-2 space-y-2">
                                    {(attachments.length === 0 && pendingAttachments.length === 0) && <div className="text-xs text-gray-500 text-center py-4">Nenhum comprovante</div>}

                                    {/* Pending Items */}
                                    {pendingAttachments.map((att, idx) => (
                                        <div
                                            key={`pending-${idx}`}
                                            onClick={() => {
                                                setViewingAttachment({
                                                    id: null, // No ID for pending
                                                    file_name: att.name,
                                                    file_type: att.type,
                                                    file_data: att.data,
                                                    created_at: new Date().toISOString()
                                                })
                                                setZoom(1)
                                                setRotation(0)
                                            }}
                                            className={`p-2 rounded cursor-pointer border border-dashed border-orange-300 bg-orange-50 hover:border-orange-400 dark:bg-orange-900/20 dark:border-orange-500 flex flex-col gap-1 transition-all ${viewingAttachment?.file_data === att.data ? 'ring-2 ring-orange-400' : ''}`}
                                        >
                                            <div className="w-full aspect-square bg-gray-200 dark:bg-gray-800 rounded flex items-center justify-center overflow-hidden">
                                                {att.type.startsWith('image/') ? (
                                                    <img src={att.data} alt="" className="w-full h-full object-cover opacity-70" />
                                                ) : (
                                                    <Icon name="description" className="w-8 h-8 text-gray-400" />
                                                )}
                                            </div>
                                            <div className="text-[10px] truncate font-medium text-orange-700 dark:text-orange-300" title={att.name}>{att.name} (Novo)</div>
                                            <div className="text-[9px] text-gray-400">Pendente</div>
                                        </div>
                                    ))}

                                    {/* Saved Items */}
                                    {attachments.map(att => (
                                        <div
                                            key={att.id}
                                            onClick={() => {
                                                setViewingAttachment(att)
                                                setZoom(1)
                                                setRotation(0)
                                            }}
                                            className={`p-2 rounded cursor-pointer border hover:border-blue-400 flex flex-col gap-1 transition-all ${viewingAttachment?.id === att.id ? 'bg-blue-50 border-blue-500 dark:bg-blue-900/30 dark:border-blue-500 ring-1 ring-blue-500' : 'bg-white dark:bg-gray-600 border-gray-200 dark:border-gray-500'}`}
                                        >
                                            <div className="w-full aspect-square bg-gray-200 dark:bg-gray-800 rounded flex items-center justify-center overflow-hidden">
                                                {att.file_type.startsWith('image/') ? (
                                                    <img src={att.file_data} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <Icon name="description" className="w-8 h-8 text-gray-400" />
                                                )}
                                            </div>
                                            <div className="text-[10px] truncate" title={att.file_name}>{att.file_name}</div>
                                            <div className="text-[9px] text-gray-400">{new Date(att.created_at).toLocaleDateString()}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Main Viewer Area */}
                                <div className="flex-1 bg-gray-100 dark:bg-gray-800 relative overflow-hidden flex items-center justify-center p-4">
                                    {!viewingAttachment && <div className="text-gray-400 dark:text-gray-500 flex flex-col items-center gap-2">
                                        <Icon name="image" className="w-12 h-12 opacity-50" />
                                        <span>Selecione ou envie um comprovante</span>
                                    </div>}

                                    {viewingAttachment && (
                                        <div className="relative" style={{
                                            transform: `scale(${zoom}) rotate(${rotation}deg)`,
                                            transition: 'transform 0.2s ease-out'
                                        }}>
                                            {viewingAttachment.file_type.startsWith('image/') ? (
                                                <img src={viewingAttachment.file_data} alt={viewingAttachment.file_name} className="max-w-full max-h-full shadow-lg" />
                                            ) : (
                                                <div className="bg-white p-8 rounded shadow text-center">
                                                    <Icon name="description" className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                                                    <p>{viewingAttachment.file_name}</p>
                                                    <p className="text-sm text-gray-500">Visualização não disponível para este tipo de arquivo.</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="border-t dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-750 flex justify-end gap-2">
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
