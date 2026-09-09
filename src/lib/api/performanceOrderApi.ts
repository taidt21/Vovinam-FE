import { apiGet } from './api';

export interface PerformanceOrderWire {
  id: string;
  eventId: string;
  athleteId: string | null;
  teamId: string | null;
  thuTu: number;
}

export function fetchPerformanceOrders(): Promise<PerformanceOrderWire[]> {
  return apiGet<PerformanceOrderWire[]>('/performance-orders');
}
