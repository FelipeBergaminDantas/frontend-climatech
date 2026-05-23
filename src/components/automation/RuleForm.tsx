'use client'

import { useEffect, useMemo, useState } from 'react'
import type { AutomationRule, Room } from '@/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface RuleFormProps {
  roomId: string
  rooms: Room[]
  onSave: (data: Omit<AutomationRule, 'id' | 'createdAt' | 'updatedAt' | 'runtimeStatus'>) => Promise<void>
  onCancel: () => void
  closeOnSave?: boolean
  initialRule?: AutomationRule
}

interface FormErrors {
  nomeAutomacao?: string
  roomId?: string
  horaInicio?: string
  horaFim?: string
}

export function RuleForm({ roomId, rooms, onSave, onCancel, initialRule }: RuleFormProps) {
  const [nomeAutomacao, setNomeAutomacao] = useState(initialRule?.nomeAutomacao ?? '')
  const [selectedRoomId, setSelectedRoomId] = useState(initialRule?.roomId ?? roomId)
  const [flSomenteDiaUtil, setFlSomenteDiaUtil] = useState(initialRule?.flSomenteDiaUtil ?? false)

  useEffect(() => {
    if (!selectedRoomId && rooms.length > 0) {
      setSelectedRoomId(rooms[0].id)
    }
  }, [rooms, selectedRoomId])
  const [flSegunda, setFlSegunda] = useState(initialRule?.flSegunda ?? true)
  const [flTerca, setFlTerca] = useState(initialRule?.flTerca ?? true)
  const [flQuarta, setFlQuarta] = useState(initialRule?.flQuarta ?? true)
  const [flQuinta, setFlQuinta] = useState(initialRule?.flQuinta ?? true)
  const [flSexta, setFlSexta] = useState(initialRule?.flSexta ?? true)
  const [flSabado, setFlSabado] = useState(initialRule?.flSabado ?? false)
  const [flDomingo, setFlDomingo] = useState(initialRule?.flDomingo ?? false)

  useEffect(() => {
    if (flSomenteDiaUtil) {
      setFlSabado(false)
      setFlDomingo(false)
    }
  }, [flSomenteDiaUtil])
  const [horaInicio, setHoraInicio] = useState(initialRule?.horaInicio ?? '')
  const [horaFim, setHoraFim] = useState(initialRule?.horaFim ?? '')
  const [prioridade, setPrioridade] = useState(initialRule?.prioridade ?? 1)
  const [errors, setErrors] = useState<FormErrors>({})
  const [isLoading, setIsLoading] = useState(false)

  const selectedRoom = useMemo(() => rooms.find((room) => room.id === selectedRoomId), [rooms, selectedRoomId])

  function validate(): boolean {
    const next: FormErrors = {}

    if (!nomeAutomacao.trim()) {
      next.nomeAutomacao = 'Nome da automação é obrigatório.'
    }
    if (!selectedRoomId) {
      next.roomId = 'Selecione uma sala.'
    }
    if (!horaInicio) {
      next.horaInicio = 'Horário de início é obrigatório.'
    }
    if (!horaFim) {
      next.horaFim = 'Horário de fim é obrigatório.'
    }
    if (horaInicio && horaFim) {
      const toMinutes = (value: string) => {
        const [hours, minutes] = value.split(':').map(Number)
        return hours * 60 + minutes
      }
      if (toMinutes(horaInicio) >= toMinutes(horaFim)) {
        next.horaFim = 'O horário de fim deve ser posterior ao início.'
      }
    }
    if (!flSomenteDiaUtil && ![flSegunda, flTerca, flQuarta, flQuinta, flSexta, flSabado, flDomingo].some(Boolean)) {
      next.horaInicio = 'Selecione ao menos um dia da semana ou somente dias úteis.'
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!validate()) return
    setIsLoading(true)

    try {
      await onSave({
        clientId: selectedRoom?.clientId ?? '',
        roomId: selectedRoomId,
        nomeAutomacao: nomeAutomacao.trim(),
        tipoTrigger: 'periodo',
        flAtivo: initialRule?.flAtivo ?? true,
        temperaturaAlvo: selectedRoom?.targetTemp ?? null,
        flSomenteDiaUtil,
        flSegunda,
        flTerca,
        flQuarta,
        flQuinta,
        flSexta,
        flSabado,
        flDomingo,
        horaInicio,
        horaFim,
        prioridade,
      })

      if (closeOnSave !== false) {
        onCancel()
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar automação.'
      setErrors({ nomeAutomacao: message })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <Input
        label="Nome da automação"
        id="nome-automacao"
        name="nome-automacao"
        value={nomeAutomacao}
        onChange={(e) => setNomeAutomacao(e.target.value)}
        error={errors.nomeAutomacao}
        placeholder="Ex: Climatização matinal"
        required
      />

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
          <option value="">Selecione uma sala...</option>
          {rooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.name}
            </option>
          ))}
        </select>
        {errors.roomId && <p className="text-xs text-red-500 dark:text-red-400">{errors.roomId}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Início"
          id="hora-inicio"
          name="hora-inicio"
          type="time"
          value={horaInicio}
          onChange={(e) => setHoraInicio(e.target.value)}
          error={errors.horaInicio}
          required
        />
        <Input
          label="Fim"
          id="hora-fim"
          name="hora-fim"
          type="time"
          value={horaFim}
          onChange={(e) => setHoraFim(e.target.value)}
          error={errors.horaFim}
          required
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Seg', value: flSegunda, setter: setFlSegunda, disabled: false },
          { label: 'Ter', value: flTerca, setter: setFlTerca, disabled: false },
          { label: 'Qua', value: flQuarta, setter: setFlQuarta, disabled: false },
          { label: 'Qui', value: flQuinta, setter: setFlQuinta, disabled: false },
          { label: 'Sex', value: flSexta, setter: setFlSexta, disabled: false },
          { label: 'Sáb', value: flSabado, setter: setFlSabado, disabled: flSomenteDiaUtil },
          { label: 'Dom', value: flDomingo, setter: setFlDomingo, disabled: flSomenteDiaUtil },
        ].map((day) => (
          <label
            key={day.label}
            className={['flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300', day.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'].join(' ')}
          >
            <input
              type="checkbox"
              checked={day.value}
              onChange={(e) => day.setter(e.target.checked)}
              disabled={day.disabled}
            />
            {day.label}
          </label>
        ))}
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
        <input
          type="checkbox"
          checked={flSomenteDiaUtil}
          onChange={(e) => setFlSomenteDiaUtil(e.target.checked)}
        />
        Apenas dias úteis
      </label>
      {flSomenteDiaUtil && (
        <p className="text-xs text-slate-500">Ao selecionar somente dias úteis, sábado e domingo ficam desativados.</p>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="priority" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Prioridade
        </label>
        <select
          id="priority"
          value={prioridade}
          onChange={(e) => setPrioridade(Number(e.target.value))}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {[1, 2, 3, 4, 5].map((value) => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>
      </div>

      <div className="rounded-lg border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/30 dark:bg-amber-950/10 dark:text-amber-200 space-y-2">
        <div className="flex gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="font-medium">Aviso importante sobre a automação</p>
            <p className="mt-1">O AC será <strong>desligado automaticamente 2 minutos antes</strong> do horário de início. Portanto, <strong>não ligue o AC manualmente</strong> a partir de 2 minutos antes da automação começar.</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-900/30 dark:bg-blue-950/10 dark:text-blue-200">
        Apenas gatilhos por período estão disponíveis nesta versão. A lógica de temperatura ainda está em desenvolvimento.
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={isLoading}>
          {initialRule ? 'Salvar alterações' : 'Criar automação'}
        </Button>
      </div>
    </form>
  )
}
