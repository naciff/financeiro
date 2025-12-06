import { supabase } from '../lib/supabase'

export async function listAccounts() {
  if (!supabase) return { data: [], error: null }
  return supabase.from('accounts').select('id,nome,tipo,ativo,principal,dia_vencimento').order('created_at', { ascending: true })
}

export async function searchAccounts(term: string, limit = 10) {
  if (!supabase) return { data: [], error: null }
  return supabase.from('accounts').select('id,nome,tipo,ativo').ilike('nome', `%${term}%`).order('nome').limit(limit)
}

export async function createAccount(payload: { nome: string; tipo: string; saldo_inicial?: number; observacoes?: string; banco_codigo?: string | null; agencia?: string | null; conta?: string | null; dia_vencimento?: number | null; cor?: string; principal?: boolean }) {
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
    .select('id,nome,tipo,ativo,principal,dia_vencimento,banco_codigo,agencia,conta,saldo_inicial,observacoes,cor')
    .eq('id', id)
    .eq('user_id', userId as any)
    .single()
}

export async function listAccountBalances() {
  if (!supabase) return { data: [], error: null }
  return supabase.from('account_balances_view').select('*')
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

export async function listSchedules(limit = 200, options?: { includeConcluded?: boolean }) {
  if (!supabase) return { data: [], error: null }
  const userId = (await supabase.auth.getUser()).data.user?.id
  let query = supabase
    .from('schedules')
    .select(`
      *,
      cliente:favorecido_id(id,nome),
      caixa:caixa_id(id,nome,cor),
      compromisso:compromisso_id(id,nome),
      grupo_compromisso:grupo_compromisso_id(id,nome)
    `)
    .eq('user_id', userId as any)

  if (!options?.includeConcluded) {
    query = query.neq('situacao', 2 as any)
  }

  return query.order('created_at', { ascending: false }).limit(limit)
}

export async function updateSchedule(id: string, payload: any) {
  if (!supabase) return { data: null, error: null }
  const userId = (await supabase.auth.getUser()).data.user?.id
  return supabase.from('schedules').update({ ...payload }).eq('id', id).eq('user_id', userId as any).select('id').single()
}

export async function deleteSchedule(id: string) {
  if (!supabase) return { data: null, error: null }
  const userId = (await supabase.auth.getUser()).data.user?.id
  return supabase.from('schedules').delete().eq('id', id).eq('user_id', userId as any)
}

export async function listTransactions(limit = 50) {
  if (!supabase) return { data: [], error: null }
  return supabase.from('transactions').select('*').order('data_lancamento', { ascending: false }).limit(limit)
}

export async function payTransaction(txId: string, contaId: string, amount: number, date?: string) {
  if (!supabase) return { data: null, error: null }
  return supabase.rpc('fn_pay', { tx_id: txId, conta: contaId, amount, d: date ?? null })
}

export async function receiveTransaction(txId: string, contaId: string, amount: number, date?: string) {
  if (!supabase) return { data: null, error: null }
  return supabase.rpc('fn_receive', { tx_id: txId, conta: contaId, amount, d: date ?? null })
}

export async function createTransaction(payload: any) {
  if (!supabase) return { data: null, error: null }
  const userId = (await supabase.auth.getUser()).data.user?.id
  return supabase.from('transactions').insert([{ user_id: userId, ...payload }]).select('id').single()
}

export async function listClients() {
  if (!supabase) return { data: [], error: null }
  return supabase.from('clients').select('id,nome,documento').order('nome', { ascending: true })
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

export async function listCommitmentGroups() {
  if (!supabase) return { data: [], error: null }
  return supabase.from('commitment_groups').select('id,nome,operacao,tipo').order('nome', { ascending: true })
}

export async function listCommitmentsByGroup(groupId: string) {
  if (!supabase) return { data: [], error: null }
  return supabase.from('commitments').select('id,nome,ir').eq('grupo_id', groupId).order('nome', { ascending: true })
}

export async function listCashboxes() {
  if (!supabase) return { data: [], error: null }
  return supabase.from('cashboxes').select('id,nome').order('nome', { ascending: true })
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
  const { data, error } = await supabase
    .from('messages')
    .select('content')
    .eq('active', true)

  if (error) return { data: null, error }
  if (!data || data.length === 0) return { data: { content: 'Se quer ter sucesso completo em sua vida, você tem que ser foda.' }, error: null }

  const randomIndex = Math.floor(Math.random() * data.length)
  return { data: data[randomIndex], error: null }
}
