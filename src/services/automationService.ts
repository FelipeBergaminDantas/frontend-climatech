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
    horaInicio: automation.hora_inicio,
    horaFim: automation.hora_fim,
    prioridade: automation.prioridade,
    createdAt: automation.dth_created_at,
    updatedAt: automation.dth_updated_at,
    runtimeStatus: undefined,
  }
}

export function mapStateResponse(state: any): AutomationState {
  return {
    idAutomacao: state.id_automacao,
    flEmExecucao: state.fl_em_execucao,
    comandoEnviado: state.comando_enviado,
    dthInicioExecucao: state.dth_inicio_execucao,
    dthFimExecucao: state.dth_fim_execucao,
    dthUltimaExecucao: state.dth_ultima_execucao,
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
  const backendRules = await getAutomationsFromBackend(clientId, roomId)
  return backendRules.map(mapAutomationResponse)
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
  return mapAutomationResponse(result)
}

export async function deleteRule(id: string, password?: string): Promise<void> {
  await verifyPassword(password)
  await deleteAutomationInBackend(id)
}
