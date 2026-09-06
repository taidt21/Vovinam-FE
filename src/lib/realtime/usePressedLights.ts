import { useEffect, useRef, useState } from "react";
import { subscribeLightPressed } from "./pressLightClient";

export interface PressedLights {
  do: { id: string; diem: number }[];
  xanh: { id: string; diem: number }[];
}

// LightBoxes (và JudgePanel bên màn hình công khai) cần đúng 1 mảng 5
// phần tử theo VỊ TRÍ giám định (1-5), phần tử nào không ai bấm thì để
// trống (undefined) — trong khi presses ở trên chỉ là "những ai ĐANG
// bấm ngay lúc này" (không theo thứ tự cố định nào, gọn dần khi có
// người nhả tay). Việc bấm đèn CHỈ gửi kèm giamDinhId, không có sẵn số
// thứ tự — số thứ tự nằm ở dữ liệu Trọng tài (Bàn thư ký gán sân/vị
// trí), phải tự khớp theo id, dùng chung đúng 1 hàm ở đây thay vì viết
// lại logic này riêng ở từng nơi hiển thị đèn.
export function toPositionedPresses(
  presses: readonly { id: string; diem: number }[],
  judgePositions: Record<string, number>,
): (number | undefined)[] {
  const result: (number | undefined)[] = Array(5).fill(undefined);
  for (const press of presses) {
    const viTri = judgePositions[press.id];
    // Không rõ vị trí thì bỏ qua, không đoán đại 1 chỗ nào — sáng nhầm
    // hàng còn tệ hơn tạm thời chưa sáng hàng nào.
    if (viTri && viTri >= 1 && viTri <= 5) {
      result[viTri - 1] = press.diem;
    }
  }
  return result;
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

    // TRƯỚC ĐÂY: nghe thêm sự kiện ConsensusScored (đủ 3/5 người đồng
    // thuận, backend chốt điểm) để XOÁ SẠCH toàn bộ đèn ngay lập tức —
    // tưởng là dọn dẹp cho gọn, nhưng 5 giám định bấm gần như đồng thời
    // thì backend vẫn xử lý TUẦN TỰ từng lượt: người thứ 3 vừa đủ ngưỡng
    // là bắn ConsensusScored NGAY, xoá mất cả 3 đèn vừa sáng — người thứ
    // 4, 5 bấm sau đó vài mili-giây mới kịp sáng lên, nên chỉ còn thấy
    // tối đa 2 đèn dù cả 5 người đều đã bấm. Bỏ hẳn việc tự xoá theo sự
    // kiện này — để MỖI đèn tự tắt theo đúng hẹn giờ 1.5s CỦA RIÊNG NÓ
    // (y hệt trường hợp không đạt đồng thuận), không bị xoá sớm chỉ vì
    // đã đủ số đồng thuận ở lượt đó.
    return () => {
      unsubPress();
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
