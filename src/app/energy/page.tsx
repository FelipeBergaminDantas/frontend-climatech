'use client'

import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRooms } from '@/contexts/RoomsContext'
import { getClientName } from '@/services/clientService'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

type Period = 'hour' | 'day' | 'week' | 'month'

const PERIOD_LABELS: Record<Period, string> = {
  hour: 'Por hora', day: 'Por dia', week: 'Por semana', month: 'Por mês',
}

// Gera dados de energia com suporte a filtros de data
function generateEnergyData(period: Period, roomCount: number, year?: number, month?: number, date?: Date) {
  const seed = (i: number, base: number) => +(base + (Math.sin(i * 0.7) * base * 0.3 + Math.random() * base * 0.2)).toFixed(2)

  if (period === 'hour') {
    // Filtro por data específica
    return Array.from({ length: 24 }, (_, i) => ({
      label: `${String(i).padStart(2, '0')}h`,
      consumo: seed(i, 0.8 * roomCount),
    }))
  }
  if (period === 'day') {
    // Filtro por ano e mês
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    return days.map((d, i) => ({ label: d, consumo: seed(i, 5 * roomCount) }))
  }
  if (period === 'week') {
    // Filtro por ano e mês
    return Array.from({ length: 4 }, (_, i) => ({
      label: `Sem ${i + 1}`,
      consumo: seed(i, 30 * roomCount),
    }))
  }
  // month - filtro por ano
  return Array.from({ length: 12 }, (_, i) => ({
    label: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][i],
    consumo: seed(i, 120 * roomCount),
  }))
}

// Retorna anos disponíveis (simulado - em produção viria do backend)
function getAvailableYears(): number[] {
  const currentYear = new Date().getFullYear()
  return [currentYear - 1, currentYear]
}

// Retorna meses disponíveis para um ano (simulado)
function getAvailableMonths(year: number): number[] {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  
  if (year === currentYear) {
    // Ano atual: retorna até o mês atual
    return Array.from({ length: currentMonth }, (_, i) => i + 1)
  }
  // Anos anteriores: todos os meses
  return Array.from({ length: 12 }, (_, i) => i + 1)
}

// Retorna datas disponíveis para um mês (simulado)
function getAvailableDates(year: number, month: number): Date[] {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const currentDay = new Date().getDate()
  
  const daysInMonth = new Date(year, month, 0).getDate()
  
  if (year === currentYear && month === currentMonth) {
    // Mês atual: retorna até hoje
    return Array.from({ length: currentDay }, (_, i) => new Date(year, month - 1, i + 1))
  }
  // Meses anteriores: todos os dias
  return Array.from({ length: daysInMonth }, (_, i) => new Date(year, month - 1, i + 1))
}

function generateRoomBreakdown(rooms: { name: string }[]) {
  return rooms.map((r, i) => ({
    name: r.name,
    consumo: +(8 + Math.sin(i * 1.3) * 4 + Math.random() * 3).toFixed(1),
  }))
}

const CHART_COLORS = ['#1e5fa8', '#0ea5a0', '#10c98f', '#2d7dd2', '#34d9a5']

export default function EnergyPage() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth()
  const { rooms } = useRooms()
  const [period, setPeriod] = useState<Period>('day')
  const [filterClient, setFilterClient] = useState<string>('all')
  
  // Filtros de período avançados
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  
  const isOverviewMode = user?.role === 'admin_master' && !user?.selectedClientId
  
  // Obter opções disponíveis
  const availableYears = useMemo(() => getAvailableYears(), [])
  const availableMonths = useMemo(() => getAvailableMonths(selectedYear), [selectedYear])
  const availableDates = useMemo(() => getAvailableDates(selectedYear, selectedMonth), [selectedYear, selectedMonth])
  
  // Resetar filtros quando mudar o período
  useEffect(() => {
    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth() + 1
    
    if (period === 'month') {
      // Apenas ano
      setSelectedYear(currentYear)
    } else if (period === 'week' || period === 'day') {
      // Ano e mês
      setSelectedYear(currentYear)
      setSelectedMonth(currentMonth)
    } else if (period === 'hour') {
      // Data específica
      setSelectedYear(currentYear)
      setSelectedMonth(currentMonth)
      setSelectedDate(new Date())
    }
  }, [period])

  // Filtrar salas por cliente no modo overview
  const filteredRooms = isOverviewMode && filterClient !== 'all'
    ? rooms.filter(r => r.clientId === filterClient)
    : rooms

  // Obter lista única de clientIds
  const clientIds = useMemo(() => {
    return Array.from(new Set(rooms.map(r => r.clientId)))
  }, [rooms])

  // Agrupar salas por cliente
  const roomsByClient = useMemo(() => {
    if (!isOverviewMode) return {}
    
    const grouped: Record<string, typeof rooms> = {}
    rooms.forEach(room => {
      if (!grouped[room.clientId]) {
        grouped[room.clientId] = []
      }
      grouped[room.clientId].push(room)
    })
    return grouped
  }, [isOverviewMode, rooms])

  if (!isAuthenticated && !authLoading) return null

  const energyData = useMemo(() => generateEnergyData(period, Math.max(filteredRooms.length, 1), selectedYear, selectedMonth, selectedDate), [period, filteredRooms.length, selectedYear, selectedMonth, selectedDate])
  const roomBreakdown = useMemo(() => generateRoomBreakdown(filteredRooms), [filteredRooms])

  const totalKwh = energyData.reduce((s, d) => s + d.consumo, 0).toFixed(1)
  const avgKwh = (energyData.reduce((s, d) => s + d.consumo, 0) / energyData.length).toFixed(2)
  const peakKwh = Math.max(...energyData.map(d => d.consumo)).toFixed(2)

  return (
    <main className="min-h-screen px-4 sm:px-6 py-6 sm:py-8 pb-16 bg-white">
      <div className="max-w-6xl mx-auto space-y-6">

        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#0f2744' }}>
            {isOverviewMode ? 'Consumo de Energia - Visão Geral' : 'Consumo de Energia'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Monitoramento do consumo energético dos dispositivos</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3">
          {/* Filtro de cliente (apenas no modo overview) */}
          {isOverviewMode && clientIds.length > 0 && (
            <select
              value={filterClient}
              onChange={e => setFilterClient(e.target.value)}
              className="px-4 py-2 rounded-xl text-sm outline-none"
              style={{ background: 'white', border: '1px solid #e2e8f0', color: '#0f2744' }}
            >
              <option value="all">Todos os clientes</option>
              {clientIds.map(clientId => (
                <option key={clientId} value={clientId}>
                  {getClientName(clientId)}
                </option>
              ))}
            </select>
          )}
          
          {/* Period filter */}
          <div className="flex gap-2 flex-wrap">
            {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                style={period === p
                  ? { background: 'linear-gradient(135deg, #1e5fa8, #2d7dd2)', color: 'white' }
                  : { background: 'white', color: '#64748b', border: '1px solid #e2e8f0' }}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
          
          {/* Filtros de período avançados */}
          <div className="flex gap-2 flex-wrap">
            {/* Filtro de ano (para mês) */}
            {period === 'month' && (
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="px-4 py-2 rounded-xl text-sm outline-none"
                style={{ background: 'white', border: '1px solid #e2e8f0', color: '#0f2744' }}
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            )}
            
            {/* Filtro de ano e mês (para semana e dia) */}
            {(period === 'week' || period === 'day') && (
              <>
                <select
                  value={selectedYear}
                  onChange={e => {
                    const newYear = Number(e.target.value)
                    setSelectedYear(newYear)
                    // Resetar mês se necessário
                    const months = getAvailableMonths(newYear)
                    if (!months.includes(selectedMonth)) {
                      setSelectedMonth(months[months.length - 1])
                    }
                  }}
                  className="px-4 py-2 rounded-xl text-sm outline-none"
                  style={{ background: 'white', border: '1px solid #e2e8f0', color: '#0f2744' }}
                >
                  {availableYears.map(year => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(Number(e.target.value))}
                  className="px-4 py-2 rounded-xl text-sm outline-none"
                  style={{ background: 'white', border: '1px solid #e2e8f0', color: '#0f2744' }}
                >
                  {availableMonths.map(month => (
                    <option key={month} value={month}>
                      {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][month - 1]}
                    </option>
                  ))}
                </select>
              </>
            )}
            
            {/* Filtro de data específica (para hora) */}
            {period === 'hour' && (
              <>
                <select
                  value={selectedYear}
                  onChange={e => {
                    const newYear = Number(e.target.value)
                    setSelectedYear(newYear)
                    // Resetar mês se necessário
                    const months = getAvailableMonths(newYear)
                    if (!months.includes(selectedMonth)) {
                      setSelectedMonth(months[months.length - 1])
                    }
                  }}
                  className="px-4 py-2 rounded-xl text-sm outline-none"
                  style={{ background: 'white', border: '1px solid #e2e8f0', color: '#0f2744' }}
                >
                  {availableYears.map(year => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedMonth}
                  onChange={e => {
                    const newMonth = Number(e.target.value)
                    setSelectedMonth(newMonth)
                    // Resetar data se necessário
                    const dates = getAvailableDates(selectedYear, newMonth)
                    if (!dates.some(d => d.getTime() === selectedDate.getTime())) {
                      setSelectedDate(dates[dates.length - 1])
                    }
                  }}
                  className="px-4 py-2 rounded-xl text-sm outline-none"
                  style={{ background: 'white', border: '1px solid #e2e8f0', color: '#0f2744' }}
                >
                  {availableMonths.map(month => (
                    <option key={month} value={month}>
                      {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][month - 1]}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedDate.toISOString().split('T')[0]}
                  onChange={e => setSelectedDate(new Date(e.target.value))}
                  className="px-4 py-2 rounded-xl text-sm outline-none"
                  style={{ background: 'white', border: '1px solid #e2e8f0', color: '#0f2744' }}
                >
                  {availableDates.map(date => (
                    <option key={date.toISOString()} value={date.toISOString().split('T')[0]}>
                      {date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Consumo total', value: `${totalKwh} kWh`, sub: PERIOD_LABELS[period].toLowerCase(), color: '#1e5fa8' },
            { label: 'Média por período', value: `${avgKwh} kWh`, sub: 'por intervalo', color: '#0ea5a0' },
            { label: 'Pico de consumo', value: `${peakKwh} kWh`, sub: 'maior registro', color: '#f59e0b' },
          ].map(({ label, value, sub, color }) => (
            <div key={label} className="rounded-2xl p-5" style={{ background: 'white', border: '1px solid #e8edf5' }}>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">{label}</p>
              <p className="text-2xl font-bold" style={{ color }}>{value}</p>
              <p className="text-xs text-slate-400 mt-1">{sub}</p>
            </div>
          ))}
        </div>

        {/* Main chart */}
        <div className="rounded-2xl p-6" style={{ background: 'white', border: '1px solid #e8edf5' }}>
          <h2 className="font-semibold text-sm mb-5" style={{ color: '#0f2744' }}>
            Consumo {PERIOD_LABELS[period].toLowerCase()} (kWh)
          </h2>
          <ResponsiveContainer width="100%" height={280}>
            {period === 'month' || period === 'week' ? (
              <BarChart data={energyData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#0f2744', border: 'none', borderRadius: 12, color: 'white', fontSize: 12 }}
                  formatter={(v) => [`${v} kWh`, 'Consumo']}
                />
                <Bar dataKey="consumo" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1e5fa8" />
                    <stop offset="100%" stopColor="#0ea5a0" />
                  </linearGradient>
                </defs>
              </BarChart>
            ) : (
              <LineChart data={energyData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#0f2744', border: 'none', borderRadius: 12, color: 'white', fontSize: 12 }}
                  formatter={(v) => [`${v} kWh`, 'Consumo']}
                />
                <Line type="monotone" dataKey="consumo" stroke="#1e5fa8" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#10c98f' }} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Room breakdown */}
        {filteredRooms.length > 0 && (
          <div className="rounded-2xl p-6" style={{ background: 'white', border: '1px solid #e8edf5' }}>
            <h2 className="font-semibold text-sm mb-5" style={{ color: '#0f2744' }}>
              Consumo por sala (kWh)
              {isOverviewMode && filterClient !== 'all' && (
                <span className="ml-2 text-xs font-normal text-slate-400">
                  - {getClientName(filterClient)}
                </span>
              )}
            </h2>
            <ResponsiveContainer width="100%" height={Math.max(filteredRooms.length * 60, 120)}>
              <BarChart data={roomBreakdown} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="barGradH" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#1e5fa8" />
                    <stop offset="100%" stopColor="#0ea5a0" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} width={110} />
                <Tooltip
                  contentStyle={{ background: '#0f2744', border: 'none', borderRadius: 12, color: 'white', fontSize: 12 }}
                  formatter={(v) => [`${v} kWh`, 'Consumo']}
                />
                <Bar dataKey="consumo" radius={[0, 6, 6, 0]} fill="url(#barGradH)">
                  {roomBreakdown.map((_, i) => (
                    <Cell key={i} fill="url(#barGradH)" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        
        {isOverviewMode && filterClient === 'all' && (
          <div className="rounded-2xl p-6 text-center" style={{ background: 'white', border: '1px solid #e8edf5' }}>
            <p className="text-sm text-slate-500">
              Selecione um cliente específico para visualizar o consumo por sala
            </p>
          </div>
        )}
      </div>
    </main>
  )
}

