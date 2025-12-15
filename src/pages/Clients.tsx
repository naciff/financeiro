import { useEffect, useState } from 'react'
import { hasBackend } from '../lib/runtime'
import { listClients, createClient, updateClient, deleteClient } from '../services/db'
import { useAppStore } from '../store/AppStore'
import { ClientModal } from '../components/modals/ClientModal'
import { Icon } from '../components/ui/Icon'

export default function Clients() {
  const store = useAppStore()
  const [items, setItems] = useState<Array<{ id: string; nome: string }>>([])
  const [showForm, setShowForm] = useState(false)
  const [nome, setNome] = useState('')
  const [doc, setDoc] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [editId, setEditId] = useState('')

  const [showClientModal, setShowClientModal] = useState(false)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(100)

  const filteredItems = items.filter(i => i.nome.toLowerCase().includes(searchTerm.toLowerCase()))

  // Calculate pagination
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedItems = filteredItems.slice(startIndex, endIndex)

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  async function load() {
    setLoading(true); setError(null)
    if (hasBackend) {
      const orgId = store.activeOrganization || undefined
      const r = await listClients(orgId)
      if (r.error) { setError(r.error.message); setItems([]) }
      else setItems((r.data as any) || [])
    } else {
      setItems(store.clients.map(c => ({ id: c.id, nome: c.nome })))
    }
    setLoading(false)
  }
  useEffect(() => { load() }, [store.activeOrganization])

  async function onSave(e: React.FormEvent) {
    // ... existing onSave code ...
    e.preventDefault()
    if (!nome.trim()) { setError('Nome é obrigatório'); return }
    setError(null)
    if (hasBackend) {
      if (editId) {
        const r = await updateClient(editId, { nome, documento: doc || undefined })
        if (r.error) setError(r.error.message)
      } else {
        const r = await createClient({ nome, documento: doc || undefined })
        if (r.error) setError(r.error.message)
      }
    } else {
      if (editId) {
        store.updateClient(editId, { nome, documento: doc || undefined } as any)
      } else {
        store.createClient({ nome, documento: doc || undefined })
      }
    }
    setNome(''); setDoc(''); setEditId(''); setShowForm(false); load()
  }

  function handleEdit() {
    if (!selectedId) return
    const c = items.find(x => x.id === selectedId) as any
    if (c) {
      setEditId(c.id)
      setNome(c.nome)
      setDoc(c.documento || '')
      setShowForm(true)
    }
  }

  async function handleDelete() {
    if (!selectedId) return
    if (!confirm('Confirma exclusão?')) return
    if (hasBackend) await deleteClient(selectedId)
    else setItems(prev => prev.filter((x: any) => x.id !== selectedId))
    setSelectedId(null)
    load()
  }

  return (
    <div className="space-y-6">
      {/* Filters & Actions Toolbar */}
      <div className="flex flex-wrap items-center gap-2 w-full">
        <button
          className="flex items-center gap-2 bg-black dark:bg-gray-900 text-white rounded px-3 py-2 hover:bg-gray-800 dark:hover:bg-black transition-colors"
          onClick={() => setShowClientModal(true)}
        >
          <Icon name="add" className="w-4 h-4" /> Incluir
        </button>

        <button
          className="flex items-center gap-2 bg-blue-600 text-white rounded px-3 py-2 disabled:opacity-50 transition-colors"
          disabled={!selectedId}
          onClick={handleEdit}
        >
          <Icon name="edit" className="w-4 h-4" /> Alterar
        </button>

        <button
          className="flex items-center gap-2 bg-red-600 text-white rounded px-3 py-2 disabled:opacity-50 transition-colors"
          disabled={!selectedId}
          onClick={handleDelete}
        >
          <Icon name="trash" className="w-4 h-4" /> Excluir
        </button>

        <div className="flex-1 flex items-center gap-2 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded px-3 py-2 min-w-[200px]">
          <Icon name="search" className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <input
            className="outline-none w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 text-sm"
            placeholder="Pesquisa por nome"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {!showForm ? null : (
        <form onSubmit={onSave} className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded p-4 space-y-3">
          <div className="font-medium text-gray-900 dark:text-gray-100">{editId ? 'Editar cliente' : 'Novo cliente'}</div>
          <label className="text-sm text-gray-700 dark:text-gray-300">Nome</label>
          <input className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" value={nome} onChange={e => setNome(e.target.value)} />
          <label className="text-sm text-gray-700 dark:text-gray-300">CPF/CNPJ (opcional)</label>
          <input className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" value={doc} onChange={e => setDoc(e.target.value)} />
          {error && <div className="text-xs text-red-600 dark:text-red-400">{error}</div>}
          <div className="flex justify-end gap-2"><button type="button" className="rounded border dark:border-gray-600 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700" onClick={() => { setShowForm(false); setError(null); setEditId('') }}>Cancelar</button><button className="bg-black dark:bg-gray-900 text-white rounded px-3 py-2 hover:bg-gray-800 dark:hover:bg-black transition-colors" type="submit">Salvar</button></div>
        </form>
      )}

      <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded p-4">
        {loading && <div role="status" aria-live="polite" className="text-sm text-gray-600 dark:text-gray-400 mb-2">Carregando…</div>}
        {error && <div className="text-sm text-red-700 dark:text-red-400 mb-2">{error}</div>}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600 text-gray-700 dark:text-gray-300">
                <th className="p-2">Nome</th>
                <th className="p-2">CPF/CNPJ</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700 text-gray-900 dark:text-gray-100">
              {paginatedItems.map((c: any) => (
                <tr
                  key={c.id}
                  className={`border-t dark:border-gray-700 cursor-pointer ${selectedId === c.id ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                  onClick={() => setSelectedId(selectedId === c.id ? null : c.id)}
                  onDoubleClick={() => { setSelectedId(c.id); setEditId(c.id); setNome(c.nome); setDoc(c.documento || ''); setShowForm(true) }}
                >
                  <td className="p-2">{c.nome}</td>
                  <td className="p-2">{c.documento || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 text-sm text-gray-700 dark:text-gray-300">
          <div className="flex items-center gap-2">
            <span>Itens por página:</span>
            <select
              className="border dark:border-gray-600 rounded p-1 bg-white dark:bg-gray-700"
              value={itemsPerPage}
              onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1) }}
            >
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value={500}>500</option>
            </select>
            <span className="ml-2">
              {filteredItems.length === 0 ? '0' : startIndex + 1} - {Math.min(endIndex, filteredItems.length)} de {filteredItems.length}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              className="px-3 py-1 border dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            >
              Anterior
            </button>
            <button
              className="px-3 py-1 border dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            >
              Próxima
            </button>
          </div>
        </div>
      </div>

      <ClientModal
        isOpen={showClientModal}
        onClose={() => setShowClientModal(false)}
        onSuccess={(client: { id: string, nome: string }) => {
          setItems(prev => [client, ...prev])
          load()
        }}
      />
    </div>
  )
}
