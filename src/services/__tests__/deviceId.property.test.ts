import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { createRoom, _resetRooms } from '@/services/roomService'

// Arbitary para um deviceId simples (sem caracteres especiais que confundam)
const deviceIdArb = fc.stringMatching(/^[A-Z0-9]{3,10}$/)

// Arbitary para nome de sala válido (2–50 chars)
const roomNameArb = fc.string({ minLength: 2, maxLength: 20 }).map((s) =>
  // garante que não seja só espaços
  s.trim().length >= 2 ? s.trim() : 'Sala ' + s.slice(0, 15)
)

// ── Propriedade 6: deviceId único por usuário ─────────────────────────────────
describe('roomService.createRoom — deviceId único por usuário', () => {
  beforeEach(() => {
    // Reseta o store para um estado limpo antes de cada teste
    _resetRooms([])
  })

  it('rejeita criação de sala com deviceId duplicado para o mesmo usuário', () => {
    fc.assert(
      fc.property(
        deviceIdArb,
        roomNameArb,
        roomNameArb,
        (deviceId, name1, name2) => {
          _resetRooms([])

          // Cria a primeira sala com sucesso
          createRoom({
            userId: 'user-test',
            name: name1.length >= 2 ? name1 : 'Sala A',
            deviceId,
            idealTempMin: 18,
            idealTempMax: 24,
          })

          // Segunda sala com mesmo deviceId deve lançar
          expect(() =>
            createRoom({
              userId: 'user-test',
              name: name2.length >= 2 ? name2 : 'Sala B',
              deviceId,
              idealTempMin: 18,
              idealTempMax: 24,
            })
          ).toThrow()
        }
      ),
      { numRuns: 50 }
    )
  })

  it('permite o mesmo deviceId para usuários diferentes', () => {
    fc.assert(
      fc.property(deviceIdArb, (deviceId) => {
        _resetRooms([])

        expect(() => {
          createRoom({
            userId: 'user-A',
            name: 'Sala A',
            deviceId,
            idealTempMin: 18,
            idealTempMax: 24,
          })
          createRoom({
            userId: 'user-B',
            name: 'Sala B',
            deviceId,
            idealTempMin: 18,
            idealTempMax: 24,
          })
        }).not.toThrow()
      }),
      { numRuns: 50 }
    )
  })

  it('permite deviceIds distintos para o mesmo usuário', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(deviceIdArb, { minLength: 2, maxLength: 5 }),
        (deviceIds) => {
          _resetRooms([])

          expect(() => {
            deviceIds.forEach((deviceId, i) => {
              createRoom({
                userId: 'user-test',
                name: `Sala ${i + 1}`,
                deviceId,
                idealTempMin: 18,
                idealTempMax: 24,
              })
            })
          }).not.toThrow()
        }
      ),
      { numRuns: 50 }
    )
  })
})
