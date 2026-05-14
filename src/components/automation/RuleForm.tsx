'use client'

import { useState } from 'react'
import type { AutomationRule, Room } from '@/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface RuleFormProps {
  roomId: string
  rooms: Room[]
  onSave: (rule: AutomationRule) => void
  onCancel: () => void
  initialRule?: AutomationRule
}

interface FormErrors {
  name?: string
  roomId?: string
  scheduleStart?: string
  scheduleEnd?: string
  tempMin?: string
  tempMax?: string
  targetTemp?: string
}

export function RuleForm({ roomId, rooms, onSave, onCancel, initialRule }: RuleFormProps) {
  const [name, setName] = useState(initialRule?.name ?? '')
  const [selectedRoomId, setSelectedRoomId] = useState(initialRule?.roomId ?? roomId)
  const [conditionType, setConditionType] = useState<'schedule' | 'temperature'>(
    initialRule?.conditionType ?? 'schedule'
  )
  const [scheduleStart, setScheduleStart] = useState(initialRule?.scheduleStart ?? '')
  const [scheduleEnd, setScheduleEnd] = useState(initialRule?.scheduleEnd ?? '')
  const [tempMin, setTempMin] = useState(initialRule?.tempMin?.toString() ?? '')
  const [tempMax, setTempMax] = useState(initialRule?.tempMax?.toString() ?? '')
  const [action, setAction] = useState<AutomationRule['action']>(initialRule?.action ?? 'turn_on')
  const [targetTemp, setTargetTemp] = useState(initialRule?.targetTemp?.toString() ?? '')
  const [errors, setErrors] = useState<FormErrors>({})
  const [conflictWarning, setConflictWarning] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  function validate(): boolean {
    const next: FormErrors = {}

    if (!name.trim()) {
      next.name = 'Nome é obrigatório.'
    }

    if (!selectedRoomId) {
      next.roomId = 'Selecione uma sala.'
    }

    if (conditionType === 'schedule') {
      if (!scheduleStart) {
        next.scheduleStart = 'Horário de início é obrigatório.'
      }
      if (!scheduleEnd) {
        next.scheduleEnd = 'Horário de fim é obrigatório.'
      }
      if (scheduleStart && scheduleEnd) {
        const toMin = (hhmm: string) => {
          const [h, m] = hhmm.split(':').map(Number)
          return h * 60 + m
        }
        if (toMin(scheduleStart) >= toMin(scheduleEnd)) {
          next.scheduleEnd = 'O horário de fim deve ser posterior ao de início.'
        }
      }
    }

    if (conditionType === 'temperature') {
      const min = parseFloat(tempMin)
      const max = parseFloat(tempMax)
      if (tempMin === '' || isNaN(min)) {
        next.tempMin = 'Temperatura mínima é obrigatória.'
      }
      if (tempMax === '' || isNaN(max)) {
        next.tempMax = 'Temperatura máxima é obrigatória.'
      }
      if (!isNaN(min) && !isNaN(max) && min >= max) {
        next.tempMax = 'A temperatura máxima deve ser maior que a mínima.'
      }
    }

    if (action === 'set_temp') {
      const t = parseFloat(targetTemp)
      if (targetTemp === '' || isNaN(t)) {
        next.targetTemp = 'Temperatura alvo é obrigatória.'
      } else if (t < 16 || t > 30) {
        next.targetTemp = 'A temperatura alvo deve estar entre 16°C e 30°C.'
      }
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!validate()) return

    setIsLoading(true)
    setConflictWarning(null)

    try {
      const data: Omit<AutomationRule, 'id' | 'createdAt'> = {
        name: name.trim(),
        roomId: selectedRoomId,
        conditionType,
        action,
        isActive: initialRule?.isActive ?? true,
        ...(conditionType === 'schedule'
          ? { scheduleStart, scheduleEnd }
          : { tempMin: parseFloat(tempMin), tempMax: parseFloat(tempMax) }),
        ...(action === 'set_temp' ? { targetTemp: parseFloat(targetTemp) } : {}),
      }

      let savedRule: AutomationRule

      if (initialRule) {
        // Pass the full rule back — the parent (AutomationsContext) handles persistence
        savedRule = { ...initialRule, ...data }
      } else {
        savedRule = { ...data, id: '', createdAt: '' }
      }

      onSave(savedRule)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar regra.'
      setErrors((prev) => ({ ...prev, name: msg }))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* Nome */}
      <Input
        label="Nome da regra"
        id="rule-name"
        name="rule-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
        required
        placeholder="Ex: Ligar de manhã"
      />

      {/* Sala */}
      <div className="flex flex-col gap-1">
        <label htmlFor="rule-room" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Sala <span className="ml-1 text-red-500" aria-hidden="true">*</span>
        </label>
        <select
          id="rule-room"
          value={selectedRoomId}
          onChange={(e) => setSelectedRoomId(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        {errors.roomId && (
          <p role="alert" className="text-xs text-red-500 dark:text-red-400">{errors.roomId}</p>
        )}
      </div>

      {/* Tipo de condição */}
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de condição</span>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="radio"
              name="conditionType"
              value="schedule"
              checked={conditionType === 'schedule'}
              onChange={() => setConditionType('schedule')}
            />
            Horário
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="radio"
              name="conditionType"
              value="temperature"
              checked={conditionType === 'temperature'}
              onChange={() => setConditionType('temperature')}
            />
            Temperatura
          </label>
        </div>
      </div>

      {/* Campos de horário */}
      {conditionType === 'schedule' && (
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Início (HH:MM)"
            id="schedule-start"
            name="schedule-start"
            type="time"
            value={scheduleStart}
            onChange={(e) => setScheduleStart(e.target.value)}
            error={errors.scheduleStart}
            required
          />
          <Input
            label="Fim (HH:MM)"
            id="schedule-end"
            name="schedule-end"
            type="time"
            value={scheduleEnd}
            onChange={(e) => setScheduleEnd(e.target.value)}
            error={errors.scheduleEnd}
            required
          />
        </div>
      )}

      {/* Campos de temperatura */}
      {conditionType === 'temperature' && (
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Temp. mínima (°C)"
            id="temp-min"
            name="temp-min"
            type="number"
            value={tempMin}
            onChange={(e) => setTempMin(e.target.value)}
            error={errors.tempMin}
            required
            placeholder="Ex: 18"
          />
          <Input
            label="Temp. máxima (°C)"
            id="temp-max"
            name="temp-max"
            type="number"
            value={tempMax}
            onChange={(e) => setTempMax(e.target.value)}
            error={errors.tempMax}
            required
            placeholder="Ex: 26"
          />
        </div>
      )}

      {/* Ação */}
      <div className="flex flex-col gap-1">
        <label htmlFor="rule-action" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Ação <span className="ml-1 text-red-500" aria-hidden="true">*</span>
        </label>
        <select
          id="rule-action"
          value={action}
          onChange={(e) => setAction(e.target.value as AutomationRule['action'])}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <option value="turn_on">Ligar</option>
          <option value="turn_off">Desligar</option>
          <option value="set_temp">Ajustar temperatura</option>
        </select>
      </div>

      {/* Temperatura alvo */}
      {action === 'set_temp' && (
        <Input
          label="Temperatura alvo (16–30°C)"
          id="target-temp"
          name="target-temp"
          type="number"
          min={16}
          max={30}
          value={targetTemp}
          onChange={(e) => setTargetTemp(e.target.value)}
          error={errors.targetTemp}
          required
          placeholder="Ex: 22"
        />
      )}

      {/* Aviso de conflito */}
      {conflictWarning && (
        <div
          role="alert"
          className="rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-300"
        >
          ⚠️ {conflictWarning}
        </div>
      )}

      {/* Botões */}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={isLoading}>
          {initialRule ? 'Salvar alterações' : 'Criar regra'}
        </Button>
      </div>
    </form>
  )
}
