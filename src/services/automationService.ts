import type {
  AutomationRule,
  AutomationLog,
  DeviceState,
} from '@/types';
import { validateTempRange, validateSchedule } from '@/utils/validators';
import { sendCommand } from './deviceService';

// In-memory stores — TODO: Replace with API calls to backend
let rules: AutomationRule[] = [];
let logs: AutomationLog[] = [];

export function getRules(roomId: string): AutomationRule[] {
  return rules.filter((r) => r.roomId === roomId);
}

export function getRuleById(id: string): AutomationRule | undefined {
  return rules.find((r) => r.id === id);
}

function validateRuleConditions(
  data: Omit<AutomationRule, 'id' | 'createdAt'>
): void {
  if (data.conditionType === 'temperature') {
    if (data.tempMin === undefined || data.tempMax === undefined) {
      throw new Error('Condição de temperatura requer tempMin e tempMax.');
    }
    validateTempRange(data.tempMin, data.tempMax);
  }

  if (data.conditionType === 'schedule') {
    if (data.scheduleStart === undefined || data.scheduleEnd === undefined) {
      throw new Error('Condição de horário requer scheduleStart e scheduleEnd.');
    }
    validateSchedule(data.scheduleStart, data.scheduleEnd);
  }
}

function detectConflict(
  newRule: Omit<AutomationRule, 'id' | 'createdAt'>,
  excludeId?: string
): AutomationRule | undefined {
  const roomRules = rules.filter(
    (r) => r.roomId === newRule.roomId && r.isActive && r.id !== excludeId
  );

  for (const existing of roomRules) {
    if (
      existing.conditionType === newRule.conditionType &&
      existing.action === newRule.action
    ) {
      // Same type + same action = conflict
      return existing;
    }
  }
  return undefined;
}

export function createRule(
  data: Omit<AutomationRule, 'id' | 'createdAt'>
): { rule: AutomationRule; conflict?: AutomationRule } {
  validateRuleConditions(data);

  const conflict = detectConflict(data);

  const newRule: AutomationRule = {
    ...data,
    id: `rule-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };

  rules.push(newRule);
  return { rule: newRule, conflict };
}

export function updateRule(
  id: string,
  data: Partial<Omit<AutomationRule, 'id' | 'createdAt'>>
): AutomationRule {
  const index = rules.findIndex((r) => r.id === id);
  if (index === -1) {
    throw new Error('Regra não encontrada.');
  }

  const updated = { ...rules[index], ...data };
  validateRuleConditions(updated);

  rules[index] = updated;
  return { ...updated };
}

export function deleteRule(id: string): void {
  const index = rules.findIndex((r) => r.id === id);
  if (index === -1) {
    throw new Error('Regra não encontrada.');
  }
  rules.splice(index, 1);
}

export function toggleRule(id: string): AutomationRule {
  const index = rules.findIndex((r) => r.id === id);
  if (index === -1) {
    throw new Error('Regra não encontrada.');
  }
  rules[index] = { ...rules[index], isActive: !rules[index].isActive };
  return { ...rules[index] };
}

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function getCurrentTimeMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

export async function evaluateRules(
  roomId: string,
  deviceState: DeviceState
): Promise<AutomationLog[]> {
  const activeRules = rules.filter((r) => r.roomId === roomId && r.isActive);
  const newLogs: AutomationLog[] = [];

  for (const rule of activeRules) {
    let conditionMet = false;

    if (rule.conditionType === 'schedule') {
      const start = timeToMinutes(rule.scheduleStart!);
      const end = timeToMinutes(rule.scheduleEnd!);
      const now = getCurrentTimeMinutes();
      conditionMet = now >= start && now < end;
    } else if (rule.conditionType === 'temperature') {
      conditionMet =
        deviceState.currentTemp >= rule.tempMin! &&
        deviceState.currentTemp <= rule.tempMax!;
    }

    if (!conditionMet) continue;

    let success = false;
    try {
      if (rule.action === 'turn_on') {
        await sendCommand(roomId, { command: 'set_power', value: 'on' });
      } else if (rule.action === 'turn_off') {
        await sendCommand(roomId, { command: 'set_power', value: 'off' });
      } else if (rule.action === 'set_temp' && rule.targetTemp !== undefined) {
        await sendCommand(roomId, { command: 'set_temp', value: rule.targetTemp });
      }
      success = true;
    } catch {
      success = false;
    }

    const log: AutomationLog = {
      id: `log-${Date.now()}-${rule.id}`,
      ruleId: rule.id,
      roomId,
      executedAt: new Date().toISOString(),
      action: rule.action,
      success,
    };

    logs.push(log);
    newLogs.push(log);
  }

  return newLogs;
}

export function getLogs(roomId?: string): AutomationLog[] {
  if (roomId) return logs.filter((l) => l.roomId === roomId);
  return [...logs];
}

/** Reset store — used in tests */
export function _resetRules(): void {
  rules = [];
  logs = [];
}
