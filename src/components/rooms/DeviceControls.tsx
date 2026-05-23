'use client'

import { useEffect, useState } from 'react'
import type { DeviceState } from '@/types'
import { sendCommand } from '@/services/deviceService'
import { useRooms } from '@/contexts/RoomsContext'

interface DeviceControlsProps {
  roomId: string
  state: DeviceState
  onUpdate: (state: DeviceState) => void
  isAdmin?: boolean
}

export function DeviceControls({ roomId, state, onUpdate, isAdmin = false }: DeviceControlsProps) {
  const { rooms, updateRoom, patchRoomLocally } = useRooms()
  const room = rooms.find((item) => item.id === roomId)
  const persistedTargetTemp = room?.targetTemp ?? state.targetTemp

  const [draft, setDraft] = useState<DeviceState>({
    ...state,
    targetTemp: persistedTargetTemp ?? state.targetTemp,
  })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [tempError, setTempError] = useState<string | null>(null)

  useEffect(() => {
    setDraft({
      ...state,
      targetTemp: persistedTargetTemp ?? state.targetTemp,
    })
  }, [state, persistedTargetTemp])

  const targetTempChanged = Number(draft.targetTemp) !== Number(persistedTargetTemp)
  const isDirty = isAdmin && (draft.isOn !== state.isOn || targetTempChanged)

  function showToast(type: 'success' | 'error', msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 5000)
  }

  async function handleSave() {
    setSaving(true)
    setTempError(null)
    const tempChanged = targetTempChanged

    try {
      let current = { ...draft }

      if (tempChanged) {
        await updateRoom(roomId, { targetTemp: draft.targetTemp })
        patchRoomLocally(roomId, { targetTemp: draft.targetTemp })
      }

      if (draft.isOn !== state.isOn) {
        current = await sendCommand(roomId, { command: 'set_power', value: draft.isOn ? 'on' : 'off' })
        if (tempChanged) {
          current = { ...current, targetTemp: draft.targetTemp }
        }
      }

      setDraft(current)
      onUpdate(current)
      showToast('success', 'Configurações salvas com sucesso.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar.'

      if (tempChanged) {
        setTempError(message)
      }

      showToast('error', message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div
          role="alert"
          className="rounded-xl px-4 py-3 text-sm"
          style={toast.type === 'success'
            ? { background: 'rgba(16,201,143,0.1)', color: '#0ea5a0', border: '1px solid rgba(16,201,143,0.2)' }
            : { background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          {toast.msg}
        </div>
      )}

      {!isAdmin && (
        <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(30,95,168,0.06)', color: '#1e5fa8', border: '1px solid rgba(30,95,168,0.15)' }}>
          Apenas administradores podem alterar as configurações do dispositivo.
        </div>
      )}

      {/* Power toggle */}
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm" style={{ color: '#0f2744' }}>Ar-condicionado</span>
        <button
          onClick={() => isAdmin && setDraft(d => ({ ...d, isOn: !d.isOn }))}
          aria-pressed={draft.isOn}
          disabled={!isAdmin}
          className="relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60"
          style={{ background: draft.isOn ? '#10c98f' : '#cbd5e1' }}
        >
          <span
            className="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform"
            style={{ transform: draft.isOn ? 'translateX(22px)' : 'translateX(2px)' }}
          />
          <span className="sr-only">{draft.isOn ? 'Desligar' : 'Ligar'}</span>
        </button>
      </div>

      {/* Setpoint */}
      <div>
        <p className="font-medium text-sm mb-3" style={{ color: '#0f2744' }}>Temperatura alvo (setpoint)</p>
        {tempError && (
          <div
            role="alert"
            className="mb-3 rounded-xl px-4 py-3 text-sm"
            style={{ background: 'rgba(239,68,68,0.08)', color: '#b91c1c', border: '1px solid rgba(239,68,68,0.25)' }}
          >
            {tempError}
          </div>
        )}
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              if (!isAdmin) return
              setTempError(null)
              setDraft(d => ({ ...d, targetTemp: Math.max(16, d.targetTemp - 1) }))
            }}
            disabled={!isAdmin || draft.targetTemp <= 16}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: '#f0f4f8', color: '#0f2744', border: '1px solid #e2e8f0' }}
          >
            −
          </button>
          <span className="text-3xl font-bold w-20 text-center" style={{ color: '#0f2744' }}>
            {draft.targetTemp}°C
          </span>
          <button
            onClick={() => {
              if (!isAdmin) return
              setTempError(null)
              setDraft(d => ({ ...d, targetTemp: Math.min(30, d.targetTemp + 1) }))
            }}
            disabled={!isAdmin || draft.targetTemp >= 30}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: '#f0f4f8', color: '#0f2744', border: '1px solid #e2e8f0' }}
          >
            +
          </button>
        </div>
        <input
          type="range" min={16} max={30} value={draft.targetTemp}
          onChange={e => {
            if (!isAdmin) return
            setTempError(null)
            setDraft(d => ({ ...d, targetTemp: Number(e.target.value) }))
          }}
          disabled={!isAdmin}
          className="w-full mt-3 disabled:cursor-not-allowed"
          style={{ accentColor: '#1e5fa8' }}
          aria-label="Temperatura alvo"
          aria-invalid={Boolean(tempError)}
          aria-describedby={tempError ? 'target-temp-error' : undefined}
        />
        <div className="flex justify-between text-xs text-slate-400 mt-1">
          <span>16°C</span><span>30°C</span>
        </div>
      </div>

      {/* Save / Discard — admin only */}
      {isAdmin && (
        <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #1e5fa8, #2d7dd2)' }}
          >
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
          {isDirty && !saving && (
            <button
              onClick={() => {
                setTempError(null)
                setDraft({ ...state, targetTemp: persistedTargetTemp ?? state.targetTemp })
              }}
              className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{ background: '#f0f4f8', color: '#64748b', border: '1px solid #e2e8f0' }}
            >
              Descartar
            </button>
          )}
          {isDirty && <span className="text-xs text-slate-400">Alterações não salvas</span>}
        </div>
      )}
    </div>
  )
}
