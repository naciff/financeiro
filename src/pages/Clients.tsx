import { useEffect, useState } from 'react'
import { hasBackend } from '../lib/runtime'
import { listClients, createClient, updateClient, deleteClient } from '../services/db'
import { useAppStore } from '../store/AppStore'
import { ClientModal } from '../components/modals/ClientModal'
import { Icon } from '../components/ui/Icon'

export default function Clients() {
  const store = useAppStore()
  const [items, setItems] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [nome, setNome] = useState('')
  const [cpfCnpj, setCpfCnpj] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [cep, setCep] = useState('')
  const [endereco, setEndereco] = useState('')
  const [numero, setNumero] = useState('')
  const [complemento, setComplemento] = useState('')
  const [bairro, setBairro] = useState('')
  const [cidade, setCidade] = useState('')
  const [uf, setUf] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState('')

  const [showClientModal, setShowClientModal] = useState(false)

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
      setItems(store.clients.map(c => ({ id: c.id, nome: c.nome, cpf_cnpj: c.documento, telefone: c.telefone, email: c.email, cep: c.cep, endereco: c.endereco, numero: c.numero, complemento: c.complemento, bairro: c.bairro, cidade: c.cidade, uf: c.uf, observacoes: c.observacoes })))
    }
    setLoading(false)
  }
  useEffect(() => { load() }, [store.activeOrganization])

  async function onSave(e: React.FormEvent) {
    // ... existing onSave code ...
    e.preventDefault()
    if (!nome.trim()) { setError('Nome é obrigatório'); return }
    setError(null)
    const clientData = {
      nome,
      cpf_cnpj: cpfCnpj || undefined,
      telefone: telefone || undefined,
      email: email || undefined,
      cep: cep || undefined,
      endereco: endereco || undefined,
      numero: numero || undefined,
      complemento: complemento || undefined,
      bairro: bairro || undefined,
      cidade: cidade || undefined,
      uf: uf || undefined,
      observacoes: observacoes || undefined,
    }
    if (hasBackend) {
      if (editId) {
        const r = await updateClient(editId, clientData)
        if (r.error) setError(r.error.message)
      } else {
        if (!store.activeOrganization) {
          setError('Nenhuma empresa selecionada')
          return
        }
        const r = await createClient({ ...clientData, organization_id: store.activeOrganization })
        if (r.error) setError(r.error.message)
      }
    } else {
      if (editId) {
        store.updateClient(editId, clientData as any)
      } else {
        store.createClient(clientData as any)
      }
    }
    setNome(''); setCpfCnpj(''); setTelefone(''); setEmail(''); setCep(''); setEndereco(''); setNumero(''); setComplemento(''); setBairro(''); setCidade(''); setUf(''); setObservacoes(''); setEditId(''); setShowForm(false); load()
  }

  function handleEdit() {
    const selectedIds = Object.keys(selected).filter(id => selected[id])
    if (selectedIds.length !== 1) return
    const idToEdit = selectedIds[0]
    const c = items.find(x => x.id === idToEdit) as any
    if (c) {
      setEditId(c.id)
      setNome(c.nome)
      setCpfCnpj(c.cpf_cnpj || '')
      setTelefone(c.telefone || '')
      setEmail(c.email || '')
      setCep(c.cep || '')
      setEndereco(c.endereco || '')
      setNumero(c.numero || '')
      setComplemento(c.complemento || '')
      setBairro(c.bairro || '')
      setCidade(c.cidade || '')
      setUf(c.uf || '')
      setObservacoes(c.observacoes || '')
      setShowForm(true)
    }
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
          onClick={() => setShowClientModal(true)}
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
      </div>

      {!showForm ? null : (
        <form onSubmit={onSave} className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded p-4 space-y-3">
          <div className="font-medium text-gray-900 dark:text-gray-100">{editId ? 'Editar cliente' : 'Novo cliente'}</div>
          <label className="text-sm text-gray-700 dark:text-gray-300">Nome</label>
          <input className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" value={nome} onChange={e => setNome(e.target.value)} />
          <label className="text-sm text-gray-700 dark:text-gray-300">CPF/CNPJ (opcional)</label>
          <input className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" value={cpfCnpj} onChange={e => setCpfCnpj(e.target.value)} />
          <label className="text-sm text-gray-700 dark:text-gray-300">Telefone (opcional)</label>
          <input className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" value={telefone} onChange={e => setTelefone(e.target.value)} />
          <label className="text-sm text-gray-700 dark:text-gray-300">Email (opcional)</label>
          <input className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" value={email} onChange={e => setEmail(e.target.value)} />
          <label className="text-sm text-gray-700 dark:text-gray-300">CEP (opcional)</label>
          <input className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" value={cep} onChange={e => setCep(e.target.value)} />
          <label className="text-sm text-gray-700 dark:text-gray-300">Endereço (opcional)</label>
          <input className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" value={endereco} onChange={e => setEndereco(e.target.value)} />
          <label className="text-sm text-gray-700 dark:text-gray-300">Número (opcional)</label>
          <input className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" value={numero} onChange={e => setNumero(e.target.value)} />
          <label className="text-sm text-gray-700 dark:text-gray-300">Complemento (opcional)</label>
          <input className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" value={complemento} onChange={e => setComplemento(e.target.value)} />
          <label className="text-sm text-gray-700 dark:text-gray-300">Bairro (opcional)</label>
          <input className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" value={bairro} onChange={e => setBairro(e.target.value)} />
          <label className="text-sm text-gray-700 dark:text-gray-300">Cidade (opcional)</label>
          <input className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" value={cidade} onChange={e => setCidade(e.target.value)} />
          <label className="text-sm text-gray-700 dark:text-gray-300">UF (opcional)</label>
          <input className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" value={uf} onChange={e => setUf(e.target.value)} />
          <label className="text-sm text-gray-700 dark:text-gray-300">Observações (opcional)</label>
          <textarea className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" value={observacoes} onChange={e => setObservacoes(e.target.value)} />
          {error && <div className="text-xs text-red-600 dark:text-red-400">{error}</div>}
          <div className="flex justify-end gap-2"><button type="button" className="rounded border dark:border-gray-600 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700" onClick={() => { setShowForm(false); setError(null); setEditId('') }}>Cancelar</button><button className="bg-black dark:bg-gray-900 text-white rounded px-3 py-2 hover:bg-gray-800 dark:hover:bg-black transition-colors" type="submit">Salvar</button></div>
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
                        setEditId(item.id)
                        setNome(item.nome)
                        setCpfCnpj(item.cpf_cnpj || '')
                        setTelefone(item.telefone || '')
                        setEmail(item.email || '')
                        setCep(item.cep || '')
                        setEndereco(item.endereco || '')
                        setNumero(item.numero || '')
                        setComplemento(item.complemento || '')
                        setBairro(item.bairro || '')
                        setCidade(item.cidade || '')
                        setUf(item.uf || '')
                        setObservacoes(item.observacoes || '')
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
                      <td className="p-3 font-medium">{item.nome}</td>
                      <td className="p-3 text-gray-500 dark:text-gray-400">{item.cpf_cnpj || '-'}</td>
                      <td className="p-3 text-gray-500 dark:text-gray-400">{item.telefone || '-'}</td>
                      <td className="p-3 text-gray-500 dark:text-gray-400">{item.cidade ? `${item.cidade}/${item.uf}` : '-'}</td>
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
        onClose={() => setShowClientModal(false)}
        onSuccess={(client: { id: string, nome: string }) => {
          setItems(prev => [client, ...prev])
          load()
        }}
      />
    </div>
  )
}
