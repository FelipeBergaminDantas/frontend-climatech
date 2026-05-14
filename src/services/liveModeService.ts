/**
 * Serviço para gerenciar o modo ao vivo
 * Controla quem ativou, notificações e prevenção de duplicidade
 */

interface LiveModeState {
  isActive: boolean
  activatedBy: string | null // userId de quem ativou
  activatedByName: string | null // nome de quem ativou
  activatedAt: string | null
  clientId: string
}

// Armazenamento em memória (em produção seria no backend)
const liveModeStates: Record<string, LiveModeState> = {}

// Listeners para notificações
type LiveModeListener = (state: LiveModeState) => void
const listeners: Record<string, LiveModeListener[]> = {}

/**
 * Ativa o modo ao vivo para um cliente
 * Retorna true se conseguiu ativar, false se já estava ativo por outro usuário
 */
export function activateLiveMode(
  clientId: string,
  userId: string,
  userName: string
): { success: boolean; message?: string; activatedBy?: string } {
  const currentState = liveModeStates[clientId]

  // Se já está ativo por outro usuário, não permite
  if (currentState?.isActive && currentState.activatedBy !== userId) {
    return {
      success: false,
      message: `Modo ao vivo já está ativo por ${currentState.activatedByName}`,
      activatedBy: currentState.activatedByName || undefined,
    }
  }

  // Ativa o modo ao vivo
  const newState: LiveModeState = {
    isActive: true,
    activatedBy: userId,
    activatedByName: userName,
    activatedAt: new Date().toISOString(),
    clientId,
  }

  liveModeStates[clientId] = newState

  // Notifica todos os listeners
  notifyListeners(clientId, newState)

  return { success: true }
}

/**
 * Desativa o modo ao vivo para um cliente
 * Apenas quem ativou pode desativar
 */
export function deactivateLiveMode(
  clientId: string,
  userId: string
): { success: boolean; message?: string } {
  const currentState = liveModeStates[clientId]

  // Se não está ativo, não faz nada
  if (!currentState?.isActive) {
    return { success: true }
  }

  // Se foi ativado por outro usuário, não permite desativar
  if (currentState.activatedBy !== userId) {
    return {
      success: false,
      message: `Apenas ${currentState.activatedByName} pode desativar o modo ao vivo`,
    }
  }

  // Desativa o modo ao vivo
  const newState: LiveModeState = {
    isActive: false,
    activatedBy: null,
    activatedByName: null,
    activatedAt: null,
    clientId,
  }

  liveModeStates[clientId] = newState

  // Notifica todos os listeners
  notifyListeners(clientId, newState)

  return { success: true }
}

/**
 * Obtém o estado atual do modo ao vivo para um cliente
 */
export function getLiveModeState(clientId: string): LiveModeState {
  return (
    liveModeStates[clientId] || {
      isActive: false,
      activatedBy: null,
      activatedByName: null,
      activatedAt: null,
      clientId,
    }
  )
}

/**
 * Verifica se um usuário pode controlar o modo ao vivo
 */
export function canControlLiveMode(
  clientId: string,
  userId: string,
  userRole: string
): boolean {
  // Usuários comuns nunca podem controlar
  if (userRole === 'user') {
    return false
  }

  const state = liveModeStates[clientId]

  // Se não está ativo, admin pode ativar
  if (!state?.isActive) {
    return true
  }

  // Se está ativo, apenas quem ativou pode desativar
  return state.activatedBy === userId
}

/**
 * Registra um listener para mudanças no modo ao vivo
 */
export function addLiveModeListener(
  clientId: string,
  listener: LiveModeListener
): () => void {
  if (!listeners[clientId]) {
    listeners[clientId] = []
  }

  listeners[clientId].push(listener)

  // Retorna função para remover o listener
  return () => {
    listeners[clientId] = listeners[clientId].filter((l) => l !== listener)
  }
}

/**
 * Notifica todos os listeners de um cliente
 */
function notifyListeners(clientId: string, state: LiveModeState) {
  const clientListeners = listeners[clientId] || []
  clientListeners.forEach((listener) => listener(state))
}

/**
 * Desativa automaticamente o modo ao vivo após um tempo (opcional)
 */
export function scheduleAutoDeactivation(
  clientId: string,
  durationMs: number = 3600000 // 1 hora por padrão
): NodeJS.Timeout {
  return setTimeout(() => {
    const state = liveModeStates[clientId]
    if (state?.isActive) {
      const newState: LiveModeState = {
        isActive: false,
        activatedBy: null,
        activatedByName: null,
        activatedAt: null,
        clientId,
      }

      liveModeStates[clientId] = newState
      notifyListeners(clientId, newState)
    }
  }, durationMs)
}
