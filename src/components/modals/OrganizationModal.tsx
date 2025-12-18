import React, { useState } from 'react'
import { createOrganization } from '../../services/db'
import { useAppStore } from '../../store/AppStore'

type OrganizationModalProps = {
    isOpen: boolean
    onClose: () => void
    onSuccess?: (org: any) => void
}

export function OrganizationModal({ isOpen, onClose, onSuccess }: OrganizationModalProps) {
    const store = useAppStore()
    const [name, setName] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    if (!isOpen) return null

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!name.trim()) return

        setLoading(true)
        setError(null)
        try {
            const { data, error } = await createOrganization(name.trim())
            if (error) throw error

            // Refresh organizations in store
            await store.refreshOrganizations()

            if (onSuccess) onSuccess(data)
            onClose()
            setName('')
        } catch (err: any) {
            setError(err.message || 'Erro ao criar empresa')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md transform transition-all border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Nova Empresa
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <span className="material-icons-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Nome da Empresa / Organização
                            </label>
                            <input
                                autoFocus
                                type="text"
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#014d6d] outline-none transition-all"
                                placeholder="Ex: Minha Empresa LTDA"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                disabled={loading}
                            />
                        </div>

                        {error && (
                            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                                {error}
                            </div>
                        )}
                    </div>

                    <div className="mt-8 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 text-sm font-medium text-white bg-[#014d6d] hover:bg-[#013c55] rounded-lg shadow-sm transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:transform-none"
                            disabled={loading || !name.trim()}
                        >
                            {loading ? 'Criando...' : 'Criar Empresa'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
