import type {
  User,
  Room,
  DeviceState,
  TemperatureReading,
  AutomationRule,
  ClimaTechNode,
} from '@/types';

export const mockUser: User = {
  id: 'user-1',
  name: 'Rafael Alves',
  email: 'rafa_alves0901@hotmail.com',
  twoFactorEnabled: false,
  role: 'admin_master',
};

export const mockAdmin: User = {
  id: 'admin-1',
  name: 'Felipe Bergamin Dantas',
  email: 'felipedantas016@gmail.com',
  twoFactorEnabled: false,
  role: 'admin_master',
};

export const mockRooms: Room[] = [
  {
    id: 'room-1',
    userId: 'user-1',
    clientId: 'client-unifecaf',
    name: 'Auditório',
    deviceId: 'ESP-001',
    acCount: 2,
    location: 'Térreo',
    idealTempMin: 20,
    idealTempMax: 24,
    createdAt: '2024-01-10T10:00:00.000Z',
  },
  {
    id: 'room-2',
    userId: 'user-1',
    clientId: 'client-unifecaf',
    name: 'Laboratório de Informática 05',
    deviceId: 'ESP-002',
    acCount: 1,
    location: '1º Andar',
    idealTempMin: 18,
    idealTempMax: 22,
    createdAt: '2024-01-11T09:00:00.000Z',
  },
  {
    id: 'room-3',
    userId: 'user-1',
    clientId: 'client-unifecaf',
    name: 'Sala 208',
    deviceId: 'ESP-003',
    acCount: 3,
    location: '2º Andar',
    idealTempMin: 19,
    idealTempMax: 23,
    createdAt: '2024-01-12T08:00:00.000Z',
  },
  {
    id: 'room-4',
    userId: 'user-1',
    clientId: 'client-demo',
    name: 'Sala Demo 1',
    deviceId: 'ESP-004',
    acCount: 1,
    location: 'Andar 1',
    idealTempMin: 20,
    idealTempMax: 24,
    createdAt: '2024-01-13T10:00:00.000Z',
  },
  {
    id: 'room-5',
    userId: 'user-1',
    clientId: 'client-demo',
    name: 'Sala Demo 2',
    deviceId: 'ESP-005',
    acCount: 2,
    location: 'Andar 2',
    idealTempMin: 19,
    idealTempMax: 23,
    createdAt: '2024-01-14T11:00:00.000Z',
  },
];

export const mockDeviceStates: DeviceState[] = [
  {
    roomId: 'room-1',
    currentTemp: 22,
    targetTemp: 22,
    isOn: true,
    mode: 'cool',
    fanSpeed: 'medium',
    lastUpdated: new Date().toISOString(),
  },
  {
    roomId: 'room-2',
    currentTemp: 26,
    targetTemp: 20,
    isOn: true,
    mode: 'cool',
    fanSpeed: 'high',
    lastUpdated: new Date().toISOString(),
  },
  {
    roomId: 'room-3',
    currentTemp: 19,
    targetTemp: 21,
    isOn: false,
    mode: 'auto',
    fanSpeed: 'auto',
    lastUpdated: new Date().toISOString(),
  },
  {
    roomId: 'room-4',
    currentTemp: 23,
    targetTemp: 22,
    isOn: true,
    mode: 'cool',
    fanSpeed: 'low',
    lastUpdated: new Date().toISOString(),
  },
  {
    roomId: 'room-5',
    currentTemp: 21,
    targetTemp: 21,
    isOn: true,
    mode: 'auto',
    fanSpeed: 'auto',
    lastUpdated: new Date().toISOString(),
  },
];

function generateHistory(roomId: string, baseTemp: number, daysAgo = 0): TemperatureReading[] {
  const readings: TemperatureReading[] = [];
  // Anchor to midnight of the target day
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, 0, 0, 0).getTime();
  // 48 readings = one every 30 min, from 0h to 23h30
  for (let i = 0; i < 48; i++) {
    const ts = midnight + i * 30 * 60 * 1000;
    const variation = (Math.sin((i + daysAgo * 7) * 0.4) * 2) + (Math.random() - 0.5) * 1.5;
    readings.push({
      roomId,
      temp: Math.round((baseTemp + variation) * 10) / 10,
      timestamp: new Date(ts).toISOString(),
    });
  }
  return readings;
}

// Generate 7 days of history per room (today + 6 previous days)
function generateMultiDayHistory(roomId: string, baseTemp: number): TemperatureReading[] {
  const all: TemperatureReading[] = [];
  for (let d = 6; d >= 0; d--) {
    all.push(...generateHistory(roomId, baseTemp, d));
  }
  return all;
}

export const mockTemperatureHistory: Record<string, TemperatureReading[]> = {
  'room-1': generateMultiDayHistory('room-1', 22),
  'room-2': generateMultiDayHistory('room-2', 26),
  'room-3': generateMultiDayHistory('room-3', 19),
  'room-4': generateMultiDayHistory('room-4', 23),
  'room-5': generateMultiDayHistory('room-5', 21),
};

export const mockAutomationRules: AutomationRule[] = [
  {
    id: 'rule-1',
    roomId: 'room-1',
    name: 'Ligar de manhã',
    conditionType: 'schedule',
    scheduleStart: '07:00',
    scheduleEnd: '09:00',
    action: 'turn_on',
    isActive: true,
    createdAt: '2024-01-15T10:00:00.000Z',
  },
  {
    id: 'rule-2',
    roomId: 'room-2',
    name: 'Resfriamento automático',
    conditionType: 'temperature',
    tempMin: 25,
    tempMax: 35,
    action: 'set_temp',
    targetTemp: 22,
    isActive: true,
    createdAt: '2024-01-16T10:00:00.000Z',
  },
  {
    id: 'rule-3',
    roomId: 'room-3',
    name: 'Desligar à noite',
    conditionType: 'schedule',
    scheduleStart: '22:00',
    scheduleEnd: '23:59',
    action: 'turn_off',
    isActive: false,
    createdAt: '2024-01-17T10:00:00.000Z',
  },
];

// Nodes — 1 CTNR + acCount CTNCs per room
export const mockNodes: ClimaTechNode[] = [
  // Auditório (room-1, acCount: 2)
  {
    id: 'CTN-R-V1-82427401',
    type: 'CTNR',
    pairId: 'SALA-01',
    roomId: 'room-1',
    roomName: 'Auditório',
    firmwareVersion: '1.2.0',
    status: 'online',
    lastSeen: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  },
  {
    id: 'CTN-C-V1-82427402',
    type: 'CTNC',
    pairId: 'SALA-01',
    roomId: 'room-1',
    roomName: 'Auditório',
    firmwareVersion: '1.2.0',
    status: 'online',
    lastSeen: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    acIndex: 1,
  },
  {
    id: 'CTN-C-V1-82427403',
    type: 'CTNC',
    pairId: 'SALA-01',
    roomId: 'room-1',
    roomName: 'Auditório',
    firmwareVersion: '1.2.0',
    status: 'offline',
    lastSeen: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    acIndex: 2,
  },

  // Laboratório de Informática 05 (room-2, acCount: 1)
  {
    id: 'CTN-R-V1-82427404',
    type: 'CTNR',
    pairId: 'SALA-02',
    roomId: 'room-2',
    roomName: 'Laboratório de Informática 05',
    firmwareVersion: '1.1.3',
    status: 'online',
    lastSeen: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: 'CTN-C-V1-82427405',
    type: 'CTNC',
    pairId: 'SALA-02',
    roomId: 'room-2',
    roomName: 'Laboratório de Informática 05',
    firmwareVersion: '1.1.3',
    status: 'online',
    lastSeen: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    acIndex: 1,
  },

  // Sala 208 (room-3, acCount: 3)
  {
    id: 'CTN-R-V1-82427406',
    type: 'CTNR',
    pairId: 'SALA-03',
    roomId: 'room-3',
    roomName: 'Sala 208',
    firmwareVersion: '1.2.0',
    status: 'offline',
    lastSeen: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'CTN-C-V1-82427407',
    type: 'CTNC',
    pairId: 'SALA-03',
    roomId: 'room-3',
    roomName: 'Sala 208',
    firmwareVersion: '1.2.0',
    status: 'offline',
    lastSeen: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    acIndex: 1,
  },
  {
    id: 'CTN-C-V1-82427408',
    type: 'CTNC',
    pairId: 'SALA-03',
    roomId: 'room-3',
    roomName: 'Sala 208',
    firmwareVersion: '1.1.3',
    status: 'online',
    lastSeen: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    acIndex: 2,
  },
  {
    id: 'CTN-C-V1-82427409',
    type: 'CTNC',
    pairId: 'SALA-03',
    roomId: 'room-3',
    roomName: 'Sala 208',
    firmwareVersion: '1.2.0',
    status: 'online',
    lastSeen: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    acIndex: 3,
  },
];
