import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  getIndicatorStatus,
  validateTargetTemp,
  validateTempRange,
  validateSchedule,
  validateRoomName,
  validatePassword,
  validateOpacity,
} from '@/utils/validators'

// ── Propriedade 1: getIndicatorStatus reflete corretamente o desvio ──────────
describe('getIndicatorStatus', () => {
  it('retorna "ok" quando currentTemp está dentro do intervalo ideal', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 40 }),
        fc.integer({ min: 0, max: 40 }),
        (a, b) => {
          const [idealMin, idealMax] = a <= b ? [a, b] : [b, a]
          if (idealMin === idealMax) return true // skip degenerate
          const currentTemp = fc.sample(
            fc.integer({ min: idealMin, max: idealMax }),
            1
          )[0]
          return getIndicatorStatus(currentTemp, idealMin, idealMax) === 'ok'
        }
      ),
      { numRuns: 100 }
    )
  })

  it('retorna "warning" quando desvio é ≤ 3°C fora do intervalo', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 35 }),
        fc.integer({ min: 1, max: 3 }),
        fc.boolean(),
        (idealMin, deviation, above) => {
          const idealMax = idealMin + 5
          const currentTemp = above ? idealMax + deviation : idealMin - deviation
          return getIndicatorStatus(currentTemp, idealMin, idealMax) === 'warning'
        }
      ),
      { numRuns: 100 }
    )
  })

  it('retorna "critical" quando desvio é > 3°C fora do intervalo', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 30 }),
        fc.integer({ min: 4, max: 15 }),
        fc.boolean(),
        (idealMin, deviation, above) => {
          const idealMax = idealMin + 5
          const currentTemp = above ? idealMax + deviation : idealMin - deviation
          return getIndicatorStatus(currentTemp, idealMin, idealMax) === 'critical'
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ── Propriedade 2: validateTargetTemp rejeita fora de [16, 30] ───────────────
describe('validateTargetTemp', () => {
  it('não lança para valores dentro de [16, 30]', () => {
    fc.assert(
      fc.property(fc.integer({ min: 16, max: 30 }), (temp) => {
        expect(() => validateTargetTemp(temp)).not.toThrow()
      }),
      { numRuns: 100 }
    )
  })

  it('lança para valores abaixo de 16', () => {
    fc.assert(
      fc.property(fc.integer({ min: -50, max: 15 }), (temp) => {
        expect(() => validateTargetTemp(temp)).toThrow()
      }),
      { numRuns: 100 }
    )
  })

  it('lança para valores acima de 30', () => {
    fc.assert(
      fc.property(fc.integer({ min: 31, max: 100 }), (temp) => {
        expect(() => validateTargetTemp(temp)).toThrow()
      }),
      { numRuns: 100 }
    )
  })
})

// ── Propriedade 3: validateTempRange rejeita quando min >= max ───────────────
describe('validateTempRange', () => {
  it('não lança quando min < max', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -20, max: 50 }),
        fc.integer({ min: 1, max: 20 }),
        (min, delta) => {
          expect(() => validateTempRange(min, min + delta)).not.toThrow()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('lança quando min >= max', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -20, max: 50 }),
        fc.integer({ min: 0, max: 20 }),
        (min, delta) => {
          expect(() => validateTempRange(min + delta, min)).toThrow()
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ── Propriedade 4: validateSchedule rejeita quando start >= end ──────────────
describe('validateSchedule', () => {
  const toHHMM = (minutes: number) => {
    const h = Math.floor(minutes / 60).toString().padStart(2, '0')
    const m = (minutes % 60).toString().padStart(2, '0')
    return `${h}:${m}`
  }

  it('não lança quando start < end', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1438 }),
        fc.integer({ min: 1, max: 60 }),
        (startMin, delta) => {
          const endMin = startMin + delta
          if (endMin > 1439) return true // skip overflow
          expect(() => validateSchedule(toHHMM(startMin), toHHMM(endMin))).not.toThrow()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('lança quando start >= end', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1439 }),
        fc.integer({ min: 0, max: 60 }),
        (endMin, delta) => {
          const startMin = endMin + delta
          if (startMin > 1439) return true // skip overflow
          expect(() => validateSchedule(toHHMM(startMin), toHHMM(endMin))).toThrow()
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ── Propriedade 5: validateRoomName aceita [2, 50] chars ─────────────────────
describe('validateRoomName', () => {
  it('não lança para nomes com 2–50 caracteres', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 2, maxLength: 50 }),
        (name) => {
          expect(() => validateRoomName(name)).not.toThrow()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('lança para nomes com menos de 2 caracteres', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 1 }), (name) => {
        expect(() => validateRoomName(name)).toThrow()
      }),
      { numRuns: 50 }
    )
  })

  it('lança para nomes com mais de 50 caracteres', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 51, maxLength: 100 }), (name) => {
        expect(() => validateRoomName(name)).toThrow()
      }),
      { numRuns: 50 }
    )
  })
})

// ── Propriedade 7: validatePassword exige ≥8 chars com letras e números ──────
describe('validatePassword', () => {
  it('não lança para senhas válidas (≥8 chars, letras + números)', () => {
    // Gera senha com pelo menos 1 letra, 1 número, total ≥ 8
    const validPassword = fc.tuple(
      fc.stringMatching(/[a-zA-Z]{1,10}/),
      fc.stringMatching(/[0-9]{1,10}/),
      fc.string({ minLength: 0, maxLength: 10 })
    ).map(([letters, digits, extra]) => {
      const base = letters + digits + extra
      return base.length >= 8 ? base : base + 'aB3dEfGh'.slice(0, 8 - base.length)
    })

    fc.assert(
      fc.property(validPassword, (pwd) => {
        expect(() => validatePassword(pwd)).not.toThrow()
      }),
      { numRuns: 100 }
    )
  })

  it('lança para senhas com menos de 8 caracteres', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 7 }), (pwd) => {
        expect(() => validatePassword(pwd)).toThrow()
      }),
      { numRuns: 100 }
    )
  })

  it('lança para senhas sem números (apenas letras)', () => {
    // Gera strings com 8–20 chars contendo APENAS letras [a-zA-Z]
    const onlyLetters = fc
      .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')), {
        minLength: 8,
        maxLength: 20,
      })
      .map((chars) => chars.join(''))

    fc.assert(
      fc.property(onlyLetters, (pwd) => {
        expect(() => validatePassword(pwd)).toThrow()
      }),
      { numRuns: 100 }
    )
  })

  it('lança para senhas sem letras (apenas dígitos)', () => {
    // Gera strings com 8–20 chars contendo APENAS dígitos [0-9]
    const onlyDigits = fc
      .array(fc.constantFrom(...'0123456789'.split('')), {
        minLength: 8,
        maxLength: 20,
      })
      .map((chars) => chars.join(''))

    fc.assert(
      fc.property(onlyDigits, (pwd) => {
        expect(() => validatePassword(pwd)).toThrow()
      }),
      { numRuns: 100 }
    )
  })
})

// ── Propriedade 9: validateOpacity aceita apenas [0, 100] ────────────────────
describe('validateOpacity', () => {
  it('não lança para valores dentro de [0, 100]', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100 }), (value) => {
        expect(() => validateOpacity(value)).not.toThrow()
      }),
      { numRuns: 100 }
    )
  })

  it('lança para valores negativos', () => {
    fc.assert(
      fc.property(fc.integer({ min: -1000, max: -1 }), (value) => {
        expect(() => validateOpacity(value)).toThrow()
      }),
      { numRuns: 100 }
    )
  })

  it('lança para valores acima de 100', () => {
    fc.assert(
      fc.property(fc.integer({ min: 101, max: 1000 }), (value) => {
        expect(() => validateOpacity(value)).toThrow()
      }),
      { numRuns: 100 }
    )
  })
})
