import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    
    if (!email) {
      setError('Por favor, insira seu email')
      return
    }
    
    if (!validateEmail(email)) {
      setError('Por favor, insira um email válido')
      return
    }
    
    if (!supabase) { 
      setError('Configuração do Supabase ausente')
      return 
    }
    
    setLoading(true)
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })
    setLoading(false)
    
    if (err) {
      setError(err.message)
    } else {
      setSuccess('Email de recuperação enviado! Verifique sua caixa de entrada.')
      setEmail('')
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        {/* Header with FourTek Logo */}
        <div className="p-8 text-center border-b border-neutral-100">
          <div className="flex items-center justify-center mb-4">
            <img 
              src="/logo.svg" 
              alt="FourTek Logo" 
              className="h-16 w-auto object-contain"
              loading="eager"
            />
          </div>
        </div>

        {/* Forgot Password Form */}
        <form onSubmit={onSubmit} className="p-8 space-y-6">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-neutral-900 mb-2">Recuperar Senha</h2>
            <p className="text-neutral-600 text-sm">
              Insira seu email e enviaremos um link para redefinir sua senha.
            </p>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-2">
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

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-600">{success}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-fourtek-green hover:bg-fourtek-green-hover disabled:bg-neutral-400 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
          >
            {loading ? 'Enviando...' : 'Enviar Email de Recuperação'}
          </button>

          <div className="text-center">
            <Link to="/login" className="text-sm text-fourtek-blue hover:text-fourtek-blue-hover font-medium transition-colors duration-200">
              Voltar para o login
            </Link>
          </div>
        </form>

        {/* Footer with Social Icons and Quote */}
        <div className="p-8 border-t border-neutral-100">
          <div className="flex justify-center space-x-4 mb-6">
            <a href="#" className="w-10 h-10 bg-neutral-200 rounded-full flex items-center justify-center text-neutral-600 hover:bg-fourtek-blue hover:text-white transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg">
              <img src="/icons/site.svg" alt="Website" className="w-5 h-5" />
            </a>
            <a href="#" className="w-10 h-10 bg-neutral-200 rounded-full flex items-center justify-center text-neutral-600 hover:bg-pink-600 hover:text-white transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg">
              <img src="/icons/instagram.svg" alt="Instagram" className="w-5 h-5" />
            </a>
            <a href="#" className="w-10 h-10 bg-neutral-200 rounded-full flex items-center justify-center text-neutral-600 hover:bg-blue-800 hover:text-white transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg">
              <img src="/icons/facebook.svg" alt="Facebook" className="w-5 h-5" />
            </a>
            <a href="#" className="w-10 h-10 bg-neutral-200 rounded-full flex items-center justify-center text-neutral-600 hover:bg-blue-700 hover:text-white transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg">
              <img src="/icons/linkedin.svg" alt="LinkedIn" className="w-5 h-5" />
            </a>
          </div>
          
          <div className="text-center">
            <p className="text-neutral-500 italic text-sm">
              "Se quer ter sucesso completo em sua vida, você tem que ser foda."
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}