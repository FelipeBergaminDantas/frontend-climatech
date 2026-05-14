'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import type { TemperatureReading } from '@/types'

interface TemperatureChartProps {
  readings: TemperatureReading[]
  idealMin?: number
  idealMax?: number
  mode?: 'history'
}

function pad(n: number) { return String(n).padStart(2, '0') }

/** Format a timestamp as a clean label: "18h", "18h30" */
function cleanLabel(ts: number): string {
  const d = new Date(ts)
  const h = d.getHours()
  const m = d.getMinutes()
  return m === 0 ? `${h}h` : `${h}h${pad(m)}`
}

export function TemperatureChart({ readings, idealMin, idealMax, mode = 'history' }: TemperatureChartProps) {
  if (readings.length === 0) {
    return <p className="text-sm text-slate-400 py-8 text-center">Sem dados de temperatura.</p>
  }

  const data = readings.map(r => ({
    ts: new Date(r.timestamp).getTime(),
    temp: r.temp,
  }))

  const temps = readings.map(r => r.temp)
  const minTemp = Math.floor(Math.min(...temps)) - 1
  const maxTemp = Math.ceil(Math.max(...temps)) + 1

  // Domain spans the full selected day (0h → 24h)
  const firstTs = data[0].ts
  const d0 = new Date(firstTs)
  const domainStart = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate(), 0, 0, 0).getTime()
  const domainEnd = domainStart + 24 * 60 * 60 * 1000

  // Build axis ticks: every 2h
  const tickStep = 2 * 60 * 60 * 1000
  const axisTicks: number[] = []
  for (let t = domainStart; t <= domainEnd; t += tickStep) {
    axisTicks.push(t)
  }

  const xTickFormatter = (ts: number) => cleanLabel(ts)

  // Tooltip label: clean "HH:MM" or "HHh" / "HHh30"
  const tooltipLabelFormatter = (label: unknown) => {
    const ts = typeof label === 'number' ? label : Number(label)
    if (isNaN(ts)) return ''
    return cleanLabel(ts)
  }

  const chartContent = (
    <LineChart
      width={Math.max(960, data.length * 20)}
      height={260}
      data={data}
      margin={{ top: 8, right: 20, left: -10, bottom: 0 }}
    >
      <defs>
        <linearGradient id="tempGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#1e5fa8" />
          <stop offset="100%" stopColor="#0ea5a0" />
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
      <XAxis
        dataKey="ts"
        type="number"
        scale="time"
        domain={[domainStart, domainEnd]}
        ticks={axisTicks}
        tick={{ fontSize: 10, fill: '#94a3b8' }}
        axisLine={false}
        tickLine={false}
        tickFormatter={xTickFormatter}
      />
      <YAxis
        domain={[minTemp, maxTemp]}
        tick={{ fontSize: 10, fill: '#94a3b8' }}
        axisLine={false}
        tickLine={false}
        tickFormatter={v => `${v}°`}
      />
      <Tooltip
        contentStyle={{ background: '#0f2744', border: 'none', borderRadius: 12, color: 'white', fontSize: 12, padding: '8px 12px' }}
        formatter={(v) => [`${v}°C`, 'Temperatura']}
        labelFormatter={tooltipLabelFormatter}
        labelStyle={{ color: '#94a3b8', marginBottom: 4 }}
      />
      {idealMin !== undefined && <ReferenceLine y={idealMin} stroke="#10c98f" strokeDasharray="4 4" strokeWidth={1.5} />}
      {idealMax !== undefined && <ReferenceLine y={idealMax} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1.5} />}
      <Line
        type="monotone"
        dataKey="temp"
        stroke="url(#tempGrad)"
        strokeWidth={2.5}
        dot={false}
        connectNulls={false}
        activeDot={{ r: 5, fill: '#10c98f', stroke: 'white', strokeWidth: 2 }}
      />
    </LineChart>
  )

  return (
    <div style={{ overflowX: 'auto', overflowY: 'hidden' }}>
      <div style={{ width: Math.max(960, data.length * 20), minWidth: '100%' }}>
        {chartContent}
      </div>
    </div>
  )
}
