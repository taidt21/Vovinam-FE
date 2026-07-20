/** @format */

import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { Shuffle } from "lucide-react";
import type { Athlete, CompetitionEvent, Match, Squad } from "../../types";
import { generateBracket } from "../../lib/bracket";
import BracketView from "../../components/BracketView/BracketView";
import styles from "./NoiDungBocTham.module.scss";

type AthleteRecord = Omit<Athlete, "noiDung" | "canNang"> & {
  eventIds: string[];
};

function getAthletesForEvent(
  athletes: AthleteRecord[],
  eventId: string,
  eventTen: string,
): Athlete[] {
  return athletes
    .filter((a) => a.eventIds.includes(eventId))
    .map(({ eventIds, ...rest }) => ({
      ...rest,
      noiDung: [eventTen],
    }));
}

function getSquadsForEvent(squads: Squad[], eventId: string): Squad[] {
  return squads.filter((s) => s.eventId === eventId);
}

function shuffleAndStore<T>(
  items: T[],
  eventId: string,
  setter: Dispatch<SetStateAction<Record<string, T[]>>>,
) {
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  setter((prev) => ({ ...prev, [eventId]: shuffled }));
}

function squadMemberNames(s: Squad, athletes: Athlete[]): string {
  return s.athleteIds
    .map((id) => athletes.find((a) => a.id === id)?.hoTen)
    .join(", ");
}

const LOAI_LABEL = { quyen: "Quyền", doi_khang: "Đối kháng" } as const;

function BocThamButton({
  onClick,
  count,
  hasResult,
  itemLabel,
}: {
  onClick: () => void;
  count: number;
  hasResult: boolean;
  itemLabel: string;
}) {
  const disabled = count < 2;
  return (
    <div className={styles.actions}>
      <button
        className={styles.btnPrimary}
        onClick={onClick}
        disabled={disabled}>
        <Shuffle size={16} /> {hasResult ? "Bốc thăm lại" : "Bốc thăm"}
      </button>
      {disabled && (
        <span className={styles.hint}>
          Cần tối thiểu 2 {itemLabel} để bốc thăm
        </span>
      )}
    </div>
  );
}

export default function NoiDungBocTham() {
  // Dữ liệu gốc — không nằm trong file này nữa, load thật qua fetch() từ
  // public/data/*.json. Sau này nối API thật, chỉ cần đổi đúng 3 URL bên
  // dưới (VD "/api/events") — phần còn lại của component không đổi gì.
  const [events, setEvents] = useState<CompetitionEvent[]>([]);
  const [athletes, setAthletes] = useState<AthleteRecord[]>([]);
  const [squads, setSquads] = useState<Squad[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/data/events.json").then((r) => r.json()),
      fetch("/data/athletes.json").then((r) => r.json()),
      fetch("/data/squads.json").then((r) => r.json()),
    ])
      .then(([eventsData, athletesData, squadsData]) => {
        setEvents(eventsData);
        setAthletes(athletesData);
        setSquads(squadsData);
      })
      .catch(() =>
        setLoadError(
          "Không tải được dữ liệu — kiểm tra lại 3 file trong public/data/",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const [tab, setTab] = useState<"quyen" | "doi_khang">("doi_khang");
  const [selectedId, setSelectedId] = useState("e1");
  const [bracketsByEvent, setBracketsByEvent] = useState<
    Record<string, Match[]>
  >({});
  const [orderByEvent, setOrderByEvent] = useState<Record<string, Athlete[]>>(
    {},
  );
  const [squadOrderByEvent, setSquadOrderByEvent] = useState<
    Record<string, Squad[]>
  >({});

  const eventsInTab = useMemo(
    () => events.filter((ev) => ev.loai === tab),
    [events, tab],
  );
  const selected = events.find((ev) => ev.id === selectedId) ?? eventsInTab[0];
  const athletesOfSelected = selected
    ? getAthletesForEvent(athletes, selected.id, selected.ten)
    : [];
  const bracket = selected ? bracketsByEvent[selected.id] : undefined;
  const order = selected ? orderByEvent[selected.id] : undefined;
  const squadsOfSelected = selected
    ? getSquadsForEvent(squads, selected.id)
    : [];
  const squadOrder = selected ? squadOrderByEvent[selected.id] : undefined;
  const isTeamEvent = selected?.hinhThucThi === "doi";

  const handleBocTham = () => {
    if (!selected) return;
    const matches = generateBracket(athletesOfSelected, selected.id);
    setBracketsByEvent((prev) => ({ ...prev, [selected.id]: matches }));
  };
  const handleBocThamQuyen = () =>
    selected &&
    shuffleAndStore(athletesOfSelected, selected.id, setOrderByEvent);
  const handleBocThamSquads = () =>
    selected &&
    shuffleAndStore(squadsOfSelected, selected.id, setSquadOrderByEvent);

  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.hint}>Đang tải dữ liệu...</p>
      </div>
    );
  }
  if (loadError) {
    return (
      <div className={styles.page}>
        <p className={styles.hint}>{loadError}</p>
      </div>
    );
  }

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

            <section className={styles.registeredSection}>
              <h2 className={styles.registeredTitle}>
                {isTeamEvent ? "Danh sách đội đăng ký" : "Danh sách đăng ký"}{" "}
                <span>
                  {isTeamEvent
                    ? `(${squadsOfSelected.length} đội)`
                    : `(${athletesOfSelected.length} người)`}
                </span>
              </h2>
              {isTeamEvent ? (
                squadsOfSelected.length > 0 ? (
                  <ol className={styles.athleteList}>
                    {squadsOfSelected.map((s) => (
                      <li key={s.id}>
                        <strong>{s.ten}</strong> —{" "}
                        {squadMemberNames(s, athletesOfSelected)}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className={styles.hint}>
                    Chưa có đội đăng ký nội dung này
                  </p>
                )
              ) : athletesOfSelected.length > 0 ? (
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
                <BocThamButton
                  onClick={handleBocTham}
                  count={athletesOfSelected.length}
                  hasResult={!!bracket}
                  itemLabel="VĐV đăng ký"
                />
                <BracketView
                  matches={bracket ?? []}
                  athletes={athletesOfSelected}
                />
              </>
            ) : isTeamEvent ? (
              <>
                <BocThamButton
                  onClick={handleBocThamSquads}
                  count={squadsOfSelected.length}
                  hasResult={!!squadOrder}
                  itemLabel="đội"
                />
                {squadOrder && (
                  <div className={styles.registeredSection}>
                    <h2 className={styles.registeredTitle}>Thứ tự thi diễn</h2>
                    <ol className={styles.athleteList}>
                      {squadOrder.map((s) => (
                        <li key={s.id}>
                          <strong>{s.ten}</strong> —{" "}
                          {squadMemberNames(s, athletesOfSelected)}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </>
            ) : (
              <>
                <BocThamButton
                  onClick={handleBocThamQuyen}
                  count={athletesOfSelected.length}
                  hasResult={!!order}
                  itemLabel="VĐV đăng ký"
                />
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
