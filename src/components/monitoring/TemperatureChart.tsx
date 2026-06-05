'use client'

import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, Scatter,
} from 'recharts'
interface TemperatureChartReading {
  timestamp: string
  temp?: number | string
  temperatura?: number | string
  measurementTimestamp?: string | null
}

interface TemperatureChartProps {
  readings: TemperatureChartReading[]
  referenceReadings?: TemperatureChartReading[]
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

function parseLocalTimestamp(value: string): number {
  const normalized = value.trim().replace(' ', 'T')
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?/)
  if (!match) return NaN

  const [, year, month, day, hour, minute, second = '0'] = match
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  ).getTime()
}

function getReadingTemp(reading: TemperatureChartReading): number {
  const rawTemp = reading.temp ?? reading.temperatura
  if (typeof rawTemp === 'number') return rawTemp
  if (typeof rawTemp === 'string') return Number(rawTemp)
  return NaN
}


export function TemperatureChart({ readings, referenceReadings = [], idealMin, idealMax }: TemperatureChartProps) {
  if (readings.length === 0) {
    return <p className="text-sm text-slate-400 py-8 text-center">Sem dados de temperatura.</p>
  }

  const data = readings
    .map(r => {
      const temp = getReadingTemp(r)
      const timestamp = typeof r.timestamp === 'string' ? r.timestamp : ''
      return {
        ts: parseLocalTimestamp(timestamp),
        temp,
      }
    })
    .filter((item) => Number.isFinite(item.ts) && Number.isFinite(item.temp))
    .sort((a, b) => a.ts - b.ts)

  const referenceData = referenceReadings
    .map(r => {
      const temp = getReadingTemp(r)
      return {
        ts: parseLocalTimestamp(r.timestamp),
        refTemp: temp,
        measurementTs: r.measurementTimestamp ? parseLocalTimestamp(r.measurementTimestamp) : NaN,
      }
    })
    .filter((item) => Number.isFinite(item.ts) && Number.isFinite(item.refTemp))
    .sort((a, b) => a.ts - b.ts)

  if (data.length === 0) {
    return <p className="text-sm text-slate-400 py-8 text-center">Sem dados de temperatura.</p>
  }

  const temps = data.map((r) => r.temp)
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
    <ComposedChart
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
        contentStyle={{ 
          background: '#0f2744', 
          border: 'none', 
          borderRadius: 12, 
          color: 'white', 
          fontSize: 12, 
          padding: '8px 12px' 
        }}
        formatter={(v, name) => {
          // Only show temperature values, ignore reference points
          if (name === 'temp') return [`${v}°C`, 'Temperatura']
          return null
        }}
        labelFormatter={tooltipLabelFormatter}
        labelStyle={{ color: 'white', marginBottom: 4, fontWeight: 'normal' }}
        itemStyle={{ color: 'white' }}
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
      {/* Remove reference scatter points to avoid duplicate tooltip values */}
    </ComposedChart>
  )

  return (
    <div style={{ overflowX: 'auto', overflowY: 'hidden' }}>
      <div style={{ width: Math.max(960, data.length * 20), minWidth: '100%' }}>
        {chartContent}
      </div>
    </div>
  )
}
