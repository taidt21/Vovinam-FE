export interface PortalSquad {
  id: string;
  eventId: string;
  ten: string;
  athleteIds: string[];
}

function keyFor(accountId: string): string {
  return `vovinam:portal-squads:${accountId}`;
}

export function loadSquads(accountId: string): PortalSquad[] {
  try {
    const raw = localStorage.getItem(keyFor(accountId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSquads(accountId: string, squads: PortalSquad[]): void {
  try {
    localStorage.setItem(keyFor(accountId), JSON.stringify(squads));
  } catch {
    // bỏ qua
  }
}