/** @format */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Award, Swords } from "lucide-react";
import { useCourts } from "../../lib/utils/useCourts";
import type { CourtBasic } from "../../lib/utils/courts";
import { usePressedLights, toPositionedPresses } from "../../lib/realtime/usePressedLights";
import {
  formatMmSs,
  getMatchSnapshot,
  subscribeMatchState,
  tinhThoiGianConLai,
} from "../../lib/realtime/liveMatchStore";
import {
  ensureJoinedCourt,
  subscribeConnectionState,
} from "../../lib/realtime/matchHubConnection";
import {
  getQuyenSnapshot,
  subscribeQuyenState,
} from "../../lib/realtime/liveQuyenStore";
import type { LiveQuyenState } from "../../types/liveQuyen";
import type {
  CompetitionEvent,
  LiveMatchState,
  Match,
  Tournament,
} from "../../types";
import { apiGet } from "../../lib/api/api";
import { fetchEvents } from "../../lib/api/eventsApi";
import { fetchMatches } from "../../lib/api/matchesApi";
import { numberDoiKhangMatches } from "../../lib/domain/bracket";
import { fetchQuyenJudgeScores } from "../../lib/api/quyenJudgeScoreApi";
import { tinhDiemQuyenTongHop } from "../../lib/domain/quyenScoring";
import { fetchTrongTai } from "../../lib/api/trongTaiApi";
import { useMatchBell } from "../../lib/audio/matchBell";
import AthleteAvatar from "../../components/AthleteAvatar/AthleteAvatar";
import styles from "./ManHinhCongKhai.module.scss";

const DEFAULT_TOURNAMENT_NAME = "GIẢI VOVINAM";

function AutoFitTournamentTitle({ text }: { text: string }) {
  const ref = useRef<HTMLHeadingElement>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const fit = () => {
      // Cho phép title tự xuống tối đa 3 dòng.
      // Chỉ thu nhỏ font khi nội dung vẫn vượt quá 3 dòng hoặc vượt bề ngang.
      const maxFontSize = Math.min(
        52,
        window.innerWidth * 0.03,
        window.innerHeight * 0.052,
      );
      const minFontSize = 18;

      let low = minFontSize;
      let high = Math.max(minFontSize, maxFontSize);
      let best = minFontSize;

      for (let i = 0; i < 12; i += 1) {
        const mid = (low + high) / 2;
        element.style.fontSize = `${mid}px`;

        const computed = window.getComputedStyle(element);
        const lineHeight = Number.parseFloat(computed.lineHeight);
        const maxHeight = lineHeight * 3 + 2;

        const fitsWidth = element.scrollWidth <= element.clientWidth + 1;
        const fitsThreeLines = element.scrollHeight <= maxHeight;

        if (fitsWidth && fitsThreeLines) {
          best = mid;
          low = mid;
        } else {
          high = mid;
        }
      }

      element.style.fontSize = `${Math.floor(best)}px`;
    };

    fit();
    window.addEventListener("resize", fit);

    document.fonts?.ready.then(fit).catch(() => {});

    return () => window.removeEventListener("resize", fit);
  }, [text]);

  return (
    <h1 ref={ref} className={styles.tournamentTitle} title={text}>
      {text}
    </h1>
  );
}

function responsiveAthleteAvatarSize(): number {
  if (typeof window === "undefined") return 96;

  return Math.round(
    Math.max(
      74,
      Math.min(148, window.innerWidth * 0.07, window.innerHeight * 0.125),
    ),
  );
}


function responsiveQuyenAvatarSize(): number {
  if (typeof window === "undefined") return 190;

  return Math.round(
    Math.max(
      160,
      Math.min(280, window.innerWidth * 0.13, window.innerHeight * 0.24),
    ),
  );
}

export default function ManHinhCongKhai() {
  const { courts, loadingCourts } = useCourts();
  const [searchParams] = useSearchParams();

  if (loadingCourts) {
    return <div className={styles.screen} />;
  }

  const court = courts.find((c) => c.id === searchParams.get("san"));
  if (!court) return <CourtChooser courts={courts} />;

  return (
    <CourtScreen
      court={court}
      autoFullscreen={searchParams.get("autoFullscreen") === "1"}
      matchNumberFallback={
        searchParams.get("tran") ?? searchParams.get("soTran")
      }
    />
  );
}

function CourtChooser({ courts }: { courts: CourtBasic[] }) {
  return (
    <div className={styles.screen}>
      <div className={styles.chooser}>
        <img
          className={styles.chooserLogo}
          src="/src/assets/VECTOR-SPORT-_5_.svg"
          alt="VECTOR SPORT"
        />
        <p className={styles.chooserHint}>Màn hình này chiếu cho sân nào?</p>
        <div className={styles.chooserGrid}>
          {courts.map((c) => (
            <Link
              key={c.id}
              className={styles.chooserCard}
              to={`/man-hinh-cong-khai?san=${c.id}`}>
              {c.ten}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function CourtScreen({
  court,
  autoFullscreen,
  matchNumberFallback,
}: {
  court: CourtBasic;
  autoFullscreen: boolean;
  matchNumberFallback: string | null;
}) {
  const [live, setLive] = useState<LiveMatchState | null>(() =>
    getMatchSnapshot(court.id),
  );
  const [liveQuyen, setLiveQuyen] = useState<LiveQuyenState | null>(() =>
    getQuyenSnapshot(court.id),
  );
  const [, setTick] = useState(0);
  const [tournamentName, setTournamentName] = useState(DEFAULT_TOURNAMENT_NAME);
  const [matchNumber, setMatchNumber] = useState<number | null>(() => {
    if (!matchNumberFallback) return null;
    const n = Number(matchNumberFallback);
    return Number.isFinite(n) && n > 0 ? n : null;
  });

  useEffect(() => {
    setLive(getMatchSnapshot(court.id));
    const unsub = subscribeMatchState(court.id, setLive);
    const unsubConn = subscribeConnectionState((connected) => {
      if (connected) ensureJoinedCourt(court.id).catch(() => {});
    });

    const watchdog = setInterval(() => {
      if (!getMatchSnapshot(court.id)) {
        ensureJoinedCourt(court.id).catch(() => {});
      }
    }, 3000);

    return () => {
      unsub();
      unsubConn();
      clearInterval(watchdog);
    };
  }, [court.id]);

  useEffect(() => {
    setLiveQuyen(getQuyenSnapshot(court.id));
    const unsub = subscribeQuyenState(court.id, setLiveQuyen);
    const unsubConn = subscribeConnectionState((connected) => {
      if (connected) ensureJoinedCourt(court.id).catch(() => {});
    });
    return () => {
      unsub();
      unsubConn();
    };
  }, [court.id]);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadPublicMeta = async () => {
      try {
        const [tournament, events, matches] = await Promise.all([
          apiGet<Tournament>("/tournament"),
          fetchEvents(),
          fetchMatches(),
        ]);
        if (cancelled) return;

        if (tournament.ten?.trim()) {
          setTournamentName(tournament.ten.trim().toLocaleUpperCase("vi"));
        }

        const byEvent: Record<string, Match[]> = {};
        for (const match of matches) {
          if (!byEvent[match.eventId]) byEvent[match.eventId] = [];
          byEvent[match.eventId].push(match);
        }

        const numbered = numberDoiKhangMatches(
          events as CompetitionEvent[],
          byEvent,
        );
        const current = numbered.find(
          ({ match }) =>
            match.courtId === court.id && match.trangThai === "dang_thi",
        );

        if (current) {
          setMatchNumber(current.so);
        } else if (matchNumberFallback) {
          const fallback = Number(matchNumberFallback);
          setMatchNumber(
            Number.isFinite(fallback) && fallback > 0 ? fallback : null,
          );
        } else {
          setMatchNumber(null);
        }
      } catch {
        // Màn hình công khai vẫn tiếp tục chạy bằng realtime ngay cả khi
        // metadata phụ (tên giải / số trận) tạm thời không tải được.
      }
    };

    loadPublicMeta();
    const id = setInterval(loadPublicMeta, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [court.id, matchNumberFallback]);

  // id -> thuTuGiamDinh (1-5) — MỖI LẦN BẤM ĐÈN chỉ gửi lên đúng
  // giamDinhId (GUID của trọng tài) + điểm, KHÔNG hề kèm số thứ tự 1-5
  // nào (xem PressedLights type). Không có bản đồ này thì không cách
  // nào biết đèn cần sáng ĐÚNG HÀNG nào — số thứ tự chỉ nằm ở dữ liệu
  // TrongTai (do Bàn thư ký gán sân/vị trí), phải tải riêng và tự khớp
  // theo id, không được đoán/suy diễn từ tên field lạ trên payload bấm
  // đèn (payload đó không có, và cũng không nên có — tách đúng 2 việc:
  // "ai vừa bấm" và "người đó đang ở vị trí nào" là 2 dữ liệu khác nhau).
  const [judgePositions, setJudgePositions] = useState<Record<string, number>>(
    {},
  );

  useEffect(() => {
    let cancelled = false;

    const loadJudgePositions = () => {
      fetchTrongTai()
        .then((list) => {
          if (cancelled) return;
          const map: Record<string, number> = {};
          for (const t of list) {
            if (t.courtId === court.id && t.thuTuGiamDinh !== null) {
              map[t.id] = t.thuTuGiamDinh;
            }
          }
          setJudgePositions(map);
        })
        .catch(() => {
          // Giữ nguyên bản đồ cũ nếu tải lỗi tạm thời — còn hơn xoá
          // trắng khiến đèn đang sáng đúng bỗng tắt hết.
        });
    };

    loadJudgePositions();
    const id = setInterval(loadJudgePositions, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [court.id]);

  useEffect(() => {
    const enterFullscreen = async () => {
      if (document.fullscreenElement) return;
      try {
        await document.documentElement.requestFullscreen({
          navigationUI: "hide",
        });
      } catch {
        // Chrome có thể chặn request tự động; double-click vẫn dùng được.
      }
    };

    const toggleFullscreen = () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else {
        enterFullscreen();
      }
    };

    document.addEventListener("dblclick", toggleFullscreen);
    if (autoFullscreen) enterFullscreen();

    return () => document.removeEventListener("dblclick", toggleFullscreen);
  }, [autoFullscreen]);

  const pressed = usePressedLights(court.id);
  useMatchBell(court.id, live?.trangThai, live?.hetHiepLuc);

  const compactHeader = (
    <header className={styles.compactHeader}>
      <span className={styles.compactTournament}>{tournamentName}</span>
      <span className={styles.compactCourt}>{court.ten}</span>
    </header>
  );

  if (!live && liveQuyen) {
    return <QuyenScreen header={compactHeader} live={liveQuyen} />;
  }

  if (!live) {
    return (
      <div className={styles.screen}>
        {compactHeader}
        <div className={styles.idleState}>
          <Swords size={64} />
          <span>Đang chờ trận tiếp theo</span>
        </div>
      </div>
    );
  }

  const remaining = tinhThoiGianConLai(live);
  const dangNghi = live.trangThai === "nghi_giua_hiep";
  const dangTamDung = live.trangThai === "tam_dung";
  const daKetThuc = live.trangThai === "da_ket_thuc";
  const choBatDau = live.trangThai === "cho_bat_dau";

  const sideClass = (nguoiThang: "do" | "xanh") =>
    !daKetThuc
      ? ""
      : live.nguoiThang === nguoiThang
        ? styles.sideWinner
        : styles.sideLoser;

  const timerTitle = daKetThuc
    ? "KẾT THÚC"
    : dangNghi
      ? `Nghỉ hiệp ${live.hiepHienTai}`
      : `Hiệp ${live.hiepHienTai}`;

  const statusLabel = choBatDau
    ? "SẮP THI ĐẤU"
    : dangTamDung
      ? "TẠM DỪNG"
      : dangNghi
        ? "NGHỈ GIỮA HIỆP"
        : null;

  return (
    <div className={styles.combatScreen}>
      <PublicTopHeader
        tournamentName={tournamentName}
        courtName={court.ten}
        matchNumber={matchNumber}
        roundLabel={timerTitle}
        timeLabel={daKetThuc ? "--:--" : formatMmSs(remaining)}
        statusLabel={statusLabel}
      />

      <JudgePanel
        side="do"
        presses={choBatDau ? [] : pressed.do}
        judgePositions={judgePositions}
      />

      <main className={styles.fightStage}>
        <section
          className={`${styles.fighterSide} ${styles.redSide} ${sideClass("do")}`}>
          {(live.nhacNhoDo > 0 || live.soCanhCaoDo > 0) && (
            <div className={styles.canhBaoOverlay}>
              {live.nhacNhoDo > 0 && (
                <span className={styles.nhacNhoMark}>
                  {"!".repeat(live.nhacNhoDo)}
                </span>
              )}
              {live.soCanhCaoDo > 0 && (
                <span className={styles.canhCaoIcons}>
                  {Array.from({ length: live.soCanhCaoDo }, (_, i) => (
                    <span key={i} className={styles.canhCaoIcon}>
                      ⚠
                    </span>
                  ))}
                </span>
              )}
            </div>
          )}
          <div className={styles.scoreValue}>{live.diemChinhThucDo}</div>
          {daKetThuc && live.nguoiThang === "do" && (
            <div className={`${styles.winnerTag} ${styles.winnerTagLeft}`}>
              <Award size={22} /> THẮNG
            </div>
          )}
          <AthleteBar
            side="do"
            name={live.tenDo}
            unit={live.donViDo}
            photoUrl={live.anhDo}
          />
        </section>

        <section
          className={`${styles.fighterSide} ${styles.blueSide} ${sideClass("xanh")}`}>
          {(live.nhacNhoXanh > 0 || live.soCanhCaoXanh > 0) && (
            <div className={styles.canhBaoOverlay}>
              {live.nhacNhoXanh > 0 && (
                <span className={styles.nhacNhoMark}>
                  {"!".repeat(live.nhacNhoXanh)}
                </span>
              )}
              {live.soCanhCaoXanh > 0 && (
                <span className={styles.canhCaoIcons}>
                  {Array.from({ length: live.soCanhCaoXanh }, (_, i) => (
                    <span key={i} className={styles.canhCaoIcon}>
                      ⚠
                    </span>
                  ))}
                </span>
              )}
            </div>
          )}
          <div className={styles.scoreValue}>{live.diemChinhThucXanh}</div>
          {daKetThuc && live.nguoiThang === "xanh" && (
            <div className={`${styles.winnerTag} ${styles.winnerTagRight}`}>
              <Award size={22} /> THẮNG
            </div>
          )}
          <AthleteBar
            side="xanh"
            name={live.tenXanh}
            unit={live.donViXanh}
            photoUrl={live.anhXanh}
          />
        </section>
      </main>

      <JudgePanel
        side="xanh"
        presses={choBatDau ? [] : pressed.xanh}
        judgePositions={judgePositions}
      />
    </div>
  );
}

function PublicTopHeader({
  tournamentName,
  courtName,
  matchNumber,
  roundLabel,
  timeLabel,
  statusLabel,
}: {
  tournamentName: string;
  courtName: string;
  matchNumber: number | null;
  roundLabel: string;
  timeLabel: string;
  statusLabel: string | null;
}) {
  return (
    <header className={styles.publicHeader}>
      <AutoFitTournamentTitle text={tournamentName} />

      <div className={styles.courtMeta}>
        <strong>{courtName}</strong>
        <span>Trận số : {matchNumber ?? "—"}</span>
      </div>

      <div className={styles.timerCard}>
        <span className={styles.timerRound}>{roundLabel}</span>
        <strong className={styles.timerValue}>{timeLabel}</strong>
      </div>

      {statusLabel && <span className={styles.statusPill}>{statusLabel}</span>}
    </header>
  );
}

function JudgePanel({
  side,
  presses,
  judgePositions,
}: {
  side: "do" | "xanh";
  presses: readonly { id: string; diem: number }[];
  judgePositions: Record<string, number>;
}) {
  const isRed = side === "do";
  const fiveJudges = toPositionedPresses(presses, judgePositions);

  return (
    <aside
      className={`${styles.judgePanel} ${
        isRed ? styles.judgePanelRed : styles.judgePanelBlue
      }`}>
      <div className={styles.judgeTitle}>GIÁM ĐỊNH</div>
      <div className={styles.judgeHead}>
        <span />
      </div>
      <div className={styles.judgeGrid}>
        {fiveJudges.map((score, index) => {
          // +1: sáng ô 1. +2: sáng CẢ ô 1 và ô 2.
          const firstLightOn = typeof score === "number" && score >= 1;
          const secondLightOn = typeof score === "number" && score >= 2;

          return (
            <div className={styles.judgeRow} key={index}>
              <strong className={styles.judgeIndex}>{index + 1}</strong>
              <span
                className={`${styles.judgeLight} ${
                  firstLightOn ? styles.judgeLightOn : ""
                }`}
              />
              <span
                className={`${styles.judgeLight} ${
                  secondLightOn ? styles.judgeLightOn : ""
                }`}
              />
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function AthleteBar({
  side,
  name,
  unit,
  photoUrl,
}: {
  side: "do" | "xanh";
  name: string;
  unit: string;
  photoUrl: string | null | undefined;
}) {
  const avatar = (
    <div className={styles.athleteAvatarWrap}>
      <AthleteAvatar
        name={name}
        photoUrl={photoUrl}
        size={responsiveAthleteAvatarSize()}
      />
    </div>
  );

  const info = (
    <div className={styles.athleteInfo}>
      <div className={styles.athleteName}>{name}</div>
      <div className={styles.athleteUnit}>{unit}</div>
    </div>
  );

  return (
    <footer
      className={`${styles.athleteBar} ${
        side === "do" ? styles.athleteBarRed : styles.athleteBarBlue
      }`}>
      {side === "do" ? (
        <>
          {avatar}
          {info}
        </>
      ) : (
        <>
          {info}
          {avatar}
        </>
      )}
    </footer>
  );
}

function QuyenScreen({
  header,
  live,
}: {
  header: React.ReactNode;
  live: LiveQuyenState;
}) {
  const daTroi =
    live.trangThai === "dang_thi"
      ? live.thoiGianDaTroiGiay + (Date.now() - live.capNhatDongHoLuc) / 1000
      : live.thoiGianDaTroiGiay;
  const hienThi = live.coGioiHan
    ? Math.max(0, (live.thoiGianGioiHanGiay ?? 0) - daTroi)
    : daTroi;
  const mm = Math.floor(hienThi / 60);
  const ss = Math.floor(hienThi % 60);
  const timeLabel = `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  const daKetThuc = live.trangThai === "da_ket_thuc";
  const dangThi = live.trangThai === "dang_thi";

  const [diemTongHop, setDiemTongHop] = useState<number | null>(null);
  // 5 điểm riêng từng giám định đã gửi — hiện kèm điểm tổng hợp lúc kết
  // thúc, dạng bảng đánh số 1-5 theo đúng thứ tự API trả về (không hiện
  // tên thật, đơn giản hoá để nhìn từ xa dễ hơn).
  const [diemTungGiamDinh, setDiemTungGiamDinh] = useState<number[]>([]);
  useEffect(() => {
    if (!daKetThuc) {
      setDiemTongHop(null);
      setDiemTungGiamDinh([]);
      return;
    }
    let huy = false;
    const taiDiem = () => {
      fetchQuyenJudgeScores()
        .then((all) => {
          if (huy) return;
          const cuaLuotNay = all.filter(
            (s) =>
              s.eventId === live.eventId &&
              s.athleteId === live.athleteId &&
              s.teamId === live.teamId,
          );
          setDiemTungGiamDinh(cuaLuotNay.map((s) => s.diem));
          setDiemTongHop(tinhDiemQuyenTongHop(cuaLuotNay.map((s) => s.diem)));
        })
        .catch(() => {});
    };
    taiDiem();
    const id = setInterval(taiDiem, 3000);
    return () => {
      huy = true;
      clearInterval(id);
    };
  }, [daKetThuc, live.eventId, live.athleteId, live.teamId]);

  return (
    <div className={`${styles.screen} ${styles.quyenScreen}`}>
      {header}
      <div className={styles.quyenEvent}>{live.eventTen}</div>
      <div className={styles.quyenPerformerBig}>
        <AthleteAvatar
          name={live.performerLabel}
          photoUrl={live.photoUrl}
          size={responsiveQuyenAvatarSize()}
        />
        <div className={styles.quyenName}>{live.performerLabel}</div>
        <div className={styles.quyenUnit}>{live.performerSub}</div>
        {!daKetThuc && live.trangThai !== "cho_bat_dau" && (
          <span className={styles.quyenClock}>{timeLabel}</span>
        )}
        {live.trangThai === "tam_dung" && (
          <span className={styles.quyenStatus}>TẠM DỪNG</span>
        )}
        {live.trangThai === "cho_bat_dau" && (
          <span className={styles.quyenStatus}>SẮP THI ĐẤU</span>
        )}
        {dangThi && <span className={styles.quyenLive}>TRỰC TIẾP</span>}
        {daKetThuc && diemTongHop !== null && (
          <>
            <div className={styles.quyenScore}>{diemTongHop.toFixed(2)}</div>
            {diemTungGiamDinh.length > 0 && (
              <table className={styles.quyenBangGiamDinh}>
                <thead>
                  <tr>
                    <th>Giám định</th>
                    <th>Điểm</th>
                  </tr>
                </thead>
                <tbody>
                  {diemTungGiamDinh.map((diem, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>{diem.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </div>
  );
}
