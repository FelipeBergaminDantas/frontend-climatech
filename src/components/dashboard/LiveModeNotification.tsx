'use client'

import { useEffect, useState } from 'react'
import { addLiveModeListener, getLiveModeState } from '@/services/liveModeService'

interface LiveModeNotificationProps {
  clientId: string
  currentUserId: string
}

export function LiveModeNotification({ clientId, currentUserId }: LiveModeNotificationProps) {
  const [notification, setNotification] = useState<{
    show: boolean
    message: string
    type: 'activated' | 'deactivated'
  }>({ show: false, message: '', type: 'activated' })

  useEffect(() => {
    // Registra listener para mudanças no modo ao vivo
    const unsubscribe = addLiveModeListener(clientId, (state) => {
      // Não mostra notificação para quem ativou/desativou
      if (state.activatedBy === currentUserId && state.isActive) {
        return
      }

      if (state.isActive && state.activatedByName) {
        setNotification({
          show: true,
          message: `${state.activatedByName} ativou o modo ao vivo`,
          type: 'activated',
        })
      } else if (!state.isActive) {
        // Verifica se tinha alguém antes
        const previousState = getLiveModeState(clientId)
        if (previousState.activatedByName) {
          setNotification({
            show: true,
            message: `Modo ao vivo desativado`,
            type: 'deactivated',
          })
        }
      }

      // Auto-oculta após 5 segundos
      setTimeout(() => {
        setNotification((prev) => ({ ...prev, show: false }))
      }, 5000)
    })

    return unsubscribe
  }, [clientId, currentUserId])

  if (!notification.show) return null

  return (
    <div
      className="fixed top-20 right-4 z-50 animate-slide-in-right"
      style={{ maxWidth: '400px' }}
    >
      <div
        className="rounded-xl p-4 shadow-lg flex items-start gap-3"
        style={{
          background: notification.type === 'activated' ? 'rgba(16,201,143,0.95)' : 'rgba(100,116,139,0.95)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div className="flex-shrink-0">
          {notification.type === 'activated' ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
              />
            </svg>
          )}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-white">{notification.message}</p>
        </div>
        <button
          onClick={() => setNotification((prev) => ({ ...prev, show: false }))}
          className="flex-shrink-0 text-white/80 hover:text-white transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
