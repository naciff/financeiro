import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!email || !password) {
      setError('Por favor, preencha todos os campos')
      return
    }

    if (!validateEmail(email)) {
      setError('Por favor, insira um email válido')
      return
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres')
      return
    }

    if (!supabase) {
      setError('Configuração do Supabase ausente')
      return
    }

    setLoading(true)
    const { data, error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setLoading(false)

    if (err) {
      setError(err.message === 'Invalid login credentials' ? 'Credenciais inválidas. Verifique o email e a senha.' : err.message)
      return
    }
    if (data?.session) {
      navigate('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-scale-in">
        {/* Header with FourTek Logo */}
        <div className="p-8 text-center border-b border-gray-100">
          <div className="flex items-center justify-center mb-4">
            <img
              src="/logo.svg"
              alt="FourTek Logo"
              className="h-16 w-auto object-contain"
              loading="eager"
            />
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={onSubmit} className="p-8 space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fourtek-green focus:border-transparent transition-all duration-200"
              placeholder="Digite seu email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Senha
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fourtek-green focus:border-transparent transition-all duration-200"
                placeholder="Digite sua senha"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-sm text-fourtek-blue hover:text-fourtek-blue-hover transition-colors duration-200 font-medium">
              Esqueceu a senha?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-400 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          <div className="text-center">
            <span className="text-sm text-neutral-600">
              Não tem uma conta?{' '}
              <Link to="/register" className="text-fourtek-blue hover:text-fourtek-blue-hover font-medium transition-colors duration-200">
                Cadastre-se
              </Link>
            </span>
          </div>
        </form>

        {/* Footer with Social Icons and Quote */}
        <div className="px-8 pb-8 pt-4 border-t border-gray-100">
          <div className="flex justify-center space-x-4 mb-6">
            <a href="#" className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-neutral-600 hover:bg-neutral-300 hover:text-fourtek-blue transition-all duration-200 transform hover:scale-105 shadow-sm hover:shadow-md">
              <img src="/icons/site.svg" alt="Website" className="w-5 h-5" />
            </a>
            <a href="#" className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-neutral-600 hover:bg-neutral-300 hover:text-pink-600 transition-all duration-200 transform hover:scale-105 shadow-sm hover:shadow-md">
              <img src="/icons/instagram.svg" alt="Instagram" className="w-5 h-5" />
            </a>
            <a href="#" className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-neutral-600 hover:bg-neutral-300 hover:text-blue-800 transition-all duration-200 transform hover:scale-105 shadow-sm hover:shadow-md">
              <img src="/icons/facebook.svg" alt="Facebook" className="w-5 h-5" />
            </a>
            <a href="#" className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-neutral-600 hover:bg-neutral-300 hover:text-blue-700 transition-all duration-200 transform hover:scale-105 shadow-sm hover:shadow-md">
              <img src="/icons/linkedin.svg" alt="LinkedIn" className="w-5 h-5" />
            </a>
          </div>

          <div className="text-center">
            <p className="text-gray-500 italic text-sm mb-4">
              "Se quer ter sucesso completo em sua vida, você tem que ser foda."
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center max-w-md px-4">
        <p className="text-xs text-gray-400">
          Ao continuar, você concorda com nossos Termos de Serviços e Politica de Privacidade
        </p>
      </div>
    </div>
  )
}
