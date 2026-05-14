'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { Client } from '@/types'
import { getAllClients } from '@/services/clientService'

interface ClientContextValue {
  selectedClient: Client | null
  availableClients: Client[]
  selectClient: (clientId: string) => void
  clearClient: () => void
}

const CLIENT_STORAGE_KEY = 'climatech-selected-client'

export const ClientContext = createContext<ClientContextValue | null>(null)

export function ClientProvider({ children }: { children: ReactNode }) {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [availableClients, setAvailableClients] = useState<Client[]>([])

  // Carregar clientes disponíveis
  useEffect(() => {
    getAllClients().then(clients => {
      setAvailableClients(clients)
    })
  }, [])

  // Restaurar cliente selecionado do sessionStorage
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(CLIENT_STORAGE_KEY)
      if (stored) {
        const client: Client = JSON.parse(stored)
        setSelectedClient(client)
      }
    } catch {
      sessionStorage.removeItem(CLIENT_STORAGE_KEY)
    }
  }, [])

  function selectClient(clientId: string) {
    const client = availableClients.find((c) => c.id === clientId)
    if (!client) {
      throw new Error('Cliente não encontrado.')
    }
    setSelectedClient(client)
    sessionStorage.setItem(CLIENT_STORAGE_KEY, JSON.stringify(client))
  }

  function clearClient() {
    setSelectedClient(null)
    sessionStorage.removeItem(CLIENT_STORAGE_KEY)
  }

  return (
    <ClientContext.Provider
      value={{
        selectedClient,
        availableClients,
        selectClient,
        clearClient,
      }}
    >
      {children}
    </ClientContext.Provider>
  )
}

export function useClient(): ClientContextValue {
  const ctx = useContext(ClientContext)
  if (!ctx) {
    throw new Error('useClient must be used within a ClientProvider')
  }
  return ctx
}
