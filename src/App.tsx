import { Navigate, Route, Routes } from 'react-router-dom'
import { AppRoutes } from './routes/AppRoutes'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import { useAuth } from './contexts/AuthContext'

export default function App() {
  const { session, loading } = useAuth()

  if (loading) return <div className="h-full flex items-center justify-center">Carregando...</div>

  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/register" element={<Navigate to="/" replace />} />
      <Route path="/forgot-password" element={<Navigate to="/" replace />} />
      <Route path="/*" element={<AppRoutes />} />
    </Routes>
  )
}
