'use client'

/**
 * Simple in-memory cache service for API responses
 * Prevents duplicate API calls for the same data
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // time-to-live in milliseconds
}

const cache = new Map<string, CacheEntry<any>>()

const DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes

export function cacheSet<T>(key: string, data: T, ttl = DEFAULT_TTL): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
  })
}

export function cacheGet<T>(key: string): T | null {
  const entry = cache.get(key)
  if (!entry) return null

  const isExpired = Date.now() - entry.timestamp > entry.ttl
  if (isExpired) {
    cache.delete(key)
    return null
  }

  return entry.data as T
}

export function cacheClear(): void {
  cache.clear()
}

export function cacheDelete(key: string): void {
  cache.delete(key)
}

/**
 * Wrapper function for async operations with caching
 * @param key - Unique cache key
 * @param fn - Async function to execute
 * @param ttl - Time-to-live in milliseconds
 */
export async function withCache<T>(
  key: string,
  fn: () => Promise<T>,
  ttl = DEFAULT_TTL
): Promise<T> {
  const cached = cacheGet<T>(key)
  if (cached !== null) {
    return cached
  }

  const result = await fn()
  cacheSet(key, result, ttl)
  return result
}

// Cache key builders for different resources
export const cacheKeys = {
  rooms: (clientId: string) => `rooms:${clientId}`,
  acs: (clientId?: string, salaId?: string) => {
    if (salaId) return `acs:sala:${salaId}`
    if (clientId) return `acs:client:${clientId}`
    return 'acs:all'
  },
  automations: (clientId?: string, salaId?: string) => {
    if (salaId) return `automations:sala:${salaId}`
    if (clientId) return `automations:client:${clientId}`
    return 'automations:all'
  },
  clients: 'clients:all',
}
