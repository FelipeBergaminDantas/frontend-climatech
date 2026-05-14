import type { ClimaTechNode, NodeStatus } from '@/types';
import { mockNodes } from './mockData';

let nodes: ClimaTechNode[] = [...mockNodes];

export function getNodes(): ClimaTechNode[] {
  return [...nodes];
}

export function getNodesByRoom(roomId: string): ClimaTechNode[] {
  return nodes.filter(n => n.roomId === roomId);
}

export function updateNodeStatus(id: string, status: NodeStatus): ClimaTechNode {
  const index = nodes.findIndex(n => n.id === id);
  if (index === -1) throw new Error('Node não encontrado.');
  nodes[index] = { ...nodes[index], status, lastSeen: new Date().toISOString() };
  return nodes[index];
}

export function _resetNodes(): void {
  nodes = [...mockNodes];
}
