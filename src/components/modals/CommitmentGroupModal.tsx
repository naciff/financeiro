import { useState, useEffect } from 'react'
import { createCommitmentGroup } from '../../services/db'
import { useAppStore } from '../../store/AppStore'
import { hasBackend } from '../../lib/runtime'
import { Icon } from '../ui/Icon'
import { FloatingLabelInput } from '../ui/FloatingLabelInput'
import { FloatingLabelSelect } from '../ui/FloatingLabelSelect'

type Props = {
    isOpen: boolean
    onClose: () => void
    onSuccess: (group: { id: string, nome: string, operacao?: string }) => void
    initialOperation?: string
}

export function CommitmentGroupModal({ isOpen, onClose, onSuccess, initialOperation }: Props) {
    const store = useAppStore()
    const [nome, setNome] = useState('')
    const [operacao, setOperacao] = useState('despesa')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (isOpen) {
            setNome('')
            setOperacao(initialOperation || 'despesa')
            setLoading(false)
            setError('')
        }
    }, [isOpen, initialOperation])

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!nome.trim()) return

        try {
            setLoading(true)
            setError('')

            if (hasBackend) {
                if (!store.activeOrganization) {
                    setError('Organização não selecionada')
                    setLoading(false)
                    return
                }

                const r = await createCommitmentGroup({
                    nome,
                    operacao,
                    organization_id: store.activeOrganization
                })

                if (r.error) {
                    setError(r.error.message)
                } else if (r.data) {
                    onSuccess(r.data)
                    onClose()
                }
            } else {
                const id = store.createCommitmentGroup({
                    nome,
                    operacao: operacao as any
                })
                onSuccess({ id: id as any, nome, operacao })
                onClose()
            }
        } catch (err: any) {
            setError(err.message || 'Erro ao criar grupo')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 text-left backdrop-blur-sm">
            <div className="absolute inset-0" onClick={onClose} aria-hidden="true"></div>
            <div className="relative bg-white dark:bg-gray-800 border dark:border-gray-700 rounded w-[90%] max-w-md p-4 text-gray-900 dark:text-gray-100 shadow-xl">
                <div className="flex items-center justify-between mb-3 border-b dark:border-gray-700 pb-2">
                    <div className="font-medium text-lg">Novo Grupo de Compromisso</div>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <Icon name="x" className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <FloatingLabelSelect
                            label="Operação"
                            value={operacao}
                            onChange={(e) => setOperacao(e.target.value)}
                        >
                            <option value="despesa">Despesa</option>
                            <option value="receita">Receita</option>
                            <option value="aporte">Aporte</option>
                            <option value="retirada">Retirada</option>
                        </FloatingLabelSelect>
                    </div>

                    <div>
                        <FloatingLabelInput
                            label="Nome do Grupo *"
                            value={nome}
                            onChange={(e) => setNome(e.target.value)}
                        />
                    </div>

                    {error && <div className="text-xs text-red-600 dark:text-red-400">{error}</div>}

                    <div className="flex justify-end gap-2 pt-2 border-t dark:border-gray-700">
                        <button
                            type="button"
                            className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded px-4 py-2 text-sm font-medium transition-colors"
                            onClick={onClose}
                        >
                            Cancelar
                        </button>
                        <button
                            className="bg-black dark:bg-gray-900 hover:bg-gray-800 dark:hover:bg-gray-950 text-white rounded px-4 py-2 text-sm font-medium disabled:opacity-50 transition-colors shadow-sm"
                            type="submit"
                            disabled={!nome.trim() || loading}
                        >
                            {loading ? 'Salvando...' : 'Salvar Grupo'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
