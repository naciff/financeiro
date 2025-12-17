import { supabase } from '../lib/supabase'

export async function listAccounts(orgId?: string) {
  if (!supabase) return { data: [], error: null }
  const userId = orgId || (await supabase.auth.getUser()).data.user?.id
  return supabase.from('accounts').select('id,nome,tipo,ativo,principal,dia_vencimento,dia_bom,cor,agencia,conta,banco_codigo').eq('user_id', userId as any).order('created_at', { ascending: true })
}

export async function searchAccounts(term: string, limit = 10) {
  if (!supabase) return { data: [], error: null }
  return supabase.from('accounts').select('id,nome,tipo,ativo').ilike('nome', `%${term}%`).order('nome').limit(limit)
}

export async function createAccount(payload: { nome: string; tipo: string; saldo_inicial?: number; observacoes?: string; banco_codigo?: string | null; agencia?: string | null; conta?: string | null; dia_vencimento?: number | null; dia_bom?: number | null; cor?: string; principal?: boolean }) {
  if (!supabase) return { data: null, error: null }
  const userId = (await supabase.auth.getUser()).data.user?.id
  return supabase.from('accounts').insert([{ user_id: userId, ...payload }])
}

export async function updateAccountFields(id: string, patch: Record<string, any>) {
  if (!supabase) return { data: null, error: null }
  const userId = (await supabase.auth.getUser()).data.user?.id
  return supabase.from('accounts').update(patch).eq('id', id).eq('user_id', userId as any)
}

export async function getAccountById(id: string) {
  if (!supabase) return { data: null, error: null }
  const userId = (await supabase.auth.getUser()).data.user?.id
  return supabase
    .from('accounts')
    .select('id,nome,tipo,ativo,principal,dia_vencimento,dia_bom,banco_codigo,agencia,conta,saldo_inicial,observacoes,cor')
    .eq('id', id)
    .eq('user_id', userId as any)
    .single()
}

export async function listAccountBalances(orgId?: string) {
  if (!supabase) return { data: [], error: null }
  const userId = orgId || (await supabase.auth.getUser()).data.user?.id
  return supabase.from('account_balances_view').select('*').eq('user_id', userId as any)
}

export async function transfer(payload: { source: string; dest: string; amount: number; date?: string; descricao?: string }) {
  if (!supabase) return { data: null, error: null }
  return supabase.rpc('fn_transfer', { source: payload.source, dest: payload.dest, amount: payload.amount, d: payload.date ?? null, descricao: payload.descricao ?? null })
}

export async function createSchedule(payload: any) {
  if (!supabase) return { data: null, error: null }
  const userId = (await supabase.auth.getUser()).data.user?.id
  return supabase.from('schedules').insert([{ user_id: userId, ...payload }]).select('id').single()
}

export async function generateSchedule(scheduleId: string) {
  if (!supabase) return { data: null, error: null }
  return supabase.rpc('fn_generate_schedule', { sched_id: scheduleId })
}

export async function listAllCommitments(orgId?: string) {
  if (!supabase) return { data: [], error: null }
  const userId = orgId || (await supabase.auth.getUser()).data.user?.id
  return supabase.from('commitments').select('id,nome').eq('user_id', userId as any).order('nome')
}

export async function listSchedules(limit = 200, options?: { includeConcluded?: boolean, orgId?: string, compromissoId?: string, grupoCompromissoId?: string }) {
  if (!supabase) return { data: [], error: null }
  const userId = options?.orgId || (await supabase.auth.getUser()).data.user?.id
  let query = supabase
    .from('schedules')
    .select(`
      *,
      cliente:favorecido_id(id,nome),
      caixa:caixa_id(id,nome,cor),
      compromisso:compromisso_id(id,nome),
      grupo_compromisso:grupo_compromisso_id(id,nome),
      cost_center:cost_centers(id, descricao)
    `)
    .eq('user_id', userId as any)

  if (!options?.includeConcluded) {
    query = query.neq('situacao', 2 as any)
  }

  if (options?.compromissoId) {
    query = query.eq('compromisso_id', options.compromissoId)
  }

  if (options?.grupoCompromissoId) {
    query = query.eq('grupo_compromisso_id', options.grupoCompromissoId)
  }

  return query.order('created_at', { ascending: false }).limit(limit)
}

export async function checkScheduleDependencies(scheduleId: string) {
  if (!supabase) return { count: 0 }
  const { count, error } = await supabase
    .from('financials')
    .select('*', { count: 'exact', head: true })
    .eq('id_agendamento', scheduleId)
    .eq('situacao', 2) // 2 = Confirmado/Pago

  if (error) {
    console.error('Error checking dependencies:', error)
    return { count: 0 }
  }
  return { count: count || 0 }
}

export async function checkCostCenterDependencies(costCenterId: string) {
  if (!supabase) return { count: 0 }
  const { count, error } = await supabase
    .from('schedules')
    .select('*', { count: 'exact', head: true })
    .eq('cost_center_id', costCenterId)

  return { count: count || 0, error }
}

export async function updateSchedule(id: string, payload: any) {
  if (!supabase) return { data: null, error: null }
  return supabase.from('schedules').update(payload).eq('id', id).select()
}

export async function updateScheduleAndFutureFinancials(scheduleId: string, newValue: number) {
  if (!supabase) return { data: null, error: null }
  const userId = (await supabase.auth.getUser()).data.user?.id

  // 1. Update Master Schedule
  const { error: err1 } = await supabase.from('schedules').update({ valor: newValue }).eq('id', scheduleId).eq('user_id', userId as any)
  if (err1) return { error: err1 }

  // 2. Update Future Financials (Pending = 1)
  const { error: err2 } = await supabase
    .from('financials')
    .update({ valor: newValue }) // Only update 'valor', as 'valor_parcela'/'valor_total' do not exist in financials table
    .eq('id_agendamento', scheduleId)
    .eq('situacao', 1) // Only pending
    .eq('user_id', userId as any)

  return { error: err2 }
}

export async function deleteSchedule(id: string) {
  if (!supabase) return { data: null, error: null }
  const userId = (await supabase.auth.getUser()).data.user?.id

  // 1. Delete associated PENDING items (situacao = 1)
  try {
    const { error: errDel } = await supabase
      .from('financials')
      .delete()
      .eq('id_agendamento', id)
      .eq('situacao', 1)
      .eq('user_id', userId as any)
    if (errDel) console.error('Error cleaning up pending items:', errDel)
  } catch (e) { console.error(e) }

  // 2. Delete the schedule
  return supabase.from('schedules').delete().eq('id', id).eq('user_id', userId as any)
}

export async function deactivateSchedule(id: string) {
  if (!supabase) return { data: null, error: null }
  return supabase.rpc('fn_deactivate_schedule', { p_schedule_id: id })
}

export async function listTransactions(limit = 1000, orgId?: string) {
  if (!supabase) return { data: [], error: null }
  const userId = orgId || (await supabase.auth.getUser()).data.user?.id
  return supabase.from('transactions')
    .select('*, compromisso:compromisso_id(id, nome), grupo:grupo_compromisso_id(id, nome), cliente:cliente_id(id, nome)')
    .eq('user_id', userId as any)
    .order('data_lancamento', { ascending: false })
    .limit(limit)
}

export async function searchTransactions(startDate: string, endDate: string, field: 'data_vencimento' | 'data_lancamento', orgId?: string) {
  if (!supabase) return { data: [], error: null }
  const userId = orgId || (await supabase.auth.getUser()).data.user?.id
  return supabase.from('transactions')
    .select('*, compromisso:compromisso_id(id, nome), grupo:grupo_compromisso_id(id, nome), cliente:cliente_id(id, nome)')
    .eq('user_id', userId as any)
    .gte(field, startDate)
    .lte(field, endDate)
    .order('data_lancamento', { ascending: false })
    .limit(2000)
}

export async function listFinancials(options?: { status?: number, orgId?: string }) {
  if (!supabase) return { data: [], error: null }
  const userId = options?.orgId || (await supabase.auth.getUser()).data.user?.id

  let query = supabase.from('financials')
    .select(`
    *,
    caixa: caixa_id(id, nome, cor),
    cliente: favorecido_id(id, nome),
    agendamento: id_agendamento(
      id,
      tipo,
      valor,
      parcial,
      compromisso: compromisso_id(id, nome),
      grupo: grupo_compromisso_id(id, nome),
      cost_center: cost_center_id(id, descricao)
    )
  `)
    .eq('user_id', userId as any)

  if (options?.status) {
    query = query.eq('situacao', options.status)
  }

  // Order by due date asc (oldest first)
  return query.order('data_vencimento', { ascending: true })
}

export async function getFinancialItemByScheduleAndDate(scheduleId: string, dateIso: string) {
  if (!supabase) return { data: null, error: null }
  return supabase.from('financials')
    .select('id')
    .eq('id_agendamento', scheduleId)
    .eq('data_vencimento', dateIso)
    .eq('situacao', 1)
    .maybeSingle()
}

export async function deleteFinancial(id: string) {
  if (!supabase) return { data: null, error: null }
  const userId = (await supabase.auth.getUser()).data.user?.id
  return supabase.from('financials').delete().eq('id', id).eq('user_id', userId as any)
}

export async function updateFinancial(id: string, payload: any, orgId?: string) {
  if (!supabase) return { data: null, error: null }
  const userId = orgId || (await supabase.auth.getUser()).data.user?.id
  // Remove strict user_id check if relying on ID uniqueness for orgs, similar to transactions
  return supabase.from('financials').update(payload).eq('id', id).select('id').maybeSingle()
}

export async function confirmProvision(itemId: string, info: { valor: number, data: string, cuentaId: string }) {
  if (!supabase) return { data: null, error: null }
  const userId = (await supabase.auth.getUser()).data.user?.id

  return supabase.rpc('fn_confirm_ledger_item', {
    p_item_id: itemId,
    p_user_id: userId,
    p_valor_pago: info.valor,
    p_data_pagamento: info.data,
    p_conta_id: info.cuentaId
  })
}

export async function payTransaction(txId: string, contaId: string, amount: number, date?: string) {
  if (!supabase) return { data: null, error: null }
  return supabase.rpc('fn_pay', { tx_id: txId, conta: contaId, amount, d: date ?? null })
}

export async function receiveTransaction(txId: string, contaId: string, amount: number, date?: string) {
  if (!supabase) return { data: null, error: null }
  return supabase.rpc('fn_receive', { tx_id: txId, conta: contaId, amount, d: date ?? null })
}

export async function deleteTransaction(id: string) {
  if (!supabase) return { data: null, error: null }
  return supabase.from('transactions').delete().eq('id', id)
}

export async function reverseTransaction(txId: string) {
  if (!supabase) return { data: null, error: null }
  const userId = (await supabase.auth.getUser()).data.user?.id
  return supabase.rpc('fn_reverse_ledger_item', { p_tx_id: txId, p_user_id: userId })
}


export async function getTransaction(id: string, orgId?: string) {
  if (!supabase) return { data: null, error: null }
  const userId = orgId || (await supabase.auth.getUser()).data.user?.id
  return supabase.from('transactions')
    .select('*, compromisso:compromisso_id(id, nome), grupo:grupo_compromisso_id(id, nome), cliente:cliente_id(id, nome)')
    .eq('id', id)
    .eq('user_id', userId as any)
    .single()
}


export async function createTransaction(payload: any, orgId?: string) {
  if (!supabase) return { data: null, error: null }
  const userId = orgId || (await supabase.auth.getUser()).data.user?.id
  return supabase.from('transactions').insert([{ user_id: userId, ...payload }]).select('id').maybeSingle()
}

export async function updateTransaction(id: string, payload: any, orgId?: string) {
  if (!supabase) return { data: null, error: null }
  // We rely on RLS and ID uniqueness. Removing explicit user_id filter prevents issues if org context differs.
  const { id: _, ...rest } = payload
  return supabase.from('transactions').update(rest).eq('id', id).select('id').maybeSingle()
}

export async function listClients(orgId?: string) {
  if (!supabase) return { data: [], error: null }
  const userId = orgId || (await supabase.auth.getUser()).data.user?.id
  return supabase.from('clients').select('id,nome,documento').eq('user_id', userId as any).order('nome', { ascending: true })
}

export async function searchClients(term: string, limit = 10) {
  if (!supabase) return { data: [], error: null }
  return supabase.from('clients').select('id,nome').ilike('nome', `%${term}%`).order('nome').limit(limit)
}

export async function createClient(payload: { nome: string; documento?: string; email?: string; telefone?: string; razao_social?: string; endereco?: string; atividade_principal?: string }) {
  if (!supabase) return { data: null, error: null }
  const userId = (await supabase.auth.getUser()).data.user?.id
  return supabase.from('clients').insert([{ user_id: userId, ...payload }]).select('id').single()
}
export async function updateClient(id: string, payload: { nome?: string; documento?: string; email?: string; telefone?: string; razao_social?: string; endereco?: string; atividade_principal?: string }) {
  if (!supabase) return { data: null, error: null }
  const userId = (await supabase.auth.getUser()).data.user?.id
  return supabase.from('clients').update({ ...payload }).eq('id', id).eq('user_id', userId as any).select('id').single()
}
export async function deleteClient(id: string) {
  if (!supabase) return { data: null, error: null }
  const userId = (await supabase.auth.getUser()).data.user?.id
  return supabase.from('clients').delete().eq('id', id).eq('user_id', userId as any)
}

export async function listCommitmentGroups(orgId?: string) {
  if (!supabase) return { data: [], error: null }
  const userId = orgId || (await supabase.auth.getUser()).data.user?.id
  return supabase.from('commitment_groups').select('id,nome,operacao,tipo').eq('user_id', userId as any).order('nome', { ascending: true })
}

export async function listCostCenters(orgId?: string) {
  if (!supabase) return { data: [], error: null }
  const userId = orgId || (await supabase.auth.getUser()).data.user?.id
  return supabase.from('cost_centers').select('*').eq('user_id', userId as any).order('descricao', { ascending: true })
}

export async function listCommitmentsByGroup(groupId: string) {
  if (!supabase) return { data: [], error: null }
  return supabase.from('commitments').select('id,nome,ir').eq('grupo_id', groupId).order('nome', { ascending: true })
}

export async function listCashboxes(orgId?: string) {
  if (!supabase) return { data: [], error: null }
  const userId = orgId || (await supabase.auth.getUser()).data.user?.id
  return supabase.from('cashboxes').select('id,nome').eq('user_id', userId as any).order('nome', { ascending: true })
}

export async function createCommitmentGroup(payload: { operacao: 'receita' | 'despesa' | 'aporte' | 'retirada'; nome: string }) {
  if (!supabase) return { data: null, error: null }
  const userId = (await supabase.auth.getUser()).data.user?.id
  return supabase.from('commitment_groups').insert([{ user_id: userId, nome: payload.nome, operacao: payload.operacao, tipo: payload.operacao }]).select('id').single()
}
export async function updateCommitmentGroup(id: string, payload: { operacao?: 'receita' | 'despesa' | 'aporte' | 'retirada'; nome?: string }) {
  if (!supabase) return { data: null, error: null }
  const userId = (await supabase.auth.getUser()).data.user?.id
  return supabase.from('commitment_groups').update({ ...payload, tipo: payload.operacao }).eq('id', id).eq('user_id', userId as any).select('id').single()
}
export async function deleteCommitmentGroup(id: string) {
  if (!supabase) return { data: null, error: null }
  const userId = (await supabase.auth.getUser()).data.user?.id
  return supabase.from('commitment_groups').delete().eq('id', id).eq('user_id', userId as any)
}

export async function createCostCenter(payload: { descricao: string; principal?: boolean; situacao?: boolean }) {
  if (!supabase) return { data: null, error: null }
  const userId = (await supabase.auth.getUser()).data.user?.id
  return supabase.from('cost_centers').insert([{ user_id: userId, ...payload }]).select('id').single()
}

export async function updateCostCenter(id: string, payload: { descricao?: string; principal?: boolean; situacao?: boolean }) {
  if (!supabase) return { data: null, error: null }
  const userId = (await supabase.auth.getUser()).data.user?.id
  return supabase.from('cost_centers').update(payload).eq('id', id).eq('user_id', userId as any).select('id').single()
}

export async function deleteCostCenter(id: string) {
  if (!supabase) return { data: null, error: null }
  const userId = (await supabase.auth.getUser()).data.user?.id
  return supabase.from('cost_centers').delete().eq('id', id).eq('user_id', userId as any)
}

export async function createCommitment(payload: { grupo_id: string; nome: string; ir?: boolean }) {
  if (!supabase) return { data: null, error: null }
  const userId = (await supabase.auth.getUser()).data.user?.id
  return supabase.from('commitments').insert([{ user_id: userId, grupo_id: payload.grupo_id, nome: payload.nome, ir: payload.ir }]).select('id').single()
}
export async function updateCommitment(id: string, payload: { grupo_id?: string; nome?: string; ir?: boolean }) {
  if (!supabase) return { data: null, error: null }
  const userId = (await supabase.auth.getUser()).data.user?.id
  return supabase.from('commitments').update({ ...payload }).eq('id', id).eq('user_id', userId as any).select('id').single()
}
export async function deleteCommitment(id: string) {
  if (!supabase) return { data: null, error: null }
  const userId = (await supabase.auth.getUser()).data.user?.id
  return supabase.from('commitments').delete().eq('id', id).eq('user_id', userId as any)
}
export async function deleteAccountValidated(id: string) {
  if (!supabase) return { data: null, error: null }
  const userId = (await supabase.auth.getUser()).data.user?.id
  const tx = await supabase.from('transactions').select('id').eq('conta_id', id).limit(1)
  if (tx.error) return { data: null, error: tx.error }
  if (tx.data && tx.data.length > 0) return { data: null, error: { message: 'Não é possível excluir este caixa pois existem lançamentos vinculados' } as any }
  const del = await supabase.from('accounts').delete().eq('id', id).eq('user_id', userId as any)
  return del
}

export async function setAccountSituation(id: string, ativo: boolean) {
  if (!supabase) return { data: null, error: null }
  const userId = (await supabase.auth.getUser()).data.user?.id
  return supabase.from('accounts').update({ ativo }).eq('id', id).eq('user_id', userId as any)
}

export async function setAccountPrincipal(id: string, principal: boolean) {
  if (!supabase) return { data: null, error: null }
  const userId = (await supabase.auth.getUser()).data.user?.id

  // If setting as principal, first unmark ALL other accounts (only one principal total)
  if (principal) {
    await supabase
      .from('accounts')
      .update({ principal: false })
      .eq('user_id', userId as any)
      .neq('id', id)
  }

  return supabase.from('accounts').update({ principal }).eq('id', id).eq('user_id', userId as any)
}

export async function getRandomMessage() {
  if (!supabase) return { data: null, error: null }

  // Select * to see what columns exist if 'content' is missing
  const { data, error } = await supabase.from('messages').select('*')

  if (error) {
    // Return error as content so user can see it on screen
    return { data: { content: `Erro DB: ${error.message} (${error.code})` }, error: null }
  }

  if (!data || data.length === 0) {
    return { data: { content: 'Tabela "messages" vazia ou sem acesso (RLS).' }, error: null }
  }

  // Pick random row
  const randomRow = data[Math.floor(Math.random() * data.length)]

  // Try to find a suitable column for text
  const text = randomRow.content || randomRow.message || randomRow.frase || randomRow.texto || randomRow.description || Object.values(randomRow).find(v => typeof v === 'string' && v.length > 20)

  if (!text) {
    return { data: { content: 'Colunas encontradas: ' + Object.keys(randomRow).join(', ') }, error: null }
  }

  return { data: { content: text }, error: null }
}

export async function getProfile() {
  if (!supabase) return { data: null, error: null }
  const user = (await supabase.auth.getUser()).data.user
  if (!user) return { data: null, error: 'User not found' }

  return supabase
    .from('profiles')
    .select('name, email, avatar_url, phone') // Added phone
    .eq('id', user.id)
    .single()
}

export async function getDailyFinancials(dateIso: string, orgId?: string) {
  if (!supabase) return { data: [], error: null }
  const userId = orgId || (await supabase.auth.getUser()).data.user?.id

  // Calculate generic range (Date - 1 day to Date + 1 day) to handle Timezone shifts
  // We will filter strictly in JS.
  const targetDate = new Date(dateIso)
  const prevDate = new Date(targetDate)
  prevDate.setDate(prevDate.getDate() - 1)

  const gteStr = prevDate.toISOString().split('T')[0] // YYYY-MM-DD
  const lteStr = `${dateIso}T23:59:59`

  // 1. Fetch Scheduled Financials (Books)
  const { data: financials, error: err1 } = await supabase.from('financials')
    .select(`
      *,
      caixa: caixa_id(id, nome),
      cliente: favorecido_id(id, nome),
      compromisso: compromisso_id(id, nome),
      grupo: grupo_compromisso_id(id, nome)
    `)
    .eq('user_id', userId as any)
    .gte('data_vencimento', gteStr) // Start from yesterday
    //.lte('data_vencimento', lteStr) // Allow up to end of today. (Actually we don't need strict upper bound if we filter later, but let's keep it reasonable)
    .order('tipo', { ascending: false })

  // 2. Fetch Transactions (Realized)
  const { data: transactions, error: err2 } = await supabase.from('transactions')
    .select(`
      *,
      caixa: conta_id(id, nome),
      cliente: cliente_id(id, nome),
      compromisso: compromisso_id(id, nome),
      grupo: grupo_compromisso_id(id, nome)
    `)
    .eq('user_id', userId as any)
    .gte('data_vencimento', gteStr)

  // 3. Fetch Schedules (Agendamentos)
  const { data: schedules, error: err3 } = await supabase.from('schedules')
    .select(`
      *,
      caixa: caixa_id(id, nome),
      cliente: favorecido_id(id, nome),
      compromisso: compromisso_id(id, nome),
      grupo: grupo_compromisso_id(id, nome)
    `)
    .eq('user_id', userId as any)
    .gte('proxima_vencimento', gteStr)

  // Merge
  const list1 = financials || []
  const list2 = transactions || []
  const list3 = schedules || []

  // Filter function: Include if truncated date matches dateIso
  const isSameDay = (iso?: string) => {
    if (!iso) return false
    // Basic check: YYYY-MM-DD match
    if (iso.startsWith(dateIso)) return true

    // Timezone check: Convert to date object, check if it falls on 'dateIso' in local/user logic?
    // Since frontend cuts 'T', let's stick to that convention.
    // If the usage of 'dateIso' implies the visual date the user sees.
    return iso.split('T')[0] === dateIso
  }

  const filteredFinancials = list1.filter(f => isSameDay(f.data_vencimento))
  const filteredTransactions = list2.filter(t => isSameDay(t.data_vencimento || t.data_lancamento))
  const filteredSchedules = list3.filter(s => isSameDay(s.proxima_vencimento || s.ano_mes_inicial))

  // Map transactions to financials shape for the report
  const mappedTransactions = filteredTransactions.map(t => ({
    ...t,
    id: t.id,
    valor: t.valor_total || (t.valor_entrada > 0 ? t.valor_entrada : t.valor_saida),
    tipo: 'realizado', // Flag as realized
    operacao: t.operacao,
    data_vencimento: t.data_vencimento || t.data_lancamento,
    caixa: t.caixa,
    cliente: t.cliente,
    compromisso: t.compromisso,
    grupo: t.grupo
  }))

  // Map schedules to financials shape
  const mappedSchedules = filteredSchedules.map(s => ({
    ...s,
    id: s.id,
    valor: s.valor,
    tipo: 'agendamento', // Flag as scheduled
    operacao: s.operacao,
    data_vencimento: s.proxima_vencimento || s.ano_mes_inicial,
    caixa: s.caixa,
    cliente: s.cliente,
    compromisso: s.compromisso,
    grupo: s.grupo
  }))

  return { data: [...filteredFinancials, ...mappedTransactions, ...mappedSchedules], error: err1 || err2 || err3 }
}

export async function listFinancialsBySchedule(scheduleId: string, orgId?: string) {
  if (!supabase) return { data: [], error: null }
  const userId = orgId || (await supabase.auth.getUser()).data.user?.id

  return supabase.from('financials')
    .select(`
      *,
      caixa: caixa_id(id, nome, cor),
      cliente: favorecido_id(id, nome),
      agendamento: id_agendamento(
        id,
        tipo,
        compromisso: compromisso_id(id, nome),
        grupo: grupo_compromisso_id(id, nome)
      )
    `)
    .eq('user_id', userId as any)
    .eq('id_agendamento', scheduleId)
    .order('data_vencimento', { ascending: true })
}

// --- Organization / Team Management ---

export async function addOrganizationMember(email: string, permissions: any = {}) {
  if (!supabase) return { error: { message: 'Supabase não inicializado' } }

  // 1. Find user by email in profiles (via Secure RPC)
  const { data: profiles, error: profileError } = await supabase
    .rpc('search_user_by_email', { p_email: email })

  if (profileError) return { error: profileError }
  if (!profiles || profiles.length === 0) return { error: { message: 'Usuário não encontrado. Peça para ele se cadastrar no sistema primeiro.' } }

  const memberId = profiles[0].id
  const ownerId = (await supabase.auth.getUser()).data.user?.id

  if (memberId === ownerId) return { error: { message: 'Você não pode convidar a si mesmo.' } }

  // 2. Insert into organization_members
  return supabase
    .from('organization_members')
    .insert({
      owner_id: ownerId,
      member_id: memberId,
      permissions
    })
    .select()
}

export async function removeOrganizationMember(memberId: string) {
  if (!supabase) return { error: { message: 'Supabase não inicializado' } }
  const ownerId = (await supabase.auth.getUser()).data.user?.id

  return supabase
    .from('organization_members')
    .delete()
    .eq('owner_id', ownerId)
    .eq('member_id', memberId)
}

export async function listOrganizationMembers() {
  if (!supabase) return { data: [], error: null }
  const ownerId = (await supabase.auth.getUser()).data.user?.id

  // 1. Get relation rows
  const { data: members, error } = await supabase
    .from('organization_members')
    .select('id, member_id, permissions')
    .eq('owner_id', ownerId)

  if (error || !members) return { data: [], error }

  if (members.length === 0) return { data: [] }

  // 2. Get profiles manually (to avoid foreign key issues)
  const memberIds = members.map(m => m.member_id)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, email, avatar_url')
    .in('id', memberIds)

  // 3. Merge
  const merged = members.map(m => {
    const p = profiles?.find(prof => prof.id === m.member_id)
    return {
      ...m,
      profile: p || { email: 'Usuario não encontrado', name: 'Desconhecido' }
    }
  })

  return { data: merged, error: null }
}

export async function updateOrganizationMemberPermissions(id: string, permissions: any) {
  if (!supabase) return { error: { message: 'Supabase não inicializado' } }

  // Only owner can update. RLS should handle this, but we filter by owner_id just in case or for safety if passing ID.
  // Actually row ID is unique, but let's ensure we are the owner.
  const ownerId = (await supabase.auth.getUser()).data.user?.id

  return supabase
    .from('organization_members')
    .update({ permissions })
    .eq('id', id)
    .eq('owner_id', ownerId as any)
}

export async function listMyMemberships() {
  if (!supabase) return { data: [], error: null }
  const userId = (await supabase.auth.getUser()).data.user?.id

  return supabase
    .from('organization_members')
    .select(`
      owner_id,
      permissions,
      owner:owner_id(id, name, email, avatar_url)
    `)
    .eq('member_id', userId)
}

export async function listAttachments(transactionId: string) {
  if (!supabase) return { data: [], error: null }
  return supabase.from('transaction_attachments').select('*').eq('transaction_id', transactionId).order('created_at', { ascending: false })
}

export async function addAttachment(payload: { transaction_id: string; file_name: string; file_type: string; file_data: string }) {
  if (!supabase) return { data: null, error: null }
  return supabase.from('transaction_attachments').insert([payload]).select().single()
}

export async function deleteAttachment(id: string) {
  if (!supabase) return { data: null, error: null }
  return supabase.from('transaction_attachments').delete().eq('id', id)
}

export async function saveClientDefault(payload: { client_id: string; grupo_compromisso_id: string; compromisso_id: string; historico: string }) {
  if (!supabase) return { data: null, error: null }
  const userId = (await supabase.auth.getUser()).data.user?.id

  // Upsert based on unique(user_id, client_id)
  return supabase
    .from('client_defaults')
    .upsert({
      user_id: userId,
      client_id: payload.client_id,
      grupo_compromisso_id: payload.grupo_compromisso_id,
      compromisso_id: payload.compromisso_id,
      historico: payload.historico
    }, { onConflict: 'user_id, client_id' })
    .select()
    .single()
}

export async function getClientDefault(clientId: string) {
  if (!supabase) return { data: null, error: null }
  const userId = (await supabase.auth.getUser()).data.user?.id

  return supabase
    .from('client_defaults')
    .select('*')
    .eq('user_id', userId as any)
    .eq('client_id', clientId)
    .single()
}




export async function listAllProfiles() {
  if (!supabase) return { data: [], error: null }
  return supabase.from('profiles').select('*').order('created_at', { ascending: false })

}

export async function deleteUser(userId: string) {
  if (!supabase) return { error: { message: 'Supabase não inicializado' } }
  return supabase.rpc('delete_user_by_admin', { p_user_id: userId })
}

