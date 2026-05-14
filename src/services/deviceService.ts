import type { DeviceState, DeviceMode, FanSpeed, TemperatureReading } from '@/types';
import { mockDeviceStates, mockTemperatureHistory } from './mockData';
import { validateTargetTemp } from '@/utils/validators';

// In-memory store
let deviceStates: DeviceState[] = mockDeviceStates.map((s) => ({ ...s }));

export function getDeviceState(roomId: string): DeviceState {
  const state = deviceStates.find((s) => s.roomId === roomId);
  if (!state) {
    throw new Error(`Estado do dispositivo não encontrado para a sala "${roomId}".`);
  }
  return { ...state };
}

export type DeviceCommand =
  | { command: 'set_power'; value: 'on' | 'off' }
  | { command: 'set_temp'; value: number }
  | { command: 'set_mode'; value: DeviceMode }
  | { command: 'set_fan_speed'; value: FanSpeed };

export async function sendCommand(
  roomId: string,
  cmd: DeviceCommand
): Promise<DeviceState> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  const index = deviceStates.findIndex((s) => s.roomId === roomId);
  if (index === -1) {
    throw new Error(`Dispositivo não encontrado para a sala "${roomId}".`);
  }

  const state = { ...deviceStates[index] };

  switch (cmd.command) {
    case 'set_power':
      state.isOn = cmd.value === 'on';
      break;
    case 'set_temp':
      validateTargetTemp(cmd.value);
      state.targetTemp = cmd.value;
      break;
    case 'set_mode':
      state.mode = cmd.value;
      break;
    case 'set_fan_speed':
      state.fanSpeed = cmd.value;
      break;
  }

  state.lastUpdated = new Date().toISOString();
  deviceStates[index] = state;
  return { ...state };
}

export function getTemperatureHistory(roomId: string, date?: Date): TemperatureReading[] {
  const all = mockTemperatureHistory[roomId];
  if (!all) return [];

  if (!date) {
    // Default: last 24h (today)
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return all.filter(r => new Date(r.timestamp).getTime() >= cutoff);
  }

  // Filter to the requested calendar day
  const y = date.getFullYear(), mo = date.getMonth(), d = date.getDate();
  const dayStart = new Date(y, mo, d).getTime();
  const dayEnd = dayStart + 24 * 60 * 60 * 1000;
  const filtered = all.filter(r => {
    const t = new Date(r.timestamp).getTime();
    return t >= dayStart && t < dayEnd;
  });

  if (filtered.length > 0) return filtered;

  // No data for requested date — find nearest available date
  const available = [...new Set(all.map(r => {
    const d2 = new Date(r.timestamp);
    return new Date(d2.getFullYear(), d2.getMonth(), d2.getDate()).getTime();
  }))].sort((a, b) => Math.abs(a - dayStart) - Math.abs(b - dayStart));

  if (available.length === 0) return [];
  const nearest = new Date(available[0]);
  return getTemperatureHistory(roomId, nearest);
}

/** Returns available dates (as ISO date strings) for a room */
export function getAvailableDates(roomId: string): string[] {
  const all = mockTemperatureHistory[roomId];
  if (!all) return [];
  const dates = new Set(all.map(r => r.timestamp.slice(0, 10)));
  return [...dates].sort();
}

/**
 * Returns live readings for the last N minutes, one point every 5 minutes.
 * The last point is always floored to the nearest 5-min mark before now.
 */
export function getLiveReadings(roomId: string, minutes = 60): TemperatureReading[] {
  const state = deviceStates.find(s => s.roomId === roomId);
  const baseTemp = state?.currentTemp ?? 22;

  const now = Date.now();
  // Floor to nearest 5-min boundary
  const lastTs = Math.floor(now / (5 * 60 * 1000)) * (5 * 60 * 1000);
  const count = Math.floor(minutes / 5);
  const readings: TemperatureReading[] = [];

  for (let i = count - 1; i >= 0; i--) {
    const ts = lastTs - i * 5 * 60 * 1000;
    const variation = (Math.sin(ts / 600000) * 1.5) + (Math.random() - 0.5) * 0.5;
    readings.push({
      roomId,
      temp: Math.round((baseTemp + variation) * 10) / 10,
      timestamp: new Date(ts).toISOString(),
    });
  }
  return readings;
}

/** Reset store — used in tests */
export function _resetDeviceStates(): void {
  deviceStates = mockDeviceStates.map((s) => ({ ...s }));
}
