'use client'

import { useEffect, useState } from 'react'
import type { Room } from '@/types'
import { getAcsBySala } from '@/services/acService'
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

interface CtncNodeCreatePayload {
  node_id: string
  nome_ac: string
  marca_ac: string
  modelo_ac: string
  capacidade_btus: number
  tensao_fonte: number
}

interface RoomFormProps {
  userId: string
  onSave: (room: Omit<Room, 'id' | 'createdAt'> & { ctncNodes?: CtncNodeCreatePayload[] }) => Promise<void>
  onCancel: () => void
  initialRoom?: Room
  serverError?: string | null
}

interface FormErrors {
  name?: string
  deviceId?: string
  acCount?: string
  sizeM2?: string
  idealTempMin?: string
  idealTempMax?: string
  targetTemp?: string
  ctncNodeIds?: string
  ctncDetails?: string
}

interface CtncNodeDetail {
  nodeId: string
  nomeAc: string
  marcaAc: string
  modeloAc: string
  capacidadeBtus: string
  tensaoFonte: string
}

function isAutomationTempError(message: string): boolean {
  const lower = message.toLowerCase()
  return lower.includes('automa') || lower.includes('temperatura')
}

function buildDefaultCtncDetails(count: number): CtncNodeDetail[] {
  const validCount = Math.max(1, count)
  return Array.from({ length: validCount }, () => ({
    nodeId: 'CTN-C-V',
    nomeAc: '',
    marcaAc: '',
    modeloAc: '',
    capacidadeBtus: '',
    tensaoFonte: '',
  }))
}

export function RoomForm({ userId, onSave, onCancel, initialRoom, serverError }: RoomFormProps) {
  const isEditing = Boolean(initialRoom)
  const [formStep, setFormStep] = useState<1 | 2>(1)
  const [name, setName] = useState(initialRoom?.name ?? '')
  const [deviceId, setDeviceId] = useState(initialRoom?.deviceId ?? buildDefaultCtnrNodeId())
  const initialAcCount = Math.max(
    1,
    initialRoom
      ? initialRoom.ctncNodes?.length
        ? initialRoom.ctncNodes.length
        : initialRoom.ctncNodeIds?.length ?? initialRoom.acCount ?? 1
      : 1
  )

  const [acCount, setAcCount] = useState(initialAcCount.toString())
  const [sizeM2, setSizeM2] = useState(initialRoom?.sizeM2?.toString() ?? '')
  const [ctncNodeIds, setCtncNodeIds] = useState<string[]>(
    initialRoom?.ctncNodes?.length
      ? initialRoom.ctncNodes.map((node) => node.node_id)
      : initialRoom?.ctncNodeIds?.length
        ? initialRoom.ctncNodeIds
        : buildDefaultCtncNodeIds(1)
  )
  const [ctncDetails, setCtncDetails] = useState<CtncNodeDetail[]>(
    initialRoom?.ctncNodes?.length
      ? initialRoom.ctncNodes.map((node) => ({
          nodeId: node.node_id,
          nomeAc: node.nome_ac,
          marcaAc: node.marca_ac,
          modeloAc: node.modelo_ac,
          capacidadeBtus: node.capacidade_btus?.toString() ?? '',
          tensaoFonte: node.tensao_fonte?.toString() ?? '',
        }))
      : initialRoom?.ctncNodeIds?.length
        ? initialRoom.ctncNodeIds.map((id) => ({
            nodeId: id,
            nomeAc: '',
            marcaAc: '',
            modeloAc: '',
            capacidadeBtus: '',
            tensaoFonte: '',
          }))
        : buildDefaultCtncDetails(1)
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

  useEffect(() => {
    async function loadExistingCtncDetails() {
      if (!initialRoom?.id || !isEditing) return
      if (initialRoom.ctncNodes?.length) return
      if (!initialRoom.ctncNodeIds?.length) return

      try {
        const existingAcs = await getAcsBySala(initialRoom.id)
        if (!existingAcs.length) return

        setAcCount(existingAcs.length.toString())
        setCtncNodeIds(existingAcs.map((ac) => ac.nodeId))
        setCtncDetails(existingAcs.map((ac) => ({
          nodeId: ac.nodeId,
          nomeAc: ac.nomeAc,
          marcaAc: ac.marcaAc ?? '',
          modeloAc: ac.modeloAc ?? '',
          capacidadeBtus: ac.capacidadeBtus?.toString() ?? '',
          tensaoFonte: ac.tensaoFonte?.toString() ?? '',
        })))
      } catch (error) {
        console.error('Failed to load AC metadata for room edit:', error)
      }
    }

    loadExistingCtncDetails()
  }, [initialRoom?.id, initialRoom?.ctncNodeIds?.length, initialRoom?.ctncNodes?.length, isEditing])

  function updateCtncDetails(count: number) {
    setCtncNodeIds((prev) => {
      const validCount = Math.max(1, count)
      if (prev.length === validCount) return prev
      if (prev.length > validCount) return prev.slice(0, validCount)
      return [...prev, ...Array(validCount - prev.length).fill('CTN-C-V')]
    })

    setCtncDetails((prev) => {
      const validCount = Math.max(1, count)
      if (prev.length === validCount) return prev
      if (prev.length > validCount) return prev.slice(0, validCount)
      return [...prev, ...Array(validCount - prev.length).fill({
        nodeId: 'CTN-C-V',
        nomeAc: '',
        marcaAc: '',
        modeloAc: '',
        capacidadeBtus: '',
        tensaoFonte: '',
      })]
    })
  }

  function handleAcCountChange(value: string) {
    setAcCount(value)
    const parsed = parseInt(value, 10)
    if (!isNaN(parsed)) {
      updateCtncDetails(parsed)
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

  function validateStep1(): boolean {
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

    const sizeValue = parseFloat(sizeM2)
    if (sizeM2 === '' || isNaN(sizeValue)) {
      next.sizeM2 = 'Tamanho da sala é obrigatório.'
    } else if (sizeValue <= 0) {
      next.sizeM2 = 'O tamanho da sala deve ser maior que 0.'
    }

    if (!isNaN(ac) && ctncNodeIds.length !== ac) {
      next.acCount = 'O número de CTN-C deve corresponder à quantidade de ACs.'
    }

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

  function validateStep2(): boolean {
    const next: FormErrors = {}
    const seenCtnc = new Set<string>()
    let invalid = false

    ctncDetails.forEach((detail, index) => {
      const trimmedNodeId = detail.nodeId.trim()
      if (!trimmedNodeId) {
        invalid = true
        next.ctncDetails = `CTN-C ${index + 1} deve ter um ID válido.`
      } else if (!CTN_C_PATTERN.test(trimmedNodeId)) {
        invalid = true
        next.ctncDetails = `CTN-C ${index + 1} deve seguir o padrão CTN-C-VX-XXX.`
      } else if (seenCtnc.has(trimmedNodeId.toUpperCase())) {
        invalid = true
        next.ctncDetails = `CTN-C duplicado: ${trimmedNodeId}`
      } else {
        seenCtnc.add(trimmedNodeId.toUpperCase())
      }

      if (!detail.nomeAc.trim() || !detail.marcaAc.trim() || !detail.modeloAc.trim()) {
        invalid = true
        next.ctncDetails = `Preencha todos os dados do AC para o CTN-C ${index + 1}.`
      }

      const capacidade = Number(detail.capacidadeBtus)
      if (detail.capacidadeBtus.trim() === '' || Number.isNaN(capacidade) || capacidade <= 0) {
        invalid = true
        next.ctncDetails = `Capacidade de BTUs deve ser válida para o CTN-C ${index + 1}.`
      }

      const tensao = Number(detail.tensaoFonte)
      if (detail.tensaoFonte.trim() === '' || Number.isNaN(tensao) || tensao <= 0) {
        invalid = true
        next.ctncDetails = `Tensão da fonte deve ser válida para o CTN-C ${index + 1}.`
      }
    })

    setErrors(next)
    return !invalid
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (formStep === 1) {
      if (!validateStep1()) return
      setFormStep(2)
      return
    }

    if (!validateStep2()) return

    setIsLoading(true)

    try {
      const roomData: Omit<Room, 'id' | 'createdAt'> & {
        ctncNodes?: {
          node_id: string
          nome_ac: string
          marca_ac: string
          modelo_ac: string
          capacidade_btus: number
          tensao_fonte: number
        }[]
      } = {
        userId,
        clientId: initialRoom?.clientId ?? '',
        name: name.trim(),
        deviceId: deviceId.trim(),
        acCount: Math.max(1, parseInt(acCount) || 1),
        sizeM2: parseFloat(sizeM2),
        ctncNodeIds: ctncNodeIds.map((id) => id.trim()),
        idealTempMin: parseFloat(idealTempMin),
        idealTempMax: parseFloat(idealTempMax),
        targetTemp: targetTemp.trim() ? parseFloat(targetTemp) : undefined,
      }

      roomData.ctncNodes = ctncDetails.map((detail) => ({
        node_id: detail.nodeId.trim(),
        nome_ac: detail.nomeAc.trim(),
        marca_ac: detail.marcaAc.trim(),
        modelo_ac: detail.modeloAc.trim(),
        capacidade_btus: Number(detail.capacidadeBtus),
        tensao_fonte: Number(detail.tensaoFonte),
      }))

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
      <div className="rounded-2xl p-4 bg-slate-50 border border-slate-200 text-sm text-slate-600 space-y-3">
        <p className="font-medium text-slate-800">Passo {formStep} de 2</p>
        <p className="text-sm text-slate-500">
          {formStep === 1
            ? 'Preencha as informações gerais da sala e a quantidade de ACs.'
            : 'Agora informe os IDs dos CTN-C e os dados de cada AC.'}
        </p>
      </div>

      {formStep === 1 ? (
        <>
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

          <Input
            label="Tamanho da Sala (m²)"
            id="room-size-m2"
            name="room-size-m2"
            type="number"
            min={0.1}
            step="0.1"
            value={sizeM2}
            onChange={(e) => setSizeM2(e.target.value)}
            error={errors.sizeM2}
            placeholder="Ex: 42.5"
            required
          />

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
        </>
      ) : (
        <>
          <div className="rounded-2xl p-4 bg-slate-50 border border-slate-200 text-sm text-slate-600 space-y-3">
            <p className="font-medium text-slate-800">Detalhes CTN-C / AC</p>
            <p className="text-sm text-slate-500">Informe o ID de cada CTN-C e os dados do AC associado.</p>
          </div>

          {ctncDetails.map((detail, index) => (
            <div key={`ctnc-detail-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
              <p className="font-semibold text-slate-800">CTN-C {index + 1}</p>
              <Input
                label="ID do CTN-C"
                id={`room-ctnc-id-${index}`}
                name={`room-ctnc-id-${index}`}
                value={detail.nodeId}
                onChange={(e) => {
                  const formatted = formatNodeInput(e.target.value, 'CTNC')
                  setCtncDetails((prev) => {
                    const next = [...prev]
                    next[index] = { ...next[index], nodeId: formatted }
                    return next
                  })
                  setCtncNodeIds((prev) => {
                    const next = [...prev]
                    next[index] = formatted
                    return next
                  })
                }}
                placeholder="CTN-C-V1-000001"
                required
              />
              <Input
                label="Nome do AC"
                id={`room-ctnc-name-${index}`}
                name={`room-ctnc-name-${index}`}
                value={detail.nomeAc}
                onChange={(e) => {
                  const next = [...ctncDetails]
                  next[index] = { ...next[index], nomeAc: e.target.value }
                  setCtncDetails(next)
                }}
                placeholder="AC Sala 501"
                required
              />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Marca do AC"
                  id={`room-ctnc-brand-${index}`}
                  name={`room-ctnc-brand-${index}`}
                  value={detail.marcaAc}
                  onChange={(e) => {
                    const next = [...ctncDetails]
                    next[index] = { ...next[index], marcaAc: e.target.value }
                    setCtncDetails(next)
                  }}
                  placeholder="LG, Samsung, Daikin"
                  required
                />
                <Input
                  label="Modelo do AC"
                  id={`room-ctnc-model-${index}`}
                  name={`room-ctnc-model-${index}`}
                  value={detail.modeloAc}
                  onChange={(e) => {
                    const next = [...ctncDetails]
                    next[index] = { ...next[index], modeloAc: e.target.value }
                    setCtncDetails(next)
                  }}
                  placeholder="12000 BTU, Split Inverter"
                  required
                />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Input
                  label="Capacidade (BTUs)"
                  id={`room-ctnc-capacity-${index}`}
                  name={`room-ctnc-capacity-${index}`}
                  type="number"
                  min={1}
                  value={detail.capacidadeBtus}
                  onChange={(e) => {
                    const next = [...ctncDetails]
                    next[index] = { ...next[index], capacidadeBtus: e.target.value }
                    setCtncDetails(next)
                  }}
                  placeholder="12000"
                  required
                />
                <Input
                  label="Tensão da fonte (V)"
                  id={`room-ctnc-voltage-${index}`}
                  name={`room-ctnc-voltage-${index}`}
                  type="number"
                  min={1}
                  value={detail.tensaoFonte}
                  onChange={(e) => {
                    const next = [...ctncDetails]
                    next[index] = { ...next[index], tensaoFonte: e.target.value }
                    setCtncDetails(next)
                  }}
                  placeholder="220"
                  required
                />
              </div>
            </div>
          ))}

          {errors.ctncDetails && (
            <p className="text-xs text-red-600">{errors.ctncDetails}</p>
          )}
        </>
      )}

      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
        {formStep === 2 && (
          <Button type="button" variant="secondary" onClick={() => setFormStep(1)}>
            Voltar
          </Button>
        )}
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={isLoading}>
          {formStep === 1
            ? 'Avançar'
            : initialRoom
            ? 'Salvar alterações'
            : 'Criar sala'}
        </Button>
      </div>
    </form>
  )
}
