import type { IndicatorStatus } from '@/types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates that an email address has a basic valid format.
 * Throws if the format is invalid.
 */
export function validateEmail(email: string): void {
  if (!EMAIL_REGEX.test(email)) {
    throw new Error('E-mail inválido.');
  }
}

/**
 * Returns the visual indicator status for a room based on current temperature
 * vs the target temperature set by the admin.
 *
 * - 'ok'       → |currentTemp - targetTemp| <= 0.5°C
 * - 'warning'  → difference is > 0.5°C and <= 3°C
 * - 'critical' → difference is > 3°C
 *
 * The targetTemp defaults to the center of the ideal range when not manually set.
 */
export function getIndicatorStatus(
  currentTemp: number,
  targetTemp: number
): IndicatorStatus
export function getIndicatorStatus(
  currentTemp: number,
  idealMin: number,
  idealMax: number
): IndicatorStatus
export function getIndicatorStatus(
  currentTemp: number,
  targetOrMin: number,
  idealMax?: number
): IndicatorStatus {
  const targetTemp =
    idealMax === undefined
      ? targetOrMin
      : (targetOrMin + idealMax) / 2

  const diff = Math.abs(currentTemp - targetTemp)
  if (diff <= 0.5) return 'ok'
  if (diff <= 3) return 'warning'
  return 'critical'
}

/**
 * Validates that a target temperature is within the allowed range [16, 30].
 * Throws if the value is outside that range.
 */
export function validateTargetTemp(temp: number): void {
  if (temp < 16 || temp > 30) {
    throw new Error(
      `Temperatura alvo inválida: ${temp}°C. O valor deve estar entre 16°C e 30°C.`
    );
  }
}

/**
 * Validates that a room name has between 2 and 50 characters (inclusive).
 * Throws if the constraint is violated.
 */
export function validateRoomName(name: string): void {
  if (name.length < 2 || name.length > 50) {
    throw new Error(
      'O nome da sala deve ter entre 2 e 50 caracteres.'
    );
  }
}

/**
 * Validates that a password has at least 8 characters and contains
 * both letters and numbers.
 * Throws if the constraint is violated.
 */
export function validatePassword(password: string): void {
  if (password.length < 8) {
    throw new Error('A senha deve ter no mínimo 8 caracteres.');
  }
  if (!/[a-zA-Z]/.test(password)) {
    throw new Error('A senha deve conter pelo menos uma letra.');
  }
  if (!/[0-9]/.test(password)) {
    throw new Error('A senha deve conter pelo menos um número.');
  }
}

/**
 * Validates that a temperature range has min strictly less than max.
 * Throws if min >= max.
 */
export function validateTempRange(min: number, max: number): void {
  if (min >= max) {
    throw new Error(
      'A temperatura mínima deve ser menor que a temperatura máxima.'
    );
  }
}

/**
 * Validates that a schedule has start strictly before end.
 * Both values must be in "HH:MM" format.
 * Throws if start >= end.
 */
export function validateSchedule(start: string, end: string): void {
  const toMinutes = (hhmm: string): number => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  };

  if (toMinutes(start) >= toMinutes(end)) {
    throw new Error(
      'O horário de início deve ser anterior ao horário de fim.'
    );
  }
}

/**
 * Validates that an opacity value is an integer within [0, 100].
 * Throws if the value is outside that range.
 */
export function validateOpacity(value: number): void {
  if (value < 0 || value > 100) {
    throw new Error(
      `Opacidade inválida: ${value}. O valor deve estar entre 0 e 100.`
    );
  }
}
