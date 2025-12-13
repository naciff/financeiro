import { useEffect, useState } from 'react'
import { Icon } from '../components/ui/Icon'
import { useAppStore } from '../store/AppStore'
import { listOrganizationMembers, updateOrganizationMemberPermissions, addOrganizationMember, removeOrganizationMember } from '../services/db'

export default function Permissions() {
    const store = useAppStore()
    const [members, setMembers] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [inviteEmail, setInviteEmail] = useState('')
    const [inviteLoading, setInviteLoading] = useState(false)
    const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    const screens = [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'calendar', label: 'Calendário' },
        { id: 'schedules_control', label: 'Controle e Previsão' },
        { id: 'ledger', label: 'Livro Caixa' },
        { id: 'schedules', label: 'Agendamentos' },
        { id: 'transfers', label: 'Transferências' },
        { id: 'reports', label: 'Relatórios' },
        { id: 'notes', label: 'Notas' },
        { id: 'cadastro', label: 'Cadastros' },
    ]

    useEffect(() => {
        loadData()
    }, [store.activeOrganization])

    function loadData() {
        // Always load members for the current user's organization scope (which includes Pessoal/Reviewing own org)
        setLoading(true)
        listOrganizationMembers().then(r => {
            setMembers(r.data || [])
            setLoading(false)
        })
    }

    async function handleInvite(e: React.FormEvent) {
        e.preventDefault()
        if (!inviteEmail) return

        setInviteLoading(true)
        setMsg(null)

        try {
            const res = await addOrganizationMember(inviteEmail, { role: 'admin' }) // Default permission
            if (res.error) {
                setMsg({ type: 'error', text: 'Erro ao convidar: ' + res.error.message })
            } else {
                setMsg({ type: 'success', text: 'Usuário convidado com sucesso!' })
                setInviteEmail('')
                loadData()
            }
        } catch (err) {
            setMsg({ type: 'error', text: 'Erro inesperado.' })
        } finally {
            setInviteLoading(false)
        }
    }

    async function handleRemove(memberId: string) {
        if (!confirm('Tem certeza que deseja remover este usuário?')) return
        await removeOrganizationMember(memberId)
        loadData()
    }

    async function handleToggle(memberId: string, screenId: string, currentPermissions: any) {
        // Clone permissions
        const newPermissions = { ...currentPermissions }
        // Toggle
        newPermissions[screenId] = !newPermissions[screenId]

        // Update locally
        setMembers(prev => prev.map(m => m.id === memberId ? { ...m, permissions: newPermissions } : m))

        // Save
        setSaving(true)
        await updateOrganizationMemberPermissions(memberId, newPermissions)
        setSaving(false)
    }

    // Removed the (!store.activeOrganization) check to allow "Pessoal" organization management

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center gap-2 mb-6">
                <Icon name="lock_person" className="w-8 h-8 text-primary" />
                <h1 className="text-2xl font-bold dark:text-gray-100">Usuário e Permissões</h1>
            </div>

            {/* Invite Section */}
            <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-6 shadow-sm">
                <h2 className="text-lg font-medium mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100">
                    <Icon name="user" className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    Convidar Membro
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    Convide usuários para acessar seus dados. Eles poderão visualizar e editar seus lançamentos conforme as permissões abaixo.
                </p>

                <form onSubmit={handleInvite} className="flex gap-3 items-end bg-gray-50 dark:bg-gray-700 p-4 rounded border dark:border-gray-600">
                    <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">E-mail do Usuário</label>
                        <input
                            type="email"
                            required
                            placeholder="exemplo@email.com"
                            className="w-full border dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            value={inviteEmail}
                            onChange={e => setInviteEmail(e.target.value)}
                            disabled={inviteLoading}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={inviteLoading}
                        className={`px-4 py-2 rounded text-sm font-medium transition ${inviteLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                    >
                        {inviteLoading ? 'Convidando...' : 'Convidar'}
                    </button>
                </form>

                {msg && (
                    <div className={`mt-4 p-4 rounded text-sm ${msg.type === 'success' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'}`}>
                        {msg.text}
                    </div>
                )}
            </div>

            <div className="grid gap-6">
                {loading && <div className="text-center py-4">Carregando membros...</div>}

                {!loading && members.length === 0 && (
                    <div className="text-center py-10 text-gray-500 bg-surface-light dark:bg-surface-dark rounded-lg shadow">
                        Nenhum membro encontrado nesta organização.
                    </div>
                )}

                {members.map(member => (
                    <div key={member.id} className="bg-white dark:bg-gray-800 rounded-lg shadow border dark:border-gray-700 overflow-hidden">
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold">
                                    {member.profile?.name?.charAt(0) || '?'}
                                </div>
                                <div>
                                    <div className="font-medium text-gray-900 dark:text-gray-100">{member.profile?.name || 'Desconhecido'}</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">{member.profile?.email}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                {saving && <span className="text-xs text-blue-500 animate-pulse">Salvando...</span>}
                                <button
                                    onClick={() => handleRemove(member.member_id)}
                                    className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 text-xs font-medium flex items-center gap-1"
                                    title="Remover Usuário"
                                >
                                    <Icon name="trash" className="w-4 h-4" />
                                    Remover
                                </button>
                            </div>
                        </div>

                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {screens.map(screen => {
                                    const hasAccess = member.permissions?.[screen.id] !== false // Default to true if undefined
                                    return (
                                        <label key={screen.id} className="flex items-center gap-3 p-3 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={hasAccess}
                                                onChange={() => handleToggle(member.id, screen.id, member.permissions || {})}
                                                className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                                            />
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{screen.label}</span>
                                        </label>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
