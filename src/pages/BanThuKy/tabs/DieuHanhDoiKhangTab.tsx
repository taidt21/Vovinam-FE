/** @format */

import { useEffect, useRef, useState } from "react";
import {
  Minus,
  Plus,
  Flag,
  Play,
  Pause,
  SkipForward,
  Settings,
  RotateCcw,
  Undo2,
  Award,
  Check,
  X,
} from "lucide-react";
import type { LiveMatchState, LyDoKetThuc, Match } from "../../../types";
import {
  getMatchSnapshot,
  publishMatchState,
  subscribeMatchState,
  formatMmSs,
  tinhThoiGianConLai,
  tinhNhanThoiGianTran,
} from "../../../lib/realtime/liveMatchStore";
import { serverNow } from "../../../lib/realtime/serverClock";
import { usePressedLights, toPositionedPresses } from "../../../lib/realtime/usePressedLights";
import { fetchTrongTai } from "../../../lib/api/trongTaiApi";
import { useMatchBell } from "../../../lib/audio/matchBell";
import { ghiLogDieuChinhDiem, xoaLogDieuChinhDiem } from "../../../lib/realtime/pressLightClient";
import Modal from "../../../components/Modal/Modal";
import AthleteAvatar from "../../../components/AthleteAvatar/AthleteAvatar";
import MatchLogPanel from "../../../components/MatchLogPanel/MatchLogPanel";
import LiveLightsPanel from "../../../components/LiveLightsPanel/LiveLightsPanel";
import LightBoxes from "../../../components/LightBoxes/LightBoxes";
import { LY_DO_OPTIONS } from "../helpers";
import RecoveryScreen from "./RecoveryScreen";
import styles from "../BanThuKy.module.scss";

// Vòng 32 và Vòng 16 gộp chung nhãn "Vòng loại" khi hiện — đúng quy ước
// đang dùng ở trang xuất PDF đối kháng và tab Lịch thi đấu, để mọi nơi
// khớp nhau.
function nhanVong(vong: string): string {
  return vong === "Vòng 32" || vong === "Vòng 16" ? "Vòng loại" : vong;
}

export default function DieuHanhDoiKhangTab({
  match,
  eventTen,
  so,
  athleteName,
  athleteTeam,
  onEndMatch,
  onGoTranChoBatDau,
  choPhepHiepPhu,
}: {
  match: Match;
  eventTen: string;
  so: number | undefined;
  athleteName: (id: string | null) => string | null;
  athleteTeam: (id: string | null) => string;
  onEndMatch: (lyDo: LyDoKetThuc, thang: "do" | "xanh") => void;
  onGoTranChoBatDau: () => void;
  choPhepHiepPhu: boolean;
}) {
  const courtId = match.courtId!;
  const [live, setLive] = useState<LiveMatchState | null>(() =>
    getMatchSnapshot(courtId),
  );
  const pressed = usePressedLights(courtId);

  // id -> thuTuGiamDinh (1-5) — xem đúng comment ở toPositionedPresses
  // (usePressedLights.ts): việc bấm đèn chỉ gửi kèm giamDinhId, số thứ
  // tự phải tự khớp riêng qua dữ liệu Trọng tài. Trang này trước giờ
  // gọi thẳng presses.map(p => p.diem) vào LightBoxes — coi "thứ tự
  // đang bấm" là "vị trí giám định", sai y hệt lỗi đã sửa bên màn hình
  // công khai.
  const [judgePositions, setJudgePositions] = useState<Record<string, number>>(
    {},
  );
  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetchTrongTai()
        .then((list) => {
          if (cancelled) return;
          const map: Record<string, number> = {};
          for (const t of list) {
            if (t.courtId === courtId && t.thuTuGiamDinh !== null) {
              map[t.id] = t.thuTuGiamDinh;
            }
          }
          setJudgePositions(map);
        })
        .catch(() => {
          // Giữ nguyên bản đồ cũ nếu tải lỗi tạm thời.
        });
    };
    load();
    const id = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [courtId]);
  const [, setTick] = useState(0);
  const diemVangBaseline = useRef<{ do: number; xanh: number } | null>(null);

  const [showEndFlow, setShowEndFlow] = useState(false);
  const [lyDo, setLyDo] = useState<LyDoKetThuc>("thang_diem");
  const [showSettings, setShowSettings] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  useEffect(() => {
    setLive(getMatchSnapshot(courtId));
    return subscribeMatchState(courtId, setLive);
  }, [courtId]);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (live) {
      setShowRecovery(false);
      return;
    }
    const t = setTimeout(() => setShowRecovery(true), 2000);
    return () => clearTimeout(t);
  }, [live, courtId]);
  const remaining = live ? tinhThoiGianConLai(live) : 0;
  useMatchBell(courtId, live?.trangThai, live?.hetHiepLuc);
  // Lịch sử điều chỉnh tay của TỪNG BÊN riêng biệt — "Hoàn tác" bên nào
  // chỉ lùi lại đúng thao tác gần nhất của bên đó, không đụng bên kia dù
  // thao tác sau đó xen giữa 2 bên. Chỉ lưu lúc CÒN ĐANG XEM đúng trận
  // này (mất khi rời trang) — điểm số thật đã lưu ở nơi khác rồi
  // (MatchState), đây chỉ là ngăn xếp để biết "lùi lại thế nào". Đặt
  // TRƯỚC "if (!live) return" bên dưới — xem đúng comment ngay sau đây
  // giải thích lý do bắt buộc.
  //
  // Giữ kèm logId (Id dòng log đã ghi lúc cộng/trừ) — hoàn tác XOÁ HẲN
  // đúng dòng đó thay vì thêm 1 dòng "hoàn tác" mới, để log trông như
  // chưa từng có thao tác này. null nếu lúc ghi log bị lỗi (mất mạng...)
  // — vẫn hoàn tác điểm bình thường, chỉ là không xoá được dòng log
  // tương ứng (vì chưa từng có dòng nào được ghi).
  const [lichSuDo, setLichSuDo] = useState<
    { delta: number; logId: string | null }[]
  >([]);
  const [lichSuXanh, setLichSuXanh] = useState<
    { delta: number; logId: string | null }[]
  >([]);
  const dangChay = live?.trangThai === "dang_thi";
  const dangNghi = live?.trangThai === "nghi_giua_hiep";
  const laHiepCuoi = live ? live.hiepHienTai >= live.tongSoHiep : false;
  // Hiệp phụ (điểm vàng) = hiepHienTai vượt qua tongSoHiep — đúng quy ước
  // đã có sẵn trong comment của type LiveMatchState từ trước, không phải
  // mình tự đặt ra.
  const dangHiepPhu = live ? live.hiepHienTai > live.tongSoHiep : false;
  const hetGio = remaining <= 0 && (dangChay || dangNghi);

  // 3 hook điểm vàng dưới đây BẮT BUỘC đứng trước "if (!live) return" ở
  // cuối khối này — Rules of Hooks không cho phép hook chạy có điều
  // kiện. Trước đây đặt SAU dòng return sớm, nghĩa là mỗi lần live còn
  // null (đúng lúc trận vừa mở, đang chờ dữ liệu sống) React gọi ÍT hook
  // hơn bình thường — lỗi thật (oxlint bắt được dạng error, không phải
  // warning), không phải chuyện vặt.
  //
  // Tự động lúc hết giờ, đỡ phải bấm tay:
  // 1. Hết giờ 1 hiệp (chưa phải hiệp cuối) -> tự chuyển nghỉ/hiệp kế
  //    tiếp, thuần cơ học, không đụng gì tới ai thắng ai thua.
  // 2. Hết giờ hiệp CUỐI (kể cả hiệp phụ), điểm KHÔNG hoà -> chỉ tự chọn
  //    màu thắng (đỡ bước bấm Đỏ/Xanh thắng) rồi DỪNG LẠI ở đúng màn
  //    hình "Đã có người thắng" như lúc chọn tay — vẫn cần bấm "Xác
  //    nhận, qua trận tiếp theo" mới thật sự qua trận khác.
  // 3. Điểm hoà -> không tự chọn gì. Nếu giải cho phép hiệp phụ và CHƯA
  //    từng vào hiệp phụ, ketThucHiep() ở dưới tự chuyển sang nghỉ giữa
  //    hiệp thay vì dừng hẳn (xem logic trong đó). Đã ở hiệp phụ mà vẫn
  //    hoà, hoặc giải không cho phép hiệp phụ -> dừng hẳn, để BTK tự bấm
  //    "Kết thúc trận" chọn tay (bốc thăm/cân hạng cân).
  useEffect(() => {
    const cur = live;
    if (!cur || !hetGio || !dangChay) return;
    if (!laHiepCuoi) {
      ketThucHiep();
      return;
    }
    if (cur.diemChinhThucDo === cur.diemChinhThucXanh) {
      ketThucHiep();
      return;
    }
    const winner = cur.diemChinhThucDo > cur.diemChinhThucXanh ? "do" : "xanh";
    patch({
      trangThai: "da_ket_thuc",
      nguoiThang: winner,
      lyDoKetThuc: dangHiepPhu ? "diem_vang" : "thang_diem",
      hetHiepLuc: Date.now(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hetGio, dangChay, laHiepCuoi]);

  // Cách biệt đủ 10 điểm -> xử thắng ngay lập tức, không cần chờ hết
  // giờ hiệp.
  //
  // CHỈ áp dụng lúc ĐANG THI (dangChay) — KHÔNG áp dụng khi đã tạm dừng
  // hay đã kết thúc. Lý do: nếu áp dụng cả lúc tạm dừng, sẽ tạo vòng
  // lặp vô hạn với nút "Bấm nhầm, chọn lại" (huyKetThuc) — nút đó chỉ
  // chuyển trangThai về "tam_dung", KHÔNG đụng gì tới điểm số. Nếu vẫn
  // áp dụng lúc tạm dừng, effect này sẽ thấy điểm vẫn cách biệt ≥10
  // ngay lập tức và tự kết thúc lại y hệt, khiến người dùng bấm "chọn
  // lại" mà màn hình cứ nháy liên tục, không có gì thay đổi được (lỗi
  // đã gặp thực tế, xác nhận qua ảnh chụp màn hình).
  //
  // Điều chỉnh tay lúc TẠM DỪNG (nút +/-) vẫn được xử lý riêng, ngay
  // trong hàm adjustScore — xem đúng chỗ đó, không cần effect này lo.
  //
  // Dùng >= (không phải ==) vì 1 lượt ghi điểm có thể nhảy thẳng qua
  // mốc 10 (VD đang cách 8, ghi thêm +3 thành 11).
  useEffect(() => {
    const cur = live;
    if (!cur || !dangChay) return;
    const chenhLech = Math.abs(cur.diemChinhThucDo - cur.diemChinhThucXanh);
    if (chenhLech < 10) return;
    const benThang = cur.diemChinhThucDo > cur.diemChinhThucXanh ? "do" : "xanh";
    patch({
      trangThai: "da_ket_thuc",
      nguoiThang: benThang,
      lyDoKetThuc: "cach_biet_10_diem",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live?.diemChinhThucDo, live?.diemChinhThucXanh, dangChay]);

  // Điểm vàng — ghi nhớ điểm số NGAY LÚC hiệp phụ bắt đầu, để biết chính
  // xác bên nào ghi điểm ĐẦU TIÊN trong hiệp phụ (không phải tổng điểm
  // cả trận, chỉ tính từ đây trở đi).
  useEffect(() => {
    if (!dangHiepPhu) {
      diemVangBaseline.current = null;
      return;
    }
    const cur = live;
    if (diemVangBaseline.current === null && cur) {
      diemVangBaseline.current = {
        do: cur.diemChinhThucDo,
        xanh: cur.diemChinhThucXanh,
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dangHiepPhu]);

  // Ai ghi điểm trước trong hiệp phụ thắng ngay — không đợi hết giờ hiệp
  // phụ. Dừng ở màn hình "Đã có người thắng" như mọi trường hợp khác,
  // vẫn cần bấm "Xác nhận, qua trận tiếp theo" mới thật sự qua trận sau.
  useEffect(() => {
    const cur = live;
    if (!cur || !dangHiepPhu || !dangChay || !diemVangBaseline.current) return;
    if (cur.diemChinhThucDo > diemVangBaseline.current.do) {
      patch({
        trangThai: "da_ket_thuc",
        nguoiThang: "do",
        lyDoKetThuc: "diem_vang",
      });
    } else if (cur.diemChinhThucXanh > diemVangBaseline.current.xanh) {
      patch({
        trangThai: "da_ket_thuc",
        nguoiThang: "xanh",
        lyDoKetThuc: "diem_vang",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dangHiepPhu, dangChay, live?.diemChinhThucDo, live?.diemChinhThucXanh]);

  if (!live) {
    if (!showRecovery)
      return <p className={styles.hint}>Đang khởi tạo trận...</p>;
    return (
      <RecoveryScreen
        match={match}
        eventTen={eventTen}
        athleteName={athleteName}
        athleteTeam={athleteTeam}
      />
    );
  }

  const patch = (p: Partial<LiveMatchState>) => {
    const next = { ...live, ...p, capNhatLuc: Date.now() };
    publishMatchState(next);
    setLive(next);
  };

  const batDauHiep = () =>
    patch({
      trangThai: "dang_thi",
      hiepHienTai: live.hiepHienTai + 1,
      thoiGianConLaiGiay: live.thoiGianHiepGiay,
      capNhatDongHoLuc: serverNow(),
      // Cảnh cáo TRONG HIỆP reset về 0 mỗi khi 1 hiệp mới THẬT SỰ bắt
      // đầu — khác hẳn soCanhCaoDo/Xanh (cả trận), field đó không đụng
      // tới ở đây, giữ nguyên xuyên suốt các hiệp.
      soCanhCaoHiepDo: 0,
      soCanhCaoHiepXanh: 0,
    } as Partial<LiveMatchState>);
  const tamDung = () =>
    patch({ trangThai: "tam_dung", thoiGianConLaiGiay: remaining });
  const tiepTuc = () =>
    patch({ trangThai: "dang_thi", capNhatDongHoLuc: serverNow() });
  const ketThucHiep = () => {
    // Hoà đúng lúc hết giờ hiệp cuối, CHƯA từng vào hiệp phụ, và giải cho
    // phép -> xử như hiệp thường (qua nghỉ giữa hiệp) thay vì dừng hẳn,
    // để "Bắt đầu hiệp {n+1}" bên dưới tự nhiên trở thành hiệp phụ (đúng
    // n+1 lúc này > tongSoHiep). Đã ở hiệp phụ rồi mà vẫn hoà thì KHÔNG
    // lặp thêm hiệp phụ nữa — dừng hẳn như hiệp cuối bình thường, để BTK
    // tự chọn theo bốc thăm/cân hạng cân.
    const vaoHiepPhu =
      laHiepCuoi &&
      !dangHiepPhu &&
      choPhepHiepPhu &&
      live.diemChinhThucDo === live.diemChinhThucXanh;
    patch(
      laHiepCuoi && !vaoHiepPhu
        ? { trangThai: "tam_dung", thoiGianConLaiGiay: 0, hetHiepLuc: Date.now() }
        : {
            trangThai: "nghi_giua_hiep",
            thoiGianConLaiGiay: live.thoiGianNghiGiay,
            capNhatDongHoLuc: serverNow(),
            hetHiepLuc: Date.now(),
          },
    );
  };

  const adjustScore = (side: "do" | "xanh", delta: number) => {
    const key = side === "do" ? "diemChinhThucDo" : "diemChinhThucXanh";
    const diemDoMoi = side === "do" ? live.diemChinhThucDo + delta : live.diemChinhThucDo;
    const diemXanhMoi =
      side === "xanh" ? live.diemChinhThucXanh + delta : live.diemChinhThucXanh;

    // Chỉnh tay lúc ĐANG TẠM DỪNG vẫn cần bắt được luật cách biệt 10
    // điểm ngay lập tức — effect riêng cho luật này (xem phía trên) CỐ
    // TÌNH chỉ chạy lúc đang thi, không chạy lúc tạm dừng (tránh vòng
    // lặp vô hạn với nút "Bấm nhầm, chọn lại"). Kiểm tra trực tiếp ở
    // đây, đúng 1 lần ngay khi bấm, không có rủi ro lặp vì đây là hàm
    // gọi 1 lần, không phải effect tự chạy lại theo dõi state.
    const chenhLechMoi = Math.abs(diemDoMoi - diemXanhMoi);
    if (live.trangThai !== "da_ket_thuc" && chenhLechMoi >= 10) {
      const benThang = diemDoMoi > diemXanhMoi ? "do" : "xanh";
      patch({
        [key]: live[key] + delta,
        diemDaChinhTay: true,
        trangThai: "da_ket_thuc",
        nguoiThang: benThang,
        lyDoKetThuc: "cach_biet_10_diem",
      } as Partial<LiveMatchState>);
    } else {
      patch({
        [key]: live[key] + delta,
        diemDaChinhTay: true,
      } as Partial<LiveMatchState>);
    }

    const tenBen = side === "do" ? "Đỏ" : "Xanh";
    const dauSo = delta > 0 ? "+" : "";
    ghiLogDieuChinhDiem(
      courtId,
      `Bàn thư ký ${delta > 0 ? "cộng" : "trừ"} ${tenBen} ${dauSo}${delta}đ`,
      tinhNhanThoiGianTran(live),
    ).then((logId) => {
      if (side === "do") setLichSuDo((prev) => [...prev, { delta, logId }]);
      else setLichSuXanh((prev) => [...prev, { delta, logId }]);
    });
  };

  const hoanTac = (side: "do" | "xanh") => {
    const lichSu = side === "do" ? lichSuDo : lichSuXanh;
    const cuoi = lichSu[lichSu.length - 1];
    if (cuoi === undefined) return;

    const key = side === "do" ? "diemChinhThucDo" : "diemChinhThucXanh";
    patch({
      [key]: live[key] - cuoi.delta,
      diemDaChinhTay: true,
    } as Partial<LiveMatchState>);

    if (side === "do") setLichSuDo((prev) => prev.slice(0, -1));
    else setLichSuXanh((prev) => prev.slice(0, -1));

    // Xoá HẲN dòng log gốc thay vì ghi thêm dòng "hoàn tác" mới — log
    // trông như chưa từng có thao tác này. Không còn logId (lỗi mạng
    // lúc ghi log ban đầu) thì không có gì để xoá, bỏ qua — điểm vẫn
    // đã lùi lại đúng ở trên rồi.
    if (cuoi.logId) xoaLogDieuChinhDiem(courtId, cuoi.logId);
  };

  // Nhắc nhở đủ 3 lần -> trừ 2 điểm + reset về 0 + CỘNG THÊM 1 vào CẢ 2
  // bộ đếm cảnh cáo cùng lúc:
  //   - soCanhCaoHiepDo/Xanh (trong ĐÚNG hiệp này, tự reset mỗi hiệp
  //     mới ở batDauHiep) — đủ 3 -> xử thua ngay.
  //   - soCanhCaoDo/Xanh (cả trận, không bao giờ tự reset) — đủ 4 ->
  //     xử thua ngay, DÙ không hiệp riêng lẻ nào đủ 3 (VD hiệp 1 bị 2,
  //     hiệp 2 bị thêm 2 -> mỗi hiệp riêng chưa đủ 3, nhưng tổng 4 vẫn
  //     thua theo đúng luật này).
  // Kiểm tra hiệp trước, cả trận sau — không quan trọng thứ tự (đủ 1
  // trong 2 là thua), nhưng kiểm tra hiệp trước cho tự nhiên vì đó là
  // ngưỡng thấp hơn, thường chạm tới trước.
  //
  // Xử thua y hệt cách "hết giờ, không hoà" tự chọn thắng ở effect phía
  // trên (tự chuyển trangThai + nguoiThang, vẫn dừng lại đúng màn "Đã
  // có người thắng" chờ BTK bấm xác nhận, không tự nhảy qua trận khác).
  const adjustNhacNho = (side: "do" | "xanh", delta: number) => {
    const key = side === "do" ? "nhacNhoDo" : "nhacNhoXanh";
    const scoreKey = side === "do" ? "diemChinhThucDo" : "diemChinhThucXanh";
    const canhCaoKey = side === "do" ? "soCanhCaoDo" : "soCanhCaoXanh";
    const canhCaoHiepKey =
      side === "do" ? "soCanhCaoHiepDo" : "soCanhCaoHiepXanh";
    const next = Math.max(0, live[key] + delta);

    if (delta > 0 && next >= 3) {
      const canhCaoHiepMoi = live[canhCaoHiepKey] + 1;
      const canhCaoTranMoi = live[canhCaoKey] + 1;
      const thuaTheoHiep = canhCaoHiepMoi >= 3;
      const thuaTheoTran = canhCaoTranMoi >= 4;

      if (thuaTheoHiep || thuaTheoTran) {
        const benThang = side === "do" ? "xanh" : "do";
        patch({
          [key]: 0,
          [scoreKey]: live[scoreKey] - 2,
          [canhCaoHiepKey]: canhCaoHiepMoi,
          [canhCaoKey]: canhCaoTranMoi,
          trangThai: "da_ket_thuc",
          nguoiThang: benThang,
          lyDoKetThuc: "xu_thua_canh_cao",
        } as Partial<LiveMatchState>);
      } else {
        patch({
          [key]: 0,
          [scoreKey]: live[scoreKey] - 2,
          [canhCaoHiepKey]: canhCaoHiepMoi,
          [canhCaoKey]: canhCaoTranMoi,
        } as Partial<LiveMatchState>);
      }
    } else {
      patch({ [key]: next } as Partial<LiveMatchState>);
    }
  };

  const restartMatch = () => {
    if (
      !window.confirm(
        "Đấu lại từ đầu? Toàn bộ điểm, nhắc nhở, cảnh cáo và tiến trình hiệp hiện tại sẽ bị xóa.",
      )
    )
      return;
    patch({
      trangThai: "cho_bat_dau",
      hiepHienTai: 0,
      thoiGianConLaiGiay: live.thoiGianHiepGiay,
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
    });
    setLichSuDo([]);
    setLichSuXanh([]);
  };

  const daKetThuc = live.trangThai === "da_ket_thuc";

  const confirmWinner = (thang: "do" | "xanh") => {
    patch({ trangThai: "da_ket_thuc", nguoiThang: thang, lyDoKetThuc: lyDo });
    setShowEndFlow(false);
  };
  const confirmFinish = () => {
    if (live.nguoiThang) onEndMatch(live.lyDoKetThuc ?? lyDo, live.nguoiThang);
  };
  const huyKetThuc = () =>
    patch({ trangThai: "tam_dung", nguoiThang: null, lyDoKetThuc: undefined });

  return (
    <div className={styles.dieuHanh}>
      <div className={styles.matchMeta}>
        {so && <span className={styles.matchNoTag}>#{so}</span>} {eventTen} -{" "}
        {nhanVong(match.vong)}
      </div>

      <div className={styles.scoreBoardBig}>
        <div
          className={[
            styles.cornerDo,
            daKetThuc
              ? live.nguoiThang === "do"
                ? styles.cornerWinner
                : styles.cornerLoser
              : "",
          ]
            .filter(Boolean)
            .join(" ")}>
          {!daKetThuc && (
            <LightBoxes presses={toPositionedPresses(pressed.do, judgePositions)} />
          )}
          <div className={styles.cornerMain}>
            <span className={styles.cornerLabelDo}>ĐỎ</span>
            <AthleteAvatar
              name={athleteName(match.athleteRedId) ?? "—"}
              photoUrl={live.anhDo}
              size={72}
            />
            <div className={styles.athNameBig}>
              {athleteName(match.athleteRedId)}
            </div>
            <div className={styles.athUnit}>
              {athleteTeam(match.athleteRedId)}
            </div>
            <div className={styles.scoreNumDoBig}>{live.diemChinhThucDo}</div>
            {daKetThuc ? (
              live.nguoiThang === "do" && (
                <div className={styles.winnerBadge}>
                  <Award size={16} /> Thắng
                </div>
              )
            ) : (
              <>
                <div className={styles.stepBtnsBig}>
                  <button onClick={() => adjustScore("do", -1)}>-1</button>
                  <button onClick={() => adjustScore("do", 1)}>+1</button>
                  <button onClick={() => adjustScore("do", -2)}>-2</button>
                  <button onClick={() => adjustScore("do", 2)}>+2</button>
                  <button onClick={() => adjustScore("do", 3)}>+3</button>
                  <button
                    className={styles.undoBtnBig}
                    onClick={() => hoanTac("do")}
                    disabled={lichSuDo.length === 0}
                    title="Hoàn tác thao tác cộng/trừ điểm gần nhất bên Đỏ">
                    <Undo2 size={18} />
                  </button>
                </div>
                <div className={styles.warnRowBig}>
                  <span>Nhắc nhở (3 → tự trừ 2đ)</span>
                  <div className={styles.dotsBig}>
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className={
                          i < live.nhacNhoDo ? styles.dotOnDo : styles.dotOff
                        }
                      />
                    ))}
                  </div>
                  <button onClick={() => adjustNhacNho("do", -1)}>
                    <Minus size={14} />
                  </button>
                  <button onClick={() => adjustNhacNho("do", 1)}>
                    <Plus size={14} />
                  </button>
                </div>
                <div className={styles.warnRowBig}>
                  <span>Cảnh cáo hiệp này (3 → xử thua ngay)</span>
                  <div className={styles.dotsBig}>
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className={
                          i < live.soCanhCaoHiepDo
                            ? styles.dotOnDo
                            : styles.dotOff
                        }
                      />
                    ))}
                  </div>
                </div>
                <div className={styles.warnRowBig}>
                  <span>Cảnh cáo cả trận (4 → xử thua ngay)</span>
                  <div className={styles.dotsBig}>
                    {[0, 1, 2, 3].map((i) => (
                      <span
                        key={i}
                        className={
                          i < live.soCanhCaoDo
                            ? styles.dotOnDo
                            : styles.dotOff
                        }
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className={styles.timerCol}>
          {daKetThuc ? (
            <div className={styles.endedBox}>
              <Award size={28} />
              <span className={styles.endedLabel}>Đã có người thắng</span>
              <div className={styles.controlBtns}>
                <button className={styles.btnPrimary} onClick={confirmFinish}>
                  <Check size={16} /> Xác nhận, qua trận tiếp theo
                </button>
                <button className={styles.linkBtn} onClick={huyKetThuc}>
                  Bấm nhầm, chọn lại
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className={styles.hiepRow}>
                <span className={styles.hiep}>
                  {live.hiepHienTai === 0
                    ? "Chưa bắt đầu"
                    : dangNghi
                      ? `Nghỉ giữa hiệp ${live.hiepHienTai}`
                      : dangHiepPhu
                        ? "Hiệp phụ — Điểm vàng"
                        : `Hiệp ${live.hiepHienTai}/${live.tongSoHiep}`}
                </span>
                {live.trangThai === "cho_bat_dau" && (
                  <button
                    className={styles.settingsBtn}
                    onClick={() => setShowSettings(true)}
                    aria-label="Cài đặt trận">
                    <Settings size={14} />
                  </button>
                )}
              </div>
              <span
                className={`${styles.timerBig} ${hetGio ? styles.timerDone : ""}`}>
                {formatMmSs(remaining)}
              </span>
              {live.trangThai === "cho_bat_dau" && (
                <div className={styles.timerBtnRow}>
                  <button className={styles.timerBtn} onClick={batDauHiep}>
                    <Play size={15} /> Bắt đầu hiệp 1
                  </button>
                  <button
                    className={styles.dropMatchBtn}
                    onClick={onGoTranChoBatDau}
                    title="Gỡ trận này khỏi sân, cho sân nghỉ">
                    <X size={15} /> Bỏ, cho sân nghỉ
                  </button>
                </div>
              )}
              {dangChay && !hetGio && (
                <div className={styles.timerBtnRow}>
                  <button className={styles.timerBtn} onClick={tamDung}>
                    <Pause size={15} />
                  </button>
                  <button className={styles.timerBtn} onClick={ketThucHiep}>
                    <SkipForward size={15} />
                  </button>
                </div>
              )}
              {live.trangThai === "tam_dung" &&
                // Trạng thái "tam_dung" dùng chung cho 2 việc: (1) BTK bấm
                // tạm dừng thật sự giữa hiệp (còn giờ), và (2) hết giờ
                // hiệp CUỐI, đang chờ BTK chọn người thắng bên dưới (giờ
                // đã về 0 — patch trong ketThucHiep() set thoiGianConLaiGiay
                // = 0 đúng lúc này). Trước đây chỉ so laHiepCuoi (luôn
                // đúng ở hiệp cuối, kể cả lúc CÒN GIỜ), lỡ ẩn mất nút
                // "Tiếp tục" cả khi BTK tạm dừng thật sự giữa hiệp cuối —
                // đúng lỗi đã gặp. So thẳng theo giờ còn lại mới đúng: hết
                // giờ (=0) mới ẩn, còn giờ thì hiệp nào cũng phải tiếp tục
                // được.
                !(laHiepCuoi && live.thoiGianConLaiGiay <= 0) && (
                  <button className={styles.timerBtn} onClick={tiepTuc}>
                    <Play size={15} /> Tiếp tục
                  </button>
                )}
              {dangNghi && (
                <button className={styles.timerBtn} onClick={batDauHiep}>
                  <Play size={15} />{" "}
                  {live.hiepHienTai + 1 > live.tongSoHiep
                    ? "Bắt đầu hiệp phụ (Điểm vàng)"
                    : `Bắt đầu hiệp ${live.hiepHienTai + 1}`}
                </button>
              )}
              {hetGio && dangChay && (
                <button className={styles.timerBtn} onClick={ketThucHiep}>
                  <SkipForward size={15} /> Hết giờ
                </button>
              )}
              <button className={styles.restartBtn} onClick={restartMatch}>
                <RotateCcw size={13} /> Đấu lại từ đầu
              </button>
            </>
          )}
        </div>

        <div
          className={[
            styles.cornerXanh,
            daKetThuc
              ? live.nguoiThang === "xanh"
                ? styles.cornerWinner
                : styles.cornerLoser
              : "",
          ]
            .filter(Boolean)
            .join(" ")}>
          <div className={styles.cornerMain}>
            <span className={styles.cornerLabelXanh}>XANH</span>
            <AthleteAvatar
              name={athleteName(match.athleteBlueId) ?? "—"}
              photoUrl={live.anhXanh}
              size={72}
            />
            <div className={styles.athNameBig}>
              {athleteName(match.athleteBlueId)}
            </div>
            <div className={styles.athUnit}>
              {athleteTeam(match.athleteBlueId)}
            </div>
            <div className={styles.scoreNumXanhBig}>
              {live.diemChinhThucXanh}
            </div>
            {daKetThuc ? (
              live.nguoiThang === "xanh" && (
                <div className={styles.winnerBadge}>
                  <Award size={16} /> Thắng
                </div>
              )
            ) : (
              <>
                <div className={styles.stepBtnsBig}>
                  <button onClick={() => adjustScore("xanh", -1)}>-1</button>
                  <button onClick={() => adjustScore("xanh", 1)}>+1</button>
                  <button onClick={() => adjustScore("xanh", -2)}>-2</button>
                  <button onClick={() => adjustScore("xanh", 2)}>+2</button>
                  <button onClick={() => adjustScore("xanh", 3)}>+3</button>
                  <button
                    className={styles.undoBtnBig}
                    onClick={() => hoanTac("xanh")}
                    disabled={lichSuXanh.length === 0}
                    title="Hoàn tác thao tác cộng/trừ điểm gần nhất bên Xanh">
                    <Undo2 size={18} />
                  </button>
                </div>
                <div className={styles.warnRowBig}>
                  <span>Nhắc nhở (3 → tự trừ 2đ)</span>
                  <div className={styles.dotsBig}>
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className={
                          i < live.nhacNhoXanh
                            ? styles.dotOnXanh
                            : styles.dotOff
                        }
                      />
                    ))}
                  </div>
                  <button onClick={() => adjustNhacNho("xanh", -1)}>
                    <Minus size={14} />
                  </button>
                  <button onClick={() => adjustNhacNho("xanh", 1)}>
                    <Plus size={14} />
                  </button>
                </div>
                <div className={styles.warnRowBig}>
                  <span>Cảnh cáo hiệp này (3 → xử thua ngay)</span>
                  <div className={styles.dotsBig}>
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className={
                          i < live.soCanhCaoHiepXanh
                            ? styles.dotOnXanh
                            : styles.dotOff
                        }
                      />
                    ))}
                  </div>
                </div>
                <div className={styles.warnRowBig}>
                  <span>Cảnh cáo cả trận (4 → xử thua ngay)</span>
                  <div className={styles.dotsBig}>
                    {[0, 1, 2, 3].map((i) => (
                      <span
                        key={i}
                        className={
                          i < live.soCanhCaoXanh
                            ? styles.dotOnXanh
                            : styles.dotOff
                        }
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          {!daKetThuc && (
            <LightBoxes presses={toPositionedPresses(pressed.xanh, judgePositions)} />
          )}
        </div>
      </div>

      <LiveLightsPanel courtId={courtId} />

      {!daKetThuc && (
        <div className={styles.controls}>
          {!showEndFlow ? (
            <button
              className={styles.btnDangerBig}
              onClick={() => setShowEndFlow(true)}>
              <Flag size={18} /> Kết thúc trận
            </button>
          ) : (
            <>
              <label className={styles.reasonRow}>
                <span>Lý do</span>
                <select
                  value={lyDo}
                  onChange={(e) => setLyDo(e.target.value as LyDoKetThuc)}>
                  {LY_DO_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className={styles.controlBtns}>
                <button
                  className={styles.pickDoBig}
                  onClick={() => confirmWinner("do")}>
                  Đỏ thắng
                </button>
                <button
                  className={styles.pickXanhBig}
                  onClick={() => confirmWinner("xanh")}>
                  Xanh thắng
                </button>
              </div>
            </>
          )}
        </div>
      )}
      <MatchLogPanel courtId={courtId} />

      {showSettings && (
        <Modal title="Cài đặt trận đấu" onClose={() => setShowSettings(false)}>
          <div className={styles.settingsForm}>
            <label className={styles.field}>
              <span>Số hiệp</span>
              <input
                type="number"
                min={1}
                max={5}
                value={live.tongSoHiep}
                onChange={(e) => patch({ tongSoHiep: Number(e.target.value) })}
              />
            </label>
            <label className={styles.field}>
              <span>Thời gian mỗi hiệp (giây)</span>
              <input
                type="number"
                min={30}
                step={10}
                value={live.thoiGianHiepGiay}
                onChange={(e) =>
                  patch({
                    thoiGianHiepGiay: Number(e.target.value),
                    thoiGianConLaiGiay: Number(e.target.value),
                  })
                }
              />
            </label>
            <label className={styles.field}>
              <span>Thời gian nghỉ giữa hiệp (giây)</span>
              <input
                type="number"
                min={10}
                step={10}
                value={live.thoiGianNghiGiay}
                onChange={(e) =>
                  patch({ thoiGianNghiGiay: Number(e.target.value) })
                }
              />
            </label>
          </div>
        </Modal>
      )}
    </div>
  );
}
