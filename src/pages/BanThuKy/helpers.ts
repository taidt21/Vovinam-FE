import { Swords, BicepsFlexed, Users } from "lucide-react";
import type { LiveMatchState, LyDoKetThuc, Match } from "../../types";
import type { LyDoKetThucQuyen } from "../../types/liveQuyen";
import { serverNow } from "../../lib/realtime/serverClock";
import type { QuyenItem } from "./types";
import type { QuyenJudgeScoreWire } from "../../lib/api/quyenJudgeScoreApi";

export const LY_DO_OPTIONS: { value: LyDoKetThuc; label: string }[] = [
  { value: "thang_diem", label: "Thắng điểm" },
  { value: "diem_vang", label: "Điểm vàng" },
  { value: "boc_tham", label: "Bốc thăm" },
  { value: "can_hang_can", label: "Cân hạng cân" },
  { value: "bo_cuoc", label: "Bỏ cuộc" },
  { value: "xu_thua_canh_cao", label: "Xử thua do đủ 3 cảnh cáo" },
  { value: "cach_biet_10_diem", label: "Thắng cách biệt 10 điểm" },
];

export const LY_DO_KET_THUC_QUYEN_OPTIONS: {
  value: LyDoKetThucQuyen;
  label: string;
}[] = [
  { value: "hoan_thanh", label: "Hoàn thành bình thường" },
  { value: "quen_bai", label: "Quên bài" },
  { value: "dung_bai", label: "Dừng bài giữa chừng" },
  { value: "roi_vu_khi", label: "Rơi vũ khí" },
  { value: "chan_thuong", label: "Chấn thương" },
  { value: "loi_may", label: "Mất điện / lỗi máy" },
];
export const LY_DO_KET_THUC_QUYEN_LABEL: Record<LyDoKetThucQuyen, string> =
  Object.fromEntries(
    LY_DO_KET_THUC_QUYEN_OPTIONS.map((o) => [o.value, o.label]),
  ) as Record<LyDoKetThucQuyen, string>;

export const DEFAULT_TONG_SO_HIEP = 2;
export const DEFAULT_THOI_GIAN_HIEP = 60;
export const DEFAULT_THOI_GIAN_NGHI = 30;
const DEFAULT_SO_TRONG_TAI = 5;

export function quyenKeyOf(
  eventId: string,
  athleteId: string | null,
  teamId: string | null,
): string {
  return `${eventId}::${athleteId ?? ""}::${teamId ?? ""}`;
}

export function scoreMatchesQuyenItem(
  s: QuyenJudgeScoreWire,
  item: Pick<QuyenItem, "event" | "athleteId" | "teamId">,
): boolean {
  return (
    s.eventId === item.event.id &&
    s.athleteId === item.athleteId &&
    s.teamId === item.teamId
  );
}

export function makeLiveState(
  courtId: string,
  eventTen: string,
  match: Match,
  tenDo: string,
  donViDo: string,
  anhDo: string | null,
  tenXanh: string,
  donViXanh: string,
  anhXanh: string | null,
): LiveMatchState {
  return {
    matchId: match.id,
    courtId,
    tenNoiDung: eventTen,
    vong: match.vong,
    tenDo,
    donViDo,
    anhDo,
    tenXanh,
    donViXanh,
    anhXanh,
    trangThai: "cho_bat_dau",
    hiepHienTai: 0,
    tongSoHiep: DEFAULT_TONG_SO_HIEP,
    thoiGianHiepGiay: DEFAULT_THOI_GIAN_HIEP,
    thoiGianNghiGiay: DEFAULT_THOI_GIAN_NGHI,
    thoiGianConLaiGiay: DEFAULT_THOI_GIAN_HIEP,
    capNhatDongHoLuc: serverNow(),
    hetHiepLuc: 0,
    soTrongTaiCanCo: DEFAULT_SO_TRONG_TAI,
    diemChinhThucDo: 0,
    diemChinhThucXanh: 0,
    diemDaChinhTay: false,
    nhacNhoDo: 0,
    nhacNhoXanh: 0,
    soCanhCaoDo: 0,
    soCanhCaoXanh: 0,
    soCanhCaoHiepDo: 0,
    soCanhCaoHiepXanh: 0,
    nguoiThang: null,
    capNhatLuc: Date.now(),
  };
}

export const TABS = [
  { id: "lich_dk", label: "Lịch thi đấu đối kháng", icon: Swords },
  { id: "lich_quyen", label: "Lịch thi đấu quyền", icon: BicepsFlexed },
  { id: "dieu_hanh_dk", label: "Điều hành đối kháng", icon: Swords },
  { id: "dieu_hanh_quyen", label: "Điều hành quyền", icon: BicepsFlexed },
  { id: "trong_tai", label: "Trọng tài", icon: Users },
] as const;
export type TabId = (typeof TABS)[number]["id"];
