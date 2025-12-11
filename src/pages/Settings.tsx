import React, { useEffect, useState } from 'react'
import { useAppStore } from '../store/AppStore'
import { Icon } from '../components/ui/Icon'
import { addOrganizationMember, listMyMemberships, listOrganizationMembers, removeOrganizationMember, getProfile } from '../services/db'

export default function Settings() {
  const { activeOrganization, setActiveOrganization } = useAppStore()
  const [activeTab, setActiveTab] = useState<'geral' | 'equipe'>('equipe')

  // State for Team Management
  const [members, setMembers] = useState<any[]>([])
  const [memberships, setMemberships] = useState<any[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [myProfile, setMyProfile] = useState<any>(null)

  useEffect(() => {
    loadData()
    getProfile().then(r => setMyProfile(r.data))
  }, [])

  async function loadData() {
    setLoading(true)
    const [mMembers, mShips] = await Promise.all([
      listOrganizationMembers(),
      listMyMemberships()
    ])
    setMembers(mMembers.data || [])
    setMemberships(mShips.data || [])
    setLoading(false)
  }

  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEmail) return

    setLoading(true)
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
      setLoading(false)
    }
  }

  async function handleRemove(memberId: string) {
    if (!confirm('Tem certeza que deseja remover este usuário?')) return
    await removeOrganizationMember(memberId)
    loadData()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-800">Cofigurações</h1>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'geral' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('geral')}
        >
          Geral
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'equipe' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('equipe')}
        >
          Usuários e Permissões
        </button>
      </div>

      {activeTab === 'geral' && (
        <div className="bg-white border rounded p-6 text-gray-500">
          Configurações gerais do sistema (Em breve)
        </div>
      )}

      {activeTab === 'equipe' && (
        <div className="space-y-8">

          {/* 1. Context Switcher */}
          <div className="bg-white border rounded p-6">
            <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Icon name="group" className="w-5 h-5 text-gray-500" />
              Contexto de Acesso
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Selecione qual banco de dados você deseja acessar.
            </p>

            <div className="space-y-2">
              <label className={`flex items-center gap-3 p-3 border rounded cursor-pointer transition-colors ${activeOrganization === null ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300' : 'hover:bg-gray-50'}`}>
                <input
                  type="radio"
                  name="orgCtx"
                  checked={activeOrganization === null}
                  onChange={() => setActiveOrganization(null)}
                  className="w-4 h-4 text-blue-600"
                />
                <div>
                  <div className="font-medium text-gray-900">Minha Organização (Padrão)</div>
                  <div className="text-xs text-gray-500">Meus dados pessoais</div>
                </div>
              </label>

              {memberships.map(ship => (
                <label key={ship.owner_id} className={`flex items-center gap-3 p-3 border rounded cursor-pointer transition-colors ${activeOrganization === ship.owner_id ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300' : 'hover:bg-gray-50'}`}>
                  <input
                    type="radio"
                    name="orgCtx"
                    checked={activeOrganization === ship.owner_id}
                    onChange={() => setActiveOrganization(ship.owner_id)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div>
                    <div className="font-medium text-gray-900">Organização de {ship.owner?.name || ship.owner?.email}</div>
                    <div className="text-xs text-gray-500">Acesso compartilhado</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* 2. My Team Management */}
          <div className="bg-white border rounded p-6">
            <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Icon name="user" className="w-5 h-5 text-gray-500" />
              Gerenciar minha Equipe
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Convide usuários para acessar seus dados. Eles poderão visualizar e editar seus lançamentos conforme as permissões.
            </p>

            {/* Invite Form */}
            <form onSubmit={handleInvite} className="flex gap-3 mb-8 items-end bg-gray-50 p-4 rounded border">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">E-mail do Usuário</label>
                <input
                  type="email"
                  required
                  placeholder="exemplo@email.com"
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className={`px-4 py-2 rounded text-sm font-medium transition ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
              >
                {loading ? 'Convidando...' : 'Convidar'}
              </button>
            </form>

            {msg && (
              <div className={`mb-6 p-4 rounded text-sm ${msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {msg.text}
              </div>
            )}

            {/* Members List */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3">Usuário</th>
                    <th className="px-4 py-3">Permissão</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {members.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                        Nenhum membro convidado ainda.
                      </td>
                    </tr>
                  ) : (
                    members.map(m => (
                      <tr key={m.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{m.profile?.name || 'Sem nome'}</div>
                          <div className="text-xs text-gray-500">{m.profile?.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">Acesso Total</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleRemove(m.member_id)}
                            className="text-red-600 hover:text-red-900 text-xs font-medium flex items-center gap-1 justify-end ml-auto"
                          >
                            <Icon name="trash" className="w-4 h-4" />
                            Remover
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
