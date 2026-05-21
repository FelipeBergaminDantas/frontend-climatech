import type { Room } from '@/types';
import { validateRoomName } from '@/utils/validators';

// In-memory store — TODO: Replace with API calls to backend
let rooms: Room[] = [];

export function getRooms(userId: string): Room[] {
  return rooms.filter((r) => r.userId === userId);
}

export function getRoomById(id: string): Room | undefined {
  return rooms.find((r) => r.id === id);
}

export function createRoom(
  data: Omit<Room, 'id' | 'createdAt'>
): Room {
  validateRoomName(data.name);

  const duplicate = rooms.find(
    (r) => r.userId === data.userId && r.deviceId === data.deviceId
  );
  if (duplicate) {
    throw new Error(
      `O identificador de dispositivo "${data.deviceId}" já está associado a outra sala.`
    );
  }

  const newRoom: Room = {
    ...data,
    id: `room-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };

  rooms.push(newRoom);
  return newRoom;
}

export function updateRoom(
  id: string,
  data: Partial<Omit<Room, 'id' | 'userId' | 'createdAt'>>
): Room {
  const index = rooms.findIndex((r) => r.id === id);
  if (index === -1) {
    throw new Error('Sala não encontrada.');
  }

  if (data.name !== undefined) {
    validateRoomName(data.name);
  }

  if (data.deviceId !== undefined) {
    const room = rooms[index];
    const duplicate = rooms.find(
      (r) =>
        r.userId === room.userId &&
        r.deviceId === data.deviceId &&
        r.id !== id
    );
    if (duplicate) {
      throw new Error(
        `O identificador de dispositivo "${data.deviceId}" já está associado a outra sala.`
      );
    }
  }

  rooms[index] = { ...rooms[index], ...data };
  return rooms[index];
}

export function deleteRoom(id: string): void {
  const index = rooms.findIndex((r) => r.id === id);
  if (index === -1) {
    throw new Error('Sala não encontrada.');
  }
  rooms.splice(index, 1);
}

/** Reset store — used in tests */
export function _resetRooms(data: Room[] = []): void {
  rooms = [...data];
}
