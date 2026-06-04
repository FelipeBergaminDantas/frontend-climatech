'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Input } from '@/components/ui/Input'
import { validateEmail } from '@/utils/validators'
import * as authService from '@/services/authService'

const APP_VERSION = '1.0.0-beta'

const ACCESS_HISTORY = [
  { date: '31/03/2026 14:22', ip: '189.28.xx.xx', device: 'Chrome — Windows' },
  { date: '30/03/2026 09:10', ip: '189.28.xx.xx', device: 'Safari — iPhone' },
  { date: '28/03/2026 18:45', ip: '177.92.xx.xx', device: 'Chrome — Windows' },
]

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl p-6 space-y-5" style={{ background: 'white', border: '1px solid #e8edf5' }}>
      <h2 className="font-semibold" style={{ color: '#0f2744' }}>{title}</h2>
      {children}
    </section>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-sm text-slate-600">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
        style={{ background: checked ? '#10c98f' : '#cbd5e1' }}
      >
        <span
          className="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
          style={{ transform: checked ? 'translateX(22px)' : 'translateX(2px)' }}
        />
      </button>
    </label>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading, logout, updateUser } = useAuth()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>()
  const [avatarError, setAvatarError] = useState('')
  const [accountSaved, setAccountSaved] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [emailAlerts, setEmailAlerts] = useState(true)
  const [pushAlerts, setPushAlerts] = useState(false)
  const [reportFrequency, setReportFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly')

  useEffect(() => {
    if (user) {
      setName(user.name)
      setEmail(user.email)
      setAvatarPreview(user.avatarUrl)
    }
  }, [user])

  if (!isAuthenticated && !authLoading) return null

  const hasChanges = user ? (name !== user.name || email !== user.email) : false

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarError('')
    try {
      const url = authService.uploadAvatar(file)
      setAvatarPreview(url)
      updateUser({ avatarUrl: url })
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Erro ao enviar foto.')
    }
  }

  function handleSaveAccount(e: React.FormEvent) {
    e.preventDefault()
    setEmailError('')
    try { validateEmail(email) } catch { setEmailError('Formato de e-mail inválido.'); return }
    updateUser({ name: name.trim(), email: email.trim() })
    setAccountSaved(true)
    setTimeout(() => setAccountSaved(false), 2500)
  }

  async function handle2FA(e: React.FormEvent) {
    e.preventDefault()
  }

  return (
    <main className="min-h-screen px-4 sm:px-6 py-6 sm:py-8 pb-16 bg-white">
      <div className="max-w-2xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#0f2744' }}>Configurações</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gerencie sua conta e preferências</p>
        </div>

        <Section title="Conta">
          <div className="flex items-center gap-4">
            <div>
              {avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarPreview} alt="Foto de perfil" className="w-16 h-16 rounded-full object-cover" style={{ border: '2px solid #e8edf5' }} />
              ) : (
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #1e5fa8, #0ea5a0)' }}>
                  {user?.name?.[0]?.toUpperCase() ?? '?'}
                </div>
              )}
            </div>
            <div>
              <button onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={{ background: '#f0f4f8', color: '#1e5fa8', border: '1px solid #e2e8f0' }}>
                Alterar foto
              </button>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleAvatarChange} aria-label="Upload de foto de perfil" />
              {avatarError && <p className="text-xs text-red-500 mt-1">{avatarError}</p>}
              <p className="text-xs text-slate-400 mt-1">JPG ou PNG, máx. 2 MB</p>
            </div>
          </div>

          <form onSubmit={handleSaveAccount} className="space-y-4">
            <Input id="settings-name" name="settings-name" label="Nome" value={name} onChange={e => setName(e.target.value)} required />
            <Input id="settings-email" name="settings-email" label="E-mail" type="email" value={email} onChange={e => setEmail(e.target.value)} error={emailError} required />
            <div className="flex items-center gap-3">
              <button type="submit" disabled={!hasChanges}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                style={{ background: 'linear-gradient(135deg, #1e5fa8, #2d7dd2)' }}>
                Salvar dados
              </button>
              {accountSaved && <span className="text-sm" style={{ color: '#10c98f' }}>Salvo!</span>}
            </div>
          </form>
        </Section>

        <Section title="Notificações">
          <div className="space-y-4">
            <Toggle checked={emailAlerts} onChange={setEmailAlerts} label="Alertas por e-mail (temperatura fora do range)" />
            <Toggle checked={pushAlerts} onChange={setPushAlerts} label="Alertas por push (notificações no navegador)" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Frequência de relatórios</span>
              <select value={reportFrequency} onChange={e => setReportFrequency(e.target.value as typeof reportFrequency)}
                className="px-3 py-1.5 rounded-xl text-sm outline-none"
                style={{ background: '#f0f4f8', border: '1px solid #e2e8f0', color: '#0f2744' }}>
                <option value="daily">Diário</option>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensal</option>
              </select>
            </div>
          </div>
        </Section>

        <Section title="Histórico de acesso">
          <div className="space-y-2">
            {ACCESS_HISTORY.map((entry, i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 py-2 border-b border-slate-50 last:border-0">
                <div>
                  <p className="text-sm font-medium" style={{ color: '#0f2744' }}>{entry.device}</p>
                  <p className="text-xs text-slate-400">{entry.ip}</p>
                </div>
                <span className="text-xs text-slate-400">{entry.date}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Privacidade">
          <p className="text-sm text-slate-500">
            Em conformidade com a LGPD, você pode solicitar a exclusão de todos os seus dados da plataforma.
          </p>
          <button
            onClick={() => alert('Solicitação registrada. Nossa equipe entrará em contato em até 72h.')}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{ background: '#fff1f2', color: '#ef4444', border: '1px solid #fecdd3' }}>
            Solicitar exclusão de conta
          </button>
        </Section>

        <section className="rounded-2xl p-6" style={{ background: 'white', border: '1px solid #fee2e2' }}>
          <h2 className="font-semibold mb-3" style={{ color: '#0f2744' }}>Sessão</h2>
          <button
            onClick={async () => {
              await logout()
              router.replace('/login')
            }}
            className="px-4 py-2 rounded-xl text-sm font-medium text-white"
            style={{ background: '#ef4444' }}>
            Sair da conta
          </button>
        </section>

        <p className="text-center text-xs text-slate-300">
          ClimaTech Platform v{APP_VERSION}
        </p>
      </div>
    </main>
  )
}

