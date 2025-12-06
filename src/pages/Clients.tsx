import { useEffect, useState } from 'react'
import { hasBackend } from '../lib/runtime'
import { listClients, createClient, updateClient, deleteClient } from '../services/db'
import { useAppStore } from '../store/AppStore'

export default function Clients() {
  const store = useAppStore()
  const [items, setItems] = useState<Array<{id:string;nome:string}>>([])
  const [showForm, setShowForm] = useState(false)
  const [nome, setNome] = useState('')
  const [doc, setDoc] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [editId, setEditId] = useState('')

  async function load() {
    setLoading(true); setError(null)
    if (hasBackend) {
      const r = await listClients()
      if (r.error) { setError(r.error.message); setItems([]) }
      else setItems((r.data as any) || [])
    } else {
      setItems(store.clients.map(c => ({ id: c.id, nome: c.nome })))
    }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function onSave(e: React.FormEvent) {
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

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Clientes</h1>
      {!showForm && (
        <div className="bg-white border rounded p-4"><button className="bg-black text-white rounded px-3 py-2" onClick={() => setShowForm(true)} aria-label="Inserir">Incluir</button></div>
      )}
      {showForm && (
        <form onSubmit={onSave} className="bg-white border rounded p-4 space-y-3">
          <div className="font-medium">{editId ? 'Editar cliente' : 'Novo cliente'}</div>
          <label className="text-sm">Nome</label>
          <input className="w-full border rounded px-3 py-2" value={nome} onChange={e => setNome(e.target.value)} />
          <label className="text-sm">CPF/CNPJ (opcional)</label>
          <input className="w-full border rounded px-3 py-2" value={doc} onChange={e => setDoc(e.target.value)} />
          {error && <div className="text-xs text-red-600">{error}</div>}
          <div className="flex justify-end gap-2"><button type="button" className="rounded border px-3 py-2" onClick={() => { setShowForm(false); setError(null); setEditId('') }}>Cancelar</button><button className="bg-black text-white rounded px-3 py-2" type="submit">Salvar</button></div>
        </form>
      )}
      <div className="bg-white border rounded p-4">
        {loading && <div role="status" aria-live="polite" className="text-sm text-gray-600 mb-2">Carregando…</div>}
        {error && <div className="text-sm text-red-700 mb-2">{error}</div>}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="p-2">Nome</th>
                <th className="p-2">CPF/CNPJ</th>
                <th className="p-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c: any) => (
                <tr key={c.id} className="border-t">
                  <td className="p-2">{c.nome}</td>
                  <td className="p-2">{c.documento || ''}</td>
                  <td className="p-2">
                    <button className="px-2 py-1 rounded border hover:bg-gray-50 mr-2" onClick={() => { setEditId(c.id); setNome(c.nome); setDoc(c.documento || ''); setShowForm(true) }} aria-label={`Editar ${c.nome}`}>Editar</button>
                    <button className="px-2 py-1 rounded border hover:bg-gray-50" onClick={async () => { if (!confirm('Confirma exclusão?')) return; if (hasBackend) await deleteClient(c.id); else setItems(prev => prev.filter((x:any)=>x.id!==c.id)); load() }} aria-label={`Excluir ${c.nome}`}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
