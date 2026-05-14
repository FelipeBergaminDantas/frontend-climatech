'use client'

import type { AutomationRule } from '@/types'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface RuleListProps {
  rules: AutomationRule[]
  onToggle: (id: string) => void
  onEdit: (rule: AutomationRule) => void
  onDelete: (id: string) => void
}

const actionLabels: Record<AutomationRule['action'], string> = {
  turn_on: 'Ligar',
  turn_off: 'Desligar',
  set_temp: 'Ajustar temperatura',
}

export function RuleList({ rules, onToggle, onEdit, onDelete }: RuleListProps) {
  if (rules.length === 0) {
    return (
      <Card>
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">
          Nenhuma regra cadastrada
        </p>
      </Card>
    )
  }

  return (
    <ul className="space-y-3">
      {rules.map((rule) => (
        <li key={rule.id}>
          <Card>
            <div className="flex items-start justify-between gap-4">
              {/* Info */}
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {rule.name}
                  </span>
                  <span
                    className={[
                      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                      rule.isActive
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
                    ].join(' ')}
                  >
                    {rule.isActive ? 'Ativa' : 'Inativa'}
                  </span>
                </div>

                <p className="text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-medium">Condição:</span>{' '}
                  {rule.conditionType === 'schedule'
                    ? `Horário — ${rule.scheduleStart} às ${rule.scheduleEnd}`
                    : `Temperatura — ${rule.tempMin}°C a ${rule.tempMax}°C`}
                </p>

                <p className="text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-medium">Ação:</span>{' '}
                  {actionLabels[rule.action]}
                  {rule.action === 'set_temp' && rule.targetTemp !== undefined
                    ? ` (${rule.targetTemp}°C)`
                    : ''}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggle(rule.id)}
                  aria-label={rule.isActive ? 'Desativar regra' : 'Ativar regra'}
                  title={rule.isActive ? 'Desativar' : 'Ativar'}
                >
                  {rule.isActive ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(rule)}
                  aria-label="Editar regra"
                  title="Editar"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(rule.id)}
                  aria-label="Excluir regra"
                  title="Excluir"
                  className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </Button>
              </div>
            </div>
          </Card>
        </li>
      ))}
    </ul>
  )
}
