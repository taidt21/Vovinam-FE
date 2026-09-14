export interface EventSummaryMedalItem {
  hang: 1 | 2 | 3;
  label?: string;
  members?: string[];
  sub: string;
  diem?: number;
}

export interface EventSummaryState {
  courtId: string;
  eventId: string;
  eventTen: string;
  loai: 'doi_khang' | 'quyen';
  items: EventSummaryMedalItem[];
  capNhatLuc: number;
}
