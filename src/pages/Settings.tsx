import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAppStore } from '../store/AppStore'
import { Icon } from '../components/ui/Icon'
import { listMyMemberships, getProfile, listOrganizationMembers, addOrganizationMember, removeOrganizationMember, listMyOrganizations, updateOrganization, deleteOrganization, createOrganization, getAllOrganizationsAdmin, addOrgMemberAdmin, updateOrganizationAdmin, getOrganization } from '../services/db'
import Permissions from './Permissions'
import AdminUsers from './AdminUsers'
import { FloatingLabelInput } from '../components/ui/FloatingLabelInput'
import { ImageUploadInput } from '../components/ui/ImageUploadInput'
import { SettingsContent } from '../components/layout/SettingsContent'



export default function Settings() {
  const { activeOrganization, setActiveOrganization } = useAppStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = (searchParams.get('tab') as any) || 'organizacoes'
  const [activeTab, setActiveTab] = useState<'config_relatorios' | 'integracoes' | 'integracao' | 'equipe' | 'organizacoes' | 'permissoes' | 'users' | 'ajustes'>(initialTab)
  const [integrationSubTab, setIntegrationSubTab] = useState<'whatsapp' | 'email'>('whatsapp')

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'geral') {
      setActiveTab('config_relatorios')
    } else if (tab && ['config_relatorios', 'integracoes', 'integracao', 'equipe', 'organizacoes', 'permissoes', 'users', 'ajustes'].includes(tab)) {
      setActiveTab(tab as any)
    }
  }, [searchParams])

  const handleTabChange = (tab: 'config_relatorios' | 'integracoes' | 'integracao' | 'equipe' | 'organizacoes' | 'permissoes' | 'users' | 'ajustes') => {
    setActiveTab(tab)
    setSearchParams({ tab })
  }

  // State for Team Management - REMOVED
  // State for Team Management
  const [teamSelectedOrgId, setTeamSelectedOrgId] = useState<string>('')
  const [memberships, setMemberships] = useState<any[]>([]) // Used for "Equipe" tab list
  const [loading, setLoading] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [myProfile, setMyProfile] = useState<any>(null)

  // State for Organizations Management
  const [myOrgs, setMyOrgs] = useState<any[]>([])
  const [editingOrg, setEditingOrg] = useState<any>(null)
  const [newOrgName, setNewOrgName] = useState('')

  // State for Integration
  const [waUrl, setWaUrl] = useState('https://apiconnect8.datamastersolucoes.com.br/api/messages/send')
  const [waStatusUrl, setWaStatusUrl] = useState('https://apiconnect8.datamastersolucoes.com.br/api/whatsapp-status')
  const [waToken, setWaToken] = useState('uBNvKVjY4VymooGg5UBgIVEBHINvqk')
  const [testNumber, setTestNumber] = useState('')
  const [testMessage, setTestMessage] = useState('Teste de integração do Sistema Financeiro')
  const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [testResponse, setTestResponse] = useState('')

  // Report Config State
  const [reportConfig, setReportConfig] = useState({
    logo_main: '',
    logo_secondary: '',
    company_name: '',
    cnpj: '',
    address: '',
    site: '',
    email: '',
    phone: '',
    report_title_prefix: 'Relatório Financeiro',
    footer_text: '',
    smtp_host: '',
    smtp_port: '',
    smtp_secure: false,
    smtp_user: '',
    smtp_pass: '',
    smtp_from: ''
  })

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
  }, [activeOrganization]) // Add dependency on activeOrganization to reload config

  useEffect(() => {
    // Sync report config from active org (fetch fresh from DB)
    async function loadOrgConfig() {
      if (!activeOrganization) return

      const { data, error } = await getOrganization(activeOrganization)
      if (data && data.report_config) {
        setReportConfig(prev => ({ ...prev, ...data.report_config }))
      } else {
        // Reset to defaults if no config found or error
        setReportConfig({
          logo_main: '',
          logo_secondary: '',
          company_name: '',
          cnpj: '',
          address: '',
          site: '',
          email: '',
          phone: '',
          report_title_prefix: 'Relatório Financeiro',
          footer_text: '',
          smtp_host: '',
          smtp_port: '',
          smtp_secure: false,
          smtp_user: '',
          smtp_pass: '',
          smtp_from: ''
        })
      }
    }
    loadOrgConfig()
  }, [activeOrganization])

  function saveConfig() {
    localStorage.setItem('financeiro_wa_url', waUrl)
    localStorage.setItem('financeiro_wa_status_url', waStatusUrl)
    localStorage.setItem('financeiro_wa_token', waToken)
    alert('Configurações salvas com sucesso!')
  }

  async function saveReportConfig() {
    if (!activeOrganization) return alert('Selecione uma organização ativa');
    const res = await updateOrganization(activeOrganization, { report_config: reportConfig })
    if (res.error) {
      alert('Erro ao salvar: ' + res.error.message)
    } else {
      alert('Configurações de Relatório salvas!')
      loadData() // Reload to update local state
    }
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
    const [orgsRes, adminOrgsRes] = await Promise.all([
      listMyOrganizations(),
      getAllOrganizationsAdmin()
    ])

    // If adminOrgsRes has data (meaning we are admin), use it. Otherwise fall back to myOrgs.
    // Actually, we want to separate "My Orgs" from "All Orgs" view? 
    // The requirement says "mostrar todas as organizações criadas no banco de dados... agrupado por usuario"
    // So if admin, we prefer the admin list.

    console.log('Admin Orgs Res:', adminOrgsRes)
    if (adminOrgsRes.data && adminOrgsRes.data.length > 0) {
      console.log('Using Admin Orgs List')
      setMyOrgs(adminOrgsRes.data)
      // Initialize team selector if empty
      if (!teamSelectedOrgId && activeOrganization) {
        setTeamSelectedOrgId(activeOrganization)
      } else if (!teamSelectedOrgId && adminOrgsRes.data.length > 0) {
        setTeamSelectedOrgId(adminOrgsRes.data[0].id)
      }
    } else {
      console.log('Using Standard Orgs List')
      setMyOrgs(orgsRes.data || [])
      // Initialize team selector if empty
      if (!teamSelectedOrgId && activeOrganization) {
        setTeamSelectedOrgId(activeOrganization)
      } else if (!teamSelectedOrgId && orgsRes.data && orgsRes.data.length > 0) {
        setTeamSelectedOrgId(orgsRes.data[0].id)
      }
    }

    // Load members for the selected org (or active if just set)
    const targetOrgId = teamSelectedOrgId || activeOrganization
    if (targetOrgId) {
      const perms = await listOrganizationMembers(targetOrgId)
      setMemberships(perms.data || [])
    }
    setLoading(false)
  }

  async function handleCreateOrg() {
    if (!newOrgName) return
    const res = await createOrganization(newOrgName)
    if (res.error) {
      alert('Erro ao criar organização: ' + res.error.message)
    } else {
      setNewOrgName('')
      loadData()
      alert('Organização criada com sucesso!')
    }
  }

  async function handleUpdateOrg(org: any) {
    const newName = prompt('Novo nome da organização:', org.name)
    if (newName && newName !== org.name) {
      let res;
      // If I am master admin, use admin function to ensure permission even if not owner
      if (myProfile?.email === 'ramon.naciff@gmail.com') {
        res = await updateOrganizationAdmin(org.id, newName)
      } else {
        // Standard update (RLS)
        res = await updateOrganization(org.id, { name: newName })
      }

      if (res.error) {
        alert('Erro ao atualizar: ' + (res.error.message || JSON.stringify(res.error)))
      } else {
        loadData()
      }
    }
  }

  async function handleDeleteOrg(orgId: string) {
    if (!window.confirm('Tem certeza que deseja excluir esta organização? Esta ação é IRREVERSÍVEL e apagará TODOS os dados.')) return

    // Double confirmation
    if (!window.confirm('Realmente tem certeza? Todos os lançamentos, clientes e contas serão perdidos.')) return

    const res = await deleteOrganization(orgId)
    if (res.error) {
      alert('Erro ao excluir: ' + res.error.message)
    } else {
      if (activeOrganization === orgId) {
        setActiveOrganization(null)
        window.location.reload()
      } else {
        loadData()
      }
    }
  }

  async function handleInvite() {
    if (!inviteEmail || !teamSelectedOrgId) return
    const res = await addOrganizationMember(teamSelectedOrgId, inviteEmail)
    if (res.error) {
      alert('Erro ao convidar: ' + res.error.message)
    } else {
      alert('Usuário convidado com sucesso!')
      setInviteEmail('')
      loadData()
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!teamSelectedOrgId) return
    if (!window.confirm('Tem certeza que deseja remover este membro da organização?')) return

    const res = await removeOrganizationMember(teamSelectedOrgId, userId)
    if (res.error) {
      alert('Erro ao remover: ' + res.error.message)
    } else {
      loadData()
    }
  }

  async function handleAdminLinkUser(orgId: string) {
    const email = prompt('Digite o e-mail do usuário para vincular a esta organização:')
    if (!email) return

    const role = prompt('Qual a função? (member/owner)', 'member')
    if (!role) return

    const res = await addOrgMemberAdmin(orgId, email, role)
    if (res.error) {
      alert('Erro ao vincular: ' + (res.error.message || JSON.stringify(res.error)))
    } else {
      alert('Usuário vinculado com sucesso (ou permissão atualizada)!')
    }
  }

  return (
    <div className="space-y-6">
      {/* Title Removed as per request */}

      {/* Tabs */}
      {/* Tabs */}
      <div className="flex border-b dark:border-gray-700 overflow-x-auto">
        {/* Context: Organization Management */}
        {(['organizacoes', 'equipe', 'permissoes'].includes(activeTab)) && (
          <>
            <button
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${activeTab === 'organizacoes' ? 'border-b-2 border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
              onClick={() => handleTabChange('organizacoes')}
            >
              Organizações
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${activeTab === 'equipe' ? 'border-b-2 border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
              onClick={() => handleTabChange('equipe')}
            >
              Equipe
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${activeTab === 'permissoes' ? 'border-b-2 border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
              onClick={() => handleTabChange('permissoes')}
            >
              Usuário e Permissões
            </button>
          </>
        )}

        {/* Context: General Settings */}
        {(['config_relatorios', 'users', 'ajustes'].includes(activeTab)) && (
          <>
            <button
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${activeTab === 'config_relatorios' ? 'border-b-2 border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
              onClick={() => handleTabChange('config_relatorios')}
            >
              Configuração Relatórios
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${activeTab === 'users' ? 'border-b-2 border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
              onClick={() => handleTabChange('users')}
            >
              Usuários Cadastrados
            </button>

            <button
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${activeTab === 'ajustes' ? 'border-b-2 border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
              onClick={() => handleTabChange('ajustes')}
            >
              Ajustes
            </button>
          </>
        )}
      </div>

      {activeTab === 'ajustes' && (
        <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded p-6">
          <h2 className="text-lg font-medium mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <Icon name="settings" className="w-5 h-5 text-gray-500" />
            Ajustes de Layout
          </h2>
          <SettingsContent />
        </div>
      )}

      {activeTab === 'config_relatorios' && (
        <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded p-6">
          <h2 className="text-lg font-medium mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <Icon name="file-text" className="w-5 h-5 text-gray-500" />
            Personalização de Relatórios (PDF)
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Configure o cabeçalho dos relatórios PDF com a identidade visual da sua empresa.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Logos */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700 dark:text-gray-300 border-b pb-2">Logos</h3>
              <ImageUploadInput
                label="Logo Principal (Esquerda)"
                value={reportConfig.logo_main}
                onChange={url => setReportConfig({ ...reportConfig, logo_main: url })}
                bucket="logos"
              />
              <ImageUploadInput
                label="Logo Secundária (Direita - Opcional)"
                value={reportConfig.logo_secondary}
                onChange={url => setReportConfig({ ...reportConfig, logo_secondary: url })}
                bucket="logos"
              />
              <div className="text-xs text-gray-500">
                Recomendado: Imagens em formato PNG ou JPG. Tamanho recomendado: 200x100px (Proporção 2:1). Fazer upload salvará a imagem no banco de dados.
              </div>
            </div>

            {/* Company Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700 dark:text-gray-300 border-b pb-2">Dados da Empresa</h3>
              <FloatingLabelInput
                label="Razão Social / Nome da Empresa"
                value={reportConfig.company_name}
                onChange={e => setReportConfig({ ...reportConfig, company_name: e.target.value })}
              />
              <FloatingLabelInput
                label="CNPJ"
                value={reportConfig.cnpj}
                onChange={e => setReportConfig({ ...reportConfig, cnpj: e.target.value })}
              />
            </div>

            {/* Contact Info */}
            <div className="space-y-4 md:col-span-2">
              <h3 className="font-semibold text-gray-700 dark:text-gray-300 border-b pb-2">Endereço e Contato</h3>
              <FloatingLabelInput
                label="Endereço Completo (Rua, Número, Bairro, Cidade/UF, CEP)"
                value={reportConfig.address}
                onChange={e => setReportConfig({ ...reportConfig, address: e.target.value })}
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FloatingLabelInput
                  label="Site"
                  value={reportConfig.site}
                  onChange={e => setReportConfig({ ...reportConfig, site: e.target.value })}
                />
                <FloatingLabelInput
                  label="E-mail"
                  value={reportConfig.email}
                  onChange={e => setReportConfig({ ...reportConfig, email: e.target.value })}
                />
                <FloatingLabelInput
                  label="Telefone / Celular"
                  value={reportConfig.phone}
                  onChange={e => setReportConfig({ ...reportConfig, phone: e.target.value })}
                />
              </div>
            </div>



            {/* Report Title */}
            <div className="space-y-4 md:col-span-2">
              <h3 className="font-semibold text-gray-700 dark:text-gray-300 border-b pb-2">Título do Relatório</h3>
              <FloatingLabelInput
                label="Prefixo do Título (ex: Relatório Financeiro)"
                value={reportConfig.report_title_prefix}
                onChange={e => setReportConfig({ ...reportConfig, report_title_prefix: e.target.value })}
              />
            </div>

            {/* Footer Text */}
            <div className="space-y-4 md:col-span-2">
              <h3 className="font-semibold text-gray-700 dark:text-gray-300 border-b pb-2">Rodapé (Opcional)</h3>
              <FloatingLabelInput
                label="Texto do Rodapé (Lado Esquerdo)"
                value={reportConfig.footer_text}
                onChange={e => setReportConfig({ ...reportConfig, footer_text: e.target.value })}
              />
              <p className="text-xs text-gray-500">O número da página será adicionado automaticamente no lado direito.</p>
            </div>

          </div>

          <div className="mt-6 pt-4 border-t dark:border-gray-700 flex justify-end">
            <button
              onClick={saveReportConfig}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors shadow-sm"
            >
              Salvar Configurações
            </button>
          </div>
        </div>
      )}

      {activeTab === 'organizacoes' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded p-6">
            <h2 className="text-lg font-medium mb-4 text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Icon name="briefcase" className="w-5 h-5 text-purple-500" />
              Organizações
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Gerencie as empresas e organizações do sistema.
            </p>

            {/* Create One */}
            <div className="flex gap-2 items-end mb-8 max-w-xl">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Criar Nova Organização</label>
                <input
                  type="text"
                  className="w-full border dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Nome da empresa..."
                  value={newOrgName}
                  onChange={e => setNewOrgName(e.target.value)}
                />
              </div>
              <button
                onClick={handleCreateOrg}
                disabled={!newOrgName}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm font-medium transition-colors disabled:opacity-50"
              >
                Criar
              </button>
            </div>

            {/* List Grouped by Owner if available (Admin view), else flat list */}
            {(() => {
              // Check if we have owner info (implies admin view)
              const hasOwnerInfo = myOrgs.length > 0 && 'owner_name' in myOrgs[0]

              if (hasOwnerInfo) {
                // Group by owner
                const grouped: Record<string, any[]> = {}
                myOrgs.forEach(org => {
                  const key = org.owner_name || 'Desconhecido'
                  if (!grouped[key]) grouped[key] = []
                  grouped[key].push(org)
                })

                return (
                  <div className="space-y-8">
                    {Object.entries(grouped).map(([ownerName, orgs]) => (
                      <div key={ownerName} className="border-l-2 border-purple-200 pl-4">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <Icon name="person" className="w-4 h-4" />
                          {ownerName}
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full normal-case font-normal">{orgs.length} empresas</span>
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {orgs.map(org => (
                            <div key={org.id} className="border dark:border-gray-700 rounded-lg p-4 flex flex-col justify-between bg-gray-50 dark:bg-gray-700/50">
                              <div>
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-2">
                                  {org.name}
                                  {/* If we are super admin, we can edit everything? Or just owner? The requirement didn't specify editing rights for admin, but assuming read-only or standard rights. 
                                                      Let's keep standard edit buttons if I am the owner OR if I strictly requested full management. 
                                                      For now, let's stick to strict ownership for editing to avoid RLS errors, unless we update RLS too.
                                                      Actually, db.ts updateOrganization uses simple RLS. Admin function bypasses RLS for SELECT but not for UPDATE. 
                                                      So show edit buttons only if I am the owner owner_id === myProfile.id
                                                   */}
                                  {org.owner_id === myProfile?.id && <span className="text-[10px] bg-yellow-100 text-yellow-800 px-1 rounded border border-yellow-200">Dono</span>}
                                </h3>
                                <p className="text-xs text-gray-500 font-mono mb-1">{org.id}</p>
                                {org.owner_email && <p className="text-xs text-blue-500">{org.owner_email}</p>}
                              </div>

                              {/* Allow Edit if Owner OR Master Admin */}
                              {(org.owner_id === myProfile?.id || myProfile?.email === 'ramon.naciff@gmail.com') && (
                                <div className="flex gap-2 mt-4 justify-end">
                                  <button
                                    onClick={() => handleUpdateOrg(org)}
                                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                  >
                                    <Icon name="edit" className="w-3 h-3" /> Editar
                                  </button>
                                  {org.owner_id === myProfile?.id && (
                                    <button
                                      onClick={() => handleDeleteOrg(org.id)}
                                      className="text-xs text-red-600 hover:underline flex items-center gap-1"
                                    >
                                      <Icon name="trash" className="w-3 h-3" /> Excluir
                                    </button>
                                  )}
                                </div>
                              )}

                              {/* Admin Link Button (Only for Master) */}
                              {hasOwnerInfo && (
                                <div className="mt-2 pt-2 border-t dark:border-gray-600 flex justify-end">
                                  <button
                                    onClick={() => handleAdminLinkUser(org.id)}
                                    className="text-[10px] text-green-600 hover:text-green-700 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded border border-green-200 dark:border-green-800 flex items-center gap-1"
                                  >
                                    <Icon name="link" className="w-3 h-3" /> Vincular Usuário
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              } else {
                // Standard View (Non-admin or fallback)
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {myOrgs.map(org => (
                      <div key={org.id} className="border dark:border-gray-700 rounded-lg p-4 flex flex-col justify-between bg-gray-50 dark:bg-gray-700/50">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-2">
                            {org.name}
                            {org.owner_id === myProfile?.id && <span className="text-[10px] bg-yellow-100 text-yellow-800 px-1 rounded border border-yellow-200">Dono</span>}
                          </h3>
                          <p className="text-xs text-gray-500 font-mono">{org.id}</p>
                        </div>

                        {org.owner_id === myProfile?.id && (
                          <div className="flex gap-2 mt-4 justify-end">
                            <button
                              onClick={() => handleUpdateOrg(org)}
                              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <Icon name="edit" className="w-3 h-3" /> Editar
                            </button>
                            <button
                              onClick={() => handleDeleteOrg(org.id)}
                              className="text-xs text-red-600 hover:underline flex items-center gap-1"
                            >
                              <Icon name="trash" className="w-3 h-3" /> Excluir
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )
              }
            })()}
          </div>
        </div>
      )}

      {activeTab === 'equipe' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <h2 className="text-lg font-medium flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <Icon name="users" className="w-5 h-5 text-blue-500" />
                Gerenciar Equipe
              </h2>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Gerenciar:</label>
                <select
                  value={teamSelectedOrgId}
                  onChange={(e) => {
                    const newId = e.target.value
                    setTeamSelectedOrgId(newId)
                    // Trigger reload for this org
                    listOrganizationMembers(newId).then(r => setMemberships(r.data || []))
                  }}
                  className="border dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 min-w-[200px]"
                >
                  <option value="" disabled>Selecione uma Organização...</option>
                  {myOrgs.map(org => (
                    <option key={org.id} value={org.id}>
                      {org.name} {org.owner_name ? `(${org.owner_name})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
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
                disabled={!inviteEmail || !teamSelectedOrgId}
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

      {activeTab === 'integracoes' && (
        <div className="space-y-6">
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${integrationSubTab === 'whatsapp' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
              onClick={() => setIntegrationSubTab('whatsapp')}
            >
              Integração WhatsApp
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${integrationSubTab === 'email' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
              onClick={() => setIntegrationSubTab('email')}
            >
              Configurações de E-mail
            </button>
          </div>

          {integrationSubTab === 'email' && (
            <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded p-6">
              <h2 className="text-lg font-medium mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <Icon name="mail" className="w-5 h-5 text-blue-500" />
                Configurações de E-mail (SMTP)
              </h2>
              <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded text-sm text-orange-800 dark:text-orange-200 mb-4">
                Essas configurações são usadas para enviar relatórios por e-mail.
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FloatingLabelInput
                  label="Servidor SMTP (Host)"
                  value={reportConfig.smtp_host || ''}
                  onChange={e => setReportConfig({ ...reportConfig, smtp_host: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FloatingLabelInput
                    label="Porta"
                    value={reportConfig.smtp_port || ''}
                    onChange={e => setReportConfig({ ...reportConfig, smtp_port: e.target.value })}
                  />
                  <div className="flex items-center">
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={reportConfig.smtp_secure || false}
                        onChange={e => setReportConfig({ ...reportConfig, smtp_secure: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      Usar SSL/TLS (Secure)
                    </label>
                  </div>
                </div>
                <FloatingLabelInput
                  label="Usuário (User)"
                  value={reportConfig.smtp_user || ''}
                  onChange={e => setReportConfig({ ...reportConfig, smtp_user: e.target.value })}
                />
                <FloatingLabelInput
                  label="Senha (Password)"
                  value={reportConfig.smtp_pass || ''}
                  onChange={e => setReportConfig({ ...reportConfig, smtp_pass: e.target.value })}
                  type="password"
                />
                <FloatingLabelInput
                  label="E-mail de Envio (From)"
                  value={reportConfig.smtp_from || ''}
                  onChange={e => setReportConfig({ ...reportConfig, smtp_from: e.target.value })}
                  className="md:col-span-2"
                />
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={saveReportConfig}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
                >
                  Salvar SMTP
                </button>
              </div>
            </div>
          )}

          {integrationSubTab === 'whatsapp' && (
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
                      Salvar Whatsapp
                    </button>
                  </div>
                </div>
              </div>

              {/* 1. Connection Test */}
              <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded p-6 shadow-sm">
                <h3 className="text-md font-bold mb-4 text-gray-900 dark:text-gray-100">1. Testar Conexão Check</h3>

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
          )}
        </div>
      )}

      {activeTab === 'permissoes' && (
        <Permissions />
      )}
      {activeTab === 'users' && (
        <AdminUsers />
      )}
    </div>
  )
}
