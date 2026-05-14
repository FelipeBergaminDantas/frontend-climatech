/**
 * Hook para verificar o status do cliente atual
 * Retorna se o cliente está ativo e se pode criar novos itens
 */

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getAllClients } from '@/services/clientService'

export function useClientStatus() {
  const { user, isLoading: authLoading } = useAuth()
  const [isClientActive, setIsClientActive] = useState(true)
  const [isLoading, setIsLoading] = useState(false)

  const currentClientId = user?.selectedClientId || user?.clientId || ''

  useEffect(() => {
    // Aguarda o auth terminar de carregar
    if (authLoading) {
      return
    }

    // Se não há cliente selecionado, assume ativo (modo overview)
    if (!currentClientId) {
      setIsClientActive(true)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    getAllClients()
      .then(clients => {
        const client = clients.find(c => c.id === currentClientId)
        setIsClientActive(client?.isActive ?? true)
      })
      .catch(() => {
        // Em caso de erro, assume ativo para não bloquear a UI
        setIsClientActive(true)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [currentClientId, authLoading])

  return {
    isClientActive,
    isLoading,
    canCreate: isClientActive, // Só pode criar se o cliente estiver ativo
    currentClientId,
  }
}
