import type { AutomationRule, AutomationState } from '@/types'
import {
  createAutomationInBackend,
  deleteAutomationInBackend,
  getAutomationStatesFromBackend,
  getAutomationsFromBackend,
  toggleAutomationInBackend,
  updateAutomationInBackend,
} from '@/services/apiService'
import { verifyCurrentPassword } from '@/services/userService'
import { withCache, cacheKeys, cacheDelete } from '@/services/cacheService'

/** Converte timestamp da API para ISO exibível em Brasília (mantém −03:00 se já vier assim). */
function formatBrazilTimestamp(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  const raw = String(value).trim()
  if (!raw) return undefined

  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T')
  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) return raw

  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(parsed)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00'
  const datePart = `${get('year')}-${get('month')}-${get('day')}`
  const timePart = `${get('hour')}:${get('minute')}:${get('second')}`
  const fractionMatch = normalized.match(/\.(\d{1,6})/)
  const fraction = fractionMatch ? `.${fractionMatch[1].padEnd(6, '0')}` : ''
  return `${datePart}T${timePart}${fraction}-03:00`
}

/** Converte hora do backend (TIME ou timestamptz) para HH:MM em Brasília. */
function formatScheduleTime(value: string | null | undefined): string {
  if (!value) return ''
  const raw = String(value).trim()
  if (!raw.includes('T') && !raw.includes(' ')) {
    return raw.slice(0, 5)
  }
  const parsed = new Date(raw.includes('T') ? raw : raw.replace(' ', 'T'))
  if (Number.isNaN(parsed.getTime())) return raw.slice(0, 5)
  return parsed.toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function mapAutomationResponse(automation: any): AutomationRule {
  return {
    id: automation.id_automacao,
    clientId: automation.id_cliente,
    roomId: automation.id_sala,
    nomeAutomacao: automation.nome_automacao,
    tipoTrigger: automation.tipo_trigger,
    flAtivo: automation.fl_ativo,
    temperaturaAlvo: automation.temperatura_alvo ?? null,
    flSomenteDiaUtil: automation.fl_somente_dia_util,
    flSegunda: automation.fl_segunda,
    flTerca: automation.fl_terca,
    flQuarta: automation.fl_quarta,
    flQuinta: automation.fl_quinta,
    flSexta: automation.fl_sexta,
    flSabado: automation.fl_sabado,
    flDomingo: automation.fl_domingo,
    horaInicio: formatScheduleTime(automation.hora_inicio),
    horaFim: formatScheduleTime(automation.hora_fim),
    prioridade: automation.prioridade,
    createdAt: formatBrazilTimestamp(automation.dth_created_at) ?? automation.dth_created_at,
    updatedAt: formatBrazilTimestamp(automation.dth_updated_at) ?? automation.dth_updated_at,
    runtimeStatus: undefined,
  }
}

export function mapStateResponse(state: any): AutomationState {
  return {
    idAutomacao: state.id_automacao,
    flEmExecucao: state.fl_em_execucao,
    comandoEnviado: state.comando_enviado,
    dthInicioExecucao: formatBrazilTimestamp(state.dth_inicio_execucao),
    dthFimExecucao: formatBrazilTimestamp(state.dth_fim_execucao),
    dthUltimaExecucao: formatBrazilTimestamp(state.dth_ultima_execucao),
    status: state.status,
  }
}

async function verifyPassword(password?: string): Promise<void> {
  if (!password) {
    throw new Error('Senha não informada.')
  }
  await verifyCurrentPassword(password)
}

export async function fetchAutomations(clientId?: string, roomId?: string): Promise<AutomationRule[]> {
  return withCache(cacheKeys.automations(clientId, roomId), async () => {
    const backendRules = await getAutomationsFromBackend(clientId, roomId)
    return backendRules.map(mapAutomationResponse)
  })
}

export async function fetchAutomationStates(roomId: string): Promise<AutomationState[]> {
  const states = await getAutomationStatesFromBackend(roomId)
  return states.map(mapStateResponse)
}

export async function createRule(payload: {
  clientId?: string
  roomId: string
  nomeAutomacao: string
  flSomenteDiaUtil: boolean
  flSegunda: boolean
  flTerca: boolean
  flQuarta: boolean
  flQuinta: boolean
  flSexta: boolean
  flSabado: boolean
  flDomingo: boolean
  horaInicio: string
  horaFim: string
  prioridade: number
}, password?: string): Promise<AutomationRule> {
  await verifyPassword(password)
  const data = {
    id_cliente: payload.clientId,
    id_sala: payload.roomId,
    nome_automacao: payload.nomeAutomacao,
    tipo_trigger: 'periodo' as const,
    fl_somente_dia_util: payload.flSomenteDiaUtil,
    fl_segunda: payload.flSegunda,
    fl_terca: payload.flTerca,
    fl_quarta: payload.flQuarta,
    fl_quinta: payload.flQuinta,
    fl_sexta: payload.flSexta,
    fl_sabado: payload.flSabado,
    fl_domingo: payload.flDomingo,
    hora_inicio: payload.horaInicio,
    hora_fim: payload.horaFim,
    prioridade: payload.prioridade,
  }
  const result = await createAutomationInBackend(data)
  // Invalidate automations cache
  if (payload.clientId) cacheDelete(cacheKeys.automations(payload.clientId))
  cacheDelete(cacheKeys.automations(undefined, payload.roomId))
  return mapAutomationResponse(result)
}

export async function updateRule(id: string, payload: {
  nomeAutomacao?: string
  flSomenteDiaUtil?: boolean
  flSegunda?: boolean
  flTerca?: boolean
  flQuarta?: boolean
  flQuinta?: boolean
  flSexta?: boolean
  flSabado?: boolean
  flDomingo?: boolean
  horaInicio?: string
  horaFim?: string
  prioridade?: number
  flAtivo?: boolean
}, password?: string): Promise<AutomationRule> {
  await verifyPassword(password)
  const data: Record<string, any> = {}
  if (payload.nomeAutomacao !== undefined) data.nome_automacao = payload.nomeAutomacao
  if (payload.flSomenteDiaUtil !== undefined) data.fl_somente_dia_util = payload.flSomenteDiaUtil
  if (payload.flSegunda !== undefined) data.fl_segunda = payload.flSegunda
  if (payload.flTerca !== undefined) data.fl_terca = payload.flTerca
  if (payload.flQuarta !== undefined) data.fl_quarta = payload.flQuarta
  if (payload.flQuinta !== undefined) data.fl_quinta = payload.flQuinta
  if (payload.flSexta !== undefined) data.fl_sexta = payload.flSexta
  if (payload.flSabado !== undefined) data.fl_sabado = payload.flSabado
  if (payload.flDomingo !== undefined) data.fl_domingo = payload.flDomingo
  if (payload.horaInicio !== undefined) data.hora_inicio = payload.horaInicio
  if (payload.horaFim !== undefined) data.hora_fim = payload.horaFim
  if (payload.prioridade !== undefined) data.prioridade = payload.prioridade
  if (payload.flAtivo !== undefined) data.fl_ativo = payload.flAtivo
  const result = await updateAutomationInBackend(id, data)
  return mapAutomationResponse(result)
}

export async function toggleRule(id: string, password?: string): Promise<AutomationRule> {
  await verifyPassword(password)
  const result = await toggleAutomationInBackend(id)
  // Note: We can't easily invalidate specific cache keys without knowing the room/client IDs
  // The cache will auto-expire in 5 minutes, but you could pass them as params for better performance
  return mapAutomationResponse(result)
}

export async function deleteRule(id: string, password?: string): Promise<void> {
  await verifyPassword(password)
  await deleteAutomationInBackend(id)
  // Note: We can't easily invalidate specific cache keys without knowing the room/client IDs
  // The cache will auto-expire in 5 minutes, but you could pass them as params for better performance
}
