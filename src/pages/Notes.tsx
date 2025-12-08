
import React, { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { Icon } from '../components/ui/Icon'
import { hasBackend } from '../lib/runtime'

type Note = {
    id: string
    created_at: string
    group_name: string
    description: string
    content: string
}

export default function Notes() {
    const [notes, setNotes] = useState<Note[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editId, setEditId] = useState<string | null>(null)

    // Form states
    const [groupName, setGroupName] = useState('')
    const [description, setDescription] = useState('')
    const [content, setContent] = useState('')
    const [date, setDate] = useState('')

    // Expanded state for groups
    const [expanded, setExpanded] = useState<Record<string, boolean>>({})

    // Load notes
    useEffect(() => {
        loadNotes()
    }, [])

    async function loadNotes() {
        if (!hasBackend || !supabase) {
            setLoading(false)
            return
        }

        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('notes')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error
            if (data) setNotes(data)
        } catch (error) {
            console.error('Error loading notes:', error)
        } finally {
            setLoading(false)
        }
    }

    // Derived state for unique groups
    const existingGroups = useMemo(() => {
        const groups = new Set(notes.map(n => n.group_name))
        return Array.from(groups).sort()
    }, [notes])

    // Group items
    const groupedNotes = useMemo(() => {
        const groups: Record<string, Note[]> = {}
        notes.forEach(note => {
            if (!groups[note.group_name]) groups[note.group_name] = []
            groups[note.group_name].push(note)
        })
        return groups
    }, [notes])

    // Initialize expanded state when notes load (if not already set)
    useEffect(() => {
        if (notes.length > 0) {
            setExpanded(prev => {
                const next = { ...prev }
                Object.keys(groupedNotes).forEach(g => {
                    if (next[g] === undefined) next[g] = false // Default collapsed
                })
                return next
            })
        }
    }, [groupedNotes, notes.length])


    // Handlers
    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!hasBackend || !supabase) return
        if (!groupName.trim() || !description.trim()) return

        try {
            // Use the selected date combined with current time for precision if needed, 
            // or just the date at 12:00 to avoid timezone shifts. 
            // Here we append a time to match timestamptz format approximately or let postgres handle it.
            // But usually created_at is a timestamp. Let's assume we want to set the time component to now if new, or keep time if editing?
            // User requested "Data Editavel", creating a new note "pegar sempre a data do dia".
            // We will set the time to 12:00:00 to be safe on the specific day.
            const dateToSave = new Date(date + 'T12:00:00').toISOString()

            if (editId) {
                // Update
                const { error } = await supabase
                    .from('notes')
                    .update({
                        group_name: groupName,
                        description,
                        content,
                        created_at: dateToSave
                    })
                    .eq('id', editId)

                if (error) throw error
            } else {
                // Create
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return

                const { error } = await supabase
                    .from('notes')
                    .insert({
                        user_id: user.id,
                        group_name: groupName,
                        description,
                        content,
                        created_at: dateToSave
                    })

                if (error) throw error
            }

            await loadNotes()
            resetForm()
        } catch (error) {
            console.error('Error saving note:', error)
            alert('Erro ao salvar nota')
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Tem certeza que deseja excluir esta nota?')) return
        if (!hasBackend || !supabase) return

        try {
            const { error } = await supabase
                .from('notes')
                .delete()
                .eq('id', id)

            if (error) throw error
            setNotes(prev => prev.filter(n => n.id !== id))
        } catch (error) {
            console.error('Error deleting note:', error)
            alert('Erro ao excluir nota')
        }
    }

    function handleEdit(note: Note) {
        setEditId(note.id)
        setGroupName(note.group_name)
        setDescription(note.description)
        setContent(note.content || '')
        // Extract YYYY-MM-DD from timestamp
        const d = new Date(note.created_at)
        const yyyy = d.getFullYear()
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const dd = String(d.getDate()).padStart(2, '0')
        setDate(`${yyyy}-${mm}-${dd}`)

        setShowForm(true)
    }

    function handleNew() {
        resetForm()
        // Set date to today
        const now = new Date()
        const yyyy = now.getFullYear()
        const mm = String(now.getMonth() + 1).padStart(2, '0')
        const dd = String(now.getDate()).padStart(2, '0')
        setDate(`${yyyy}-${mm}-${dd}`)
        setShowForm(true)
    }

    function resetForm() {
        setEditId(null)
        setGroupName('')
        setDescription('')
        setContent('')
        setDate('')
        setShowForm(false)
    }

    const formatDate = (dateStr: string) => {
        // Parse date considering timezone offset directly or just split string if we saved as ISO
        // Since we save as ISO with time potentially, let's use standard date formatting
        return new Date(dateStr).toLocaleDateString('pt-BR')
    }

    return (
        <div className="space-y-6">
            <h1 className="text-xl font-semibold">Notas</h1>

            {!showForm && (
                <div className="bg-white border rounded p-4">
                    <button
                        onClick={handleNew}
                        className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded hover:bg-gray-800 transition-colors"
                    >
                        <Icon name="add" className="w-5 h-5" />
                        Nova Nota
                    </button>
                </div>
            )}

            {showForm && (
                <div className="bg-white border rounded-lg p-6 shadow-sm">
                    <h2 className="text-lg font-medium mb-4">{editId ? 'Editar Nota' : 'Nova Nota'}</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                    className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Grupo</label>
                                <input
                                    type="text"
                                    list="groups-list"
                                    value={groupName}
                                    onChange={e => setGroupName(e.target.value)}
                                    className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Selecione ou digite um novo grupo"
                                    required
                                />
                                <datalist id="groups-list">
                                    {existingGroups.map(g => (
                                        <option key={g} value={g} />
                                    ))}
                                </datalist>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Resumo da nota"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Conteúdo</label>
                            <textarea
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                rows={6}
                                className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none font-sans"
                                placeholder="Digite o conteúdo da nota..."
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-4 py-2 border rounded hover:bg-gray-50 text-gray-700"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                                Salvar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {loading ? (
                <div className="text-center py-8 text-gray-500">Carregando notas...</div>
            ) : notes.length === 0 ? (
                <div className="text-center py-12 bg-white border rounded-lg text-gray-500">
                    Nenhuma nota encontrada. Crie a primeira!
                </div>
            ) : (
                <div className="space-y-4">
                    {existingGroups.map(group => {
                        const groupItems = groupedNotes[group] || []
                        const isExpanded = expanded[group]

                        return (
                            <div key={group} className="bg-white border rounded">
                                <div
                                    className="flex items-center gap-3 px-3 py-2 cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                                    onClick={() => setExpanded(s => ({ ...s, [group]: !s[group] }))}
                                >
                                    <Icon name={isExpanded ? 'chevron-down' : 'chevron-right'} className="w-4 h-4" />
                                    <div className="font-medium">{group}</div>
                                    <div className="ml-auto text-sm text-gray-600">{groupItems.length} notas</div>
                                </div>

                                {isExpanded && (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-gray-50 border-b">
                                                <tr>
                                                    <th className="px-6 py-3 font-medium text-gray-500">Data</th>
                                                    <th className="px-6 py-3 font-medium text-gray-500">Descrição</th>
                                                    <th className="px-6 py-3 font-medium text-gray-500 text-right">Ações</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {groupItems.map(note => (
                                                    <tr key={note.id} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-6 py-3 text-gray-600 whitespace-nowrap w-32">
                                                            {formatDate(note.created_at)}
                                                        </td>
                                                        <td className="px-6 py-3 font-medium text-gray-900">
                                                            {note.description}
                                                            {note.content && (
                                                                <div className="text-xs text-gray-500 mt-0.5 truncate max-w-xs font-normal">
                                                                    {note.content.substring(0, 50)}{note.content.length > 50 ? '...' : ''}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-3 text-right w-24">
                                                            <div className="flex justify-end gap-2">
                                                                <button
                                                                    onClick={() => handleEdit(note)}
                                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                                                    title="Editar"
                                                                >
                                                                    <Icon name="edit" className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDelete(note.id)}
                                                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                                                    title="Excluir"
                                                                >
                                                                    <Icon name="trash" className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
