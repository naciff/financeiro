import React, { useState, useEffect } from 'react'
import { Icon } from '../ui/Icon'
import { FloatingLabelInput } from '../ui/FloatingLabelInput'
import { createService, updateService } from '../../services/db'
import { useAppStore } from '../../store/AppStore'

interface ServiceModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    serviceToEdit?: any
}

export function ServiceModal({ isOpen, onClose, onSuccess, serviceToEdit }: ServiceModalProps) {
    const store = useAppStore()
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [defaultValue, setDefaultValue] = useState<number>(0)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (serviceToEdit) {
            setName(serviceToEdit.name || '')
            setDescription(serviceToEdit.description || '')
            setDefaultValue(serviceToEdit.default_value || 0)
        } else {
            setName('')
            setDescription('')
            setDefaultValue(0)
        }
        setError(null)
    }, [serviceToEdit, isOpen])

    if (!isOpen) return null

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!name) {
            setError('O nome é obrigatório')
            return
        }
        if (!store.activeOrganization) {
            setError('Nenhuma organização selecionada')
            return
        }

        setLoading(true)
        setError(null)

        const payload = {
            name,
            description,
            default_value: defaultValue,
            organization_id: store.activeOrganization
        }

        try {
            if (serviceToEdit) {
                const { error } = await updateService(serviceToEdit.id, payload)
                if (error) throw error
            } else {
                const { error } = await createService(payload)
                if (error) throw error
            }
            onSuccess()
            onClose()
        } catch (err: any) {
            setError(err.message || 'Erro ao salvar serviço')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md my-8">
                <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 rounded-t-lg z-10">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100">
                        <Icon name="app_registration" className="w-6 h-6 text-blue-600" />
                        {serviceToEdit ? 'Alterar Serviço' : 'Novo Serviço'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <Icon name="close" className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded border border-red-200 dark:border-red-800 text-sm">
                            {error}
                        </div>
                    )}

                    <FloatingLabelInput
                        label="Nome do Serviço *"
                        id="service_name"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                    />

                    <FloatingLabelInput
                        label="Descrição"
                        id="service_description"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                    />

                    <FloatingLabelInput
                        label="Valor Padrão (R$)"
                        id="service_value"
                        type="number"
                        step="0.01"
                        value={defaultValue}
                        onChange={e => setDefaultValue(parseFloat(e.target.value) || 0)}
                    />

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded transition-colors shadow-sm"
                        >
                            {loading ? 'Salvando...' : 'Salvar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
