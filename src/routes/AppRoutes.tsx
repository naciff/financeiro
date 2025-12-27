
import { Route, Routes, Navigate } from 'react-router-dom'
import Layout from '../shared/Layout'
import Dashboard from '../pages/Dashboard'
import Calendar from '../pages/Calendar'
import Schedules from '../pages/Schedules'
import Ledger from '../pages/Ledger'
import Accounts from '../pages/Accounts'
import Transfers from '../pages/Transfers'
import Reports from '../pages/Reports'
import Notes from '../pages/Notes'
import Profile from '../pages/Profile'
import Settings from '../pages/Settings'
import Cadastro from '../pages/Cadastro'
import Permissions from '../pages/Permissions'
import CommitmentGroups from '../pages/CommitmentGroups'
import Commitments from '../pages/Commitments'
import Clients from '../pages/Clients'
import ScheduleControl from '../pages/ScheduleControl'
import AdminUsers from '../pages/AdminUsers'
import { CostCenters } from '../pages/CostCenters'
import Services from '../pages/Services'
import DbManager from '../pages/DbManager'
import { Help } from '../pages/Help'
import SaldoDetalhado from '../pages/SaldoDetalhado'

export function AppRoutes() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/schedules" element={<Schedules />} />
        <Route path="/schedules/control" element={<ScheduleControl />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/cadastro/caixa-financeiro" element={<Accounts />} />
        <Route path="/cadastro/grupo-compromisso" element={<CommitmentGroups />} />
        <Route path="/cadastro/compromisso" element={<Commitments />} />
        <Route path="/cadastro/clientes" element={<Clients />} />
        <Route path="/cadastro/cost-centers" element={<CostCenters />} />
        <Route path="/cadastro/servicos" element={<Services />} />
        <Route path="/ledger" element={<Ledger />} />
        <Route path="/accounts" element={<Accounts />} />
        <Route path="/transfers" element={<Transfers />} />
        <Route path="/saldo-detalhado" element={<SaldoDetalhado />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/notes" element={<Notes />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/permissoes" element={<Permissions />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/db-manager" element={<DbManager />} />
        <Route path="/help" element={<Help />} />
      </Routes>
    </Layout>
  )
}
