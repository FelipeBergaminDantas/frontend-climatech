'use client'

import { useState } from 'react'
import type { Room } from '@/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface RoomFormProps {
  userId: string
  onSave: (room: Room) => void
  onCancel: () => void
  initialRoom?: Room
}

interface FormErrors {
  name?: string
  deviceId?: string
  location?: string
  acCount?: string
  idealTempMin?: string
  idealTempMax?: string
}

export function RoomForm({ userId, onSave, onCancel, initialRoom }: RoomFormProps) {
  const [name, setName] = useState(initialRoom?.name ?? '')
  const [deviceId, setDeviceId] = useState(initialRoom?.deviceId ?? '')
  const [location, setLocation] = useState(initialRoom?.location ?? '')
  const [acCount, setAcCount] = useState(initialRoom?.acCount?.toString() ?? '1')
  const [idealTempMin, setIdealTempMin] = useState(initialRoom?.idealTempMin?.toString() ?? '')
  const [idealTempMax, setIdealTempMax] = useState(initialRoom?.idealTempMax?.toString() ?? '')
  const [errors, setErrors] = useState<FormErrors>({})
  const [isLoading, setIsLoading] = useState(false)

  function validate(): boolean {
    const next: FormErrors = {}

    if (!name.trim()) {
      next.name = 'Nome é obrigatório.'
    } else if (name.trim().length < 2 || name.trim().length > 50) {
      next.name = 'O nome deve ter entre 2 e 50 caracteres.'
    }

    if (!deviceId.trim()) {
      next.deviceId = 'Identificador do dispositivo é obrigatório.'
    }

    if (!location.trim()) {
      next.location = 'Localização é obrigatória.'
    }

    const ac = parseInt(acCount)
    if (isNaN(ac) || ac < 1) {
      next.acCount = 'Informe ao menos 1 AC. Serão criados 1 CTN-R + N CTN-C nodes.'
    }

    const min = parseFloat(idealTempMin)
    const max = parseFloat(idealTempMax)

    if (idealTempMin === '' || isNaN(min)) {
      next.idealTempMin = 'Temperatura mínima é obrigatória.'
    }

    if (idealTempMax === '' || isNaN(max)) {
      next.idealTempMax = 'Temperatura máxima é obrigatória.'
    }

    if (!isNaN(min) && !isNaN(max) && max <= min) {
      next.idealTempMax = 'A temperatura máxima deve ser maior que a mínima.'
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!validate()) return

    setIsLoading(true)

    try {
      // Build the room object — for new rooms the service assigns id/createdAt
      // For edits we preserve existing id/createdAt
      const roomData: Room = {
        id: initialRoom?.id ?? '',
        userId,
        clientId: initialRoom?.clientId ?? '', // Preserva clientId existente ou será definido pelo parent
        name: name.trim(),
        deviceId: deviceId.trim(),
        acCount: Math.max(1, parseInt(acCount) || 1),
        location: location.trim() || undefined,
        idealTempMin: parseFloat(idealTempMin),
        idealTempMax: parseFloat(idealTempMax),
        createdAt: initialRoom?.createdAt ?? '',
      }

      onSave(roomData)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar sala.'
      // Surface deviceId duplicate error inline
      if (msg.toLowerCase().includes('identificador')) {
        setErrors((prev) => ({ ...prev, deviceId: msg }))
      } else {
        setErrors((prev) => ({ ...prev, name: msg }))
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
        label="Identificador do dispositivo (dev_id do CTN-R)"
        id="room-device-id"
        name="room-device-id"
        value={deviceId}
        onChange={(e) => setDeviceId(e.target.value)}
        error={errors.deviceId}
        required
        placeholder="Ex: CTN-R-V1-82427401"
      />

      <Input
        label="Localização"
        id="room-location"
        name="room-location"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        error={errors.location}
        required
        placeholder="Ex: 1º Andar"
      />

      <Input
        label="Quantidade de ACs (1 CTN-C por AC)"
        id="room-ac-count"
        name="room-ac-count"
        type="number"
        value={acCount}
        onChange={(e) => setAcCount(e.target.value)}
        error={errors.acCount}
        placeholder="Ex: 2"
        required
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Temp. ideal mínima (°C)"
          id="room-temp-min"
          name="room-temp-min"
          type="number"
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
          value={idealTempMax}
          onChange={(e) => setIdealTempMax(e.target.value)}
          error={errors.idealTempMax}
          required
          placeholder="Ex: 24"
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
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
