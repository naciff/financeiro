import { useEffect, useState } from 'react'
import { Icon } from '../components/ui/Icon'
import { useAppStore } from '../store/AppStore'
import { listOrganizationMembers, updateOrganizationMemberPermissions, addOrganizationMember, removeOrganizationMember, listMyOrganizations, getAllOrganizationsAdmin, addOrgMemberAdmin } from '../services/db'

export default function Permissions() {
    const store = useAppStore()
    const [members, setMembers] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [inviteEmail, setInviteEmail] = useState('')
    const [inviteLoading, setInviteLoading] = useState(false)
    const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    // Organization Selection State
    const [availableOrgs, setAvailableOrgs] = useState<any[]>([])
    const [selectedOrgId, setSelectedOrgId] = useState<string>('')
    const [isMaster, setIsMaster] = useState(false)

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
        loadOrgs()
    }, [])

    useEffect(() => {
        if (selectedOrgId) {
            loadMembers(selectedOrgId)
        } else {
            setMembers([])
        }
    }, [selectedOrgId])

    async function loadOrgs() {
        setLoading(true)
        // Check if master by trying admin call (or checking profile email, simpler)
        // Actually getAllOrganizationsAdmin returns empty if not master, so safe to try
        const adminRes = await getAllOrganizationsAdmin()

        if (adminRes.data && adminRes.data.length > 0) {
            setIsMaster(true)
            setAvailableOrgs(adminRes.data)
            // Default to active or first
            if (store.activeOrganization) {
                setSelectedOrgId(store.activeOrganization)
            } else if (adminRes.data.length > 0) {
                setSelectedOrgId(adminRes.data[0].id)
            }
        } else {
            // Normal User
            const myRes = await listMyOrganizations()
            setAvailableOrgs(myRes.data || [])
            if (store.activeOrganization) {
                setSelectedOrgId(store.activeOrganization)
            } else if (myRes.data && myRes.data.length > 0) {
                setSelectedOrgId(myRes.data[0].id)
            }
        }
        setLoading(false)
    }

    function loadMembers(orgId: string) {
        setLoading(true)
        listOrganizationMembers(orgId).then(r => {
            setMembers(r.data || [])
            setLoading(false)
        })
    }

    async function handleInvite(e: React.FormEvent) {
        e.preventDefault()
        if (!inviteEmail || !selectedOrgId) return

        setInviteLoading(true)
        setMsg(null)

        try {
            let res;
            if (isMaster) {
                // Master Admin uses special function to bypass RLS if needed (or standard if owner)
                // But permissions page is granular. Does addOrgMemberAdmin allow granular permissions? No, it sets role 'member'.
                // Granular permissions are set via updateOrganizationMemberPermissions AFTER adding.
                // So we add as member first.
                res = await addOrgMemberAdmin(selectedOrgId, inviteEmail, 'member')
            } else {
                res = await addOrganizationMember(selectedOrgId, inviteEmail)
            }

            if (res.error) {
                setMsg({ type: 'error', text: 'Erro ao convidar: ' + (res.error.message || JSON.stringify(res.error)) })
            } else {
                setMsg({ type: 'success', text: 'Usuário convidado com sucesso! Configure as permissões abaixo.' })
                setInviteEmail('')
                loadMembers(selectedOrgId)
            }
        } catch (err) {
            setMsg({ type: 'error', text: 'Erro inesperado.' })
        } finally {
            setInviteLoading(false)
        }
    }

    async function handleRemove(memberId: string) {
        if (!confirm('Tem certeza que deseja remover este usuário?')) return
        if (!selectedOrgId) return

        // Remove logic might need to be admin-aware if standard RLS blocks it for non-owners
        // But for now assuming standard remove works if we are owner. 
        // If Master Admin is not owner, remove might fail with standard RLS.
        // We might need a removeOrgMemberAdmin function later if this fails.
        const res = await removeOrganizationMember(selectedOrgId, memberId) // Using explicit orgId if function supports it?
        // Wait, removeOrganizationMember signature is (orgId, userId). Yes.

        if (res.error) {
            alert('Erro ao remover: ' + res.error.message)
        } else {
            loadMembers(selectedOrgId)
        }
    }

    async function handleToggle(memberId: string, screenId: string, currentPermissions: any) {
        // Clone permissions
        const newPermissions = { ...currentPermissions }

        // Check effective state (default is true/allowed if undefined)
        const isCurrentlyAllowed = newPermissions[screenId] !== false

        // Toggle
        newPermissions[screenId] = !isCurrentlyAllowed

        // Update locally only
        setMembers(prev => prev.map(m => m.id === memberId ? { ...m, permissions: newPermissions, _hasChanges: true } : m))
    }

    async function handleSave(member: any) {
        setSaving(true)
        const res = await updateOrganizationMemberPermissions(member.id, member.permissions)
        setSaving(false)

        if (res.error) {
            alert('Erro ao salvar permissão: ' + res.error.message)
        } else {
            // Clear dirty flag
            setMembers(prev => prev.map(m => m.id === member.id ? { ...m, _hasChanges: false } : m))
            alert('Permissões salvas com sucesso!')
        }
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Icon name="lock_person" className="w-8 h-8 text-primary" />
                    <h1 className="text-2xl font-bold dark:text-gray-100">Usuário e Permissões</h1>
                </div>

                {/* Organization Selector */}
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Gerenciar:</label>
                    <select
                        value={selectedOrgId}
                        onChange={(e) => setSelectedOrgId(e.target.value)}
                        className="border dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 min-w-[200px]"
                    >
                        <option value="" disabled>Selecione uma Organização...</option>
                        {availableOrgs.map(org => (
                            <option key={org.id} value={org.id}>
                                {org.name} {isMaster && org.owner_name ? `(${org.owner_name})` : ''}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Invite Section */}
            <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-6 shadow-sm">
                <h2 className="text-lg font-medium mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100">
                    <Icon name="user" className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    Convidar Membro
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    Convide usuários para a organização <strong>{availableOrgs.find(o => o.id === selectedOrgId)?.name || 'selecionada'}</strong>.
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
                            disabled={inviteLoading || !selectedOrgId}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={inviteLoading || !selectedOrgId}
                        className={`px-4 py-2 rounded text-sm font-medium transition ${inviteLoading || !selectedOrgId ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
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

                {!loading && selectedOrgId && members.length === 0 && (
                    <div className="text-center py-10 text-gray-500 bg-surface-light dark:bg-surface-dark rounded-lg shadow">
                        Nenhum membro encontrado nesta organização.
                    </div>
                )}

                {!selectedOrgId && (
                    <div className="text-center py-10 text-gray-500 bg-surface-light dark:bg-surface-dark rounded-lg shadow">
                        Selecione uma organização acima para gerenciar permissões.
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
                                {member.role !== 'owner' && (
                                    <button
                                        onClick={() => handleRemove(member.user_id)}
                                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 text-xs font-medium flex items-center gap-1"
                                        title="Remover Usuário"
                                    >
                                        <Icon name="trash" className="w-4 h-4" />
                                        Remover
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                                {screens.map(screen => {
                                    const hasAccess = member.permissions?.[screen.id] !== false // Default to true if undefined
                                    return (
                                        <label key={screen.id} className="flex items-center gap-3 p-3 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={hasAccess}
                                                onChange={() => handleToggle(member.id, screen.id, member.permissions || {})}
                                                disabled={isMaster ? false : (member.role === 'owner')}
                                                className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                                            />
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{screen.label}</span>
                                        </label>
                                    )
                                })}
                            </div>

                            {/* Save Button for this member */}
                            <div className="flex justify-end pt-4 border-t dark:border-gray-700">
                                <button
                                    onClick={() => handleSave(member)}
                                    disabled={saving || (member.role === 'owner' && !isMaster)} // Disable for owners unless master
                                    className={`px-4 py-2 rounded text-sm font-medium flex items-center gap-2 ${member._hasChanges
                                        ? 'bg-green-600 hover:bg-green-700 text-white'
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                        }`}
                                >
                                    <Icon name="check" className="w-4 h-4" />
                                    {saving ? 'Salvando...' : 'Salvar Alterações'}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
