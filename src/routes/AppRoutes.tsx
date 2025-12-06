import { Route, Routes, Navigate } from 'react-router-dom'
import Layout from '../shared/Layout'
import Dashboard from '../pages/Dashboard'
import Calendar from '../pages/Calendar'
import Schedules from '../pages/Schedules'
import Ledger from '../pages/Ledger'
import Accounts from '../pages/Accounts'
import Transfers from '../pages/Transfers'
import Reports from '../pages/Reports'
import Settings from '../pages/Settings'
import Cadastro from '../pages/Cadastro'
import CommitmentGroups from '../pages/CommitmentGroups'
import Commitments from '../pages/Commitments'
import Clients from '../pages/Clients'
import ScheduleControl from '../pages/ScheduleControl'

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
        <Route path="/ledger" element={<Ledger />} />
        <Route path="/accounts" element={<Accounts />} />
        <Route path="/transfers" element={<Transfers />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  )
}
