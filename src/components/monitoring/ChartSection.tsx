'use client'

import { useMemo, useState, useEffect } from 'react'
import { TemperatureChart } from './TemperatureChart'
import { getAvailableDates } from '@/services/deviceService'
import { getClientName } from '@/services/clientService'
import { useTemperatureHistory } from '@/hooks/useTemperatureTelemetry'
import type { Room } from '@/types'

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

function getLocalDateInputValue(date = new Date()): string {
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10)
}

export function ChartSection({ 
  roomId, 
  idealMin, 
  idealMax,
  showClientFilter = false,
  allRooms = [],
  onRoomChange
}: ChartSectionProps) {
  const [selectedDate, setSelectedDate] = useState<string>(() => getLocalDateInputValue())
  type TemperatureChartPoint = { timestamp: string; temp?: number; temperatura?: number; measurementTimestamp?: string | null }
  
  // Fetch temperature history using the hook
  const { history, referenceIntervals, resolvedDate } = useTemperatureHistory(roomId, selectedDate)
  
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

  const availableDates = useMemo(() => getAvailableDates(roomId), [roomId])

  const readings: TemperatureChartPoint[] = useMemo(() => history.map((point) => ({
    timestamp: point.timestamp,
    temp: typeof point.temperatura === 'number' ? point.temperatura : Number(point.temperatura),
    temperatura: point.temperatura,
    measurementTimestamp: point.measurementTimestamp,
  })), [history])

  const referenceReadings: TemperatureChartPoint[] = useMemo(() => referenceIntervals.map((point) => ({
    timestamp: point.timestamp,
    temp: typeof point.temperatura === 'number' ? point.temperatura : Number(point.temperatura),
    temperatura: point.temperatura,
    measurementTimestamp: point.measurementTimestamp,
  })), [referenceIntervals])

  const fallbackDate = resolvedDate && resolvedDate !== selectedDate
    ? resolvedDate
    : ''

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
            max={getLocalDateInputValue()}
            onChange={e => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 rounded-xl text-xs outline-none cursor-pointer w-full sm:w-auto"
            style={{ background: '#f0f4f8', border: '1px solid #e2e8f0', color: '#0f2744' }}
            aria-label="Selecionar data"
          />
        </div>
      </div>

      {/* Nearest date notice */}
      {fallbackDate && (
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
        referenceReadings={referenceReadings}
        idealMin={idealMin}
        idealMax={idealMax}
        mode="history"
      />
    </div>
  )
}
