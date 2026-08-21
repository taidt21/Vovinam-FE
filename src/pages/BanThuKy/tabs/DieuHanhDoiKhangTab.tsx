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
  Award,
  Check,
} from "lucide-react";
import type { LiveMatchState, LyDoKetThuc, Match } from "../../../types";
import {
  getMatchSnapshot,
  publishMatchState,
  subscribeMatchState,
  formatMmSs,
  tinhThoiGianConLai,
} from "../../../lib/realtime/liveMatchStore";
import { serverNow } from "../../../lib/realtime/serverClock";
import { usePressedLights } from "../../../lib/realtime/usePressedLights";
import Modal from "../../../components/Modal/Modal";
import AthleteAvatar from "../../../components/AthleteAvatar/AthleteAvatar";
import MatchLogPanel from "../../../components/MatchLogPanel/MatchLogPanel";
import LiveLightsPanel from "../../../components/LiveLightsPanel/LiveLightsPanel";
import LightBoxes from "../../../components/LightBoxes/LightBoxes";
import { LY_DO_OPTIONS } from "../helpers";
import RecoveryScreen from "./RecoveryScreen";
import styles from "../BanThuKy.module.scss";

export default function DieuHanhDoiKhangTab({
  match,
  eventTen,
  so,
  athleteName,
  athleteTeam,
  onEndMatch,
  choPhepHiepPhu,
}: {
  match: Match;
  eventTen: string;
  so: number | undefined;
  athleteName: (id: string | null) => string | null;
  athleteTeam: (id: string | null) => string;
  onEndMatch: (lyDo: LyDoKetThuc, thang: "do" | "xanh") => void;
  choPhepHiepPhu: boolean;
}) {
  const courtId = match.courtId!;
  const [live, setLive] = useState<LiveMatchState | null>(() =>
    getMatchSnapshot(courtId),
  );
  const pressed = usePressedLights(courtId);
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
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hetGio, dangChay, laHiepCuoi]);

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
    });
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
        ? { trangThai: "tam_dung", thoiGianConLaiGiay: 0 }
        : {
            trangThai: "nghi_giua_hiep",
            thoiGianConLaiGiay: live.thoiGianNghiGiay,
            capNhatDongHoLuc: serverNow(),
          },
    );
  };

  const adjustScore = (side: "do" | "xanh", delta: number) => {
    const key = side === "do" ? "diemChinhThucDo" : "diemChinhThucXanh";
    patch({
      [key]: live[key] + delta,
      diemDaChinhTay: true,
    } as Partial<LiveMatchState>);
  };

  const adjustNhacNho = (side: "do" | "xanh", delta: number) => {
    const key = side === "do" ? "canhCaoDo" : "canhCaoXanh";
    const scoreKey = side === "do" ? "diemChinhThucDo" : "diemChinhThucXanh";
    const next = Math.max(0, live[key] + delta);
    if (delta > 0 && next >= 3) {
      patch({
        [key]: 0,
        [scoreKey]: live[scoreKey] - 2,
      } as Partial<LiveMatchState>);
    } else {
      patch({ [key]: next } as Partial<LiveMatchState>);
    }
  };

  const restartMatch = () => {
    if (
      !window.confirm(
        "Đấu lại từ đầu? Toàn bộ điểm, nhắc nhở và tiến trình hiệp hiện tại sẽ bị xóa.",
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
      canhCaoDo: 0,
      canhCaoXanh: 0,
      nguoiThang: null,
    });
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
        {match.vong}
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
          {!daKetThuc && <LightBoxes presses={pressed.do.map((p) => p.diem)} />}
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
                  <button onClick={() => adjustScore("do", -1)}>
                    <Minus size={22} />
                  </button>
                  <button onClick={() => adjustScore("do", 1)}>
                    <Plus size={22} />
                  </button>
                </div>
                <div className={styles.warnRowBig}>
                  <span>Nhắc nhở (3 → tự trừ 2đ)</span>
                  <div className={styles.dotsBig}>
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className={
                          i < live.canhCaoDo ? styles.dotOnDo : styles.dotOff
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
                <button className={styles.timerBtn} onClick={batDauHiep}>
                  <Play size={15} /> Bắt đầu hiệp 1
                </button>
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
                !(laHiepCuoi && live.hiepHienTai > 0) && (
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
                  <button onClick={() => adjustScore("xanh", -1)}>
                    <Minus size={22} />
                  </button>
                  <button onClick={() => adjustScore("xanh", 1)}>
                    <Plus size={22} />
                  </button>
                </div>
                <div className={styles.warnRowBig}>
                  <span>Nhắc nhở (3 → tự trừ 2đ)</span>
                  <div className={styles.dotsBig}>
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className={
                          i < live.canhCaoXanh
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
              </>
            )}
          </div>
          {!daKetThuc && (
            <LightBoxes presses={pressed.xanh.map((p) => p.diem)} />
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
