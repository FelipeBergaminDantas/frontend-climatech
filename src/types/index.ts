export type UserRole = 'admin_master' | 'admin_client' | 'user';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  twoFactorEnabled: boolean;
  role: UserRole;
  clientId?: string; // Para admin_client e user — vinculado a um cliente específico
  selectedClientId?: string; // Para admin_master — cliente selecionado na sessão atual
}

export interface Client {
  id: string;
  name: string;
  cep?: string;
  address?: string;
  phone?: string;
  createdAt: string;
  isActive: boolean; // Flag de ativação
}

export interface Room {
  id: string;
  userId: string;
  clientId: string; // Vinculado a um cliente
  name: string;
  deviceId: string;
  acCount: number;
  ctncNodeIds?: string[];
  location?: string;
  idealTempMin: number;
  idealTempMax: number;
  targetTemp?: number | null; // Temperatura alvo (16-30°C) — pode ser nula inicialmente
  createdAt: string;
}

export interface Ac {
  id: string;
  clientId: string;
  salaId: string;
  salaName?: string;
  nodeId: string;
  nomeAc: string;
  nodeStatus?: string;
  nodeType?: string;
  nodeLastSeen?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DeviceState {
  roomId: string;
  currentTemp: number;
  targetTemp: number;
  isOn: boolean;
  mode: DeviceMode;
  fanSpeed: FanSpeed;
  lastUpdated: string;
}

export type DeviceMode = 'cool' | 'fan' | 'dry' | 'heat' | 'auto';
export type FanSpeed = 'low' | 'medium' | 'high' | 'auto';

export interface TemperatureReading {
  roomId: string;
  temp: number;
  timestamp: string;
}

export interface AutomationRule {
  id: string;
  roomId: string;
  name: string;
  conditionType: 'schedule' | 'temperature';
  scheduleStart?: string;
  scheduleEnd?: string;
  tempMin?: number;
  tempMax?: number;
  action: AutomationAction;
  targetTemp?: number;
  isActive: boolean;
  createdAt: string;
}

export type AutomationAction = 'turn_on' | 'turn_off' | 'set_temp';

export interface AutomationLog {
  id: string;
  ruleId: string;
  roomId: string;
  executedAt: string;
  action: AutomationAction;
  success: boolean;
}

export interface ThemePreferences {
  mode: 'light' | 'dark';
  backgroundColor: string;
  backgroundOpacity: number;
}

export type IndicatorStatus = 'ok' | 'warning' | 'critical';

export type NodeType = 'CTNR' | 'CTNC';
export type NodeStatus = 'online' | 'offline';

export interface ClimaTechNode {
  id: string;           // CTN-R-V1-{MAC} or CTN-C-V1-{MAC}
  type: NodeType;
  pairId: string;       // ex: SALA-01
  roomId: string;
  roomName: string;
  firmwareVersion: string;
  status: NodeStatus;
  lastSeen: string;     // ISO timestamp
  acIndex?: number;     // CTNC only — which AC unit (1, 2, 3...)
}
