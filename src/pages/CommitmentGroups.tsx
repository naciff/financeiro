import { useEffect, useState } from 'react'
import { useAppStore } from '../store/AppStore'
import { hasBackend } from '../lib/runtime'
import { listCommitmentGroups, createCommitmentGroup, updateCommitmentGroup, deleteCommitmentGroup } from '../services/db'
import { Icon } from '../components/ui/Icon'

export default function CommitmentGroups() {
  const store = useAppStore()
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState<'despesa' | 'receita' | 'aporte' | 'retirada'>('despesa')
  const [items, setItems] = useState<Array<{ id: string; nome: string; operacao?: string }>>([])
  const [editId, setEditId] = useState<string>('')
  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    try { const raw = localStorage.getItem('groups.expanded'); return raw ? JSON.parse(raw) : { despesa: true, receita: true, aporte: true, retirada: true } } catch { return { despesa: true, receita: true, aporte: true, retirada: true } }
  })
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [selected, setSelected] = useState<Record<string, boolean>>({})

  useEffect(() => { try { localStorage.setItem('groups.expanded', JSON.stringify(expanded)) } catch { } }, [expanded])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    setLoading(true); setError(null)
    if (hasBackend) {
      const orgId = store.activeOrganization
      if (orgId) {
        listCommitmentGroups(orgId).then(r => {
          if (r.error) { setError(r.error.message); setItems([]) }
          else {
            const data = Array.isArray(r.data) ? r.data : []
            setItems(data.filter((x: any) => x && typeof x.id === 'string' && typeof x.nome === 'string'))
          }
          setLoading(false)
        }).catch(e => { setError(String(e)); setItems([]); setLoading(false) })
      } else {
        setItems([])
        setLoading(false)
      }
    } else {
      const data: any = store.commitment_groups
      const valid = Array.isArray(data) ? data.filter((x: any) => x && typeof x.id === 'string' && typeof x.nome === 'string') : []
      setItems(valid); setLoading(false)
    }
  }, [store.commitment_groups, store.activeOrganization])

  function onCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return
    if (hasBackend) {
      if (!store.activeOrganization) { setError('Organização não selecionada'); return }
      createCommitmentGroup({ nome, operacao: tipo, organization_id: store.activeOrganization! }).then(() => listCommitmentGroups(store.activeOrganization!).then(r => { if (!r.error && r.data) setItems(r.data as any) }))
    } else {
      store.createCommitmentGroup({ nome, operacao: tipo } as any)
    }
    setNome(''); setShowForm(false)
  }
  function onUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!editId || !nome.trim()) return
    if (hasBackend) {
      if (!store.activeOrganization) return
      updateCommitmentGroup(editId, { nome, operacao: tipo }).then(() => listCommitmentGroups(store.activeOrganization!).then(r => { if (!r.error && r.data) setItems(r.data as any) }))
    }
    else store.updateCommitmentGroup(editId, { nome, operacao: tipo } as any)
    setEditId(''); setNome(''); setShowForm(false)
  }


  const selectedIds = Object.keys(selected).filter(k => selected[k])
  const canEdit = selectedIds.length === 1
  const canDelete = selectedIds.length > 0

  function handleEdit() {
    if (!canEdit) return
    const id = selectedIds[0]
    const g = items.find(x => x.id === id)
    if (g) {
      setEditId(g.id)
      setNome(g.nome)
      setTipo((g.operacao as any) || 'despesa')
      setShowForm(true)
    }
  }

  function handleDelete() {
    if (!canDelete) return
    if (!confirm(`Excluir ${selectedIds.length} grupos selecionados?`)) return

    const promise = hasBackend
      ? Promise.all(selectedIds.map(id => deleteCommitmentGroup(id)))
      : Promise.resolve(selectedIds.forEach(id => store.deleteCommitmentGroup(id)))

    promise.then(() => {
      setSelected({})
      if (hasBackend && store.activeOrganization) {
        listCommitmentGroups(store.activeOrganization).then(r => { if (!r.error && r.data) setItems(r.data as any) })
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 w-full">
        <button
          className="flex items-center gap-2 bg-black dark:bg-gray-900 text-white rounded px-3 py-2 hover:bg-gray-800 dark:hover:bg-black transition-colors"
          onClick={() => setShowForm(true)}
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
            placeholder="Buscar por nome"
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

      {showForm && (
        <form onSubmit={editId ? onUpdate : onCreate} className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded p-4 space-y-3">
          <div className="font-medium text-gray-900 dark:text-gray-100">{editId ? 'Editar grupo' : 'Novo grupo'}</div>
          <label className="text-sm text-gray-700 dark:text-gray-300">Tipo</label>
          <select className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" value={tipo} onChange={e => setTipo(e.target.value as any)}>
            <option value="despesa">Despesa</option>
            <option value="receita">Receita</option>
            <option value="aporte">Aporte</option>
            <option value="retirada">Retirada</option>
          </select>
          <label className="text-sm text-gray-700 dark:text-gray-300">Nome</label>
          <input className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" placeholder="Nome" value={nome} onChange={e => setNome(e.target.value)} />
          <div className="flex justify-end gap-2"><button type="button" className="rounded border dark:border-gray-600 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700" onClick={() => { setShowForm(false); setEditId(''); setNome('') }}>Cancelar</button><button className="bg-black dark:bg-gray-900 text-white rounded px-3 py-2 hover:bg-gray-800 dark:hover:bg-black transition-colors" type="submit">Salvar</button></div>
        </form>
      )}

      <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded p-4">
        {loading && <div role="status" aria-live="polite" className="text-sm text-gray-600 dark:text-gray-400 mb-2">Carregando grupos…</div>}
        {error && <div className="text-sm text-red-700 dark:text-red-400 mb-2">Erro ao carregar grupos: {error}</div>}

        {/* Inner header removed, loop types */}
        {(['despesa', 'receita', 'aporte', 'retirada'] as const).map(tipoKey => {
          const cor = tipoKey === 'despesa' ? 'text-red-600 dark:text-red-400' : tipoKey === 'receita' ? 'text-green-600 dark:text-green-400' : tipoKey === 'aporte' ? 'text-blue-600 dark:text-blue-400' : 'text-yellow-600 dark:text-yellow-400'
          const groupItems = items.filter(g => (g.operacao || 'despesa') === tipoKey).filter(g => g.nome.toLowerCase().includes(search.toLowerCase()))

          if (groupItems.length === 0 && search) return null // Hide empty groups when searching? Optional. Leaving standard behavior.

          const totalPages = Math.max(1, Math.ceil(groupItems.length / pageSize))
          const current = Math.min(page, totalPages)
          const pageItems = groupItems.slice((current - 1) * pageSize, current * pageSize)
          return (
            <div key={tipoKey} className="mb-4 border dark:border-gray-700 rounded bg-white dark:bg-gray-800">
              <div className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors" onClick={() => setExpanded(s => ({ ...s, [tipoKey]: !s[tipoKey] }))}>
                <Icon name={expanded[tipoKey] ? 'chevron-down' : 'chevron-right'} className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span className={`material-icons-outlined text-lg ${cor}`}>
                  {tipoKey === 'receita' ? 'arrow_upward' : tipoKey === 'despesa' ? 'arrow_downward' : tipoKey === 'aporte' ? 'add_circle' : 'remove_circle'}
                </span>
                <div className="font-medium capitalize text-gray-900 dark:text-gray-100">{tipoKey}</div>
                <div className="ml-auto text-sm text-gray-600 dark:text-gray-400">{groupItems.length} itens</div>
                <button className="px-2 py-1 rounded border dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600" onClick={e => { e.stopPropagation(); setExpanded(s => ({ ...s, [tipoKey]: !s[tipoKey] })) }} aria-label="Expandir/Colapsar">
                  <Icon name={expanded[tipoKey] ? 'minus' : 'add'} className="w-4 h-4" />
                </button>
              </div>
              {expanded[tipoKey] && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        <th className="p-2 w-10">Seleção</th>
                        <th className="p-2">Nome</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-900 dark:text-gray-100">
                      {pageItems.map(g => (
                        <tr
                          key={g.id}
                          className="border-t dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                          onClick={() => setSelected(s => ({ ...s, [g.id]: !s[g.id] }))}
                          onDoubleClick={() => { setEditId(g.id); setNome(g.nome); setTipo((g.operacao as any) || 'despesa'); setShowForm(true) }}
                        >
                          <td className="p-2" onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={!!selected[g.id]}
                              onChange={e => setSelected(s => ({ ...s, [g.id]: e.target.checked }))}
                              aria-label={`Selecionar ${g.nome}`}
                            />
                          </td>
                          <td className="p-2">{g.nome}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-end gap-2 p-2 text-gray-700 dark:text-gray-300">
                      <button className="px-3 py-1 rounded border dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={current === 1}>Anterior</button>
                      <span>Página {current} de {totalPages}</span>
                      <button className="px-3 py-1 rounded border dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={current === totalPages}>Próxima</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
