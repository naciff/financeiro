import { useEffect, useState } from 'react'
import { hasBackend } from '../lib/runtime'
import { listClients, deleteClient } from '../services/db'
import { useAppStore } from '../store/AppStore'
import { ClientModal } from '../components/modals/ClientModal'
import { Icon } from '../components/ui/Icon'
import { maskPhone } from '../utils/format'

export default function Clients() {
  const store = useAppStore()
  const [items, setItems] = useState<any[]>([])

  // State for Modal
  const [showClientModal, setShowClientModal] = useState(false)
  const [clientToEdit, setClientToEdit] = useState<any>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)

  const filteredItems = items.filter(i => i.nome.toLowerCase().includes(search.toLowerCase()))

  // Calculate pagination
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize))
  const current = Math.min(page, totalPages)
  const pageItems = filteredItems.slice((current - 1) * pageSize, current * pageSize)

  // Reset to page 1 when search or page size changes
  useEffect(() => {
    setPage(1)
  }, [search, pageSize])

  async function load() {
    setLoading(true); setError(null)
    if (hasBackend) {
      if (!store.activeOrganization) {
        setItems([])
        setLoading(false)
        return
      }
      const orgId = store.activeOrganization
      const r = await listClients(orgId)
      if (r.error) { setError(r.error.message); setItems([]) }
      else setItems((r.data as any) || [])
    } else {
      setItems(store.clients.map(c => ({
        id: c.id,
        nome: c.nome,
        cpf_cnpj: c.documento,
        telefone: c.telefone,
        email: c.email,
        endereco: c.endereco,
        razao_social: c.razao_social,
        atividade_principal: c.atividade_principal,
        notify_email: c.notify_email,
        notify_whatsapp: c.notify_whatsapp
      })))
    }
    setLoading(false)
  }
  useEffect(() => { load() }, [store.activeOrganization])

  function handleEdit() {
    const selectedIds = Object.keys(selected).filter(id => selected[id])
    if (selectedIds.length !== 1) return
    const idToEdit = selectedIds[0]
    const c = items.find(x => x.id === idToEdit)
    if (c) {
      setClientToEdit(c)
      setShowClientModal(true)
    }
  }

  function handleOpenNew() {
    setClientToEdit(null)
    setShowClientModal(true)
  }

  async function handleDelete() {
    const selectedIds = Object.keys(selected).filter(id => selected[id])
    if (selectedIds.length === 0) return
    if (!confirm(`Confirma exclusão de ${selectedIds.length} cliente(s)?`)) return
    if (hasBackend) {
      for (const id of selectedIds) {
        await deleteClient(id)
      }
    } else {
      setItems(prev => prev.filter((x: any) => !selectedIds.includes(x.id)))
    }
    setSelected({})
    load()
  }

  return (
    <div className="space-y-6 text-gray-900 dark:text-gray-100">
      {/* Filters & Actions Toolbar */}
      <div className="flex flex-wrap items-center gap-2 w-full">
        <button
          className="flex items-center gap-2 bg-black dark:bg-gray-900 text-white rounded px-3 py-2 hover:bg-gray-800 dark:hover:bg-black transition-colors"
          onClick={handleOpenNew}
        >
          <Icon name="add" className="w-4 h-4" /> Incluir
        </button>

        <button
          className="flex items-center gap-2 bg-blue-600 text-white rounded px-3 py-2 disabled:opacity-50 transition-colors"
          disabled={Object.keys(selected).filter(id => selected[id]).length !== 1}
          onClick={handleEdit}
        >
          <Icon name="edit" className="w-4 h-4" /> Alterar
        </button>

        <button
          className="flex items-center gap-2 bg-red-600 text-white rounded px-3 py-2 disabled:opacity-50 transition-colors"
          disabled={Object.keys(selected).filter(id => selected[id]).length === 0}
          onClick={handleDelete}
        >
          <Icon name="trash" className="w-4 h-4" /> Excluir
        </button>

        <div className="flex-1 flex items-center gap-2 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded px-3 py-2 min-w-[200px]">
          <Icon name="search" className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <input
            className="outline-none w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 text-sm"
            placeholder="Pesquisa por nome"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {search && (
          <button
            className="text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border dark:border-gray-600 rounded px-3 py-2 text-gray-700 dark:text-gray-300 whitespace-nowrap"
            onClick={() => setSearch('')}
          >
            Limpar
          </button>
        )}
      </div>

      {error && <div className="text-red-500 text-sm">{error}</div>}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded border dark:border-gray-700 overflow-hidden">
        {loading && <div className="p-4 text-center">Carregando...</div>}
        {!loading && pageItems.length === 0 && <div className="p-4 text-center text-gray-500">Nenhum registro encontrado.</div>}

        {!loading && pageItems.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 uppercase">
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
                    <th className="p-3">Nome</th>
                    <th className="p-3">CPF/CNPJ</th>
                    <th className="p-3">Telefone</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Cidade/UF</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map(item => (
                    <tr
                      key={item.id}
                      className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                      onClick={() => setSelected(s => ({ ...s, [item.id]: !s[item.id] }))}
                      onDoubleClick={() => {
                        setClientToEdit(item)
                        setShowClientModal(true)
                      }}
                    >
                      <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={!!selected[item.id]}
                          onChange={e => setSelected(s => ({ ...s, [item.id]: e.target.checked }))}
                        />
                      </td>
                      <td className="p-3 font-medium">{item.nome}</td>
                      <td className="p-3 text-gray-500 dark:text-gray-400">{item.cpf_cnpj || item.documento || '-'}</td>
                      <td className="p-3 text-gray-500 dark:text-gray-400">{item.telefone ? maskPhone(item.telefone) : '-'}</td>
                      <td className="p-3 text-gray-500 dark:text-gray-400">{item.email || '-'}</td>
                      <td className="p-3 text-gray-500 dark:text-gray-400">{item.endereco ? (item.endereco.split(',').slice(-2).join('/').trim()) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-gray-50 dark:bg-gray-800 border-t dark:border-gray-700 text-gray-700 dark:text-gray-300">
              <div className="flex items-center gap-2">
                <span className="text-xs">Itens por página:</span>
                <select
                  className="bg-white dark:bg-gray-700 border dark:border-gray-600 rounded px-2 py-1 text-xs outline-none"
                  value={pageSize}
                  onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
                >
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                  <option value={500}>500</option>
                </select>
                <span className="text-xs text-gray-500 dark:text-gray-500 ml-2">
                  {((current - 1) * pageSize) + 1} - {Math.min(current * pageSize, filteredItems.length)} de {filteredItems.length}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button className="px-3 py-1 rounded border dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={current === 1}>Anterior</button>
                <span className="text-xs">Página {current} de {totalPages}</span>
                <button className="px-3 py-1 rounded border dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={current === totalPages}>Próxima</button>
              </div>
            </div>
          </>
        )}
      </div>

      <ClientModal
        isOpen={showClientModal}
        onClose={() => {
          setShowClientModal(false)
          setClientToEdit(null)
        }}
        clientToEdit={clientToEdit}
        onSuccess={(client: { id: string, nome: string }) => {
          // Refresh list
          load()
        }}
      />
    </div>
  )
}
