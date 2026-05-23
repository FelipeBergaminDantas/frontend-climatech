'use client'

import { useEffect, useState } from 'react'
import type { Room } from '@/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

const CTN_R_PATTERN = /^CTN-R-V\d+-\d+$/i
const CTN_C_PATTERN = /^CTN-C-V\d+-\d+$/i

function padNumber(value: number, length: number) {
  return String(value).padStart(length, '0')
}

function buildDefaultCtnrNodeId() {
  return 'CTN-R-V'
}

function buildDefaultCtncNodeIds(count: number): string[] {
  const validCount = Math.max(1, count)
  return Array.from({ length: validCount }, () => 'CTN-C-V')
}

interface RoomFormProps {
  userId: string
  onSave: (room: Room) => Promise<void>
  onCancel: () => void
  initialRoom?: Room
  serverError?: string | null
}

interface FormErrors {
  name?: string
  deviceId?: string
  acCount?: string
  idealTempMin?: string
  idealTempMax?: string
  targetTemp?: string
}

function isAutomationTempError(message: string): boolean {
  const lower = message.toLowerCase()
  return lower.includes('automa') || lower.includes('temperatura')
}

export function RoomForm({ userId, onSave, onCancel, initialRoom, serverError }: RoomFormProps) {
  const isEditing = Boolean(initialRoom)
  const [name, setName] = useState(initialRoom?.name ?? '')
  const [deviceId, setDeviceId] = useState(initialRoom?.deviceId ?? buildDefaultCtnrNodeId())
  const [acCount, setAcCount] = useState(initialRoom?.acCount?.toString() ?? '1')
  const [ctncNodeIds, setCtncNodeIds] = useState<string[]>(
    initialRoom?.ctncNodeIds?.length ? initialRoom.ctncNodeIds : buildDefaultCtncNodeIds(1)
  )
  const [idealTempMin, setIdealTempMin] = useState(initialRoom?.idealTempMin?.toString() ?? '')
  const [idealTempMax, setIdealTempMax] = useState(initialRoom?.idealTempMax?.toString() ?? '')
  const [targetTemp, setTargetTemp] = useState(initialRoom?.targetTemp?.toString() ?? '')
  const [errors, setErrors] = useState<FormErrors>({})
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!serverError) return
    if (isAutomationTempError(serverError)) {
      setErrors((prev) => ({ ...prev, targetTemp: serverError }))
    } else {
      setErrors((prev) => ({ ...prev, name: serverError }))
    }
  }, [serverError])

  function updateCtncNodes(count: number) {
    setCtncNodeIds((prev) => {
      const validCount = Math.max(1, count)
      if (prev.length === validCount) return prev
      if (prev.length > validCount) return prev.slice(0, validCount)
      return [...prev, ...Array(validCount - prev.length).fill('CTN-C-V')]
    })
  }

  function handleAcCountChange(value: string) {
    setAcCount(value)
    const parsed = parseInt(value, 10)
    if (!isNaN(parsed)) {
      updateCtncNodes(parsed)
    }
  }

  function formatNodeInput(raw: string, kind: 'CTNR' | 'CTNC') {
    const prefix = kind === 'CTNR' ? 'CTN-R-V' : 'CTN-C-V'
    const value = raw.toUpperCase().replace(/\s+/g, '')
    const content = value.startsWith(prefix)
      ? value.slice(prefix.length)
      : value.replace(/^CTN-[RC]-?V?/i, '')

    const digitsOnly = content.replace(/[^0-9-]/g, '').replace(/^-+/, '')
    if (!digitsOnly) return prefix

    const [version, rest = ''] = digitsOnly.split('-', 2)
    if (!version) return prefix
    if (!rest) return `${prefix}${version}-`
    return `${prefix}${version}-${rest}`
  }

  function validate(): boolean {
    const next: FormErrors = {}

    if (!name.trim()) {
      next.name = 'Nome é obrigatório.'
    } else if (name.trim().length < 2 || name.trim().length > 50) {
      next.name = 'O nome deve ter entre 2 e 50 caracteres.'
    }

    if (!deviceId.trim()) {
      next.deviceId = 'Identificador do dispositivo é obrigatório.'
    } else if (!CTN_R_PATTERN.test(deviceId.trim())) {
      next.deviceId = 'CTN-R deve seguir o padrão CTN-R-VX-XXX.'
    }

    const ac = parseInt(acCount)
    if (isNaN(ac) || ac < 1) {
      next.acCount = 'Informe ao menos 1 AC. Serão criados 1 CTN-R + N CTN-C nodes.'
    }

    if (ctncNodeIds.length === 0) {
      next.acCount = 'Ao menos um CTN-C deve ser informado.'
    }

    if (!isNaN(ac) && ctncNodeIds.length !== ac) {
      next.acCount = 'O número de CTN-C deve corresponder à quantidade de ACs.'
    }

    const seenCtnc = new Set<string>()
    ctncNodeIds.forEach((id, index) => {
      const trimmed = id.trim()
      if (!trimmed) {
        next.acCount = `CTN-C ${index + 1} não pode ficar vazio.`
      } else if (!CTN_C_PATTERN.test(trimmed)) {
        next.acCount = `CTN-C ${index + 1} deve seguir o padrão CTN-C-VX-XXX.`
      } else if (seenCtnc.has(trimmed.toUpperCase())) {
        next.acCount = `CTN-C duplicado: ${trimmed}`
      } else {
        seenCtnc.add(trimmed.toUpperCase())
      }
    })

    const min = parseFloat(idealTempMin)
    const max = parseFloat(idealTempMax)

    if (idealTempMin === '' || isNaN(min)) {
      next.idealTempMin = 'Temperatura mínima é obrigatória.'
    } else if (min < 16) {
      next.idealTempMin = 'Temperatura mínima deve ser 16°C ou superior.'
    }

    if (idealTempMax === '' || isNaN(max)) {
      next.idealTempMax = 'Temperatura máxima é obrigatória.'
    } else if (max > 30) {
      next.idealTempMax = 'Temperatura máxima deve ser 30°C ou inferior.'
    }

    if (!isNaN(min) && !isNaN(max) && max <= min) {
      next.idealTempMax = 'A temperatura máxima deve ser maior que a mínima.'
    }

    if (targetTemp === '') {
      next.targetTemp = 'Temperatura alvo é obrigatória.'
    } else {
      const temp = parseFloat(targetTemp)
      if (isNaN(temp)) {
        next.targetTemp = 'Temperatura alvo deve ser um número.'
      } else if (temp < 16 || temp > 30) {
        next.targetTemp = 'A temperatura alvo deve estar entre 16°C e 30°C.'
      } else if (!isNaN(min) && temp < min) {
        next.targetTemp = 'A temperatura alvo deve ser maior ou igual à temperatura ideal mínima.'
      } else if (!isNaN(max) && temp > max) {
        next.targetTemp = 'A temperatura alvo deve ser menor ou igual à temperatura ideal máxima.'
      }
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!validate()) return

    setIsLoading(true)

    try {
      const roomData: Room = {
        id: initialRoom?.id ?? '',
        userId,
        clientId: initialRoom?.clientId ?? '',
        name: name.trim(),
        deviceId: deviceId.trim(),
        acCount: Math.max(1, parseInt(acCount) || 1),
        ctncNodeIds: ctncNodeIds.map((id) => id.trim()),
        idealTempMin: parseFloat(idealTempMin),
        idealTempMax: parseFloat(idealTempMax),
        targetTemp: targetTemp.trim() ? parseFloat(targetTemp) : undefined,
        createdAt: initialRoom?.createdAt ?? '',
      }

      await onSave(roomData)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar sala.'
      const lower = msg.toLowerCase()
      if (isAutomationTempError(msg)) {
        setErrors((prev) => ({ ...prev, targetTemp: msg }))
      } else if (lower.includes('identificador') || lower.includes('ctn-r')) {
        setErrors((prev) => ({ ...prev, deviceId: msg }))
      } else if (lower.includes('ctn-c')) {
        setErrors((prev) => ({ ...prev, acCount: msg }))
      } else {
        setErrors((prev) => ({ ...prev, name: msg }))
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {serverError && (
        <div
          role="alert"
          className="rounded-xl px-4 py-3 text-sm"
          style={{ background: 'rgba(239,68,68,0.08)', color: '#b91c1c', border: '1px solid rgba(239,68,68,0.25)' }}
        >
          {serverError}
        </div>
      )}
      <Input
        label="Nome da sala"
        id="room-name"
        name="room-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
        required
        placeholder="Ex: Sala de estar"
      />

      <Input
        label="Identificador do dispositivo (CTN-R)"
        id="room-device-id"
        name="room-device-id"
        value={deviceId}
        onChange={(e) => setDeviceId(formatNodeInput(e.target.value, 'CTNR'))}
        error={errors.deviceId}
        required
        disabled={isEditing}
        placeholder="Ex: CTN-R-V1-000001"
      />

      <Input
        label="Quantidade de ACs (1 CTN-C por AC)"
        id="room-ac-count"
        name="room-ac-count"
        type="number"
        value={acCount}
        onChange={(e) => handleAcCountChange(e.target.value)}
        error={errors.acCount}
        placeholder="Ex: 1"
        required
        disabled={isEditing}
      />

      <div className="rounded-2xl p-4 bg-slate-50 border border-slate-200 text-sm text-slate-600 space-y-3">
        <p className="font-medium text-slate-800">IDs de nodes CTN-C</p>
        {ctncNodeIds.map((id, index) => (
          <Input
            key={`ctnc-${index}`}
            label={`AC - ${index + 1}`}
            id={`room-ctnc-${index}`}
            name={`room-ctnc-${index}`}
            value={id}
            onChange={(e) => {
              const next = [...ctncNodeIds]
              next[index] = formatNodeInput(e.target.value, 'CTNC')
              setCtncNodeIds(next)
            }}
            placeholder="CTN-C-V1-001"
            required
          />
        ))}
      </div>

      <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Input
          label="Temp. ideal mínima (°C)"
          id="room-temp-min"
          name="room-temp-min"
          type="number"
          min={16}
          max={30}
          step="0.5"
          value={idealTempMin}
          onChange={(e) => setIdealTempMin(e.target.value)}
          error={errors.idealTempMin}
          required
          placeholder="Ex: 18"
        />
        <Input
          label="Temp. ideal máxima (°C)"
          id="room-temp-max"
          name="room-temp-max"
          type="number"
          min={16}
          max={30}
          step="0.5"
          value={idealTempMax}
          onChange={(e) => setIdealTempMax(e.target.value)}
          error={errors.idealTempMax}
          required
          placeholder="Ex: 24"
        />
        <Input
          label="Temp. alvo (°C)"
          id="room-temp-target"
          name="room-temp-target"
          type="number"
          step="0.5"
          min={16}
          max={30}
          value={targetTemp}
          onChange={(e) => setTargetTemp(e.target.value)}
          error={errors.targetTemp}
          required
          placeholder="Ex: 22"
        />
      </div>

      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={isLoading}>
          {initialRoom ? 'Salvar alterações' : 'Criar sala'}
        </Button>
      </div>
    </form>
  )
}
