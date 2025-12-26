import { useState, useEffect } from 'react'
import { useAppStore } from '../../store/AppStore'
import { Icon } from '../ui/Icon'
import { listClients } from '../../services/db'
import { hasBackend } from '../../lib/runtime'

type Recipient = {
    id: string
    nome: string
    contact: string // email or phone
}

type Props = {
    isOpen: boolean
    mode: 'email' | 'whatsapp'
    onClose: () => void
    onConfirm: (recipients: Recipient[]) => void
}

export function RecipientModal({ isOpen, mode, onClose, onConfirm }: Props) {
    const store = useAppStore()
    const [recipients, setRecipients] = useState<Recipient[]>([])
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!isOpen) return

        async function load() {
            setLoading(true)
            let allClients: any[] = []

            if (hasBackend && store.activeOrganization) {
                const { data } = await listClients(store.activeOrganization)
                if (data) allClients = data
            } else {
                allClients = store.clients
            }

            const filtered = allClients
                .filter(c => {
                    if (mode === 'email') return c.notify_email && c.email
                    if (mode === 'whatsapp') return c.notify_whatsapp && c.telefone
                    return false
                })
                .map(c => ({
                    id: c.id,
                    nome: c.nome,
                    contact: mode === 'email' ? c.email! : c.telefone!
                }))

            setRecipients(filtered)
            setSelectedIds(new Set(filtered.map(r => r.id)))
            setLoading(false)
        }

        load()
    }, [isOpen, mode, store.clients, store.activeOrganization])

    function toggle(id: string) {
        const next = new Set(selectedIds)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        setSelectedIds(next)
    }

    function toggleAll() {
        if (selectedIds.size === recipients.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(recipients.map(r => r.id)))
        }
    }

    function handleConfirm() {
        const selected = recipients.filter(r => selectedIds.has(r.id))
        onConfirm(selected)
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/40 text-left backdrop-blur-sm">
            <div className="absolute inset-0" onClick={onClose} aria-hidden="true"></div>
            <div className="relative bg-white dark:bg-gray-800 border dark:border-gray-700 rounded w-[90%] max-w-md max-h-[80vh] flex flex-col shadow-xl">
                <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                    <div className="font-medium text-lg">
                        Selecionar Destinatários ({mode === 'email' ? 'E-mail' : 'WhatsApp'})
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <Icon name="x" className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-2 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-between items-center">
                    <span className="text-sm text-gray-500 ml-2">{selectedIds.size} selecionado(s)</span>
                    <button onClick={toggleAll} className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium px-2 py-1">
                        {selectedIds.size === recipients.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                    </button>
                </div>

                <div className="overflow-auto flex-1 p-2 space-y-1">
                    {loading && <div className="p-4 text-center text-gray-500">Carregando destinatários...</div>}
                    {!loading && recipients.length === 0 && (
                        <div className="text-center text-gray-500 py-8">
                            Nenhum cliente configurado para receber {mode === 'email' ? 'e-mails' : 'mensagens'}.
                            <br /><span className="text-xs">Edite o cadastro do cliente e marque a opção de envio.</span>
                        </div>
                    )}
                    {!loading && recipients.map(r => (
                        <div key={r.id} onClick={() => toggle(r.id)} className="flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
                            <input
                                type="checkbox"
                                checked={selectedIds.has(r.id)}
                                onChange={() => { }} // Handled by div click
                                className="rounded border-gray-300 dark:border-gray-600 text-black focus:ring-black pointer-events-none"
                            />
                            <div className="flex-1 min-w-0">
                                <div className="font-medium truncate text-gray-900 dark:text-gray-100">{r.nome}</div>
                                <div className="text-xs text-gray-500 truncate">{r.contact}</div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-4 border-t dark:border-gray-700 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 rounded border dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={selectedIds.size === 0}
                        className="px-4 py-2 rounded bg-black dark:bg-gray-900 text-white hover:bg-gray-800 dark:hover:bg-black disabled:opacity-50 transition-colors"
                    >
                        Enviar para {selectedIds.size}
                    </button>
                </div>
            </div>
        </div>
    )
}
