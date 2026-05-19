'use client'

import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'

interface PasswordConfirmModalProps {
  title: string
  message: string
  onConfirm: (password: string) => Promise<void>
  onClose: () => void
  confirmButtonText?: string
  isDangerous?: boolean
}

export function PasswordConfirmModal({
  title,
  message,
  onConfirm,
  onClose,
  confirmButtonText = 'Confirmar',
  isDangerous = false,
}: PasswordConfirmModalProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await onConfirm(password)
      setPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao verificar senha.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: '#0f2744' }}>{title}</h2>
            <p className="text-sm text-slate-500 mt-1">{message}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Fechar">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password-confirm" className="block text-sm font-medium" style={{ color: '#0f2744' }}>
              Sua senha
            </label>
            <input
              id="password-confirm"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none"
              placeholder="Digite sua senha"
              autoFocus
              required
            />
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" variant={isDangerous ? 'danger' : 'primary'} loading={isSubmitting}>
              {isSubmitting ? 'Confirmando...' : confirmButtonText}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
