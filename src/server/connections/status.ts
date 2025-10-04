import type { ConnectionStatus } from '../../lib/types/connections';

// Чем "хуже" статус, тем выше приоритет
const PRIORITY: Record<ConnectionStatus, number> = {
    disconnected: 6,
    error: 5,
    needs_reauth: 4,
    syncing: 3,
    connected: 2,
    not_connected: 1,
};

export function aggregateStatus(statuses: ConnectionStatus[]): ConnectionStatus {
  if (!statuses.length) return 'not_connected';
  return statuses.sort((a, b) => PRIORITY[b] - PRIORITY[a])[0];
}
