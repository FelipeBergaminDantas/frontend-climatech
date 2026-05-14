interface ConnectionAlertProps {
  isConnected: boolean
}

export function ConnectionAlert({ isConnected }: ConnectionAlertProps) {
  if (isConnected) return null

  return (
    <div
      role="alert"
      className="flex items-center gap-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-300"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-5 h-5 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
        />
      </svg>
      <span>
        Dados podem estar desatualizados. Verifique sua conexão.
      </span>
    </div>
  )
}
