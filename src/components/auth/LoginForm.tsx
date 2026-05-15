'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { validateEmail } from '@/utils/validators'
import * as authService from '@/services/authService'

// ── Forgot password modal ──────────────────────────────────────────────────────
function ForgotPasswordModal({ onClose }: { onClose: () => void }) {
  const [fpEmail, setFpEmail] = useState('')
  const [fpStatus, setFpStatus] = useState<'idle' | 'sent' | 'not_found' | 'invalid'>('idle')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try { validateEmail(fpEmail) } catch { setFpStatus('invalid'); return }

    // Check against the in-memory user store
    const exists = authService.isEmailRegistered(fpEmail)
    setFpStatus(exists ? 'sent' : 'not_found')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-sm rounded-2xl p-6 space-y-4" style={{ background: 'white' }}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg" style={{ color: '#0f2744' }}>Recuperar senha</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors" aria-label="Fechar">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {fpStatus === 'sent' ? (
          <div className="rounded-xl p-4 text-sm text-center space-y-2" style={{ background: 'rgba(16,201,143,0.08)', border: '1px solid rgba(16,201,143,0.2)' }}>
            <p className="font-semibold" style={{ color: '#0ea5a0' }}>✓ Solicitação registrada!</p>
            <p className="text-slate-500">
              Se o e-mail <span className="font-medium text-slate-700">{fpEmail}</span> estiver cadastrado, você receberá as instruções em breve.
            </p>
            <p className="text-xs text-slate-400">(Envio real requer integração com serviço de e-mail)</p>
            <button onClick={onClose} className="mt-2 px-4 py-2 rounded-xl text-sm font-medium text-white" style={{ background: 'linear-gradient(135deg, #1e5fa8, #2d7dd2)' }}>
              Fechar
            </button>
          </div>
        ) : fpStatus === 'not_found' ? (
          <div className="rounded-xl p-4 text-sm text-center space-y-2" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <p className="font-semibold text-red-500">E-mail não encontrado</p>
            <p className="text-slate-500">Este e-mail não está cadastrado. <Link href="/register" className="font-semibold underline" style={{ color: '#1e5fa8' }}>Cadastre-se</Link> primeiro.</p>
            <button onClick={() => setFpStatus('idle')} className="mt-2 px-4 py-2 rounded-xl text-sm font-medium" style={{ background: '#f0f4f8', color: '#64748b' }}>
              Tentar outro e-mail
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-slate-500">Informe seu e-mail cadastrado e enviaremos um link para redefinir sua senha.</p>
            <div className="space-y-1.5">
              <label htmlFor="fp-email" className="block text-sm font-medium" style={{ color: '#0f2744' }}>E-mail</label>
              <input
                id="fp-email" type="email" value={fpEmail} onChange={e => setFpEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={{ background: '#f8fafc', border: fpStatus === 'invalid' ? '1.5px solid #fca5a5' : '1.5px solid #e2e8f0', color: '#0f2744' }}
                required
              />
              {fpStatus === 'invalid' && <p className="text-xs text-red-500">E-mail inválido.</p>}
            </div>
            <button type="submit" className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all"
              style={{ background: 'linear-gradient(135deg, #1e5fa8, #2d7dd2)' }}>
              Enviar link de recuperação
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

// ── Privacy policy modal ──────────────────────────────────────────────────────
export function PrivacyModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-lg rounded-2xl p-6 space-y-5" style={{ background: 'white' }}>
        <h3 className="font-bold text-xl" style={{ color: '#0f2744' }}>Política de Privacidade</h3>

        <div className="text-sm leading-relaxed space-y-3 max-h-72 overflow-y-auto pr-1" style={{ color: '#374151' }}>
          <p>
            Ao clicar "Aceitar" após ler esta Política de Privacidade ou ao confirmar o recebimento desta Política de Privacidade e dos Termos e Condições de uso do site via outro meio que não o próprio site, o Usuário confirma ser legalmente capaz e maior de 18 (dezoito) anos, bem como está ciente de que a Política de Privacidade deve ser lida em conjunto com os Termos e Condições de uso do site, motivo pelo qual recomenda-se a leitura atenta dos documentos.
          </p>
          <p>
            A ClimaTech coleta apenas os dados necessários para o funcionamento da plataforma, incluindo nome, e-mail e dados de uso. Nenhuma informação é compartilhada com terceiros sem consentimento explícito do usuário.
          </p>
          <p>
            Em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018), o usuário tem direito ao acesso, correção e exclusão de seus dados a qualquer momento através das Configurações da conta.
          </p>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button onClick={onClose}
            className="text-sm underline transition-colors hover:opacity-70"
            style={{ color: '#64748b' }}>
            Cancelar
          </button>
          <button onClick={onClose}
            className="px-8 py-3 rounded-2xl text-sm font-bold text-white tracking-widest uppercase transition-all"
            style={{ background: 'linear-gradient(135deg, #1e5fa8, #2d7dd2)' }}>
            Aceitar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Shared left panel content ──────────────────────────────────────────────────
export function AuthLeftPanel() {
  return (
    <div className="hidden lg:flex flex-col w-[55%] bg-white relative overflow-hidden">
      <div className="bubble-1 absolute top-[8%] right-[12%] w-28 h-28 rounded-full opacity-[0.07]"
        style={{ background: 'radial-gradient(circle, #0ea5a0, #0f2744)' }} />
      <div className="bubble-2 absolute top-[30%] right-[5%] w-48 h-48 rounded-full opacity-[0.05]"
        style={{ background: 'radial-gradient(circle, #10c98f, #1e5fa8)' }} />
      <div className="bubble-3 absolute bottom-[20%] right-[18%] w-36 h-36 rounded-full opacity-[0.06]"
        style={{ background: 'radial-gradient(circle, #0ea5a0, #0f2744)' }} />
      <div className="bubble-4 absolute bottom-[5%] left-[8%] w-56 h-56 rounded-full opacity-[0.04]"
        style={{ background: 'radial-gradient(circle, #10c98f, #0ea5a0)' }} />
      <div className="bubble-5 absolute top-[55%] left-[3%] w-20 h-20 rounded-full opacity-[0.08]"
        style={{ background: 'radial-gradient(circle, #1e5fa8, #0ea5a0)' }} />

      {/* Centered content */}
      <div className="relative z-10 flex flex-col h-full px-16 py-14">
        <div className="flex-1 flex flex-col items-center justify-center gap-8">
          <Image
            src="/logo_sem_nome.png"
            alt="ClimaTech Logo"
            width={72}
            height={72}
            className="object-contain"
            style={{ mixBlendMode: 'multiply' }}
          />
          <div className="space-y-4 text-center">
            <p className="text-sm font-semibold tracking-widest uppercase" style={{ color: '#0ea5a0' }}>
              Bem-vindo ao
            </p>
            <h1 className="text-6xl font-extrabold leading-none tracking-tight" style={{ color: '#0f2744' }}>
              ClimaTech
            </h1>
            <p className="text-base leading-relaxed max-w-xs mx-auto" style={{ color: '#475569' }}>
              Plataforma de controle climático inteligente baseada em IoT.
            </p>
          </div>

          <div className="flex gap-10">
            {[
              { value: '99.9%', label: 'Uptime' },
              { value: '28%', label: 'Economia' },
              { value: '24/7', label: 'Monitoramento' },
            ].map(({ value, label }) => (
              <div key={label} className="space-y-1 text-center">
                <p className="text-3xl font-extrabold" style={{ color: '#0f2744' }}>{value}</p>
                <p className="text-xs font-medium tracking-wide uppercase" style={{ color: '#64748b' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-center" style={{ color: '#64748b' }}>
          © 2026 ClimaTech. Todos os direitos reservados.
        </p>
      </div>
    </div>
  )
}

// ── Login form ─────────────────────────────────────────────────────────────────
export function LoginForm() {
  const { login, isAuthenticated, user } = useAuth()
  const router = useRouter()

  // Prevent navigating back to protected pages when on login (e.g., after logout)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!isAuthenticated) {
      const onPop = () => {
        // Keep user on login if they try to go back
        router.replace('/login')
      }
      window.addEventListener('popstate', onPop)
      return () => window.removeEventListener('popstate', onPop)
    }
    return
  }, [isAuthenticated, router])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [genericError, setGenericError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)

  function validateFields(): boolean {
    let valid = true
    setEmailError(''); setPasswordError(''); setGenericError('')
    if (!email) { setEmailError('E-mail é obrigatório.'); valid = false }
    else { try { validateEmail(email) } catch { setEmailError('E-mail inválido.'); valid = false } }
    if (!password) { setPasswordError('Senha é obrigatória.'); valid = false }
    return valid
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!validateFields()) return
    setLoading(true)
    try {
      const loggedUser = await login(email, password)
      // Admin master vai para seleção de cliente, outros vão direto para dashboard
      if (loggedUser.role === 'admin_master') {
        router.push('/select-client')
      } else {
        router.push('/dashboard')
      }
    } catch (err) {
      console.error('Login error:', err)
      setGenericError('E-mail ou senha incorretos. Tente novamente.')
      setLoading(false)
    }
  }

  const inputBorder = (hasError: boolean) =>
    hasError ? '1.5px solid rgba(252,165,165,0.8)' : '1.5px solid rgba(255,255,255,0.15)'

  return (
    <>
      <style>{`
        @keyframes float1 { 0%,100%{transform:translateY(0) translateX(0)} 33%{transform:translateY(-40px) translateX(20px)} 66%{transform:translateY(20px) translateX(-15px)} }
        @keyframes float2 { 0%,100%{transform:translateY(0) translateX(0)} 33%{transform:translateY(30px) translateX(-25px)} 66%{transform:translateY(-20px) translateX(30px)} }
        @keyframes float3 { 0%,100%{transform:translateY(0) translateX(0)} 50%{transform:translateY(-50px) translateX(10px)} }
        @keyframes float4 { 0%,100%{transform:translateY(0) translateX(0)} 40%{transform:translateY(35px) translateX(-20px)} 80%{transform:translateY(-15px) translateX(25px)} }
        @keyframes float5 { 0%,100%{transform:translateY(0) translateX(0)} 60%{transform:translateY(-30px) translateX(-30px)} }
        .bubble-1{animation:float1 8s ease-in-out infinite}
        .bubble-2{animation:float2 11s ease-in-out infinite}
        .bubble-3{animation:float3 9s ease-in-out infinite}
        .bubble-4{animation:float4 13s ease-in-out infinite}
        .bubble-5{animation:float5 7s ease-in-out infinite}
        .bubble-6{animation:float1 10s ease-in-out infinite reverse}
        .bubble-7{animation:float3 12s ease-in-out infinite reverse}
        @keyframes spin{to{transform:rotate(360deg)}}
        .spinner{animation:spin 0.8s linear infinite}
      `}</style>

      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}
      {showPrivacy && <PrivacyModal onClose={() => setShowPrivacy(false)} />}

      {/* Full-page loading overlay shown after successful login while navigating */}
      {loading && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/90 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
              <div className="absolute inset-0 rounded-full border-4 border-transparent"
                style={{ borderTopColor: '#1e5fa8', borderRightColor: '#0ea5a0', animation: 'spin 0.9s linear infinite' }} />
            </div>
            <p className="text-sm font-medium" style={{ color: '#64748b' }}>Entrando…</p>
          </div>
        </div>
      )}

      <div className="min-h-screen flex">
        <AuthLeftPanel />

        {/* RIGHT PANEL */}
        <div className="flex-1 flex flex-col min-h-screen relative overflow-hidden"
          style={{ background: 'linear-gradient(155deg, #0f2744 0%, #1a3a5c 30%, #0d6e6a 65%, #0ea5a0 85%, #10c98f 100%)' }}>

          {/* Decorative bubbles */}
          <div className="bubble-6 absolute top-[10%] left-[10%] w-40 h-40 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #10c98f, transparent)' }} />
          <div className="bubble-7 absolute bottom-[15%] right-[8%] w-56 h-56 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #0ea5a0, transparent)' }} />

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 px-8 pt-10">
            <Image src="/logo_sem_nome.png" alt="ClimaTech" width={36} height={36} className="object-contain" style={{ mixBlendMode: 'screen' }} />
            <span className="text-white font-bold text-lg">ClimaTech</span>
          </div>

          <div className="relative z-10 flex-1 flex items-center justify-center px-8 py-10">
            <div className="w-full max-w-[360px]">
              <div className="mb-10">
                <h2 className="text-4xl font-bold text-white mb-2">Entrar</h2>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>Acesse sua conta para continuar</p>
              </div>

              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-sm font-medium" style={{ color: 'rgba(255,255,255,0.75)' }}>E-mail</label>
                  <input id="email" name="email" type="email" autoComplete="email" placeholder="E-mail" value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-2xl text-sm text-white placeholder-white/30 outline-none transition-all"
                    style={{ background: 'rgba(255,255,255,0.1)', border: inputBorder(!!emailError), backdropFilter: 'blur(8px)', caretColor: '#10c98f' }}
                    required />
                  {emailError && <p className="text-xs text-red-300 pl-1">{emailError}</p>}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="block text-sm font-medium" style={{ color: 'rgba(255,255,255,0.75)' }}>Senha</label>
                    <button type="button" onClick={() => setShowForgot(true)}
                      className="text-xs hover:underline transition-all"
                      style={{ color: 'rgba(255,255,255,0.6)' }}>
                      Esqueceu a senha?
                    </button>
                  </div>
                  <input id="password" name="password" type="password" autoComplete="current-password" placeholder="Senha" value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-2xl text-sm text-white placeholder-white/30 outline-none transition-all"
                    style={{ background: 'rgba(255,255,255,0.1)', border: inputBorder(!!passwordError), backdropFilter: 'blur(8px)', caretColor: '#10c98f' }}
                    required />
                  {passwordError && <p className="text-xs text-red-300 pl-1">{passwordError}</p>}
                </div>

                {genericError && (
                  <p role="alert" className="text-sm text-red-300 text-center rounded-2xl py-3 px-4"
                    style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    {genericError}
                  </p>
                )}

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded accent-[#10c98f]" />
                  <span className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>Lembrar-me</span>
                </label>

                <button type="submit" disabled={loading}
                  className="w-full py-4 rounded-2xl text-sm font-bold text-white tracking-widest uppercase transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                  style={{ background: 'rgba(255,255,255,0.18)', border: '1.5px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(12px)', boxShadow: loading ? 'none' : '0 4px 24px rgba(16,201,143,0.2)' }}>
                  {loading && (
                    <svg className="spinner w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                      <path d="M12 2a10 10 0 0110 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                  )}
                  {loading ? 'Entrando…' : 'LOGIN'}
                </button>
              </form>

              <p className="mt-8 text-center text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Entre em contato com um administrador para obter acesso.
              </p>
            </div>
          </div>

          <div className="relative z-10 pb-8 text-center space-y-2">
            <button
              onClick={() => setShowPrivacy(true)}
              className="text-xs hover:underline transition-all"
              style={{ color: 'rgba(255,255,255,0.55)' }}
            >
              Política de Privacidade
            </button>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>
              © 2026 <span className="font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>ClimaTech</span> — Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
