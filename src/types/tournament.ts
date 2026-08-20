export interface Tournament {
  id: string;
  ten: string;
  soSan: number;
  choPhepHiepPhu: boolean;
}

export interface Team {
  id: string;
  tournamentId: string;
  ten: string;
}

export interface Court {
  id: string;
  tournamentId: string;
  ten: string;
}