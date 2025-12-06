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
  const [tab, setTab] = useState<'despesa' | 'receita' | 'aporte' | 'retirada'>('despesa')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<{ key: 'nome' | 'grupo'; dir: 'asc' | 'desc' }>({ key: 'nome', dir: 'asc' })

  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [ir, setIr] = useState(false)

  useEffect(() => {
    async function load() {
      if (hasBackend) {
        const g = await listCommitmentGroups()
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
  }, [store.commitment_groups, store.commitments])

  // Inicializar expanded vazio (recolhido por padrão)
  // useEffect removido para manter o padrão recolhido

  function onCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim() || !grupoId) return
    if (hasBackend) createCommitment({ nome, grupo_id: grupoId, ir }).then(async () => {
      setShowForm(false)
      const g = await listCommitmentGroups(); if (!g.error && g.data) setGrupos(g.data as any)
      const r = await listCommitmentsByGroup(grupoId);
      if (!r.error && r.data) {
        setItems(prev => [...prev.filter(i => i.grupo_id !== grupoId), ...((r.data as any).map((c: any) => ({ id: c.id, nome: c.nome, grupo_id: grupoId, ir: c.ir })))])
      }
    })
    else { store.createCommitment({ nome, grupo_id: grupoId, ir }); setItems(prev => [...prev, { id: Date.now().toString(), nome, grupo_id: grupoId, ir }]) }
    setNome(''); setGrupoId(''); setIr(false); setShowForm(false)
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

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Compromissos</h1>
      <div className="flex items-center gap-2">
        {(['despesa', 'receita', 'aporte', 'retirada'] as const).map(k => {
          const active = tab === k
          const bg = active ? 'bg-fourtek-blue text-white shadow' : 'bg-white'
          return (<button key={k} className={`px-3 py-2 rounded border transition-colors duration-300 ${bg}`} onClick={() => setTab(k)}>{k[0].toUpperCase() + k.slice(1)}</button>)
        })}
        <div className="ml-auto flex items-center gap-2 bg-white border rounded px-3 py-2">
          <label className="text-sm" htmlFor="commitSearch">Filtro</label>
          <input id="commitSearch" className="outline-none" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>
      {!showForm && (
        <div className="bg-white border rounded p-4"><button className="bg-black text-white rounded px-3 py-2" onClick={() => { setShowForm(true); setIr(false) }} aria-label="Inserir">Incluir</button></div>
      )}
      {showForm && (
        <form onSubmit={editId ? onUpdate : onCreate} className="bg-white border rounded p-4 space-y-3">
          <div className="font-medium">{editId ? 'Editar compromisso' : 'Novo compromisso'}</div>
          <label className="text-sm">Nome</label>
          <input className="w-full border rounded px-3 py-2" placeholder="Nome" value={nome} onChange={e => setNome(e.target.value)} />
          <label className="text-sm">Grupo de Compromisso</label>
          <select className="w-full border rounded px-3 py-2" value={grupoId} onChange={e => setGrupoId(e.target.value)}>
            <option value="">Selecione o grupo</option>
            {grupos.filter(g => ((g as any).operacao || (g as any).tipo) === tab).map(g => (
              <option key={g.id} value={g.id}>{g.nome} {g.operacao ? `(${g.operacao})` : (g as any).tipo ? `(${(g as any).tipo})` : ''}</option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="irCheck" checked={ir} onChange={e => setIr(e.target.checked)} />
            <label htmlFor="irCheck" className="text-sm">IR</label>
          </div>
          <div className="flex justify-end gap-2"><button type="button" className="rounded border px-3 py-2" onClick={() => { setShowForm(false); setEditId(''); setNome(''); setGrupoId(''); setIr(false) }}>Cancelar</button><button className="bg-black text-white rounded px-3 py-2" type="submit">Salvar</button></div>
        </form>
      )}

      <div className="space-y-4">
        {filteredGroups.map(g => {
          const groupItems = groupedItems[g.id] || []
          // Se tiver busca e o grupo não tiver itens correspondentes, não mostra o grupo
          if (search && groupItems.length === 0) return null

          const isExpanded = expanded[g.id]
          const tipo = (g as any).operacao || (g as any).tipo
          const icon = tipo === 'despesa' ? 'out' : tipo === 'receita' ? 'in' : tipo === 'aporte' ? 'deposit' : 'withdraw'
          const cor = tipo === 'despesa' ? 'text-red-600' : tipo === 'receita' ? 'text-green-600' : tipo === 'aporte' ? 'text-blue-600' : 'text-yellow-600'

          return (
            <div key={g.id} className="bg-white border rounded">
              <div
                className="flex items-center gap-3 px-3 py-2 cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                onClick={() => setExpanded(s => ({ ...s, [g.id]: !s[g.id] }))}
              >
                <Icon name={isExpanded ? 'chevron-down' : 'chevron-right'} className="w-4 h-4" />
                <Icon name={icon} className={`w-5 h-5 ${cor}`} />
                <div className="font-medium">{g.nome}</div>
                <div className="ml-auto text-sm text-gray-600">{groupItems.length} itens</div>
                <button className="px-2 py-1 rounded border" onClick={e => { e.stopPropagation(); setExpanded(s => ({ ...s, [g.id]: !s[g.id] })) }} aria-label="Expandir/Colapsar">
                  <Icon name={isExpanded ? 'minus' : 'add'} className="w-4 h-4" />
                </button>
              </div>

              {isExpanded && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left bg-gray-50 border-b">
                        <th className="p-2 pl-8">Nome</th>
                        <th className="p-2 text-center w-16">IR</th>
                        <th className="p-2">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupItems.map(c => (
                        <tr key={c.id} className="border-t hover:bg-gray-50">
                          <td className="p-2 pl-8">{c.nome}</td>
                          <td className="p-2 text-center">{(c as any).ir ? 'Sim' : ''}</td>
                          <td className="p-2">
                            <button className="px-2 py-1 rounded border hover:bg-gray-50 mr-2" onClick={() => { setEditId(c.id); setNome(c.nome); setGrupoId(c.grupo_id); setIr((c as any).ir || false); setShowForm(true) }} aria-label={`Editar ${c.nome}`}>Editar</button>
                            <button className="px-2 py-1 rounded border hover:bg-gray-50" onClick={() => {
                              if (!confirm('Confirma exclusão?')) return
                              if (hasBackend) {
                                deleteCommitment(c.id).then(() => {
                                  setItems(prev => prev.filter(i => i.id !== c.id))
                                })
                              }
                              else store.deleteCommitment(c.id)
                            }} aria-label={`Excluir ${c.nome}`}>Excluir</button>
                          </td>
                        </tr>
                      ))}
                      {groupItems.length === 0 && (
                        <tr>
                          <td colSpan={3} className="p-4 text-center text-gray-500 italic">Nenhum compromisso neste grupo</td>
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
