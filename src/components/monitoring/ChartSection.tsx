'use client'

import { useState, useEffect, useCallback } from 'react'
import { TemperatureChart } from './TemperatureChart'
import { getTemperatureHistory, getLiveReadings, getAvailableDates } from '@/services/deviceService'
import { getClientName } from '@/services/clientService'
import { useTemperatureHistory } from '@/hooks/useTemperatureTelemetry'
import type { TemperatureReading, Room } from '@/types'

interface ChartSectionProps {
  roomId: string
  roomName?: string
  idealMin?: number
  idealMax?: number
  // Props para filtro de cliente
  showClientFilter?: boolean
  allRooms?: Room[]
  onRoomChange?: (roomId: string) => void
}

export function ChartSection({ 
  roomId, 
  roomName, 
  idealMin, 
  idealMax,
  showClientFilter = false,
  allRooms = [],
  onRoomChange
}: ChartSectionProps) {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date()
    const offset = now.getTimezoneOffset()
    return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10)
  })
  type TemperatureChartPoint = { timestamp: string; temp?: number; temperatura?: number }
  const [readings, setReadings] = useState<TemperatureChartPoint[]>([])
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [resolvedDate, setResolvedDate] = useState<string>('')
  
  // Fetch temperature history using the hook
  const { history, isLoading: historyLoading, error: historyError } = useTemperatureHistory(roomId, selectedDate)
  
  // Obter lista única de clientes
  const clientIds = Array.from(new Set(allRooms.map(r => r.clientId)))
  
  // Inicializa com o primeiro cliente disponível
  const [selectedClientId, setSelectedClientId] = useState<string>(() => clientIds[0] || '')
  
  // Filtrar salas por cliente selecionado
  const filteredRooms = allRooms.filter(r => r.clientId === selectedClientId)

  // Quando o filtro de cliente muda, seleciona a primeira sala do cliente
  useEffect(() => {
    if (showClientFilter && filteredRooms.length > 0 && onRoomChange) {
      const currentRoomInFilter = filteredRooms.find(r => r.id === roomId)
      if (!currentRoomInFilter) {
        onRoomChange(filteredRooms[0].id)
      }
    }
  }, [selectedClientId, filteredRooms, roomId, showClientFilter, onRoomChange])

  // Load available dates once
  useEffect(() => {
    const dates = getAvailableDates(roomId)
    setAvailableDates(dates)
  }, [roomId])

  // Update readings when hook data changes
  useEffect(() => {
    if (history && history.length > 0) {
      const normalizedReadings = history.map((point) => ({
        timestamp: point.timestamp,
        temp: typeof (point as any).temp === 'number'
          ? (point as any).temp
          : typeof point.temperatura === 'number'
            ? point.temperatura
            : Number((point as any).temp ?? point.temperatura),
        temperatura: point.temperatura,
      }))
      setReadings(normalizedReadings)
      // Detect if we redirected to a different date
      const actual = history[0].timestamp.slice(0, 10)
      setResolvedDate(actual !== selectedDate ? actual : '')
    } else {
      setReadings([])
      setResolvedDate('')
    }
  }, [history, selectedDate])

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="font-semibold text-sm" style={{ color: '#0f2744' }}>
            Histórico de temperatura
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Granularidade: 30 min
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro de Cliente - apenas no modo overview */}
          {showClientFilter && clientIds.length > 0 && (
            <select
              value={selectedClientId}
              onChange={e => setSelectedClientId(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-xs outline-none cursor-pointer"
              style={{ background: '#f0f4f8', border: '1px solid #e2e8f0', color: '#0f2744' }}
              aria-label="Filtrar por cliente"
            >
              {clientIds.map(clientId => (
                <option key={clientId} value={clientId}>
                  {getClientName(clientId)}
                </option>
              ))}
            </select>
          )}

          {/* Seletor de Sala - sempre visível */}
          {allRooms.length > 0 && (
            <select
              value={roomId}
              onChange={e => onRoomChange?.(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-xs outline-none cursor-pointer"
              style={{ background: '#f0f4f8', border: '1px solid #e2e8f0', color: '#0f2744' }}
              aria-label="Selecionar sala"
            >
              {(showClientFilter ? filteredRooms : allRooms).map(room => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
          )}

          {/* Seletor de Data */}
          <input
            type="date"
            value={selectedDate}
            max={new Date().toISOString().slice(0, 10)}
            onChange={e => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 rounded-xl text-xs outline-none cursor-pointer w-full sm:w-auto"
            style={{ background: '#f0f4f8', border: '1px solid #e2e8f0', color: '#0f2744' }}
            aria-label="Selecionar data"
          />
        </div>
      </div>

      {/* Nearest date notice */}
      {resolvedDate && (
        <div className="rounded-xl px-4 py-2 text-xs" style={{ background: 'rgba(245,158,11,0.08)', color: '#b45309', border: '1px solid rgba(245,158,11,0.2)' }}>
          Sem dados para a data selecionada. Exibindo dados de <span className="font-semibold">{resolvedDate}</span> (data mais próxima disponível).
        </div>
      )}

      {/* Available dates hint */}
      {availableDates.length > 0 && (
        <p className="text-xs text-slate-400">
          Dados disponíveis: {availableDates[0]} até {availableDates[availableDates.length - 1]}
        </p>
      )}

      <TemperatureChart
        readings={readings}
        idealMin={idealMin}
        idealMax={idealMax}
        mode="history"
      />
    </div>
  )
}
