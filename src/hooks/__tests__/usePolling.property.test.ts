import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import * as fc from 'fast-check'
import { usePolling } from '@/hooks/usePolling'

// ── Propriedade 10: polling atualiza dados sem remontar o componente raiz ─────

describe('usePolling', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('chama o callback N vezes após N intervalos sem remontar o hook', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),   // número de ticks
        fc.integer({ min: 100, max: 5000 }), // intervalo em ms
        (ticks, intervalMs) => {
          const callback = vi.fn()

          const { unmount } = renderHook(() =>
            usePolling(callback, intervalMs, true)
          )

          act(() => {
            vi.advanceTimersByTime(intervalMs * ticks)
          })

          expect(callback).toHaveBeenCalledTimes(ticks)

          // Cleanup sem erro — hook não remontou
          unmount()
          callback.mockReset()
        }
      ),
      { numRuns: 30 }
    )
  })

  it('não chama o callback quando enabled=false', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 100, max: 2000 }),
        (ticks, intervalMs) => {
          const callback = vi.fn()

          const { unmount } = renderHook(() =>
            usePolling(callback, intervalMs, false)
          )

          act(() => {
            vi.advanceTimersByTime(intervalMs * ticks)
          })

          expect(callback).not.toHaveBeenCalled()
          unmount()
          callback.mockReset()
        }
      ),
      { numRuns: 30 }
    )
  })

  it('para de chamar o callback após unmount (sem memory leak)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 1000 }),
        (intervalMs) => {
          const callback = vi.fn()

          const { unmount } = renderHook(() =>
            usePolling(callback, intervalMs, true)
          )

          act(() => {
            vi.advanceTimersByTime(intervalMs * 2)
          })

          const callsBefore = callback.mock.calls.length
          unmount()

          act(() => {
            vi.advanceTimersByTime(intervalMs * 5)
          })

          // Após unmount, nenhuma chamada adicional
          expect(callback.mock.calls.length).toBe(callsBefore)
          callback.mockReset()
        }
      ),
      { numRuns: 30 }
    )
  })

  it('usa sempre o callback mais recente sem recriar o intervalo', () => {
    const first = vi.fn()
    const second = vi.fn()
    let callbackToUse = first

    const { rerender, unmount } = renderHook(() =>
      usePolling(() => callbackToUse(), 500, true)
    )

    act(() => { vi.advanceTimersByTime(500) })
    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(0)

    // Troca o callback sem remontar
    callbackToUse = second
    rerender()

    act(() => { vi.advanceTimersByTime(500) })
    expect(second).toHaveBeenCalledTimes(1)
    // first não foi chamado novamente
    expect(first).toHaveBeenCalledTimes(1)

    unmount()
  })
})
