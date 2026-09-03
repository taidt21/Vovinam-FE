/** @format */

import { useEffect, useLayoutEffect, useRef, useState } from "react";

// Tách "Họ / tên đệm.../ Tên" theo đúng khoảng trắng — không cố phân
// tích ngữ nghĩa tên tiếng Việt (họ kép, tên đệm kép...), chỉ đơn giản:
// từ ĐẦU TIÊN luôn là họ, từ CUỐI CÙNG luôn là tên, mọi từ Ở GIỮA đều là
// ứng viên để viết tắt — đúng khớp với ví dụ đã cho.
function tachTuTen(hoTen: string): string[] {
  return hoTen.trim().split(/\s+/).filter(Boolean);
}

// step=0: đầy đủ. step=1: viết tắt từ đệm ĐẦU TIÊN (ngay sau họ). step=2:
// viết tắt thêm từ đệm kế tiếp. Cứ thế tới khi hết từ đệm (họ và tên
// cuối luôn giữ nguyên, không bao giờ viết tắt 2 từ này).
function apDungVietTat(tuTen: string[], step: number): string {
  if (step <= 0 || tuTen.length <= 2) return tuTen.join(" ");
  const ketQua = [...tuTen];
  const soTuDemToiDa = tuTen.length - 2;
  const soLanApDung = Math.min(step, soTuDemToiDa);
  for (let i = 1; i <= soLanApDung; i++) {
    const tu = ketQua[i];
    if (tu) ketQua[i] = tu.charAt(0).toUpperCase() + ".";
  }
  return ketQua.join(" ");
}

// Thay thế trực tiếp cho việc viết {hoTen} vào 1 ô field cố định (VD:
// <div className={fieldHoTen}>{hoTen}</div> -> <FittedName name={hoTen}
// className={fieldHoTen} />) — component TỰ đo xem tên đầy đủ có tràn ô
// chứa không, tràn thì viết tắt dần từng từ đệm (giữ nguyên họ + tên)
// tới khi vừa hoặc hết từ đệm để viết tắt.
//
// Đo bằng 1 span ẩn (cùng font/cỡ chữ với ô thật, nằm ngoài luồng hiển
// thị) thay vì đo trực tiếp lên nội dung React đang hiển thị — mỗi lần
// cần đánh giá lại đều THỬ LẠI TỪ ĐẦU (tên đầy đủ) rồi tăng dần mức viết
// tắt tới khi vừa, KHÔNG dựa vào mức viết tắt hiện tại để tăng tiếp. Nhờ
// vậy tự sửa đúng cả 2 chiều nếu phép đo lần đầu (lúc trang vừa hiện,
// .card nằm trong CSS Grid + aspect-ratio nên đôi khi cần thêm 1 nhịp
// mới tính xong kích thước thật) bị sai — ResizeObserver phát hiện Ô
// THẬT đổi kích thước thì tự đánh giá lại từ đầu, không bị kẹt ở mức đã
// lỡ viết tắt quá tay từ phép đo sai trước đó.
export default function FittedName({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [hienThi, setHienThi] = useState(name);

  // Thử lại TỪ ĐẦU (tên đầy đủ) mỗi lần gọi, tăng dần mức viết tắt tới
  // khi vừa — KHÔNG dựa vào mức viết tắt đang hiển thị để tăng tiếp, để
  // tự sửa đúng cả 2 chiều nếu có lần đo trước bị sai (xem comment ở
  // trên component).
  const danhGiaLai = () => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;

    const rongOChua = container.clientWidth;
    // Chưa đo được kích thước thật (chưa layout xong) — bỏ qua lần này,
    // ResizeObserver sẽ tự gọi lại đúng lúc đo được.
    if (rongOChua === 0) return;

    const tuTen = tachTuTen(name);
    const stepToiDa = Math.max(0, tuTen.length - 2);

    let ketQua = tuTen.join(" ");
    for (let step = 0; step <= stepToiDa; step++) {
      const ungVien = apDungVietTat(tuTen, step);
      measure.textContent = ungVien;
      ketQua = ungVien;
      if (measure.scrollWidth <= rongOChua) break;
    }
    setHienThi(ketQua);
  };

  useLayoutEffect(danhGiaLai, [name]);

  // .field nằm trong .card (CSS Grid + aspect-ratio) — đôi khi trình
  // duyệt cần thêm 1 nhịp mới tính xong bề rộng Ô THẬT (lần đo ở
  // useLayoutEffect phía trên có thể đo quá sớm, ra 0 hoặc sai). Theo
  // dõi Ô THẬT bằng ResizeObserver để biết chính xác lúc nào nó đổi
  // kích thước thật sự, đánh giá lại đúng lúc đó.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(danhGiaLai);
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  return (
    <div ref={containerRef} className={className}>
      {hienThi}
      <span
        ref={measureRef}
        aria-hidden="true"
        style={{
          position: "absolute",
          visibility: "hidden",
          whiteSpace: "nowrap",
          pointerEvents: "none",
          top: 0,
          left: 0,
        }}
      />
    </div>
  );
}
