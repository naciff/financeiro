import React, { useEffect, useState } from 'react'
import { listAllProfiles, deleteUser } from '../services/db'
import { Icon } from '../components/ui/Icon'
import { SystemModal } from '../components/modals/SystemModal'

export default function AdminUsers() {
    const [users, setUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: '', name: '' })

    useEffect(() => {
        loadUsers()
    }, [])

    async function loadUsers() {
        setLoading(true)
        const { data } = await listAllProfiles()
        if (data) {
            setUsers(data)
        }
        setLoading(false)
    }

    function handleDelete(id: string, name: string) {
        setDeleteModal({ isOpen: true, id, name })
    }

    async function confirmDelete() {
        if (!deleteModal.id) return

        const res = await deleteUser(deleteModal.id)
        if (res.error) {
            alert('Erro ao excluir usuário: ' + res.error.message)
        } else {
            // Remove locally or reload
            setUsers(users.filter(u => u.id !== deleteModal.id))
        }
        setDeleteModal({ ...deleteModal, isOpen: false })
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                        Usuários Cadastrados
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        Lista de todos os usuários registrados no sistema
                    </p>
                </div>
                <button
                    onClick={loadUsers}
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium text-gray-700 dark:text-gray-200"
                >
                    <Icon name="refresh" className="text-lg" />
                    Atualizar
                </button>
            </div>

            {/* List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        Carregando usuários...
                    </div>
                ) : users.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        Nenhum usuário encontrado.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 text-xs uppercase text-gray-500 dark:text-gray-400 font-medium tracking-wider">
                                    <th className="px-6 py-4">Nome</th>
                                    <th className="px-6 py-4">Email</th>
                                    <th className="px-6 py-4">Telefone</th>
                                    <th className="px-6 py-4">Data Cadastro</th>
                                    <th className="px-6 py-4">Último Acesso</th>
                                    <th className="px-6 py-4 text-center">On-Line</th>
                                    <th className="px-6 py-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {users.map((user) => {
                                    const isOnline = user.last_login && (new Date().getTime() - new Date(user.last_login).getTime() < 5 * 60 * 1000 + 30000) // 5m 30s tolerance

                                    return (
                                        <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-sm">
                                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100 flex items-center gap-3">
                                                {user.avatar_url ? (
                                                    <img src={user.avatar_url} className="w-8 h-8 rounded-full bg-gray-200 object-cover" alt="" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-[#014d6d] text-white flex items-center justify-center text-xs font-bold">
                                                        {user.name?.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                {user.name || 'Sem nome'}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                                {user.email}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                                {user.phone || '-'}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                                {user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                                {user.last_login
                                                    ? new Date(user.last_login).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
                                                    : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className={`w-3 h-3 rounded-full mx-auto ${isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-gray-300 dark:bg-gray-600'}`} title={isOnline ? 'Online' : 'Offline'}></div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleDelete(user.id, user.name || user.email)}
                                                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                    title="Excluir Usuário"
                                                >
                                                    <Icon name="delete" />
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <SystemModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
                onConfirm={confirmDelete}
                title="Excluir Usuário"
                message={`Tem certeza que deseja excluir o usuário "${deleteModal.name}"? Esta ação é irreversível.`}
                type="confirm"
                confirmText="Excluir"
                cancelText="Cancelar"
            />
        </div>
    )
}
