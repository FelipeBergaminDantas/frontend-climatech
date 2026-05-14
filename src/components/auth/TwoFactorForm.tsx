'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/hooks/useAuth'

export function TwoFactorForm() {
  const { verify2FA } = useAuth()
  const router = useRouter()

  const [token, setToken] = useState('')
  const [tokenError, setTokenError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleTokenChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Allow only digits, max 6
    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
    setToken(value)
    if (tokenError) setTokenError('')
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setTokenError('')

    if (token.length !== 6) {
      setTokenError('O código deve ter exatamente 6 dígitos.')
      return
    }

    setLoading(true)
    try {
      const ok = await verify2FA(token)
      if (ok) {
        router.push('/dashboard')
      } else {
        setTokenError('Código inválido. Tente novamente.')
      }
    } catch (err) {
      setTokenError(err instanceof Error ? err.message : 'Código inválido. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-8">
        {/* Logo / título */}
        <div className="flex flex-col items-center gap-2 mb-8">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-900/30">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-8 h-8 text-blue-600 dark:text-blue-400"
              aria-hidden="true"
            >
              {/* Shield / lock icon for 2FA */}
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            ClimaTech
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            Verificação em duas etapas
          </p>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-300 text-center mb-6">
          Digite o código de 6 dígitos do seu aplicativo autenticador.
        </p>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
          <Input
            label="Código de verificação"
            id="token"
            name="token"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            value={token}
            onChange={handleTokenChange}
            error={tokenError}
            required
            className="text-center text-xl tracking-[0.5em] font-mono"
          />

          <Button type="submit" size="lg" loading={loading} className="w-full mt-1">
            {loading ? 'Verificando…' : 'Verificar'}
          </Button>
        </form>
      </div>
    </div>
  )
}
