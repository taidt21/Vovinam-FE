export interface PortalAthlete {
  id: string;
  hoTen: string;
  namSinh: number;
  gioiTinh: 'nam' | 'nu';
  nhomTuoi: number;
  eventIds: string[];
}

function keyFor(accountId: string): string {
  return `vovinam:portal-athletes:${accountId}`;
}

export function loadAthletes(accountId: string): PortalAthlete[] {
  try {
    const raw = localStorage.getItem(keyFor(accountId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveAthletes(accountId: string, athletes: PortalAthlete[]): void {
  try {
    localStorage.setItem(keyFor(accountId), JSON.stringify(athletes));
  } catch {
    // bỏ qua
  }
}