import type { Athlete, AthleteRecord } from "../../types";
import type { LyDoKetThucQuyen } from "../../types/liveQuyen";

export function toAthleteArray(records: AthleteRecord[]): Athlete[] {
  return records.map(({ eventIds, ...rest }) => ({ ...rest, noiDung: [] }));
}

export const LY_DO_LABEL: Record<LyDoKetThucQuyen, string> = {
  hoan_thanh: "Hoàn thành",
  quen_bai: "Quên bài",
  dung_bai: "Dừng bài giữa chừng",
  roi_vu_khi: "Rơi vũ khí",
  chan_thuong: "Chấn thương",
  loi_may: "Mất điện / lỗi máy",
};
