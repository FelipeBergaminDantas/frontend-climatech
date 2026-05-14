'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { validateEmail } from '@/utils/validators'
import { AuthLeftPanel, PrivacyModal } from './LoginForm'

export function RegisterForm() {
  const { register } = useAuth()
  const router = useRouter()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nameError, setNameError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [genericError, setGenericError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)

  function validateFields(): boolean {
    let valid = true
    setNameError(''); setEmailError(''); setPasswordError(''); setGenericError('')
    if (!name.trim()) { setNameError('Nome é obrigatório.'); valid = false }
    if (!email) { setEmailError('E-mail é obrigatório.'); valid = false }
    else { try { validateEmail(email) } catch { setEmailError('E-mail inválido.'); valid = false } }
    if (!password) { setPasswordError('Senha é obrigatória.'); valid = false }
    else if (password.length < 8) { setPasswordError('Mínimo 8 caracteres.'); valid = false }
    else if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) { setPasswordError('Use letras e números.'); valid = false }
    return valid
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!validateFields()) return
    setLoading(true)
    try {
      await register(name.trim(), email, password)
      router.push('/login')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar conta.'
      if (msg.toLowerCase().includes('e-mail já cadastrado')) {
        setEmailError(msg)
      } else {
        setGenericError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const fieldBorder = (hasError: boolean) =>
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

      {showPrivacy && <PrivacyModal onClose={() => setShowPrivacy(false)} />}

      <div className="min-h-screen flex">
        <AuthLeftPanel />

        {/* RIGHT PANEL */}
        <div className="flex-1 flex flex-col min-h-screen relative overflow-hidden"
          style={{ background: 'linear-gradient(155deg, #0f2744 0%, #1a3a5c 30%, #0d6e6a 65%, #0ea5a0 85%, #10c98f 100%)' }}>

          <div className="bubble-6 absolute top-[10%] left-[10%] w-40 h-40 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #10c98f, transparent)' }} />
          <div className="bubble-7 absolute bottom-[15%] right-[8%] w-56 h-56 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #0ea5a0, transparent)' }} />

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 px-8 pt-10">
            <Image src="/logo_sem_nome.png" alt="ClimaTech" width={36} height={36} className="object-contain" style={{ mixBlendMode: 'screen' }} />
            <span className="text-white font-bold text-lg">ClimaTech</span>
          </div>

          <div className="relative z-10 flex-1 flex items-center justify-center px-10 py-12">
            <div className="w-full max-w-[360px]">
              <div className="mb-8">
                <h2 className="text-4xl font-bold text-white mb-2">Criar conta</h2>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>Preencha os dados para se cadastrar</p>
              </div>

              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="name" className="block text-sm font-medium" style={{ color: 'rgba(255,255,255,0.75)' }}>Nome</label>
                  <input id="name" name="name" type="text" autoComplete="name" placeholder="Seu nome completo" value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-2xl text-sm text-white placeholder-white/30 outline-none transition-all"
                    style={{ background: 'rgba(255,255,255,0.1)', border: fieldBorder(!!nameError), backdropFilter: 'blur(8px)', caretColor: '#10c98f' }}
                    required />
                  {nameError && <p className="text-xs text-red-300 pl-1">{nameError}</p>}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-sm font-medium" style={{ color: 'rgba(255,255,255,0.75)' }}>E-mail</label>
                  <input id="email" name="email" type="email" autoComplete="email" placeholder="seu@email.com" value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-2xl text-sm text-white placeholder-white/30 outline-none transition-all"
                    style={{ background: 'rgba(255,255,255,0.1)', border: fieldBorder(!!emailError), backdropFilter: 'blur(8px)', caretColor: '#10c98f' }}
                    required />
                  {emailError && <p className="text-xs text-red-300 pl-1">{emailError}</p>}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="password" className="block text-sm font-medium" style={{ color: 'rgba(255,255,255,0.75)' }}>Senha</label>
                  <input id="password" name="password" type="password" autoComplete="new-password" placeholder="Mínimo 8 caracteres" value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-2xl text-sm text-white placeholder-white/30 outline-none transition-all"
                    style={{ background: 'rgba(255,255,255,0.1)', border: fieldBorder(!!passwordError), backdropFilter: 'blur(8px)', caretColor: '#10c98f' }}
                    required />
                  {passwordError && <p className="text-xs text-red-300 pl-1">{passwordError}</p>}
                </div>

                {genericError && (
                  <p role="alert" className="text-sm text-red-300 text-center rounded-2xl py-3 px-4"
                    style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    {genericError}
                  </p>
                )}

                <button type="submit" disabled={loading}
                  className="w-full py-4 rounded-2xl text-sm font-bold text-white tracking-widest uppercase transition-all disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
                  style={{ background: 'rgba(255,255,255,0.18)', border: '1.5px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(12px)', boxShadow: loading ? 'none' : '0 4px 24px rgba(16,201,143,0.2)' }}>
                  {loading && (
                    <svg className="spinner w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                      <path d="M12 2a10 10 0 0110 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                  )}
                  {loading ? 'Criando conta…' : 'CADASTRAR'}
                </button>
              </form>

              <p className="mt-8 text-center text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Já tem uma conta?{' '}
                <Link href="/login" className="font-semibold text-white hover:underline">Entrar</Link>
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
