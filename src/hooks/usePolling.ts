'use client'

import { useEffect, useRef } from 'react'

export function usePolling(
  callback: () => void,
  intervalMs: number,
  enabled: boolean
) {
  const callbackRef = useRef(callback)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    if (!enabled || intervalMs <= 0) {
      return
    }

    const timer = window.setInterval(() => {
      callbackRef.current()
    }, intervalMs)

    return () => {
      window.clearInterval(timer)
    }
  }, [enabled, intervalMs])
}
