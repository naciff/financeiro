import { useEffect, useState } from 'react'
import { hasBackend } from '../lib/runtime'
import { listServices, deleteService } from '../services/db'
import { useAppStore } from '../store/AppStore'
import { ServiceModal } from '../components/modals/ServiceModal'
import { Icon } from '../components/ui/Icon'
import { formatMoneyBr } from '../utils/format'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { PageInfo } from '../components/ui/PageInfo'

export default function Services() {
    const store = useAppStore()
    const [items, setItems] = useState<any[]>([])
    const [showServiceModal, setShowServiceModal] = useState(false)
    const [serviceToEdit, setServiceToEdit] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selected, setSelected] = useState<Record<string, boolean>>({})
    const [search, setSearch] = useState('')
    const [confirmConfig, setConfirmConfig] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void }>({ isOpen: false, title: '', message: '', onConfirm: () => { } })

    const filteredItems = items.filter(i =>
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        (i.description || '').toLowerCase().includes(search.toLowerCase())
    )

    async function load() {
        setLoading(true); setError(null)
        if (hasBackend) {
            if (!store.activeOrganization) {
                setItems([])
                setLoading(false)
                return
            }
            const orgId = store.activeOrganization
            const r = await listServices(orgId)
            if (r.error) { setError(r.error.message); setItems([]) }
            else setItems((r.data as any) || [])
        } else {
            setItems([]) // Services only in backend for now
        }
        setLoading(false)
    }

    useEffect(() => { load() }, [store.activeOrganization])

    function handleEdit() {
        const selectedIds = Object.keys(selected).filter(id => selected[id])
        if (selectedIds.length !== 1) return
        const idToEdit = selectedIds[0]
        const s = items.find(x => x.id === idToEdit)
        if (s) {
            setServiceToEdit(s)
            setShowServiceModal(true)
        }
    }

    function handleOpenNew() {
        setServiceToEdit(null)
        setShowServiceModal(true)
    }

    async function handleDelete() {
        const selectedIds = Object.keys(selected).filter(id => selected[id])
        if (selectedIds.length === 0) return

        setConfirmConfig({
            isOpen: true,
            title: 'Excluir Serviços',
            message: `Confirma exclusão de ${selectedIds.length} serviço(s)?`,
            onConfirm: async () => {
                if (hasBackend) {
                    for (const id of selectedIds) {
                        await deleteService(id)
                    }
                }
                setConfirmConfig(prev => ({ ...prev, isOpen: false }))
                setSelected({})
                load()
            }
        })
    }

    return (
        <div className="space-y-6 text-gray-900 dark:text-gray-100 p-2">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Serviços</h1>
                <PageInfo>
                    <p>Gerencie os tipos de serviços que podem ser incluídos nos contratos. Ao selecionar o Centro de Custo "Contrato" em um agendamento, você poderá vincular estes serviços.</p>
                </PageInfo>
            </div>

            {/* Filters & Actions Toolbar */}
            <div className="flex flex-wrap items-center gap-2 w-full">
                <button
                    className="flex items-center gap-2 bg-blue-600 dark:bg-blue-600 text-white rounded px-4 py-2 hover:bg-blue-700 dark:hover:bg-blue-700 transition-colors shadow-sm font-medium"
                    onClick={handleOpenNew}
                >
                    <Icon name="add" className="w-5 h-5" /> Incluir
                </button>

                <button
                    className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border dark:border-gray-600 rounded px-4 py-2 disabled:opacity-50 transition-colors font-medium hover:bg-gray-200 dark:hover:bg-gray-600"
                    disabled={Object.keys(selected).filter(id => selected[id]).length !== 1}
                    onClick={handleEdit}
                >
                    <Icon name="edit" className="w-5 h-5" /> Alterar
                </button>

                <button
                    className="flex items-center gap-2 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 rounded px-4 py-2 disabled:opacity-50 transition-colors font-medium hover:bg-red-200 dark:hover:bg-red-900/40"
                    disabled={Object.keys(selected).filter(id => selected[id]).length === 0}
                    onClick={handleDelete}
                >
                    <Icon name="trash" className="w-5 h-5" /> Excluir
                </button>

                <div className="flex-1 flex items-center gap-2 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded px-3 py-2 min-w-[200px] shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                    <Icon name="search" className="w-4 h-4 text-gray-400" />
                    <input
                        className="outline-none w-full bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 text-sm"
                        placeholder="Pesquisa por nome ou descrição"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {error && <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded border border-red-200 dark:border-red-800 text-sm">{error}</div>}

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 overflow-hidden shadow-sm">
                {loading && <div className="p-8 text-center text-gray-500">Carregando...</div>}
                {!loading && filteredItems.length === 0 && <div className="p-8 text-center text-gray-500">Nenhum serviço encontrado.</div>}

                {!loading && filteredItems.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 font-semibold border-b dark:border-gray-700">
                                    <th className="p-4 w-10 text-center">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            onChange={(e) => {
                                                const newVal = e.target.checked
                                                const newSel = { ...selected }
                                                filteredItems.forEach(i => newSel[i.id] = newVal)
                                                setSelected(newSel)
                                            }}
                                            checked={filteredItems.length > 0 && filteredItems.every(i => selected[i.id])}
                                        />
                                    </th>
                                    <th className="p-4">Nome do Serviço</th>
                                    <th className="p-4">Descrição</th>
                                    <th className="p-4 text-right">Valor Padrão</th>
                                    <th className="p-4 text-center">Data Cadastro</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-gray-700">
                                {filteredItems.map(item => (
                                    <tr
                                        key={item.id}
                                        className={`hover:bg-blue-50 dark:hover:bg-blue-900/10 cursor-pointer transition-colors ${selected[item.id] ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}
                                        onClick={() => setSelected(s => ({ ...s, [item.id]: !s[item.id] }))}
                                        onDoubleClick={() => {
                                            setServiceToEdit(item)
                                            setShowServiceModal(true)
                                        }}
                                    >
                                        <td className="p-4 text-center" onClick={e => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                checked={!!selected[item.id]}
                                                onChange={e => setSelected(s => ({ ...s, [item.id]: e.target.checked }))}
                                            />
                                        </td>
                                        <td className="p-4 font-bold text-gray-900 dark:text-gray-100">{item.name}</td>
                                        <td className="p-4 text-gray-500 dark:text-gray-400">{item.description || '-'}</td>
                                        <td className="p-4 text-right font-semibold text-gray-900 dark:text-gray-100">R$ {formatMoneyBr(Number(item.default_value || 0))}</td>
                                        <td className="p-4 text-center text-gray-400 text-xs">{new Date(item.created_at).toLocaleDateString('pt-BR')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <ServiceModal
                isOpen={showServiceModal}
                onClose={() => {
                    setShowServiceModal(false)
                    setServiceToEdit(null)
                }}
                serviceToEdit={serviceToEdit}
                onSuccess={() => {
                    load()
                }}
            />

            <ConfirmModal
                isOpen={confirmConfig.isOpen}
                title={confirmConfig.title}
                message={confirmConfig.message}
                onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmConfig.onConfirm}
            />
        </div>
    )
}
