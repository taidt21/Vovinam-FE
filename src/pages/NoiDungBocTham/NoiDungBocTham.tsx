/** @format */

import { useMemo, useState } from "react";
import { Shuffle } from "lucide-react";
import type { Athlete, CompetitionEvent, Match } from "../../types";
import { generateBracket } from "../../lib/bracket";
import BracketView from "../../components/BracketView/BracketView";
import styles from "./NoiDungBocTham.module.scss";

const HO_POOL = [
  "Nguyễn",
  "Trần",
  "Lê",
  "Phạm",
  "Hoàng",
  "Huỳnh",
  "Phan",
  "Vũ",
  "Đặng",
  "Bùi",
  "Đỗ",
  "Hồ",
  "Ngô",
  "Dương",
  "Lý",
  "Đinh",
  "Trịnh",
  "Đoàn",
  "Vương",
  "Lương",
];
const DEM_POOL = [
  "Văn",
  "Đức",
  "Minh",
  "Quang",
  "Hữu",
  "Công",
  "Xuân",
  "Thành",
  "Tuấn",
  "Anh",
];
const TEN_POOL = [
  "Khang",
  "Bảo",
  "Huy",
  "Nam",
  "Tài",
  "Vượng",
  "Long",
  "Hùng",
  "Phong",
  "Đạt",
  "Kiệt",
  "Sơn",
  "Việt",
  "Trung",
  "Thắng",
  "Khoa",
  "Phát",
  "Bách",
  "Đăng",
  "Quốc",
  "An",
  "Thịnh",
  "Dũng",
  "Hải",
];

function genName(seed: number): string {
  const ho = HO_POOL[seed % HO_POOL.length];
  const dem = DEM_POOL[(seed * 7 + 3) % DEM_POOL.length];
  const ten = TEN_POOL[(seed * 13 + 5) % TEN_POOL.length];
  return `${ho} ${dem} ${ten}`;
}

const TEAM_IDS = ["t1", "t2", "t3", "t4", "t5"];

// startIdx dùng chung 1 dải số toàn cục (0-74) qua các nội dung sinh tự
// động, để không nội dung nào bị trùng tên với nội dung khác.
function genDoiKhangAthletes(
  startIdx: number,
  count: number,
  eventName: string,
  nhomTuoi: string,
  namSinh: number,
): Athlete[] {
  return Array.from({ length: count }, (_, i) => {
    const seed = startIdx + i;
    return {
      id: `hc${seed}`,
      hoTen: genName(seed),
      namSinh,
      gioiTinh: "nam" as const,
      nhomTuoi,
      teamId: TEAM_IDS[seed % TEAM_IDS.length],
      noiDung: [eventName],
    };
  });
}

// Sinh nhanh VĐV giả để test quy mô lớn — không cần gõ tay từng tên thật.
function makeTestAthletes(
  prefix: string,
  count: number,
  teamIds: string[],
): Athlete[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}${i + 1}`,
    hoTen: `VĐV thử ${i + 1}`,
    namSinh: 2008,
    gioiTinh: "nam" as const,
    nhomTuoi: "Nhóm tuổi 2",
    teamId: teamIds[i % teamIds.length],
    noiDung: [`Đối kháng nam - test ${count} người`],
  }));
}

const SEED_EVENTS: CompetitionEvent[] = [
  {
    id: "e1",
    tournamentId: "demo",
    ten: "Đối kháng nam - 54kg",
    loai: "doi_khang",
    gioiTinh: "nam",
    nhomTuoi: "Nhóm tuổi 2",
    hangCanHoacBaiQuyen: "54kg",
    soTrongTai: 5,
    congThucTinhDiem: "10 điểm/trận",
  },
  {
    id: "e2",
    tournamentId: "demo",
    ten: "Đối kháng nam - 60kg",
    loai: "doi_khang",
    gioiTinh: "nam",
    nhomTuoi: "Nhóm tuổi 2",
    hangCanHoacBaiQuyen: "60kg",
    soTrongTai: 5,
    congThucTinhDiem: "10 điểm/trận",
  },
  {
    id: "e3",
    tournamentId: "demo",
    ten: "Đối kháng nam - 67kg",
    loai: "doi_khang",
    gioiTinh: "nam",
    nhomTuoi: "Nhóm tuổi 3",
    hangCanHoacBaiQuyen: "67kg",
    soTrongTai: 5,
    congThucTinhDiem: "10 điểm/trận",
  },
  {
    id: "e4",
    tournamentId: "demo",
    ten: "Đối kháng nữ - 48kg",
    loai: "doi_khang",
    gioiTinh: "nu",
    nhomTuoi: "Nhóm tuổi 2",
    hangCanHoacBaiQuyen: "48kg",
    soTrongTai: 5,
    congThucTinhDiem: "10 điểm/trận",
  },
  {
    id: "e5",
    tournamentId: "demo",
    ten: "Đối kháng nữ - 52kg",
    loai: "doi_khang",
    gioiTinh: "nu",
    nhomTuoi: "Nhóm tuổi 3",
    hangCanHoacBaiQuyen: "52kg",
    soTrongTai: 5,
    congThucTinhDiem: "10 điểm/trận",
  },
  {
    id: "e6",
    tournamentId: "demo",
    ten: "Quyền cá nhân nam",
    loai: "quyen",
    gioiTinh: "nam",
    nhomTuoi: "Nhóm tuổi 1",
    hangCanHoacBaiQuyen: "Long hổ quyền",
    soTrongTai: 5,
    congThucTinhDiem: "Trung bình, bỏ cao/thấp nhất",
  },
  {
    id: "e7",
    tournamentId: "demo",
    ten: "Quyền cá nhân nữ",
    loai: "quyen",
    gioiTinh: "nu",
    nhomTuoi: "Nhóm tuổi 1",
    hangCanHoacBaiQuyen: "Nhập môn quyền",
    soTrongTai: 5,
    congThucTinhDiem: "Trung bình, bỏ cao/thấp nhất",
  },
  {
    id: "e8",
    tournamentId: "demo",
    ten: "Song luyện nam",
    loai: "quyen",
    gioiTinh: "nam",
    nhomTuoi: "Nhóm tuổi 2",
    hangCanHoacBaiQuyen: "Song luyện căn bản",
    soTrongTai: 5,
    congThucTinhDiem: "Trung bình, bỏ cao/thấp nhất",
  },
  {
    id: "e9",
    tournamentId: "demo",
    ten: "Đối kháng nữ - 60kg",
    loai: "doi_khang",
    gioiTinh: "nu",
    nhomTuoi: "Nhóm tuổi 3",
    hangCanHoacBaiQuyen: "60kg",
    soTrongTai: 5,
    congThucTinhDiem: "10 điểm/trận",
  },
  {
    id: "e10",
    tournamentId: "demo",
    ten: "Đối kháng nam - test 15 người",
    loai: "doi_khang",
    gioiTinh: "nam",
    nhomTuoi: "Nhóm tuổi 2",
    hangCanHoacBaiQuyen: "test",
    soTrongTai: 5,
    congThucTinhDiem: "10 điểm/trận",
  },
  {
    id: "e11",
    tournamentId: "demo",
    ten: "Đối kháng nam - test 30 người",
    loai: "doi_khang",
    gioiTinh: "nam",
    nhomTuoi: "Nhóm tuổi 2",
    hangCanHoacBaiQuyen: "test",
    soTrongTai: 5,
    congThucTinhDiem: "10 điểm/trận",
  },
  {
    id: "e12",
    tournamentId: "demo",
    ten: "Đối kháng nam - 25kg",
    loai: "doi_khang",
    gioiTinh: "nam",
    nhomTuoi: "Nhóm tuổi 1",
    hangCanHoacBaiQuyen: "25kg",
    soTrongTai: 5,
    congThucTinhDiem: "10 điểm/trận",
  },
  {
    id: "e13",
    tournamentId: "demo",
    ten: "Đối kháng nam - 30kg",
    loai: "doi_khang",
    gioiTinh: "nam",
    nhomTuoi: "Nhóm tuổi 1",
    hangCanHoacBaiQuyen: "30kg",
    soTrongTai: 5,
    congThucTinhDiem: "10 điểm/trận",
  },
  {
    id: "e14",
    tournamentId: "demo",
    ten: "Đối kháng nam - 35kg",
    loai: "doi_khang",
    gioiTinh: "nam",
    nhomTuoi: "Nhóm tuổi 1",
    hangCanHoacBaiQuyen: "35kg",
    soTrongTai: 5,
    congThucTinhDiem: "10 điểm/trận",
  },
  {
    id: "e15",
    tournamentId: "demo",
    ten: "Đối kháng nam - 40kg",
    loai: "doi_khang",
    gioiTinh: "nam",
    nhomTuoi: "Nhóm tuổi 2",
    hangCanHoacBaiQuyen: "40kg",
    soTrongTai: 5,
    congThucTinhDiem: "10 điểm/trận",
  },
  {
    id: "e16",
    tournamentId: "demo",
    ten: "Đối kháng nam - 45kg",
    loai: "doi_khang",
    gioiTinh: "nam",
    nhomTuoi: "Nhóm tuổi 2",
    hangCanHoacBaiQuyen: "45kg",
    soTrongTai: 5,
    congThucTinhDiem: "10 điểm/trận",
  },
  {
    id: "e17",
    tournamentId: "demo",
    ten: "Đối kháng nam - 50kg",
    loai: "doi_khang",
    gioiTinh: "nam",
    nhomTuoi: "Nhóm tuổi 2",
    hangCanHoacBaiQuyen: "50kg",
    soTrongTai: 5,
    congThucTinhDiem: "10 điểm/trận",
  },
  {
    id: "e18",
    tournamentId: "demo",
    ten: "Đối kháng nam - 55kg",
    loai: "doi_khang",
    gioiTinh: "nam",
    nhomTuoi: "Nhóm tuổi 3",
    hangCanHoacBaiQuyen: "55kg",
    soTrongTai: 5,
    congThucTinhDiem: "10 điểm/trận",
  },
  {
    id: "e19",
    tournamentId: "demo",
    ten: "Đối kháng nam - 60kg (nhóm 3)",
    loai: "doi_khang",
    gioiTinh: "nam",
    nhomTuoi: "Nhóm tuổi 3",
    hangCanHoacBaiQuyen: "60kg",
    soTrongTai: 5,
    congThucTinhDiem: "10 điểm/trận",
  },
  {
    id: "e20",
    tournamentId: "demo",
    ten: "Đối kháng nam - 65kg",
    loai: "doi_khang",
    gioiTinh: "nam",
    nhomTuoi: "Nhóm tuổi 3",
    hangCanHoacBaiQuyen: "65kg",
    soTrongTai: 5,
    congThucTinhDiem: "10 điểm/trận",
  },
  {
    id: "e21",
    tournamentId: "demo",
    ten: "Đối kháng nam - 70kg",
    loai: "doi_khang",
    gioiTinh: "nam",
    nhomTuoi: "Nhóm tuổi 3",
    hangCanHoacBaiQuyen: "70kg",
    soTrongTai: 5,
    congThucTinhDiem: "10 điểm/trận",
  },
  {
    id: "e22",
    tournamentId: "demo",
    ten: "Quyền đồng đội nam",
    loai: "quyen",
    gioiTinh: "nam",
    nhomTuoi: "Nhóm tuổi 2",
    hangCanHoacBaiQuyen: "Long hổ quyền (đồng đội)",
    soTrongTai: 5,
    congThucTinhDiem: "Trung bình, bỏ cao/thấp nhất",
  },
];

// VĐV mẫu riêng cho màn này — chưa nối chung với dữ liệu Đoàn & VĐV thật,
// sẽ dùng chung 1 nguồn khi có API ở bước 4.
// e1(5) e2(7) e3(8) e4(6) e5(1) e6(4,quyền) e7(3,quyền) e8(2,quyền)
// e9(3, đối chiếu ảnh mẫu xuongca) e10(15) e11(30) e12..e21 (3..12, 10 hạng cân)
const SEED_ATHLETES_BY_EVENT: Record<string, Athlete[]> = {
  e1: [
    {
      id: "x1",
      hoTen: "Nguyễn Minh Khang",
      namSinh: 2008,
      gioiTinh: "nam",
      nhomTuoi: "Nhóm tuổi 2",
      teamId: "t1",
      noiDung: ["Đối kháng nam - 54kg"],
    },
    {
      id: "x2",
      hoTen: "Lê Gia Huy",
      namSinh: 2009,
      gioiTinh: "nam",
      nhomTuoi: "Nhóm tuổi 1",
      teamId: "t2",
      noiDung: ["Đối kháng nam - 54kg"],
    },
    {
      id: "x3",
      hoTen: "Trần Nhật Nam",
      namSinh: 2008,
      gioiTinh: "nam",
      nhomTuoi: "Nhóm tuổi 2",
      teamId: "t3",
      noiDung: ["Đối kháng nam - 54kg"],
    },
    {
      id: "x4",
      hoTen: "Bùi Anh Dương",
      namSinh: 2008,
      gioiTinh: "nam",
      nhomTuoi: "Nhóm tuổi 2",
      teamId: "t1",
      noiDung: ["Đối kháng nam - 54kg"],
    },
    {
      id: "x5",
      hoTen: "Đỗ Hoàng Anh",
      namSinh: 2009,
      gioiTinh: "nam",
      nhomTuoi: "Nhóm tuổi 1",
      teamId: "t2",
      noiDung: ["Đối kháng nam - 54kg"],
    },
  ],
  e2: [
    {
      id: "x6",
      hoTen: "Phạm Quang Huy",
      namSinh: 2008,
      gioiTinh: "nam",
      nhomTuoi: "Nhóm tuổi 2",
      teamId: "t1",
      noiDung: ["Đối kháng nam - 60kg"],
    },
    {
      id: "x7",
      hoTen: "Ngô Đức Thắng",
      namSinh: 2009,
      gioiTinh: "nam",
      nhomTuoi: "Nhóm tuổi 2",
      teamId: "t2",
      noiDung: ["Đối kháng nam - 60kg"],
    },
    {
      id: "x8",
      hoTen: "Vũ Minh Tuấn",
      namSinh: 2008,
      gioiTinh: "nam",
      nhomTuoi: "Nhóm tuổi 2",
      teamId: "t3",
      noiDung: ["Đối kháng nam - 60kg"],
    },
    {
      id: "x9",
      hoTen: "Hoàng Văn Long",
      namSinh: 2008,
      gioiTinh: "nam",
      nhomTuoi: "Nhóm tuổi 2",
      teamId: "t4",
      noiDung: ["Đối kháng nam - 60kg"],
    },
    {
      id: "x10",
      hoTen: "Lý Anh Kiệt",
      namSinh: 2009,
      gioiTinh: "nam",
      nhomTuoi: "Nhóm tuổi 1",
      teamId: "t1",
      noiDung: ["Đối kháng nam - 60kg"],
    },
    {
      id: "x11",
      hoTen: "Đinh Công Sơn",
      namSinh: 2008,
      gioiTinh: "nam",
      nhomTuoi: "Nhóm tuổi 2",
      teamId: "t2",
      noiDung: ["Đối kháng nam - 60kg"],
    },
    {
      id: "x12",
      hoTen: "Trịnh Bảo Long",
      namSinh: 2009,
      gioiTinh: "nam",
      nhomTuoi: "Nhóm tuổi 1",
      teamId: "t5",
      noiDung: ["Đối kháng nam - 60kg"],
    },
  ],
  e3: [
    {
      id: "x13",
      hoTen: "Nguyễn Hữu Phát",
      namSinh: 2008,
      gioiTinh: "nam",
      nhomTuoi: "Nhóm tuổi 3",
      teamId: "t1",
      noiDung: ["Đối kháng nam - 67kg"],
    },
    {
      id: "x14",
      hoTen: "Trần Đăng Khoa",
      namSinh: 2009,
      gioiTinh: "nam",
      nhomTuoi: "Nhóm tuổi 3",
      teamId: "t2",
      noiDung: ["Đối kháng nam - 67kg"],
    },
    {
      id: "x15",
      hoTen: "Lê Xuân Bách",
      namSinh: 2008,
      gioiTinh: "nam",
      nhomTuoi: "Nhóm tuổi 3",
      teamId: "t3",
      noiDung: ["Đối kháng nam - 67kg"],
    },
    {
      id: "x16",
      hoTen: "Phan Nhật Minh",
      namSinh: 2008,
      gioiTinh: "nam",
      nhomTuoi: "Nhóm tuổi 3",
      teamId: "t4",
      noiDung: ["Đối kháng nam - 67kg"],
    },
    {
      id: "x17",
      hoTen: "Võ Thành Đạt",
      namSinh: 2009,
      gioiTinh: "nam",
      nhomTuoi: "Nhóm tuổi 3",
      teamId: "t5",
      noiDung: ["Đối kháng nam - 67kg"],
    },
    {
      id: "x18",
      hoTen: "Đặng Quốc Việt",
      namSinh: 2008,
      gioiTinh: "nam",
      nhomTuoi: "Nhóm tuổi 3",
      teamId: "t1",
      noiDung: ["Đối kháng nam - 67kg"],
    },
    {
      id: "x19",
      hoTen: "Bùi Tuấn Kiệt",
      namSinh: 2009,
      gioiTinh: "nam",
      nhomTuoi: "Nhóm tuổi 3",
      teamId: "t2",
      noiDung: ["Đối kháng nam - 67kg"],
    },
    {
      id: "x20",
      hoTen: "Hồ Gia Bảo",
      namSinh: 2008,
      gioiTinh: "nam",
      nhomTuoi: "Nhóm tuổi 3",
      teamId: "t3",
      noiDung: ["Đối kháng nam - 67kg"],
    },
  ],
  e4: [
    {
      id: "x21",
      hoTen: "Nguyễn Thị Hồng Nhung",
      namSinh: 2008,
      gioiTinh: "nu",
      nhomTuoi: "Nhóm tuổi 2",
      teamId: "t1",
      noiDung: ["Đối kháng nữ - 48kg"],
    },
    {
      id: "x22",
      hoTen: "Trần Thị Kim Ngân",
      namSinh: 2009,
      gioiTinh: "nu",
      nhomTuoi: "Nhóm tuổi 2",
      teamId: "t2",
      noiDung: ["Đối kháng nữ - 48kg"],
    },
    {
      id: "x23",
      hoTen: "Lê Thị Bích Trâm",
      namSinh: 2008,
      gioiTinh: "nu",
      nhomTuoi: "Nhóm tuổi 2",
      teamId: "t3",
      noiDung: ["Đối kháng nữ - 48kg"],
    },
    {
      id: "x24",
      hoTen: "Phạm Thị Thu Hà",
      namSinh: 2009,
      gioiTinh: "nu",
      nhomTuoi: "Nhóm tuổi 2",
      teamId: "t4",
      noiDung: ["Đối kháng nữ - 48kg"],
    },
    {
      id: "x25",
      hoTen: "Hoàng Thị Mai Anh",
      namSinh: 2008,
      gioiTinh: "nu",
      nhomTuoi: "Nhóm tuổi 2",
      teamId: "t1",
      noiDung: ["Đối kháng nữ - 48kg"],
    },
    {
      id: "x26",
      hoTen: "Đỗ Thị Ngọc Ánh",
      namSinh: 2009,
      gioiTinh: "nu",
      nhomTuoi: "Nhóm tuổi 2",
      teamId: "t5",
      noiDung: ["Đối kháng nữ - 48kg"],
    },
  ],
  e5: [
    {
      id: "x27",
      hoTen: "Vương Thị Kiều Trang",
      namSinh: 2008,
      gioiTinh: "nu",
      nhomTuoi: "Nhóm tuổi 3",
      teamId: "t2",
      noiDung: ["Đối kháng nữ - 52kg"],
    },
  ],
  e6: [
    {
      id: "x28",
      hoTen: "Nguyễn Đình Phong",
      namSinh: 2010,
      gioiTinh: "nam",
      nhomTuoi: "Nhóm tuổi 1",
      teamId: "t1",
      noiDung: ["Quyền cá nhân nam"],
    },
    {
      id: "x29",
      hoTen: "Lê Công Danh",
      namSinh: 2010,
      gioiTinh: "nam",
      nhomTuoi: "Nhóm tuổi 1",
      teamId: "t2",
      noiDung: ["Quyền cá nhân nam"],
    },
    {
      id: "x30",
      hoTen: "Phạm Tuấn Anh",
      namSinh: 2011,
      gioiTinh: "nam",
      nhomTuoi: "Nhóm tuổi 1",
      teamId: "t3",
      noiDung: ["Quyền cá nhân nam"],
    },
    {
      id: "x31",
      hoTen: "Vũ Đức Huy",
      namSinh: 2010,
      gioiTinh: "nam",
      nhomTuoi: "Nhóm tuổi 1",
      teamId: "t4",
      noiDung: ["Quyền cá nhân nam"],
    },
  ],
  e7: [
    {
      id: "x32",
      hoTen: "Nguyễn Ngọc Bích",
      namSinh: 2010,
      gioiTinh: "nu",
      nhomTuoi: "Nhóm tuổi 1",
      teamId: "t1",
      noiDung: ["Quyền cá nhân nữ"],
    },
    {
      id: "x33",
      hoTen: "Trần Khánh Linh",
      namSinh: 2011,
      gioiTinh: "nu",
      nhomTuoi: "Nhóm tuổi 1",
      teamId: "t5",
      noiDung: ["Quyền cá nhân nữ"],
    },
    {
      id: "x34",
      hoTen: "Lê Thảo Vy",
      namSinh: 2010,
      gioiTinh: "nu",
      nhomTuoi: "Nhóm tuổi 1",
      teamId: "t2",
      noiDung: ["Quyền cá nhân nữ"],
    },
  ],
  e8: [
    {
      id: "x35",
      hoTen: "Đỗ Minh Quân",
      namSinh: 2008,
      gioiTinh: "nam",
      nhomTuoi: "Nhóm tuổi 2",
      teamId: "t2",
      noiDung: ["Song luyện nam"],
    },
    {
      id: "x36",
      hoTen: "Bùi Xuân Trường",
      namSinh: 2008,
      gioiTinh: "nam",
      nhomTuoi: "Nhóm tuổi 2",
      teamId: "t2",
      noiDung: ["Song luyện nam"],
    },
  ],
  e9: [
    {
      id: "x37",
      hoTen: "Đinh Tuấn Tài",
      namSinh: 2008,
      gioiTinh: "nu",
      nhomTuoi: "Nhóm tuổi 3",
      teamId: "t1",
      noiDung: ["Đối kháng nữ - 60kg"],
    },
    {
      id: "x38",
      hoTen: "Nguyễn Gia Bảo",
      namSinh: 2008,
      gioiTinh: "nu",
      nhomTuoi: "Nhóm tuổi 3",
      teamId: "t2",
      noiDung: ["Đối kháng nữ - 60kg"],
    },
    {
      id: "x39",
      hoTen: "Nguyễn Khắc Vượng",
      namSinh: 2009,
      gioiTinh: "nu",
      nhomTuoi: "Nhóm tuổi 3",
      teamId: "t3",
      noiDung: ["Đối kháng nữ - 60kg"],
    },
  ],
  e10: makeTestAthletes("t15_", 15, TEAM_IDS),
  e11: makeTestAthletes("t30_", 30, TEAM_IDS),
  e12: genDoiKhangAthletes(0, 3, "Đối kháng nam - 25kg", "Nhóm tuổi 1", 2011),
  e13: genDoiKhangAthletes(3, 4, "Đối kháng nam - 30kg", "Nhóm tuổi 1", 2011),
  e14: genDoiKhangAthletes(7, 5, "Đối kháng nam - 35kg", "Nhóm tuổi 1", 2010),
  e15: genDoiKhangAthletes(12, 6, "Đối kháng nam - 40kg", "Nhóm tuổi 2", 2009),
  e16: genDoiKhangAthletes(18, 7, "Đối kháng nam - 45kg", "Nhóm tuổi 2", 2009),
  e17: genDoiKhangAthletes(25, 8, "Đối kháng nam - 50kg", "Nhóm tuổi 2", 2008),
  e18: genDoiKhangAthletes(33, 9, "Đối kháng nam - 55kg", "Nhóm tuổi 3", 2007),
  e19: genDoiKhangAthletes(
    42,
    10,
    "Đối kháng nam - 60kg (nhóm 3)",
    "Nhóm tuổi 3",
    2007,
  ),
  e20: genDoiKhangAthletes(52, 11, "Đối kháng nam - 65kg", "Nhóm tuổi 3", 2006),
  e21: genDoiKhangAthletes(63, 12, "Đối kháng nam - 70kg", "Nhóm tuổi 3", 2006),
  e22: Array.from({ length: 6 }, (_, i) => {
    const seed = 75 + i;
    return {
      id: `dd${seed}`,
      hoTen: genName(seed),
      namSinh: 2008,
      gioiTinh: "nam" as const,
      nhomTuoi: "Nhóm tuổi 2",
      teamId: "t1",
      noiDung: ["Quyền đồng đội nam"],
    };
  }),
};

const LOAI_LABEL = { quyen: "Quyền", doi_khang: "Đối kháng" } as const;

export default function NoiDungBocTham() {
  const [tab, setTab] = useState<"quyen" | "doi_khang">("doi_khang");
  const [selectedId, setSelectedId] = useState("e1");
  const [bracketsByEvent, setBracketsByEvent] = useState<
    Record<string, Match[]>
  >({});
  const [orderByEvent, setOrderByEvent] = useState<Record<string, Athlete[]>>(
    {},
  );
  const eventsInTab = useMemo(
    () => SEED_EVENTS.filter((ev) => ev.loai === tab),
    [tab],
  );
  const selected =
    SEED_EVENTS.find((ev) => ev.id === selectedId) ?? eventsInTab[0];
  const athletesOfSelected = selected
    ? (SEED_ATHLETES_BY_EVENT[selected.id] ?? [])
    : [];
  const bracket = selected ? bracketsByEvent[selected.id] : undefined;
  const order = selected ? orderByEvent[selected.id] : undefined;
  const handleBocTham = () => {
    if (!selected) return;
    const matches = generateBracket(athletesOfSelected, selected.id);
    setBracketsByEvent((prev) => ({ ...prev, [selected.id]: matches }));
  };
  const handleBocThamQuyen = () => {
    if (!selected) return;
    const shuffled = [...athletesOfSelected].sort(() => Math.random() - 0.5);
    setOrderByEvent((prev) => ({ ...prev, [selected.id]: shuffled }));
  };
  return (
    <div className={styles.page}>
      <aside className={styles.sidebar}>
        <div className={styles.tabs}>
          {(["quyen", "doi_khang"] as const).map((t) => (
            <button
              key={t}
              className={t === tab ? styles.tabActive : styles.tab}
              onClick={() => setTab(t)}>
              {LOAI_LABEL[t]}
            </button>
          ))}
        </div>
        <div className={styles.eventList}>
          {eventsInTab.map((ev) => (
            <button
              key={ev.id}
              className={
                ev.id === selectedId ? styles.eventItemActive : styles.eventItem
              }
              onClick={() => setSelectedId(ev.id)}>
              {ev.ten}
            </button>
          ))}
          {eventsInTab.length === 0 && (
            <p className={styles.emptyList}>Chưa có nội dung nào</p>
          )}
        </div>
      </aside>

      <section className={styles.main}>
        {!selected ? (
          <p>Chọn 1 nội dung ở danh sách bên trái.</p>
        ) : (
          <>
            <h1 className={styles.title}>{selected.ten}</h1>

            <div className={styles.metaRow}>
              <div className={styles.metaItem}>
                <span>Giới tính</span>
                <strong>{selected.gioiTinh === "nam" ? "Nam" : "Nữ"}</strong>
              </div>
              <div className={styles.metaItem}>
                <span>Nhóm tuổi</span>
                <strong>{selected.nhomTuoi}</strong>
              </div>
              <div className={styles.metaItem}>
                <span>
                  {selected.loai === "doi_khang" ? "Hạng cân" : "Bài quyền"}
                </span>
                <strong>{selected.hangCanHoacBaiQuyen}</strong>
              </div>
              <div className={styles.metaItem}>
                <span>Số trọng tài</span>
                <strong>{selected.soTrongTai}</strong>
              </div>
              <div className={styles.metaItem}>
                <span>Công thức điểm</span>
                <strong>{selected.congThucTinhDiem}</strong>
              </div>
            </div>

            <section className={styles.registeredSection}>
              <h2 className={styles.registeredTitle}>
                Danh sách đăng ký{" "}
                <span>({athletesOfSelected.length} người)</span>
              </h2>
              {athletesOfSelected.length > 0 ? (
                <ol className={styles.athleteList}>
                  {athletesOfSelected.map((a) => (
                    <li key={a.id}>{a.hoTen}</li>
                  ))}
                </ol>
              ) : (
                <p className={styles.hint}>Chưa có VĐV đăng ký nội dung này</p>
              )}
            </section>

            {selected.loai === "doi_khang" ? (
              <>
                <div className={styles.actions}>
                  <button
                    className={styles.btnPrimary}
                    onClick={handleBocTham}
                    disabled={athletesOfSelected.length < 2}>
                    <Shuffle size={16} />{" "}
                    {bracket ? "Bốc thăm lại" : "Bốc thăm"}
                  </button>
                  {athletesOfSelected.length < 2 && (
                    <span className={styles.hint}>
                      Cần tối thiểu 2 VĐV đăng ký để bốc thăm
                    </span>
                  )}
                </div>
                <BracketView
                  matches={bracket ?? []}
                  athletes={athletesOfSelected}
                />
              </>
            ) : (
              <>
                <div className={styles.actions}>
                  <button
                    className={styles.btnPrimary}
                    onClick={handleBocThamQuyen}
                    disabled={athletesOfSelected.length < 2}>
                    <Shuffle size={16} /> {order ? "Bốc thăm lại" : "Bốc thăm"}
                  </button>
                  {athletesOfSelected.length < 2 && (
                    <span className={styles.hint}>
                      Cần tối thiểu 2 VĐV đăng ký để bốc thăm
                    </span>
                  )}
                </div>
                {order && (
                  <div className={styles.registeredSection}>
                    <h2 className={styles.registeredTitle}>Thứ tự thi diễn</h2>
                    <ol className={styles.athleteList}>
                      {order.map((a) => (
                        <li key={a.id}>{a.hoTen}</li>
                      ))}
                    </ol>
                  </div>
                )}
                <p className={styles.quyenNote}>
                  Nội dung quyền không có nhánh loại trực tiếp — bốc thăm chỉ
                  xác định thứ tự thi diễn. Cách xử lý hòa điểm còn đang để ngỏ,
                  màn này để dành làm sau khi chốt xong.
                </p>
              </>
            )}
          </>
        )}
      </section>
    </div>
  );
}
