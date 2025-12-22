import { useEffect, useState } from 'react'
import { Icon } from '../components/ui/Icon'
import { listCostCenters, createCostCenter, updateCostCenter, deleteCostCenter, checkCostCenterDependencies } from '../services/db'
import { SystemModal } from '../components/modals/SystemModal'
import { useAppStore } from '../store/AppStore'

export function CostCenters() {
    const store = useAppStore()
    const [items, setItems] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const pageSize = 10

    // Form
    const [showForm, setShowForm] = useState(false)
    const [editId, setEditId] = useState('')
    const [descricao, setDescricao] = useState('')
    const [principal, setPrincipal] = useState(false)
    const [compartilhado, setCompartilhado] = useState(false)
    const [situacao, setSituacao] = useState(true)

    // Selection
    const [selected, setSelected] = useState<Record<string, boolean>>({})

    async function load() {
        setLoading(true)
        if (!store.activeOrganization) {
            setItems([])
            setLoading(false)
            return
        }
        const res = await listCostCenters(store.activeOrganization)
        if (res.data) setItems(res.data)
        setLoading(false)
    }

    useEffect(() => {
        load()
    }, [store.activeOrganization])

    const selectedIds = Object.keys(selected).filter(k => selected[k])
    const canEdit = selectedIds.length === 1
    const canDelete = selectedIds.length > 0

    function handleNew() {
        setEditId('')
        setDescricao('')
        setPrincipal(false)
        setCompartilhado(false)
        setSituacao(true)
        setShowForm(true)
    }

    function handleEdit() {
        if (!canEdit) return
        const id = selectedIds[0]
        const item = items.find(x => x.id === id)
        if (item) {
            setEditId(item.id)
            setDescricao(item.descricao)
            setPrincipal(item.principal)
            setCompartilhado(!!item.compartilhado)
            setSituacao(item.situacao)
            setShowForm(true)
        }
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault()
        if (!descricao) return alert('Preencha a descrição')

        const payload = { descricao, principal, situacao, compartilhado }

        if (editId) {
            await updateCostCenter(editId, payload)
        } else {
            if (!store.activeOrganization) return alert('Nenhuma empresa selecionada')
            await createCostCenter({ ...payload, organization_id: store.activeOrganization })
        }
        setShowForm(false)
        load()
        setEditId('')
        setDescricao('')
    }

    async function handleDelete() {
        if (!canDelete) return

        // Single delete check to keep it simple or loop? 
        // User asked: "não permitir excluir ... se já existir vinculo ... nesse caso deve ter a opção de inativar"
        // If multiple selected, complex. Assuming single select or handling one by one?
        // Let's handle all selected.

        for (const id of selectedIds) {
            const deps = await checkCostCenterDependencies(id)
            if (deps.count > 0) {
                if (confirm(`O centro de custo "${items.find(i => i.id === id)?.descricao}" possui vínculos e não pode ser excluído. Deseja inativá-lo?`)) {
                    await updateCostCenter(id, { situacao: false })
                }
            } else {
                if (confirm(`Excluir definitivamente o centro de custo "${items.find(i => i.id === id)?.descricao}"?`)) {
                    await deleteCostCenter(id)
                }
            }
        }

        setSelected({})
        load()
    }

    const filteredItems = items.filter(i => i.descricao.toLowerCase().includes(search.toLowerCase()))
    const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize))
    const current = Math.min(page, totalPages)
    const pageItems = filteredItems.slice((current - 1) * pageSize, current * pageSize)

    return (
        <div className="space-y-6 text-gray-900 dark:text-gray-100">


            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2 w-full">
                <button
                    className="flex items-center gap-2 bg-black dark:bg-gray-900 text-white rounded px-3 py-2 hover:bg-gray-800 dark:hover:bg-black transition-colors"
                    onClick={handleNew}
                >
                    <Icon name="add" className="w-4 h-4" /> Incluir
                </button>

                <button
                    className="flex items-center gap-2 bg-blue-600 text-white rounded px-3 py-2 disabled:opacity-50 transition-colors"
                    disabled={!canEdit}
                    onClick={handleEdit}
                >
                    <Icon name="edit" className="w-4 h-4" /> Alterar
                </button>

                <button
                    className="flex items-center gap-2 bg-red-600 text-white rounded px-3 py-2 disabled:opacity-50 transition-colors"
                    disabled={!canDelete}
                    onClick={handleDelete}
                >
                    <Icon name="trash" className="w-4 h-4" /> Excluir
                </button>

                <div className="flex-1 flex items-center gap-2 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded px-3 py-2 min-w-[200px]">
                    <Icon name="search" className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <input
                        className="outline-none flex-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 text-sm"
                        placeholder="Buscar por descrição"
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1) }}
                    />
                </div>
                {search && (
                    <button
                        className="text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border dark:border-gray-600 rounded px-3 py-2 text-gray-700 dark:text-gray-300 whitespace-nowrap transition-colors"
                        onClick={() => { setSearch(''); setPage(1) }}
                    >
                        Limpar
                    </button>
                )}
            </div>

            {/* Form */}
            {showForm && (
                <form onSubmit={handleSave} className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded p-4 space-y-3">
                    <div className="font-medium text-gray-900 dark:text-gray-100">{editId ? 'Editar Centro de Custo' : 'Novo Centro de Custo'}</div>

                    <div className="mb-2">
                        <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Descrição *</label>
                        <input
                            className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            value={descricao}
                            onChange={e => setDescricao(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <div className="flex items-center gap-4 mb-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                className="w-4 h-4 text-blue-600 rounded"
                                checked={principal}
                                onChange={e => setPrincipal(e.target.checked)}
                            />
                            <span className="text-sm">Principal</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                className="w-4 h-4 text-blue-600 rounded"
                                checked={compartilhado}
                                onChange={e => setCompartilhado(e.target.checked)}
                            />
                            <span className="text-sm">Compartilhado</span>
                        </label>
                    </div>

                    <div className="mb-2">
                        <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Situação</label>
                        <select
                            className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            value={situacao ? 'ativo' : 'inativo'}
                            onChange={e => setSituacao(e.target.value === 'ativo')}
                        >
                            <option value="ativo">Ativo</option>
                            <option value="inativo">Inativo</option>
                        </select>
                    </div>

                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            className="rounded border dark:border-gray-600 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                            onClick={() => { setShowForm(false); setEditId(''); setDescricao(''); setCompartilhado(false) }}
                        >
                            Cancelar
                        </button>
                        <button
                            className="bg-black dark:bg-gray-900 text-white rounded px-3 py-2 hover:bg-gray-800 dark:hover:bg-black transition-colors"
                            type="submit"
                        >
                            Salvar
                        </button>
                    </div>
                </form>
            )}

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded border dark:border-gray-700 overflow-hidden">
                {loading && <div className="p-4 text-center">Carregando...</div>}
                {!loading && pageItems.length === 0 && <div className="p-4 text-center text-gray-500">Nenhum registro encontrado.</div>}

                {!loading && pageItems.length > 0 && (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                        <th className="p-3 w-10 text-center">
                                            <input
                                                type="checkbox"
                                                onChange={(e) => {
                                                    const newVal = e.target.checked
                                                    const newSel = { ...selected }
                                                    pageItems.forEach(i => newSel[i.id] = newVal)
                                                    setSelected(newSel)
                                                }}
                                                checked={pageItems.length > 0 && pageItems.every(i => selected[i.id])}
                                            />
                                        </th>
                                        <th className="p-3">Descrição</th>
                                        <th className="p-3 text-center w-24">Principal</th>
                                        <th className="p-3 text-center w-24">Compartilhado</th>
                                        <th className="p-3 text-center w-24">Situação</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pageItems.map(item => (
                                        <tr
                                            key={item.id}
                                            className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                                            onClick={() => setSelected(s => ({ ...s, [item.id]: !s[item.id] }))}
                                            onDoubleClick={() => {
                                                setEditId(item.id)
                                                setDescricao(item.descricao)
                                                setPrincipal(item.principal)
                                                setCompartilhado(!!item.compartilhado)
                                                setSituacao(item.situacao)
                                                setShowForm(true)
                                            }}
                                        >
                                            <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={!!selected[item.id]}
                                                    onChange={e => setSelected(s => ({ ...s, [item.id]: e.target.checked }))}
                                                />
                                            </td>
                                            <td className="p-3">{item.descricao}</td>
                                            <td className="p-3 text-center">
                                                {item.principal && <Icon name="check" className="w-5 h-5 text-green-500 mx-auto" />}
                                            </td>
                                            <td className="p-3 text-center">
                                                {item.compartilhado && <Icon name="check" className="w-5 h-5 text-blue-500 mx-auto" />}
                                            </td>
                                            <td className="p-3 text-center">
                                                <span className={`px-2 py-1 rounded text-xs font-semibold ${item.situacao ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                                                    {item.situacao ? 'Ativo' : 'Inativo'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {totalPages > 1 && (
                            <div className="flex items-center justify-end gap-2 p-3 bg-gray-50 dark:bg-gray-800 border-t dark:border-gray-700 text-gray-700 dark:text-gray-300">
                                <button className="px-3 py-1 rounded border dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={current === 1}>Anterior</button>
                                <span>Página {current} de {totalPages}</span>
                                <button className="px-3 py-1 rounded border dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={current === totalPages}>Próxima</button>
                            </div>
                        )}
                    </>
                )}
            </div>
            {/* Keeping SystemModal only if needed for delete confirmation, actually I kept confirm() but SystemModal import is there. Let's remove SystemModal usage if I heavily rely on confirm() or restore it.
                Wait, in handle New code I used confirm(). I should use SystemModal properly if I want to be consistent. 
                But to ensure exact pattern match with previous code provided in replacement, I will stick to what I wrote in Step 318 which used confirm() inside handleDelete but kept SystemModal import unused?
                Actually, looking at Step 318 content I see: 
                `if (!confirm(...)) return`
                So I will stick to that to start.
             */}
        </div>
    )
}
