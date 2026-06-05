import { useEffect, useState, useCallback } from 'react'
import { getLastTemperatureByNode, getLastTemperaturesByNodes, getTemperatureHistory, TemperatureTelemetry, API_BASE_URL, TemperatureHistoryPoint } from '@/services/apiService'
import type { TemperatureReading } from '@/types'

interface UseTemperatureTelemetryResult {
  temperature: TemperatureTelemetry | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

/**
 * Hook to fetch and cache last temperature for a node
 */
export function useTemperatureTelemetry(nodeId: string | null): UseTemperatureTelemetryResult {
  const [temperature, setTemperature] = useState<TemperatureTelemetry | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    if (!nodeId) {
      setTemperature(null)
      setIsLoading(false)
      setError(null)
      setLastUpdated(null)
      return
    }

    let isMounted = true
    const id = nodeId // Capture the non-null value

    async function fetchTemperature() {
      try {
        setIsLoading(true)
        setError(null)
        console.log('[useTemperatureTelemetry] Fetching temperature for node:', id)

        const data = await getLastTemperatureByNode(id)
        
        if (isMounted) {
          if (data) {
            console.log('[useTemperatureTelemetry] Got temperature:', data.temperatura, '°C')
            setTemperature(data)
            setLastUpdated(new Date())
          } else {
            console.log('[useTemperatureTelemetry] No temperature data found')
            setTemperature(null)
            setError('Nenhuma leitura de temperatura disponível')
          }
        }
      } catch (err) {
        if (isMounted) {
          const message = err instanceof Error ? err.message : 'Falha ao buscar temperatura'
          console.error('[useTemperatureTelemetry] Error:', message)
          setError(message)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchTemperature()

    return () => {
      isMounted = false
    }
  }, [nodeId])

  return {
    temperature,
    isLoading,
    error,
    lastUpdated,
  }
}

/**
 * Hook to fetch and cache last temperatures for multiple nodes
 */
export function useTemperatureTelemetryBatch(nodeIds: string[]): {
  temperatures: Record<string, TemperatureTelemetry | null>;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const [temperatures, setTemperatures] = useState<Record<string, TemperatureTelemetry | null>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTemperatures = useCallback(async () => {
    if (!nodeIds || nodeIds.length === 0) {
      console.log('[useTemperatureTelemetryBatch] No node IDs provided')
      setTemperatures({})
      return
    }

    try {
      console.log('[useTemperatureTelemetryBatch] Fetching temperatures for nodes:', nodeIds)
      setIsLoading(true)
      setError(null)

      const results = await getLastTemperaturesByNodes(nodeIds)
      console.log('[useTemperatureTelemetryBatch] Got results:', results)
      
      setTemperatures(results)
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao buscar temperaturas'
      console.error('[useTemperatureTelemetryBatch] Error:', message)
      setError(message)
      setTemperatures({})
    } finally {
      setIsLoading(false)
    }
  }, [nodeIds.join(',')])

  useEffect(() => {
    if (nodeIds && nodeIds.length > 0) {
      fetchTemperatures()
      
      // Poll every 30 seconds
      const interval = setInterval(fetchTemperatures, 30000)
      return () => clearInterval(interval)
    }
  }, [nodeIds.join(','), fetchTemperatures])

  return {
    temperatures,
    isLoading,
    error,
    refetch: fetchTemperatures,
  }
}

/**
 * Hook to fetch temperature history for a sala
 */
export function useTemperatureHistory(
  salaId: string | null,
  date?: string
): {
  history: TemperatureHistoryPoint[];
  isLoading: boolean;
  error: string | null;
} {
  const [history, setHistory] = useState<TemperatureHistoryPoint[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!salaId) {
      setHistory([])
      setIsLoading(false)
      setError(null)
      return
    }

    let isMounted = true
    const id = salaId // Capture the non-null value

    async function fetchHistory() {
      try {
        setIsLoading(true)
        setError(null)
        console.log('[useTemperatureHistory] Fetching history for sala:', id, 'date:', date)

        const data = await getTemperatureHistory(id, date)
        
        if (isMounted) {
          if (data && data.length > 0) {
            console.log('[useTemperatureHistory] Got', data.length, 'history points')
            setHistory(data)
            setError(null)
          } else {
            console.log('[useTemperatureHistory] No history data found')
            setHistory([])
            setError('Sem dados de temperatura para o período')
          }
        }
      } catch (err) {
        if (isMounted) {
          const message = err instanceof Error ? err.message : 'Falha ao buscar histórico'
          console.error('[useTemperatureHistory] Error:', message)
          setError(message)
          setHistory([])
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchHistory()

    return () => {
      isMounted = false
    }
  }, [salaId, date])

  return {
    history,
    isLoading,
    error,
  }
}
