'use client'

import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

interface DeleteRoomModalProps {
  isOpen: boolean
  roomName: string
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteRoomModal({ isOpen, roomName, onConfirm, onCancel }: DeleteRoomModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="Confirmar exclusão">
      <div className="space-y-5">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Tem certeza que deseja excluir a sala{' '}
          <span className="font-semibold">"{roomName}"</span>? Esta ação não pode ser desfeita.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            Excluir
          </Button>
        </div>
      </div>
    </Modal>
  )
}
