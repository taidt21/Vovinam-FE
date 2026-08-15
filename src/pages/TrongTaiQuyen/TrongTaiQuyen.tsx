/** @format */

import { useEffect, useMemo, useState } from "react";
import { Check, RefreshCw, List, Radio } from "lucide-react";
import { fetchEvents } from "../../lib/api/eventsApi";
import { apiGet } from "../../lib/api/api";
import { useCourts } from "../../lib/utils/useCourts";
import type { CourtBasic } from "../../lib/utils/courts";
import {
  fetchQuyenJudgeScores,
  upsertQuyenJudgeScore,
  type QuyenJudgeScoreWire,
} from "../../lib/api/quyenJudgeScoreApi";
import {
  getQuyenSnapshot,
  subscribeQuyenState,
} from "../../lib/realtime/liveQuyenStore";
import type { LiveQuyenState } from "../../types/liveQuyen";
import { formatEventNhomTuoi } from "../../lib/utils/nhomTuoi";
import { fetchTrongTai, type TrongTaiWire } from "../../lib/api/trongTaiApi";
import AthleteAvatar from "../../components/AthleteAvatar/AthleteAvatar";
import type { AthleteRecord, CompetitionEvent } from "../../types";
import styles from "./TrongTaiQuyen.module.scss";

const IDENTITY_KEY = "vovinam:trong-tai-quyen:identity";

interface Identity {
  giamKhaoId: string;
  tenGiamKhao: string;
  courtId: string;
}
interface PerformanceOrderWire {
  id: string;
  eventId: string;
  athleteId: string | null;
  teamId: string | null;
  thuTu: number;
}
interface QuyenItem {
  event: CompetitionEvent;
  athleteId: string | null;
  teamId: string | null;
  label: string;
  so: number;
}
interface Selection {
  eventId: string;
  athleteId: string | null;
  teamId: string | null;
  label: string;
  sub: string;
  photoUrl: string | null;
}

function loadIdentity(): Identity | null {
  try {
    const raw = localStorage.getItem(IDENTITY_KEY);
    return raw ? (JSON.parse(raw) as Identity) : null;
  } catch {
    return null;
  }
}
function saveIdentity(id: Identity) {
  try {
    localStorage.setItem(IDENTITY_KEY, JSON.stringify(id));
  } catch {
    // bỏ qua — vẫn hoạt động trong phiên hiện tại, chỉ mất khi F5
  }
}

function computeItems(
  events: CompetitionEvent[],
  orders: PerformanceOrderWire[],
  athletes: AthleteRecord[],
  teams: { id: string; ten: string }[],
): QuyenItem[] {
  const athleteName = (id: string) =>
    athletes.find((a) => a.id === id)?.hoTen ?? "—";
  const teamName = (teamId: string) =>
    teams.find((t) => t.id === teamId)?.ten ?? "—";

  const quyenEvents = events.filter((e) => e.loai === "quyen");
  const flat = [...quyenEvents]
    .sort((a, b) =>
      a.nhomTuoi === "hon_hop"
        ? 1
        : b.nhomTuoi === "hon_hop"
          ? -1
          : (a.nhomTuoi as number) - (b.nhomTuoi as number),
    )
    .flatMap((ev) => {
      const evOrders = orders
        .filter((o) => o.eventId === ev.id)
        .sort((a, b) => a.thuTu - b.thuTu);
      return evOrders.map((o) => ({
        event: ev,
        athleteId: o.athleteId,
        teamId: o.teamId,
        label: o.athleteId
          ? athleteName(o.athleteId)
          : `Đội ${teamName(o.teamId!)}`,
      }));
    });
  return flat.map((x, i) => ({ ...x, so: i + 1 }));
}

function scoreMatchesSelection(
  s: QuyenJudgeScoreWire,
  sel: Pick<Selection, "eventId" | "athleteId" | "teamId">,
): boolean {
  return (
    s.eventId === sel.eventId &&
    s.athleteId === sel.athleteId &&
    s.teamId === sel.teamId
  );
}

export default function TrongTaiQuyen() {
  const { courts, loadingCourts } = useCourts();
  const [identity, setIdentity] = useState<Identity | null>(() =>
    loadIdentity(),
  );

  if (loadingCourts)
    return <p className={styles.hint}>Đang tải danh sách sân...</p>;

  if (!identity) {
    return (
      <SetupScreen
        courts={courts}
        onDone={(id) => {
          saveIdentity(id);
          setIdentity(id);
        }}
      />
    );
  }
  return (
    <MainScreen
      identity={identity}
      courts={courts}
      onChangeSetup={() => setIdentity(null)}
    />
  );
}

function SetupScreen({
  courts,
  onDone,
}: {
  courts: CourtBasic[];
  onDone: (id: Identity) => void;
}) {
  const [list, setList] = useState<TrongTaiWire[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchTrongTai()
      .then((data) => setList(data.filter((t) => t.thuTuGiamDinh !== null)))
      .catch(() => setError(true));
  }, []);

  const tenSan = (courtId: string | null) =>
    courts.find((c) => c.id === courtId)?.ten ?? courtId ?? "—";

  const pick = (t: TrongTaiWire) => {
    if (!t.courtId) return;
    onDone({ giamKhaoId: t.id, tenGiamKhao: t.hoTen, courtId: t.courtId });
  };

  return (
    <div className={styles.setupPage}>
      <h1 className={styles.setupTitle}>Trọng tài quyền</h1>
      <p className={styles.hint}>Chọn đúng tên của bạn trong danh sách</p>

      {error && (
        <p className={styles.hint}>
          Không tải được danh sách — kiểm tra mạng rồi thử lại.
        </p>
      )}
      {list === null && !error && <p className={styles.hint}>Đang tải...</p>}
      {list !== null && list.length === 0 && (
        <p className={styles.hint}>
          Chưa có ai được Bàn thư ký gán làm giám định. Liên hệ Bàn thư ký trước
          khi vào chấm.
        </p>
      )}

      <div className={styles.pickerList}>
        {list?.map((t) => (
          <button
            key={t.id}
            type="button"
            className={styles.pickerBtn}
            onClick={() => pick(t)}>
            <span className={styles.pickerName}>{t.hoTen}</span>
            <span className={styles.pickerSub}>
              Giám định {t.thuTuGiamDinh} · {tenSan(t.courtId)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function MainScreen({
  identity,
  courts,
  onChangeSetup,
}: {
  identity: Identity;
  courts: CourtBasic[];
  onChangeSetup: () => void;
}) {
  const { giamKhaoId, tenGiamKhao, courtId } = identity;
  const courtName = courts.find((c) => c.id === courtId)?.ten ?? "";

  const [events, setEvents] = useState<CompetitionEvent[]>([]);
  const [athletes, setAthletes] = useState<AthleteRecord[]>([]);
  const [teams, setTeams] = useState<{ id: string; ten: string }[]>([]);
  const [orders, setOrders] = useState<PerformanceOrderWire[]>([]);
  const [allScores, setAllScores] = useState<QuyenJudgeScoreWire[]>([]);
  const [loading, setLoading] = useState(true);

  const [liveQuyen, setLiveQuyen] = useState<LiveQuyenState | null>(() =>
    getQuyenSnapshot(courtId),
  );
  const [viewMode, setViewMode] = useState<"live" | "list">("live");
  const [manualSelection, setManualSelection] = useState<Selection | null>(
    null,
  );

  useEffect(() => {
    setLiveQuyen(getQuyenSnapshot(courtId));
    return subscribeQuyenState(courtId, setLiveQuyen);
  }, [courtId]);

  const loadAll = () =>
    Promise.all([
      fetchEvents(),
      apiGet<AthleteRecord[]>("/dashboard/athletes"),
      apiGet<{ id: string; ten: string }[]>("/dashboard/teams"),
      apiGet<PerformanceOrderWire[]>("/performance-orders"),
      fetchQuyenJudgeScores(),
    ]).then(([eventsData, athletesData, teamsData, ordersData, scoresData]) => {
      setEvents(eventsData);
      setAthletes(athletesData);
      setTeams(teamsData);
      setOrders(ordersData);
      setAllScores(scoresData);
      return { eventsData, athletesData, teamsData, ordersData, scoresData };
    });

  useEffect(() => {
    loadAll()
      .catch(() => {})
      .finally(() => setLoading(false));
    const id = setInterval(() => loadAll().catch(() => {}), 3000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const items = useMemo(
    () => computeItems(events, orders, athletes, teams),
    [events, orders, athletes, teams],
  );

  // const athleteName = (id: string) =>
  //   athletes.find((a) => a.id === id)?.hoTen ?? "—";
  const athletePhoto = (id: string) =>
    athletes.find((a) => a.id === id)?.anhDaiDien ?? null;

  // "Đang chấm" = ưu tiên lượt đang sống thật tại đúng sân này; nếu thư ký
  // chưa đưa ai vào sân, cho phép tự chọn tay từ danh sách đầy đủ (bù cho
  // lượt đã lỡ, hoặc chấm trước khi có cơ chế sân).
  const liveSelection: Selection | null = liveQuyen
    ? {
        eventId: liveQuyen.eventId,
        athleteId: liveQuyen.athleteId,
        teamId: liveQuyen.teamId,
        label: liveQuyen.performerLabel,
        sub: liveQuyen.performerSub,
        photoUrl: liveQuyen.photoUrl,
      }
    : null;
  const current = viewMode === "live" ? liveSelection : manualSelection;

  const pickFromList = (item: QuyenItem) => {
    setManualSelection({
      eventId: item.event.id,
      athleteId: item.athleteId,
      teamId: item.teamId,
      label: item.label,
      sub: formatEventNhomTuoi(item.event.nhomTuoi),
      photoUrl: item.athleteId ? athletePhoto(item.athleteId) : null,
    });
    setViewMode("list");
  };

  if (loading) return <p className={styles.hint}>Đang tải danh sách...</p>;

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div>
          <div className={styles.tenGiamKhao}>{tenGiamKhao}</div>
          <div className={styles.courtLabel}>{courtName}</div>
        </div>
        <button className={styles.changeBtn} onClick={onChangeSetup}>
          Đổi
        </button>
      </div>

      <div className={styles.modeTabs}>
        <button
          className={
            viewMode === "live" ? styles.modeTabActive : styles.modeTab
          }
          onClick={() => setViewMode("live")}>
          <Radio size={14} /> Đang thi tại sân
        </button>
        <button
          className={
            viewMode === "list" ? styles.modeTabActive : styles.modeTab
          }
          onClick={() => setViewMode("list")}>
          <List size={14} /> Toàn bộ danh sách
        </button>
      </div>

      {viewMode === "live" && !liveQuyen && (
        <div className={styles.noMatch}>
          Chưa có ai được đưa vào {courtName} để thi quyền. Chờ Bàn thư ký bắt
          đầu, hoặc chuyển sang "Toàn bộ danh sách" nếu cần chấm bù 1 lượt đã
          qua.
        </div>
      )}

      {current && (
        <QuyenScoringPanel
          key={`${current.eventId}::${current.athleteId ?? ""}::${current.teamId ?? ""}`}
          selection={current}
          eventTen={events.find((e) => e.id === current.eventId)?.ten ?? ""}
          nhomTuoiLabel={formatEventNhomTuoi(
            events.find((e) => e.id === current.eventId)?.nhomTuoi ?? 1,
          )}
          giamKhaoId={giamKhaoId}
          tenGiamKhao={tenGiamKhao}
          allScores={allScores}
          live={viewMode === "live" ? liveQuyen : null}
          onSubmitted={(fresh) => setAllScores(fresh)}
        />
      )}

      {viewMode === "list" && !current && (
        <div className={styles.listWrap}>
          <div className={styles.listTitle}>
            Chọn lượt để chấm ({items.length})
          </div>
          {items.map((item, i) => {
            const count = allScores.filter((s) =>
              scoreMatchesSelection(s, {
                eventId: item.event.id,
                athleteId: item.athleteId,
                teamId: item.teamId,
              }),
            ).length;
            const mine = allScores.some(
              (s) =>
                scoreMatchesSelection(s, {
                  eventId: item.event.id,
                  athleteId: item.athleteId,
                  teamId: item.teamId,
                }) && s.giamKhaoId === giamKhaoId,
            );
            return (
              <button
                key={i}
                className={styles.listRow}
                onClick={() => pickFromList(item)}>
                <span className={styles.listNo}>#{item.so}</span>
                <div className={styles.listInfo}>
                  <div className={styles.listEvent}>
                    {item.event.ten} ·{" "}
                    {formatEventNhomTuoi(item.event.nhomTuoi)}
                  </div>
                  <div className={styles.listName}>{item.label}</div>
                </div>
                <span className={mine ? styles.doneTag : styles.pendingTag}>
                  {mine ? <Check size={12} /> : null} {count}/5
                </span>
              </button>
            );
          })}
          {items.length === 0 && (
            <p className={styles.hint}>
              Chưa có lượt thi quyền nào — cần bốc thăm/xếp thứ tự ở Nội dung &
              bốc thăm trước.
            </p>
          )}
        </div>
      )}

      {viewMode === "list" && current && (
        <button
          className={styles.backBtn}
          onClick={() => setManualSelection(null)}>
          ← Quay lại danh sách
        </button>
      )}
    </div>
  );
}

/* ============ Khối chấm điểm dùng chung cho cả 2 chế độ ============ */
function QuyenScoringPanel({
  selection,
  eventTen,
  nhomTuoiLabel,
  giamKhaoId,
  tenGiamKhao,
  allScores,
  live,
  onSubmitted,
}: {
  selection: Selection;
  eventTen: string;
  nhomTuoiLabel: string;
  giamKhaoId: string;
  tenGiamKhao: string;
  allScores: QuyenJudgeScoreWire[];
  live: LiveQuyenState | null;
  onSubmitted: (fresh: QuyenJudgeScoreWire[]) => void;
}) {
  const existing = allScores.find(
    (s) => scoreMatchesSelection(s, selection) && s.giamKhaoId === giamKhaoId,
  );
  const [diemNhap, setDiemNhap] = useState<string>(() =>
    existing ? String(existing.diem) : "",
  );
  const [submitting, setSubmitting] = useState(false);

  const scores = allScores.filter((s) => scoreMatchesSelection(s, selection));
  const diemHienTai = diemNhap === "" ? 0 : Number(diemNhap);

  // Bàn phím số — tối đa 2 chữ số, mỗi trọng tài chỉ được nhập điểm <= 99.
  const nhanSo = (so: number) =>
    setDiemNhap((prev) => (prev.length >= 2 ? prev : prev + String(so)));
  const xoaSo = () => setDiemNhap((prev) => prev.slice(0, -1));

  // Chỉ khoá khi đang ở chế độ "Đang thi tại sân" (live khác null) và Bàn
  // thư ký CHƯA bấm Bắt đầu. Chế độ "Toàn bộ danh sách" (chấm bù lượt đã
  // qua) không có state sống để đối chiếu nên không bị khoá.
  const chuaBatDau = live?.trangThai === "cho_bat_dau";

  const submit = async () => {
    setSubmitting(true);
    try {
      await upsertQuyenJudgeScore({
        eventId: selection.eventId,
        athleteId: selection.athleteId,
        teamId: selection.teamId,
        giamKhaoId,
        tenGiamKhao,
        diem: diemHienTai,
        chiTietJson: null,
      });
      const fresh = await fetchQuyenJudgeScores();
      onSubmitted(fresh);
    } catch {
      window.alert("Gửi điểm thất bại — kiểm tra mạng rồi thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.scoreWrap}>
      <div className={styles.performerCard}>
        <AthleteAvatar
          name={selection.label}
          photoUrl={selection.photoUrl}
          size={72}
        />
        <div>
          <div className={styles.matchMeta}>
            {eventTen} · {nhomTuoiLabel}
          </div>
          <div className={styles.performerName}>{selection.label}</div>
          <div className={styles.performerSub}>{selection.sub}</div>
        </div>
      </div>

      <div className={styles.progressNote}>
        <RefreshCw size={12} /> Đã có {scores.length}/5 trọng tài chấm lượt này
      </div>

      {chuaBatDau ? (
        <p className={styles.hint}>
          Chờ Bàn thư ký bấm "Bắt đầu" ở sân này thì mới chấm được lượt này.
        </p>
      ) : (
        <>
          <div className={styles.scoreDisplay}>
            <span className={styles.scoreDisplayLabel}>Điểm hiện tại</span>
            <span className={styles.scoreDisplayNum}>{diemNhap || "–"}</span>
          </div>

          <div className={styles.keypadGrid}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((so) => (
              <button
                key={so}
                type="button"
                className={styles.keypadBtn}
                disabled={diemNhap.length >= 2}
                onClick={() => nhanSo(so)}>
                {so}
              </button>
            ))}
            <div />
            <button
              type="button"
              className={styles.keypadBtn}
              disabled={diemNhap.length >= 2}
              onClick={() => nhanSo(0)}>
              0
            </button>
            <button
              type="button"
              className={styles.keypadBtnXoa}
              disabled={diemNhap === ""}
              onClick={xoaSo}
              aria-label="Xoá số vừa nhập">
              Xóa
            </button>
          </div>

          <button
            className={styles.btnPrimaryBig}
            disabled={submitting || diemNhap === ""}
            onClick={submit}>
            <Check size={18} /> {submitting ? "Đang gửi..." : "Gửi điểm"}
          </button>
        </>
      )}

      {existing && (
        <p className={styles.savedNote}>
          Đã gửi lúc {new Date(existing.capNhatLuc).toLocaleTimeString("vi-VN")}{" "}
          — gửi lại sẽ ghi đè điểm cũ.
        </p>
      )}
    </div>
  );
}
