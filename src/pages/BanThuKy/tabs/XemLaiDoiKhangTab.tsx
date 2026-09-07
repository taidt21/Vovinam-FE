/** @format */

import { Award, ArrowLeft, AlertTriangle, Siren } from "lucide-react";
import type { Match } from "../../../types";
import type { LiveMatchState } from "../../../types/live";
import type { MatchLogEntry } from "../../../lib/realtime/pressLightClient";
import AthleteAvatar from "../../../components/AthleteAvatar/AthleteAvatar";
import MatchLogPanel from "../../../components/MatchLogPanel/MatchLogPanel";
import { LY_DO_OPTIONS } from "../helpers";
import styles from "../BanThuKy.module.scss";

// Vòng 32 và Vòng 16 gộp chung nhãn "Vòng loại" — y hệt quy ước đã dùng
// ở DieuHanhDoiKhangTab.tsx, để hiện đúng như lúc trận này còn sống.
function nhanVong(vong: string): string {
  return vong === "Vòng 32" || vong === "Vòng 16" ? "Vòng loại" : vong;
}

// Xem lại 1 trận đối kháng ĐÃ KẾT THÚC — CHỈ ĐỌC, không có bất kỳ nút
// điều chỉnh/thao tác nào (không điểm +/-, không nhắc nhở/cảnh cáo/y tế
// có thể bấm, không tạm dừng/tiếp tục). Dữ liệu truyền vào (matchState,
// log) là ảnh chụp TĨNH đọc từ API /matches/{id}/xem-lai — KHÔNG qua
// SignalR, không tự cập nhật (trận đã xong, không có gì để cập nhật
// nữa).
//
// CỐ TÌNH tách thành component RIÊNG, không tái dùng trực tiếp
// DieuHanhDoiKhangTab.tsx (dù giao diện gần giống) — component đó đã
// qua rất nhiều lần sửa lỗi tinh vi (race condition, đồng bộ đồng hồ,
// chuông báo...), thêm nhánh "chỉ đọc" vào ngay giữa sẽ tăng rủi ro gây
// hồi quy cho đúng luồng đang thi đấu thật — tách riêng an toàn hơn hẳn,
// dù có trùng lặp phần hiển thị.
export default function XemLaiDoiKhangTab({
  match,
  eventTen,
  so,
  athleteName,
  athleteTeam,
  matchState,
  log,
  onBack,
}: {
  match: Match;
  eventTen: string;
  so?: number;
  athleteName: (id: string | null) => string | null;
  athleteTeam: (id: string | null) => string;
  matchState: LiveMatchState;
  log: MatchLogEntry[];
  onBack: () => void;
}) {
  const lyDoLabel =
    LY_DO_OPTIONS.find((o) => o.value === matchState.lyDoKetThuc)?.label ??
    matchState.lyDoKetThuc ??
    "—";

  return (
    <div className={styles.dieuHanh}>
      <div className={styles.matchMeta}>
        {so && <span className={styles.matchNoTag}>#{so}</span>} {eventTen} -{" "}
        {nhanVong(match.vong)}
        <span className={styles.xemLaiTag}>— Đang xem lại (chỉ đọc)</span>
      </div>

      <div className={styles.scoreBoardBig}>
        <div
          className={[
            styles.cornerDo,
            matchState.nguoiThang === "do"
              ? styles.cornerWinner
              : matchState.nguoiThang === "xanh"
                ? styles.cornerLoser
                : "",
          ]
            .filter(Boolean)
            .join(" ")}>
          <div className={styles.cornerMain}>
            <span className={styles.cornerLabelDo}>ĐỎ</span>
            <AthleteAvatar
              name={athleteName(match.athleteRedId) ?? "—"}
              photoUrl={matchState.anhDo}
              size={72}
            />
            <div className={styles.athNameBig}>
              {athleteName(match.athleteRedId)}
            </div>
            <div className={styles.athUnit}>
              {athleteTeam(match.athleteRedId)}
            </div>
            <div className={styles.scoreNumDoBig}>
              {matchState.diemChinhThucDo}
            </div>
            {matchState.nguoiThang === "do" && (
              <div className={styles.winnerBadge}>
                <Award size={16} /> Thắng
              </div>
            )}

            <div className={styles.statusPanel}>
              <div className={styles.statusRow}>
                <div className={styles.statusLeft}>
                  <span className={styles.statusLabel}>Nhắc nhở</span>
                  <div className={styles.miniDots}>
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className={
                          i < matchState.nhacNhoDo
                            ? styles.miniDotOn
                            : styles.miniDotOff
                        }
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className={`${styles.statusRow} ${styles.rowCanhCao}`}>
                <div className={styles.statusLeft}>
                  <AlertTriangle size={13} />
                  <span className={styles.statusLabel}>Cảnh cáo</span>
                  <div className={styles.miniDots}>
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className={
                          i < matchState.soCanhCaoHiepDo
                            ? styles.miniDotOn
                            : styles.miniDotOff
                        }
                      />
                    ))}
                  </div>
                </div>
                <span className={styles.matchCount}>
                  {matchState.soCanhCaoDo} / 4 cả trận
                </span>
              </div>
              <div className={`${styles.statusRow} ${styles.rowYTe}`}>
                <div className={styles.yTeTop}>
                  <div className={styles.statusLeft}>
                    <Siren size={13} />
                    <span className={styles.statusLabel}>Y tế</span>
                    <div className={styles.miniDots}>
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className={
                            i < matchState.soLanYTeHiepDo
                              ? styles.miniDotOn
                              : styles.miniDotOff
                          }
                        />
                      ))}
                    </div>
                  </div>
                  <span className={styles.matchCount}>
                    {matchState.soLanYTeDo} / 5 cả trận
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.timerCol}>
          <div className={styles.endedBox}>
            <Award size={28} />
            <span className={styles.endedLabel}>Đã kết thúc</span>
            <p className={styles.xemLaiLyDo}>Lý do: {lyDoLabel}</p>
            <button className={styles.btnPrimary} onClick={onBack}>
              <ArrowLeft size={16} /> Quay lại
            </button>
          </div>
        </div>

        <div className={styles.cornerXanh}>
          <div className={styles.cornerMain}>
            <span className={styles.cornerLabelXanh}>XANH</span>
            <AthleteAvatar
              name={athleteName(match.athleteBlueId) ?? "—"}
              photoUrl={matchState.anhXanh}
              size={72}
            />
            <div className={styles.athNameBig}>
              {athleteName(match.athleteBlueId)}
            </div>
            <div className={styles.athUnit}>
              {athleteTeam(match.athleteBlueId)}
            </div>
            <div className={styles.scoreNumXanhBig}>
              {matchState.diemChinhThucXanh}
            </div>
            {matchState.nguoiThang === "xanh" && (
              <div className={styles.winnerBadge}>
                <Award size={16} /> Thắng
              </div>
            )}

            <div className={styles.statusPanel}>
              <div className={styles.statusRow}>
                <div className={styles.statusLeft}>
                  <span className={styles.statusLabel}>Nhắc nhở</span>
                  <div className={styles.miniDots}>
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className={
                          i < matchState.nhacNhoXanh
                            ? styles.miniDotOn
                            : styles.miniDotOff
                        }
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className={`${styles.statusRow} ${styles.rowCanhCao}`}>
                <div className={styles.statusLeft}>
                  <AlertTriangle size={13} />
                  <span className={styles.statusLabel}>Cảnh cáo</span>
                  <div className={styles.miniDots}>
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className={
                          i < matchState.soCanhCaoHiepXanh
                            ? styles.miniDotOn
                            : styles.miniDotOff
                        }
                      />
                    ))}
                  </div>
                </div>
                <span className={styles.matchCount}>
                  {matchState.soCanhCaoXanh} / 4 cả trận
                </span>
              </div>
              <div className={`${styles.statusRow} ${styles.rowYTe}`}>
                <div className={styles.yTeTop}>
                  <div className={styles.statusLeft}>
                    <Siren size={13} />
                    <span className={styles.statusLabel}>Y tế</span>
                    <div className={styles.miniDots}>
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className={
                            i < matchState.soLanYTeHiepXanh
                              ? styles.miniDotOn
                              : styles.miniDotOff
                          }
                        />
                      ))}
                    </div>
                  </div>
                  <span className={styles.matchCount}>
                    {matchState.soLanYTeXanh} / 5 cả trận
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <MatchLogPanel courtId={match.courtId ?? ""} staticLog={log} />
    </div>
  );
}
