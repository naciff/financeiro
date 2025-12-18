import React, { useEffect, useState } from 'react'
import { useAppStore } from '../store/AppStore'
import { Icon } from '../components/ui/Icon'
import { listMyMemberships, getProfile, listOrganizationMembers, addOrganizationMember, removeOrganizationMember } from '../services/db'

export default function Settings() {
  const { activeOrganization, setActiveOrganization } = useAppStore()
  const [activeTab, setActiveTab] = useState<'geral' | 'integracao' | 'equipe'>('integracao')

  // State for Team Management - REMOVED
  // State for Team Management
  const [memberships, setMemberships] = useState<any[]>([]) // Used for "Equipe" tab list
  const [loading, setLoading] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [myProfile, setMyProfile] = useState<any>(null)

  // State for Integration
  const [waUrl, setWaUrl] = useState('https://apiconnect8.datamastersolucoes.com.br/api/messages/send')
  const [waStatusUrl, setWaStatusUrl] = useState('https://apiconnect8.datamastersolucoes.com.br/api/whatsapp-status')
  const [waToken, setWaToken] = useState('uBNvKVjY4VymooGg5UBgIVEBHINvqk')
  const [testNumber, setTestNumber] = useState('')
  const [testMessage, setTestMessage] = useState('Teste de integração do Sistema Financeiro')
  const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [testResponse, setTestResponse] = useState('')

  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle')
  const [connectionResponse, setConnectionResponse] = useState('')

  useEffect(() => {
    loadData()
    getProfile().then(r => setMyProfile(r.data))

    // Load config from local storage
    const savedUrl = localStorage.getItem('financeiro_wa_url')
    const savedStatusUrl = localStorage.getItem('financeiro_wa_status_url')
    const savedToken = localStorage.getItem('financeiro_wa_token')
    if (savedUrl) setWaUrl(savedUrl)
    if (savedStatusUrl) setWaStatusUrl(savedStatusUrl)
    if (savedToken) setWaToken(savedToken)
  }, [])

  function saveConfig() {
    localStorage.setItem('financeiro_wa_url', waUrl)
    localStorage.setItem('financeiro_wa_status_url', waStatusUrl)
    localStorage.setItem('financeiro_wa_token', waToken)
    alert('Configurações salvas com sucesso!')
  }

  // Helper to use proxy if URL matches the external API
  function getProxiedUrl(url: string) {
    if (url.includes('apiconnect8.datamastersolucoes.com.br')) {
      return url.replace('https://apiconnect8.datamastersolucoes.com.br', '/api-whatsapp')
    }
    return url
  }

  async function handleTestConnection() {
    setConnectionStatus('checking')
    setConnectionResponse('')

    try {
      const finalUrl = getProxiedUrl(waStatusUrl)
      const response = await fetch(finalUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${waToken}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      setConnectionResponse(JSON.stringify(data, null, 2))

      // Check for both HTTP error and API-level "error" field
      if (response.ok && !data.error) {
        setConnectionStatus('success')
      } else {
        setConnectionStatus('error')
      }
    } catch (error: any) {
      setConnectionStatus('error')
      setConnectionResponse(error.message || 'Erro de conexão')
    }
  }

  async function handleTestWhatsApp() {
    if (!testNumber) {
      alert('Informe um número para teste (ex: 558599999999)')
      return
    }

    setTestStatus('sending')
    setTestResponse('')

    try {
      const finalUrl = getProxiedUrl(waUrl)
      const response = await fetch(finalUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${waToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          number: testNumber,
          openTicket: "0",
          queueId: "0",
          body: testMessage
        })
      })

      const data = await response.json()
      setTestResponse(JSON.stringify(data, null, 2))

      if (response.ok && !data.error) {
        setTestStatus('success')
      } else {
        setTestStatus('error')
      }
    } catch (error: any) {
      setTestStatus('error')
      setTestResponse(error.message || 'Erro desconhecido')
    }
  }

  async function loadData() {
    setLoading(true)
    if (activeOrganization) {
      const perms = await listOrganizationMembers(activeOrganization)
      setMemberships(perms.data || [])
    }
    setLoading(false)
  }

  async function handleInvite() {
    if (!inviteEmail || !activeOrganization) return
    const res = await addOrganizationMember(activeOrganization, inviteEmail)
    if (res.error) {
      alert('Erro ao convidar: ' + res.error.message)
    } else {
      alert('Usuário convidado com sucesso!')
      setInviteEmail('')
      loadData()
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!activeOrganization) return
    if (!window.confirm('Tem certeza que deseja remover este membro da organização?')) return

    const res = await removeOrganizationMember(activeOrganization, userId)
    if (res.error) {
      alert('Erro ao remover: ' + res.error.message)
    } else {
      loadData()
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Configurações</h1>

      {/* Tabs */}
      <div className="flex border-b dark:border-gray-700 overflow-x-auto">
        <button
          className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${activeTab === 'geral' ? 'border-b-2 border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
          onClick={() => setActiveTab('geral')}
        >
          Geral
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${activeTab === 'equipe' ? 'border-b-2 border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
          onClick={() => setActiveTab('equipe')}
        >
          Equipe
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${activeTab === 'integracao' ? 'border-b-2 border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
          onClick={() => setActiveTab('integracao')}
        >
          Integrações
        </button>
      </div>

      {activeTab === 'geral' && (
        <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded p-6 text-gray-500 dark:text-gray-400">
          Configurações gerais do sistema (Em breve)
        </div>
      )}

      {activeTab === 'equipe' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded p-6">
            <h2 className="text-lg font-medium mb-4 text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Icon name="users" className="w-5 h-5 text-blue-500" />
              Gerenciar Equipe
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Adicione membros à sua organização para que eles possam acessar e gerenciar os dados financeiros.
            </p>

            {/* Invite Form */}
            <div className="flex gap-2 items-end mb-8 max-w-xl">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Convidar por E-mail</label>
                <input
                  type="email"
                  className="w-full border dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="usuario@email.com"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                />
              </div>
              <button
                onClick={handleInvite}
                disabled={!inviteEmail}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Convidar
              </button>
            </div>

            {/* Members List */}
            <div className="overflow-hidden border dark:border-gray-700 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Membro</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Função</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {memberships.map((m) => (
                    <tr key={m.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-300 overflow-hidden">
                            {m.profile?.avatar_url ? (
                              <img src={m.profile.avatar_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              (m.profile?.name || m.profile?.email || '?').charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{m.profile?.name || 'Sem nome'}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{m.profile?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${m.role === 'owner' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                          {m.role === 'owner' ? 'Proprietário' : 'Membro'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {m.role !== 'owner' && (
                          <button
                            onClick={() => handleRemoveMember(m.user_id)}
                            className="text-red-600 hover:text-red-900 dark:hover:text-red-400"
                          >
                            Remover
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {memberships.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        Nenhum membro encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'integracao' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded p-6">
            <h2 className="text-lg font-medium mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100">
              <Icon name="message-circle" className="w-5 h-5 text-green-500" />
              Integração WhatsApp
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Configure a API para envio de mensagens automáticas.
            </p>

            <div className="space-y-4 max-w-3xl">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Endpoint da API</label>
                <input
                  className="w-full border dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  value={waUrl}
                  onChange={e => setWaUrl(e.target.value)}
                  placeholder="https://api.exemplo.com/send"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Token de Autenticação (Bearer)</label>
                <div className="relative">
                  <input
                    type="text"
                    className="w-full border dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono"
                    value={waToken}
                    onChange={e => setWaToken(e.target.value)}
                    placeholder="Token..."
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={saveConfig}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
                >
                  Salvar Configuração
                </button>
              </div>
            </div>
          </div>

          {/* 1. Connection Test */}
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded p-6 shadow-sm">
            <h3 className="text-md font-bold mb-4 text-gray-900 dark:text-gray-100">1. Testar Conexão</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Endpoint de Status</label>
              <input
                className="w-full border dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                value={waStatusUrl}
                onChange={e => setWaStatusUrl(e.target.value)}
                placeholder="URL para verificar status..."
              />
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Verifica se a instância WhatsApp está conectada</p>

            <button
              onClick={handleTestConnection}
              disabled={connectionStatus === 'checking'}
              className={`w-full font-medium py-3 px-4 rounded transition-colors shadow-md text-white ${connectionStatus === 'checking' ? 'bg-gray-400' : 'bg-purple-600 hover:bg-purple-700'}`}
            >
              {connectionStatus === 'checking' ? 'Verificando...' : 'Testar Conexão'}
            </button>

            {connectionResponse && (
              <div className={`mt-4 p-3 rounded border overflow-auto ${connectionStatus === 'success' ? 'bg-gray-900 border-gray-700 text-green-400' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'}`}>
                <pre className="text-xs font-mono">{connectionResponse}</pre>
              </div>
            )}
          </div>

          {/* 2. Message Test */}
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded p-6 shadow-sm">
            <h3 className="text-md font-bold mb-4 text-gray-900 dark:text-gray-100">2. Testar Envio de Mensagem</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Número Destino (com DDI e DDD)</label>
                  <input
                    className="w-full border dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                    value={testNumber}
                    onChange={e => setTestNumber(e.target.value)}
                    placeholder="Ex: 558599999999"
                  />
                  <p className="text-xs text-gray-500 mt-1">Formato: 55 + DDD + Número (apenas números)</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Mensagem</label>
                  <textarea
                    className="w-full border dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    value={testMessage}
                    onChange={e => setTestMessage(e.target.value)}
                    rows={3}
                  />
                </div>

                <button
                  onClick={handleTestWhatsApp}
                  disabled={testStatus === 'sending'}
                  className={`px-4 py-2 rounded text-sm font-medium text-white transition-colors w-full flex items-center justify-center gap-2 ${testStatus === 'sending' ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
                >
                  {testStatus === 'sending' ? 'Enviando...' : 'Enviar Mensagem de Teste'}
                  <Icon name="send" className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Log de Resposta</label>
                <div className="w-full h-48 bg-gray-900 rounded p-3 overflow-auto font-mono text-xs text-green-400 border border-gray-700">
                  {testResponse || '// Aguardando envio...'}
                </div>
                {testStatus === 'success' && <p className="text-xs text-green-600 font-medium">Sucesso!</p>}
                {testStatus === 'error' && <p className="text-xs text-red-600 font-medium">Falha no envio.</p>}
              </div>
            </div>
          </div>

          {/* 3. Automação Diária */}
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded p-6 shadow-sm">
            <h2 className="text-lg font-medium mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100">
              <Icon name="clock" className="w-5 h-5 text-blue-500" />
              Automação Diária
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Envie automaticamente um resumo da agenda do dia para seu WhatsApp.
              <br />
              <span className="text-xs text-orange-600 dark:text-orange-400 font-medium"> Nota: Para funcionar, o sistema deve estar aberto em uma aba do navegador no horário configurado.</span>
            </p>

            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="dailyActive"
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:ring-2"
                    checked={localStorage.getItem('financeiro_daily_active') === 'true'}
                    onChange={(e) => {
                      localStorage.setItem('financeiro_daily_active', String(e.target.checked))
                      window.location.reload()
                    }}
                  />
                  <label htmlFor="dailyActive" className="text-sm font-medium text-gray-700 dark:text-gray-300">Ativar Relatório Diário</label>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Horário:</label>
                  <input
                    type="time"
                    className="border dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    defaultValue={localStorage.getItem('financeiro_daily_time') || '08:00'}
                    onChange={(e) => localStorage.setItem('financeiro_daily_time', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Modelo da Mensagem</label>
                <p className="text-xs text-gray-500 mb-2">Use <code>[dia_atual]</code> para a data e <code>[lista_lancamentos]</code> para a lista de itens.</p>
                <textarea
                  rows={8}
                  className="w-full border dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono"
                  defaultValue={localStorage.getItem('financeiro_daily_template') || `🗓️ Agenda do dia [dia_atual]:

[lista_lancamentos]

✨ Que seu dia seja abençoado!`}
                  onChange={(e) => localStorage.setItem('financeiro_daily_template', e.target.value)}
                />
              </div>
              <div className="pt-2">
                <button
                  onClick={() => alert('Configurações salvas (locais).')}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded text-sm font-medium transition-colors"
                >
                  Salvar Preferências
                </button>
              </div>
            </div>
          </div>
        </div>
      )
      }
    </div >
  )
}
