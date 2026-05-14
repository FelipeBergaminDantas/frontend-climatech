import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import type { ThemePreferences } from '@/types'

// ── Helpers que replicam a lógica de persistência do ThemeContext ─────────────
// (testamos a lógica pura de serialização/deserialização, sem DOM)

const STORAGE_KEY = 'climatech-theme'

function savePreferences(prefs: ThemePreferences, store: Map<string, string>): void {
  store.set(STORAGE_KEY, JSON.stringify(prefs))
}

function loadPreferences(store: Map<string, string>): ThemePreferences | null {
  const raw = store.get(STORAGE_KEY)
  if (!raw) return null
  return JSON.parse(raw) as ThemePreferences
}

// ── Arbitraries ───────────────────────────────────────────────────────────────

const hexColorArb = fc
  .tuple(
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 })
  )
  .map(([r, g, b]) => `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`)

const themePrefsArb: fc.Arbitrary<ThemePreferences> = fc.record({
  mode: fc.constantFrom('light', 'dark') as fc.Arbitrary<'light' | 'dark'>,
  backgroundColor: hexColorArb,
  backgroundOpacity: fc.integer({ min: 0, max: 100 }),
})

// ── Propriedade 8: round-trip de savePreferences / loadPreferences ────────────
describe('ThemeContext — persistência de preferências (round-trip)', () => {
  let store: Map<string, string>

  beforeEach(() => {
    store = new Map()
  })

  it('loadPreferences retorna exatamente o que foi salvo por savePreferences', () => {
    fc.assert(
      fc.property(themePrefsArb, (prefs) => {
        savePreferences(prefs, store)
        const loaded = loadPreferences(store)

        expect(loaded).not.toBeNull()
        expect(loaded!.mode).toBe(prefs.mode)
        expect(loaded!.backgroundColor).toBe(prefs.backgroundColor)
        expect(loaded!.backgroundOpacity).toBe(prefs.backgroundOpacity)
      }),
      { numRuns: 100 }
    )
  })

  it('salvar duas vezes mantém apenas o último valor', () => {
    fc.assert(
      fc.property(themePrefsArb, themePrefsArb, (first, second) => {
        savePreferences(first, store)
        savePreferences(second, store)
        const loaded = loadPreferences(store)

        expect(loaded!.mode).toBe(second.mode)
        expect(loaded!.backgroundColor).toBe(second.backgroundColor)
        expect(loaded!.backgroundOpacity).toBe(second.backgroundOpacity)
      }),
      { numRuns: 100 }
    )
  })

  it('loadPreferences retorna null quando nada foi salvo', () => {
    expect(loadPreferences(store)).toBeNull()
  })

  it('mode é sempre "light" ou "dark" após round-trip', () => {
    fc.assert(
      fc.property(themePrefsArb, (prefs) => {
        savePreferences(prefs, store)
        const loaded = loadPreferences(store)!
        expect(['light', 'dark']).toContain(loaded.mode)
      }),
      { numRuns: 100 }
    )
  })

  it('backgroundOpacity está sempre em [0, 100] após round-trip', () => {
    fc.assert(
      fc.property(themePrefsArb, (prefs) => {
        savePreferences(prefs, store)
        const loaded = loadPreferences(store)!
        expect(loaded.backgroundOpacity).toBeGreaterThanOrEqual(0)
        expect(loaded.backgroundOpacity).toBeLessThanOrEqual(100)
      }),
      { numRuns: 100 }
    )
  })
})
