import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getRandomMessage } from '../services/db'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('Se quer ter sucesso completo em sua vida, você tem que ser foda.')

  useEffect(() => {
    async function fetchMessage() {
      const { data } = await getRandomMessage()
      if (data?.content) {
        setMessage(data.content)
      }
    }
    fetchMessage()
  }, [])

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
    <div className="min-h-screen bg-neutral-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md animate-scale-in">
        {/* Header with FourTek Logo */}
        <div className="p-6 text-center border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-center mb-2">
            <img
              src="/logo-new.png?v=3"
              alt="Conta Mestre Logo"
              className="h-24 w-auto object-contain dark:hidden"
              loading="eager"
            />
            <img
              src="/logo-dark.png?v=3"
              alt="Conta Mestre Logo"
              className="h-24 w-auto object-contain hidden dark:block"
              loading="eager"
            />
          </div>
        </div>

        {/* Forgot Password Form */}
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div className="text-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Recuperar Senha</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Insira seu email e enviaremos um link para redefinir sua senha.
            </p>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="w-full px-3 py-2 border border-neutral-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#014d6d] focus:border-transparent transition-all duration-200 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              placeholder="Digite seu email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md p-3">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-md p-3">
              <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#014d6d] hover:bg-[#013c55] disabled:bg-neutral-400 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
          >
            {loading ? 'Enviando...' : 'Enviar Email de Recuperação'}
          </button>

          <div className="text-center">
            <Link to="/login" className="text-sm text-[#014d6d] dark:text-[#359EFF] hover:text-[#013c55] dark:hover:text-[#60b2ff] font-medium transition-colors duration-200">
              Voltar para o login
            </Link>
          </div>
        </form>

        {/* Footer with Social Icons and Quote */}
        <div className="px-6 pb-6 pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex justify-center space-x-4 mb-4">
            <a href="#" className="w-10 h-10 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center text-neutral-600 dark:text-gray-300 hover:text-[#014d6d] dark:hover:text-white transition-all duration-200 transform hover:scale-105 shadow-sm hover:shadow-md">
              <img src="/icons/site.svg" alt="Website" className="w-5 h-5" />
            </a>
            <a href="#" className="w-10 h-10 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center text-neutral-600 dark:text-gray-300 hover:text-pink-600 transition-all duration-200 transform hover:scale-105 shadow-sm hover:shadow-md">
              <img src="/icons/instagram.svg" alt="Instagram" className="w-5 h-5" />
            </a>
            <a href="#" className="w-10 h-10 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center text-neutral-600 dark:text-gray-300 hover:text-blue-800 transition-all duration-200 transform hover:scale-105 shadow-sm hover:shadow-md">
              <img src="/icons/facebook.svg" alt="Facebook" className="w-5 h-5" />
            </a>
            <a href="#" className="w-10 h-10 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center text-neutral-600 dark:text-gray-300 hover:text-blue-700 transition-all duration-200 transform hover:scale-105 shadow-sm hover:shadow-md">
              <img src="/icons/linkedin.svg" alt="LinkedIn" className="w-5 h-5" />
            </a>
          </div>

          <div className="text-center">
            <p className="text-gray-500 dark:text-gray-400 italic text-sm mb-4">
              "{message}"
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