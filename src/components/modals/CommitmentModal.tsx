import { useState, useEffect } from 'react'
import { createCommitment } from '../../services/db'
import { useAppStore } from '../../store/AppStore'
import { hasBackend } from '../../lib/runtime'
import { Icon } from '../ui/Icon'
import { FloatingLabelInput } from '../ui/FloatingLabelInput'
import { FloatingLabelSelect } from '../ui/FloatingLabelSelect'

type Props = {
    isOpen: boolean
    onClose: () => void
    onSuccess: (commitment: { id: string, nome: string, grupo_id?: string }) => void
    groups: Array<{ id: string, nome: string, operacao?: string }>
    initialGroupId?: string
}

export function CommitmentModal({ isOpen, onClose, onSuccess, groups, initialGroupId }: Props) {
    const store = useAppStore()
    const [nome, setNome] = useState('')
    const [grupoId, setGrupoId] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (isOpen) {
            setNome('')
            setGrupoId(initialGroupId || '')
            setLoading(false)
            setError('')
        }
    }, [isOpen, initialGroupId])

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!nome.trim() || !grupoId) return

        try {
            setLoading(true)
            setError('')

            if (hasBackend) {
                if (!store.activeOrganization) {
                    setError('Organização não selecionada')
                    setLoading(false)
                    return
                }

                const r = await createCommitment({
                    nome,
                    grupo_id: grupoId,
                    organization_id: store.activeOrganization
                })

                if (r.error) {
                    setError(r.error.message)
                } else if (r.data) {
                    onSuccess(r.data)
                    onClose()
                }
            } else {
                const id = store.createCommitment({
                    nome,
                    grupo_id: grupoId
                })
                onSuccess({ id: id as any, nome, grupo_id: grupoId })
                onClose()
            }
        } catch (err: any) {
            setError(err.message || 'Erro ao criar compromisso')
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
                    <div className="font-medium text-lg">Novo Compromisso</div>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <Icon name="x" className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <FloatingLabelSelect
                            label="Grupo de Compromisso *"
                            value={grupoId}
                            onChange={(e) => setGrupoId(e.target.value)}
                        >
                            <option value="">Selecione</option>
                            {groups.map(g => (
                                <option key={g.id} value={g.id}>{g.nome}</option>
                            ))}
                        </FloatingLabelSelect>
                    </div>

                    <div>
                        <FloatingLabelInput
                            label="Nome do Compromisso *"
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
                            disabled={!nome.trim() || !grupoId || loading}
                        >
                            {loading ? 'Salvando...' : 'Salvar Compromisso'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
