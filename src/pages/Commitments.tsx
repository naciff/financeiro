import { useEffect, useMemo, useState } from 'react'
import { useAppStore } from '../store/AppStore'
import { hasBackend } from '../lib/runtime'
import { listCommitmentGroups, createCommitment, updateCommitment, deleteCommitment, listCommitmentsByGroup } from '../services/db'
import { Icon } from '../components/ui/Icon'

export default function Commitments() {
  const store = useAppStore()
  const [nome, setNome] = useState('')
  const [grupoId, setGrupoId] = useState('')
  const [grupos, setGrupos] = useState<Array<{ id: string; nome: string; operacao?: string }>>([])
  const [items, setItems] = useState<Array<{ id: string; nome: string; grupo_id: string; ir?: boolean }>>([])
  const [editId, setEditId] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [tab, setTab] = useState<'despesa' | 'receita' | 'retirada' | 'aporte'>('despesa')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<{ key: 'nome' | 'grupo'; dir: 'asc' | 'desc' }>({ key: 'nome', dir: 'asc' })

  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [ir, setIr] = useState(false)

  useEffect(() => {
    async function load() {
      if (hasBackend) {
        if (!store.activeOrganization) {
          setGrupos([])
          setItems([])
          return
        }
        const orgId = store.activeOrganization
        const g = await listCommitmentGroups(orgId)
        if (!g.error && g.data) {
          const arr = g.data as any
          setGrupos(arr)
          const all: Array<{ id: string; nome: string; grupo_id: string; ir?: boolean }> = []
          for (const grp of arr) {
            const r = await listCommitmentsByGroup(grp.id)
            if (!r.error && r.data) all.push(...(r.data as any).map((c: any) => ({ id: c.id, nome: c.nome, grupo_id: grp.id, ir: c.ir })))
          }
          setItems(all)
        } else {
          setGrupos([]); setItems([])
        }
      } else {
        setGrupos(store.commitment_groups as any)
        setItems(store.commitments as any)
      }
    }
    load()
  }, [store.activeOrganization])

  // Inicializar expanded vazio (recolhido por padrão)
  // useEffect removido para manter o padrão recolhido

  function onCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim() || !grupoId) return
    if (hasBackend) {
      if (!store.activeOrganization) return
      createCommitment({ nome, grupo_id: grupoId, ir, organization_id: store.activeOrganization }).then(async () => {
        setShowForm(false)
        const g = await listCommitmentGroups(store.activeOrganization!); if (!g.error && g.data) setGrupos(g.data as any)
        const r = await listCommitmentsByGroup(grupoId);
        if (!r.error && r.data) {
          setItems(prev => [...prev.filter(i => i.grupo_id !== grupoId), ...((r.data as any).map((c: any) => ({ id: c.id, nome: c.nome, grupo_id: grupoId, ir: c.ir })))])
        }
      })
    } else {
      store.createCommitment({ nome, grupo_id: grupoId, ir })
      setItems(prev => [...prev, { id: Date.now().toString(), nome, grupo_id: grupoId, ir }])
      setNome(''); setGrupoId(''); setIr(false); setShowForm(false)
    }
  }
  function onUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!editId || !nome.trim() || !grupoId) return
    if (hasBackend) updateCommitment(editId, { nome, grupo_id: grupoId, ir }).then(() => {
      setItems(prev => prev.map(i => i.id === editId ? { ...i, nome, grupo_id: grupoId, ir } : i))
      setShowForm(false)
    })
    else store.updateCommitment(editId, { nome, grupo_id: grupoId, ir })
    setEditId(''); setNome(''); setGrupoId(''); setIr(false); setShowForm(false)
  }

  // Filtrar grupos e itens
  const filteredGroups = grupos.filter(g => ((g as any).operacao || (g as any).tipo) === tab)
  const filteredItems = items.filter(c => {
    const g = grupos.find(g => g.id === c.grupo_id)
    const tipo = (g as any)?.operacao || (g as any)?.tipo
    return tipo === tab && c.nome.toLowerCase().includes(search.toLowerCase())
  })

  // Agrupar itens filtrados
  const groupedItems: Record<string, typeof items> = {}
  filteredItems.forEach(item => {
    if (!groupedItems[item.grupo_id]) groupedItems[item.grupo_id] = []
    groupedItems[item.grupo_id].push(item)
  })

  const [selected, setSelected] = useState<Record<string, boolean>>({})

  // Reset Selection when tab changes
  useEffect(() => { setSelected({}) }, [tab])

  const selectedIds = Object.keys(selected).filter(k => selected[k])
  const canEdit = selectedIds.length === 1
  const canDelete = selectedIds.length > 0

  function handleEdit() {
    if (!canEdit) return
    const id = selectedIds[0]
    const c = items.find(x => x.id === id)
    if (c) {
      setEditId(c.id)
      setNome(c.nome)
      setGrupoId(c.grupo_id)
      setIr((c as any).ir || false)
      setShowForm(true)
    }
  }

  function handleDelete() {
    if (!canDelete) return
    if (!confirm(`Excluir ${selectedIds.length} compromissos selecionados?`)) return

    if (hasBackend) {
      Promise.all(selectedIds.map(id => deleteCommitment(id))).then(() => {
        setItems(prev => prev.filter(i => !selected[i.id]))
        setSelected({})
      })
    } else {
      selectedIds.forEach(id => store.deleteCommitment(id))
      setItems(prev => prev.filter(i => !selected[i.id]))
      setSelected({})
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 w-full">
        <button
          className="flex items-center gap-2 bg-black dark:bg-gray-900 text-white rounded px-3 py-2 hover:bg-gray-800 dark:hover:bg-black transition-colors"
          onClick={() => { setShowForm(true); setIr(false) }}
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
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {search && (
          <button
            className="text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border dark:border-gray-600 rounded px-3 py-2 text-gray-700 dark:text-gray-300 whitespace-nowrap transition-colors"
            onClick={() => setSearch('')}
          >
            Limpar
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        {(['despesa', 'receita', 'retirada', 'aporte'] as const).map(k => {
          const active = tab === k
          const bg = active ? 'bg-fourtek-blue text-white shadow' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200'
          return (<button key={k} className={`px-3 py-2 rounded border dark:border-gray-600 transition-colors duration-300 ${bg}`} onClick={() => setTab(k)}>{k[0].toUpperCase() + k.slice(1)}</button>)
        })}
      </div>

      {showForm && (
        <form onSubmit={editId ? onUpdate : onCreate} className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded p-4 space-y-3">
          <div className="font-medium text-gray-900 dark:text-gray-100">{editId ? 'Editar compromisso' : 'Novo compromisso'}</div>
          <label className="text-sm text-gray-700 dark:text-gray-300">Nome</label>
          <input className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" placeholder="Nome" value={nome} onChange={e => setNome(e.target.value)} />
          <label className="text-sm text-gray-700 dark:text-gray-300">Grupo de Compromisso</label>
          <select className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" value={grupoId} onChange={e => setGrupoId(e.target.value)}>
            <option value="">Selecione o grupo</option>
            {grupos.filter(g => ((g as any).operacao || (g as any).tipo) === tab).map(g => (
              <option key={g.id} value={g.id}>{g.nome} {g.operacao ? `(${g.operacao})` : (g as any).tipo ? `(${(g as any).tipo})` : ''}</option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="irCheck" checked={ir} onChange={e => setIr(e.target.checked)} />
            <label htmlFor="irCheck" className="text-sm text-gray-700 dark:text-gray-300">IR</label>
          </div>
          <div className="flex justify-end gap-2"><button type="button" className="rounded border dark:border-gray-600 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700" onClick={() => { setShowForm(false); setEditId(''); setNome(''); setGrupoId(''); setIr(false) }}>Cancelar</button><button className="bg-black dark:bg-gray-900 text-white rounded px-3 py-2 hover:bg-gray-800 dark:hover:bg-black transition-colors" type="submit">Salvar</button></div>
        </form>
      )}

      <div className="space-y-4">
        {filteredGroups.map(g => {
          const groupItems = groupedItems[g.id] || []
          // Se tiver busca e o grupo não tiver itens correspondentes, não mostra o grupo
          if (search && groupItems.length === 0) return null

          const isExpanded = expanded[g.id]
          const tipo = (g as any).operacao || (g as any).tipo
          const cor = tipo === 'despesa' ? 'text-red-600 dark:text-red-400' : tipo === 'receita' ? 'text-green-600 dark:text-green-400' : tipo === 'aporte' ? 'text-blue-600 dark:text-blue-400' : 'text-yellow-600 dark:text-yellow-400'

          return (
            <div key={g.id} className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded">
              <div
                className="flex items-center gap-3 px-3 py-2 cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                onClick={() => setExpanded(s => ({ ...s, [g.id]: !s[g.id] }))}
              >
                <Icon name={isExpanded ? 'chevron-down' : 'chevron-right'} className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span className={`material-icons-outlined text-lg ${cor}`}>
                  {tipo === 'receita' ? 'arrow_upward' : tipo === 'despesa' ? 'arrow_downward' : tipo === 'aporte' ? 'add_circle' : 'remove_circle'}
                </span>
                <div className="font-medium text-gray-900 dark:text-gray-100">{g.nome}</div>
                <div className="ml-auto text-sm text-gray-600 dark:text-gray-400">{groupItems.length} itens</div>
                <button className="px-2 py-1 rounded border dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600" onClick={e => { e.stopPropagation(); setExpanded(s => ({ ...s, [g.id]: !s[g.id] })) }} aria-label="Expandir/Colapsar">
                  <Icon name={isExpanded ? 'minus' : 'add'} className="w-4 h-4" />
                </button>
              </div>

              {isExpanded && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600 text-gray-700 dark:text-gray-300">
                        <th className="p-2 w-10 pl-4">Seleção</th>
                        <th className="p-2">Nome</th>
                        <th className="p-2 text-center w-16">IR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-gray-700">
                      {groupItems.map(c => (
                        <tr
                          key={c.id}
                          className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer text-gray-900 dark:text-gray-100"
                          onClick={() => setSelected(s => ({ ...s, [c.id]: !s[c.id] }))}
                          onDoubleClick={() => { setEditId(c.id); setNome(c.nome); setGrupoId(c.grupo_id); setIr((c as any).ir || false); setShowForm(true) }}
                        >
                          <td className="p-2 pl-4" onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={!!selected[c.id]}
                              onChange={e => setSelected(s => ({ ...s, [c.id]: e.target.checked }))}
                            />
                          </td>
                          <td className="p-2">{c.nome}</td>
                          <td className="p-2 text-center">{(c as any).ir ? 'Sim' : ''}</td>
                        </tr>
                      ))}
                      {groupItems.length === 0 && (
                        <tr>
                          <td colSpan={3} className="p-4 text-center text-gray-500 dark:text-gray-400 italic">Nenhum compromisso neste grupo</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
