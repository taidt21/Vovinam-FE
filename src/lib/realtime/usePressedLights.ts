import { useEffect, useRef, useState } from "react";
import { subscribeLightPressed, subscribeConsensus } from "./pressLightClient";

export interface PressedLights {
  do: { id: string; diem: number }[];
  xanh: { id: string; diem: number }[];
}

// Theo dõi các lần bấm đèn còn hiệu lực (chưa hết 1.5s, hoặc đã bị xoá vì
// vừa có đồng thuận) tại 1 sân — dùng chung cho Màn hình công khai lẫn
// Bàn thư ký, để cả 2 nơi luôn thấy y hệt nhau lúc trọng tài đang bấm.
export function usePressedLights(courtId: string): PressedLights {
  const [pressed, setPressed] = useState<PressedLights>({ do: [], xanh: [] });
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  useEffect(() => {
    const unsubPress = subscribeLightPressed(courtId, (e) => {
      const oldTimer = timersRef.current.get(e.giamDinhId);
      if (oldTimer) clearTimeout(oldTimer);

      setPressed((prev) => ({
        ...prev,
        [e.mau]: [
          ...prev[e.mau].filter((p) => p.id !== e.giamDinhId),
          { id: e.giamDinhId, diem: e.diem },
        ],
      }));

      const t = setTimeout(() => {
        setPressed((prev) => ({
          do: prev.do.filter((p) => p.id !== e.giamDinhId),
          xanh: prev.xanh.filter((p) => p.id !== e.giamDinhId),
        }));
        timersRef.current.delete(e.giamDinhId);
      }, 1500);
      timersRef.current.set(e.giamDinhId, t);
    });

    const unsubConsensus = subscribeConsensus(courtId, () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current.clear();
      setPressed({ do: [], xanh: [] });
    });

    return () => {
      unsubPress();
      unsubConsensus();
      // timersRef.current LUÔN là đúng 1 Map được tạo 1 lần (dòng 14-16),
      // chỉ bị mutate qua set/delete/clear chứ không bao giờ bị gán lại
      // Map mới — nên cảnh báo chung "ref có thể đã đổi lúc cleanup chạy"
      // không áp dụng đúng cho trường hợp này, khác với ref trỏ vào DOM
      // node có thể bị unmount trước cleanup.
      /* eslint-disable react-hooks/exhaustive-deps */
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current.clear();
      /* eslint-enable react-hooks/exhaustive-deps */
    };
  }, [courtId]);

  return pressed;
}
