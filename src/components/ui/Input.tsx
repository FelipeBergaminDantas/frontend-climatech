'use client'

import type { InputHTMLAttributes } from 'react'

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string
  error?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function Input({
  label,
  error,
  id,
  name,
  className = '',
  required,
  ...rest
}: InputProps) {
  const inputId = id ?? name

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={inputId}
          className="min-h-[2.5rem] leading-tight text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
          {required && <span className="ml-1 text-red-500" aria-hidden="true">*</span>}
        </label>
      )}
      <input
        {...rest}
        id={inputId}
        name={name}
        required={required}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className={[
          'block w-full min-w-0 appearance-none rounded-lg border px-3 text-sm h-12 transition-colors duration-150',
          'bg-white text-gray-900 placeholder-gray-400',
          'dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
          error
            ? 'border-red-400 focus-visible:ring-red-400 dark:border-red-500'
            : 'border-gray-300 dark:border-gray-600',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      />
      {error && (
        <p
          id={`${inputId}-error`}
          role="alert"
          className="text-xs text-red-500 dark:text-red-400"
        >
          {error}
        </p>
      )}
    </div>
  )
}
