'use client'

import { useRouter } from 'next/navigation'

export function EmptyState() {
  const router = useRouter()

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
        style={{ background: 'rgba(30,95,168,0.08)' }}>
        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: '#1e5fa8' }} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 21V12h6v9" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold mb-2" style={{ color: '#0f2744' }}>Nenhuma sala cadastrada</h3>
      <p className="text-sm text-slate-400 mb-6 max-w-xs">
        Cadastre sua primeira sala para começar a monitorar temperatura e controlar dispositivos.
      </p>
      <button
        onClick={() => router.push('/rooms/new')}
        className="px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all"
        style={{ background: 'linear-gradient(135deg, #1e5fa8, #2d7dd2)' }}
      >
        Cadastrar primeira sala
      </button>
    </div>
  )
}
