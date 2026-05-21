'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const SUGGESTIONS = [
  'Quanto estou gastando de energia?',
  'Qual sala consome mais?',
  'Qual a temperatura média das salas?',
  'Quando devo ligar o ar-condicionado?',
  'Como reduzir o consumo de energia?',
]

// Mock responses removed — waiting for backend AI implementation
async function getMockResponse(question: string): Promise<string> {
  // TODO: Replace with actual API call to AI service
  return 'Desculpe, o serviço de IA está indisponível no momento. Por favor, tente novamente mais tarde.'
}

export default function AIPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: 'Olá! Sou o assistente inteligente do ClimaTech. Posso ajudar com análises de consumo, temperatura e sugestões de automação. O que você gostaria de saber?',
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  if (!isAuthenticated && !authLoading) return null

  async function sendMessage(text: string) {
    if (!text.trim()) return
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text, timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    await new Promise(r => setTimeout(r, 1200 + Math.random() * 800))

    const response = await getMockResponse(text)
    const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: response, timestamp: new Date() }
    setMessages(prev => [...prev, aiMsg])
    setIsTyping(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    sendMessage(input)
  }

  return (
    <main className="min-h-screen px-6 py-8 bg-white" style={{ height: 'calc(100vh - 4rem)' }}>
      <div className="max-w-3xl mx-auto flex flex-col" style={{ height: 'calc(100vh - 8rem)' }}>

        {/* Header */}
        <div className="mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #0ea5a0, #10c98f)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: '#0f2744' }}>Assistente ClimaTech</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10c98f]" />
                <p className="text-xs text-slate-400">Modo demonstração — IA em desenvolvimento</p>
              </div>
            </div>
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 rounded-2xl overflow-hidden flex flex-col" style={{ background: 'white', border: '1px solid #e8edf5' }}>
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold"
                  style={msg.role === 'assistant'
                    ? { background: 'linear-gradient(135deg, #0ea5a0, #10c98f)', color: 'white' }
                    : { background: '#1e5fa8', color: 'white' }}>
                  {msg.role === 'assistant' ? 'IA' : 'U'}
                </div>
                {/* Bubble */}
                <div className="max-w-[80%]">
                  <div className="rounded-2xl px-4 py-3 text-sm leading-relaxed"
                    style={msg.role === 'assistant'
                      ? { background: '#f8fafc', color: '#0f2744', border: '1px solid #e8edf5' }
                      : { background: 'linear-gradient(135deg, #1e5fa8, #2d7dd2)', color: 'white' }}>
                    {msg.content}
                  </div>
                  <p className="text-xs text-slate-300 mt-1 px-1">
                    {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold"
                  style={{ background: 'linear-gradient(135deg, #0ea5a0, #10c98f)', color: 'white' }}>IA</div>
                <div className="rounded-2xl px-4 py-3 flex items-center gap-1"
                  style={{ background: '#f8fafc', border: '1px solid #e8edf5' }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} className="w-2 h-2 rounded-full bg-slate-300 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions */}
          {messages.length <= 1 && (
            <div className="px-5 pb-3">
              <p className="text-xs text-slate-400 mb-2">Sugestões:</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="text-xs px-3 py-1.5 rounded-full transition-all hover:opacity-80"
                    style={{ background: 'rgba(30,95,168,0.08)', color: '#1e5fa8', border: '1px solid rgba(30,95,168,0.15)' }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-slate-100">
            <form onSubmit={handleSubmit} className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Pergunte sobre consumo, temperatura, automações..."
                className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f2744' }}
                disabled={isTyping}
                aria-label="Mensagem para o assistente"
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="px-4 py-2.5 rounded-xl text-white text-sm font-medium transition-all disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #0ea5a0, #10c98f)' }}
                aria-label="Enviar mensagem"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  )
}
