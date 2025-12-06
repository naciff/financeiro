
import React, { createContext, useContext, useMemo, useState } from 'react'

type Account = {
  id: string; nome: string; tipo: string; saldo_inicial: number; observacoes?: string; banco_codigo?: string; agencia?: string; conta?: string; ativo?: boolean; principal?: boolean; dia_vencimento?: number
  cor?: string
}
type Transaction = {
  id: string
  conta_id?: string
  operacao: 'despesa' | 'receita' | 'aporte' | 'retirada' | 'transferencia'
  historico?: string
  data_vencimento?: string
  data_lancamento: string
  valor_entrada: number
  valor_saida: number
  status: 'agendado' | 'pendente' | 'atrasado' | 'pago' | 'recebido' | 'cancelado'
  cliente?: string
  compromisso?: string
  grupo_compromisso?: string
  nota_fiscal?: string
  detalhes?: string
}
type Client = { id: string; nome: string; documento?: string; email?: string; telefone?: string; razao_social?: string; endereco?: string; atividade_principal?: string }
type CommitmentGroup = { id: string; nome: string }
type Commitment = { id: string; nome: string; grupo_id: string; ir?: boolean }
type Cashbox = { id: string; nome: string }
type Schedule = {
  id: string
  operacao: Transaction['operacao']
  tipo: 'fixo' | 'variavel'
  especie: string
  ano_mes_inicial: string
  cliente?: string
  cliente_id?: string
  historico?: string
  detalhes?: string
  valor: number
  proxima_vencimento: string
  periodo: 'mensal' | 'anual'
  parcelas: number
  grupo_compromisso_id?: string
  compromisso_id?: string
  caixa_id?: string
  situacao?: number
}

type AppStoreState = {
  accounts: Account[]
  transactions: Transaction[]
  schedules: Schedule[]
  clients: Client[]
  commitment_groups: CommitmentGroup[]
  commitments: Commitment[]
  cashboxes: Cashbox[]
  createAccount: (a: Omit<Account, 'id'>) => void
  updateAccount: (id: string, patch: Partial<Account>) => void
  deleteAccount: (id: string) => { ok: boolean; reason?: string }
  transfer: (sourceId: string, destId: string, amount: number, date?: string, descricao?: string) => void
  createSchedule: (s: Omit<Schedule, 'id'>) => string
  generateSchedule: (id: string) => number
  payTransaction: (txId: string, contaId: string, amount: number, date?: string) => void
  receiveTransaction: (txId: string, contaId: string, amount: number, date?: string) => void
  updateSchedule: (id: string, patch: Partial<Schedule>) => void
  deleteSchedule: (id: string) => void
  createClient: (c: Omit<Client, 'id'>) => string
  updateClient: (id: string, patch: Partial<Client>) => void
  deleteClient: (id: string) => void
  createCommitmentGroup: (g: Omit<CommitmentGroup, 'id'>) => string
  createCommitment: (c: Omit<Commitment, 'id'>) => string
  updateCommitment: (id: string, patch: Partial<Commitment>) => void
  deleteCommitment: (id: string) => void
  createTransaction: (t: Omit<Transaction, 'id'>) => string
}

const AppStoreCtx = createContext<AppStoreState | null>(null)

function uid() { return crypto.randomUUID() }
function today() { return new Date().toISOString().slice(0, 10) }

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [commitmentGroups, setCommitmentGroups] = useState<CommitmentGroup[]>([
    { id: 'grp-1', nome: 'Moradia' },
    { id: 'grp-2', nome: 'Serviços' },
    { id: 'grp-3', nome: 'Educação' },
  ])
  const [commitments, setCommitments] = useState<Commitment[]>([
    { id: 'cmp-1', nome: 'Aluguel', grupo_id: 'grp-1' },
    { id: 'cmp-2', nome: 'Condomínio', grupo_id: 'grp-1' },
    { id: 'cmp-3', nome: 'Internet', grupo_id: 'grp-2' },
    { id: 'cmp-4', nome: 'Escola', grupo_id: 'grp-3' },
  ])
  const [cashboxes, setCashboxes] = useState<Cashbox[]>([
    { id: 'cx-1', nome: 'Carteira' },
    { id: 'cx-2', nome: 'Banco Itaú' },
  ])

  const api = useMemo<AppStoreState>(() => ({
    accounts,
    transactions,
    schedules,
    clients,
    commitment_groups: commitmentGroups,
    commitments,
    cashboxes,
    createAccount: a => {
      const acc = { id: uid(), ativo: a.ativo ?? true, principal: a.principal ?? false, ...a }
      setAccounts(prev => [...prev, acc])
    },
    updateAccount: (id, patch) => {
      setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a))
    },
    deleteAccount: id => {
      const hasTx = transactions.some(t => t.conta_id === id)
      if (hasTx) return { ok: false, reason: 'Não é possível excluir este caixa pois existem lançamentos vinculados' }
      setAccounts(prev => prev.filter(a => a.id !== id))
      return { ok: true }
    },
    transfer: (sourceId, destId, amount, date, descricao) => {
      const d = date || today()
      const tid = uid()
      const out: Transaction = { id: uid(), conta_id: sourceId, operacao: 'transferencia', historico: descricao, data_lancamento: d, data_vencimento: d, valor_entrada: 0, valor_saida: amount, status: 'pago' }
      const inn: Transaction = { id: uid(), conta_id: destId, operacao: 'transferencia', historico: descricao, data_lancamento: d, data_vencimento: d, valor_entrada: amount, valor_saida: 0, status: 'recebido' }
      setTransactions(prev => [inn, out, ...prev])
    },
    createSchedule: s => {
      const id = uid()
      const sched = { id, situacao: 1, ...s }
      setSchedules(prev => [sched, ...prev])
      return id
    },
    generateSchedule: id => {
      const s = schedules.find(x => x.id === id)
      if (!s) return 0
      const count = Math.max(1, s.parcelas)
      const list: Transaction[] = []
      for (let i = 0; i < count; i++) {
        const d = new Date(s.ano_mes_inicial)
        if (s.periodo === 'mensal') d.setMonth(d.getMonth() + i)
        else d.setFullYear(d.getFullYear() + i)
        const dd = d.toISOString().slice(0, 10)
        const isIn = s.operacao === 'receita' || s.operacao === 'aporte'
        list.push({ id: uid(), operacao: s.operacao, historico: s.historico, data_lancamento: dd, data_vencimento: dd, valor_entrada: isIn ? s.valor : 0, valor_saida: isIn ? 0 : s.valor, status: 'pendente' })
      }
      setTransactions(prev => [...list, ...prev])
      return count
    },
    payTransaction: (txId, contaId, amount, date) => {
      setTransactions(prev => prev.map(t => t.id === txId ? { ...t, conta_id: contaId, valor_saida: amount, status: 'pago', data_lancamento: date || t.data_lancamento } : t))
    },
    receiveTransaction: (txId, contaId, amount, date) => {
      setTransactions(prev => prev.map(t => t.id === txId ? { ...t, conta_id: contaId, valor_entrada: amount, status: 'recebido', data_lancamento: date || t.data_lancamento } : t))
    },
    createTransaction: t => {
      const id = uid()
      setTransactions(prev => [{ id, ...t }, ...prev])
      return id
    },
    updateSchedule: (id, patch) => {
      setSchedules(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
    },
    deleteSchedule: id => {
      setSchedules(prev => prev.filter(s => s.id !== id))
    },
    createClient: c => {
      const id = uid()
      setClients(prev => [...prev, { id, ...c }])
      return id
    },
    updateClient: (id, patch) => {
      setClients(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c))
    },
    deleteClient: id => {
      setClients(prev => prev.filter(c => c.id !== id))
    },
    createCommitmentGroup: g => {
      const id = uid()
      setCommitmentGroups(prev => [...prev, { id, ...g }])
      return id
    },
    updateCommitmentGroup: (id, patch) => {
      setCommitmentGroups(prev => prev.map(g => g.id === id ? { ...g, ...patch } : g))
    },
    deleteCommitmentGroup: id => {
      setCommitmentGroups(prev => prev.filter(g => g.id !== id))
      setCommitments(prev => prev.filter(c => c.grupo_id !== id))
    },
    createCommitment: c => {
      const id = uid()
      setCommitments(prev => [...prev, { id, ...c }])
      return id
    }
    , updateCommitment: (id, patch) => {
      setCommitments(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c))
    }
    , deleteCommitment: id => {
      setCommitments(prev => prev.filter(c => c.id !== id))
    }
  }), [accounts, transactions, schedules, clients, commitmentGroups, commitments, cashboxes])

  return <AppStoreCtx.Provider value={api}>{children}</AppStoreCtx.Provider>
}

export function useAppStore() {
  const ctx = useContext(AppStoreCtx)
  if (!ctx) throw new Error('AppStoreProvider ausente')
  return ctx
}
