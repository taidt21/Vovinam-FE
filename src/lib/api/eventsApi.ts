import type { CompetitionEvent } from '../../types';
import { apiGet, apiPost, apiPut } from './api';
import { nhomTuoiFromWire, nhomTuoiToWire } from '../utils/nhomTuoi';

export async function fetchEvents(): Promise<CompetitionEvent[]> {
  const raw = await apiGet<CompetitionEvent[]>('/events');
  return raw.map((e) => ({ ...e, nhomTuoi: nhomTuoiFromWire(e.nhomTuoi as number) }));
}

function toWireBody(ev: Omit<CompetitionEvent, 'id' | 'tournamentId'>) {
  return { ...ev, nhomTuoi: nhomTuoiToWire(ev.nhomTuoi) };
}

export async function createEvent(ev: Omit<CompetitionEvent, 'id' | 'tournamentId'>): Promise<CompetitionEvent> {
  const created = await apiPost<CompetitionEvent>('/events', toWireBody(ev));
  return { ...created, nhomTuoi: nhomTuoiFromWire(created.nhomTuoi as number) };
}

export async function updateEvent(id: string, ev: Omit<CompetitionEvent, 'id' | 'tournamentId'>): Promise<void> {
  await apiPut(`/events/${id}`, toWireBody(ev));
}