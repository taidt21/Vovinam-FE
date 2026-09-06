/** @format */

import { useEffect } from "react";
// File thật đặt ở src/assets/ — PHẢI import kiểu này (không được ghi
// thẳng đường dẫn dạng chuỗi "../../assets/...") vì đường dẫn CHUỖI chỉ
// được trình duyệt hiểu là tương đối tính từ URL TRANG ĐANG MỞ (VD
// /dashboard/ban-thu-ky), khác hẳn vị trí file code — hầu như luôn ra
// 404 rồi rơi vào bản dự phòng, đúng như đang gặp. Import thế này thì
// Vite tự xử lý lúc build, trả về đúng URL thật của file bất kể trang
// đang mở ở đâu.
import tiengChuongUrl from "../../assets/tieng_chuong_reo.mp3";

function playBellSound() {
  if (typeof window === "undefined") return;

  const audio = new Audio(tiengChuongUrl);
  let daDuPhong = false;
  // Dự phòng bằng bản tự tổng hợp — dùng chung 1 cờ để dù CẢ sự kiện lỗi
  // lẫn promise .play() bị từ chối cùng nổ ra (thực tế hay gặp cả 2) thì
  // cũng chỉ phát dự phòng đúng 1 lần, không chồng 2 tiếng chuông đè
  // nhau.
  const duPhong = () => {
    if (daDuPhong) return;
    daDuPhong = true;
    playBellSoundTongHop();
  };

  audio.addEventListener("error", duPhong);
  audio.play().catch(duPhong);
}

// Tự tổng hợp âm thanh bằng Web Audio API — dùng làm PHƯƠNG ÁN DỰ PHÒNG
// khi chưa có/lỗi file mp3 thật ở trên, để không bao giờ im lặng hoàn
// toàn. Vài dao động (oscillator) ở tần số hơi lệch nhau mô phỏng đúng
// kiểu "ngân" kim loại của chuông thật, tắt dần (decay) trong ~3 giây.
function playBellSoundTongHop() {
  const AudioContextCtor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioContextCtor) return;

  try {
    const ctx = new AudioContextCtor();
    const now = ctx.currentTime;
    const thoiLuong = 3;

    // Các bội âm không phải bội số nguyên tuyệt đối (giống chuông kim
    // loại thật, khác hẳn âm thanh nhạc cụ dây/hơi có bội âm đúng theo
    // tỉ lệ nguyên) — tần số gốc chọn ở vùng "tiếng chuông báo hiệp" dễ
    // nghe rõ giữa tiếng ồn khán đài, không quá chói cũng không quá trầm.
    const goc = 740;
    const boiAm = [
      { tiLe: 1, gain: 0.32 },
      { tiLe: 2.0, gain: 0.2 },
      { tiLe: 2.4, gain: 0.14 },
      { tiLe: 3.0, gain: 0.09 },
      { tiLe: 4.2, gain: 0.05 },
    ];

    const master = ctx.createGain();
    master.gain.setValueAtTime(1, now);
    master.connect(ctx.destination);

    for (const { tiLe, gain } of boiAm) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(goc * tiLe, now);

      const envelope = ctx.createGain();
      // Đánh vào ngay (attack rất ngắn) rồi tắt dần theo hàm mũ suốt
      // thời lượng còn lại — đúng hình dáng bao biên độ của tiếng chuông
      // thật (gõ 1 phát, ngân nhỏ dần, không lặp lại).
      envelope.gain.setValueAtTime(0.0001, now);
      envelope.gain.exponentialRampToValueAtTime(gain, now + 0.012);
      envelope.gain.exponentialRampToValueAtTime(0.0001, now + thoiLuong);

      osc.connect(envelope);
      envelope.connect(master);
      osc.start(now);
      osc.stop(now + thoiLuong + 0.1);
    }

    setTimeout(
      () => {
        ctx.close().catch(() => {});
      },
      (thoiLuong + 0.5) * 1000,
    );
  } catch {
    // Cả file mp3 lẫn bản tổng hợp đều không phát được (VD trình duyệt
    // chặn hẳn do chính sách autoplay) — bỏ qua, không được để lỗi âm
    // thanh làm hỏng luồng chính (chấm điểm/hiển thị điểm vẫn phải chạy
    // bình thường).
  }
}

/**
 * Phát chuông đúng 1 lần mỗi khi trận CHUYỂN SANG "đang thi" (bắt đầu
 * hiệp), VÀ đúng 1 lần khi hết giờ hiệp — dùng chung cho cả 2 nơi (Bàn
 * thư ký, và màn hình công khai nhận đúng thay đổi đó qua realtime) nên
 * chỉ cần viết logic phát hiện đúng 1 chỗ.
 *
 * Phát hiện "hết hiệp" bằng field hetHiepLuc (epoch ms) — field này
 * được ĐẶT LẠI Ở ĐÚNG 1 CHỖ DUY NHẤT (effect "hết giờ" trong
 * DieuHanhDoiKhangTab.tsx, CẢ 3 nhánh của nó) mỗi khi 1 hiệp THẬT SỰ
 * kết thúc do hết giờ — value đổi là chắc chắn vừa hết hiệp, không cần
 * suy luận gì thêm.
 *
 * TRƯỚC ĐÂY dùng thoiGianConLaiGiay <= 0 để suy luận — SAI, vì field đó
 * nhận giá trị KHÁC NHAU tuỳ từng nhánh kết thúc hiệp: hiệp cuối hoà thì
 * đúng là đặt về 0, nhưng hiệp thường (chuyển sang nghỉ giữa hiệp) lại
 * đặt THÀNH thời gian nghỉ giữa hiệp (1 số dương, VD 60s) — kiểm tra
 * <= 0 chỉ đúng cho đúng 1 trong 3 nhánh, bỏ sót các nhánh còn lại
 * (đây chính là lỗi khiến chuông không reo dù đã hết hiệp thật).
 *
 * CỐ TÌNH không phát ngay lúc trang vừa mở/tải xong dù trangThai lúc đó
 * đã là "dang_thi" — trường hợp đó là trận ĐANG DIỄN RA SẴN từ trước
 * (VD người dùng vừa F5 lại trang giữa hiệp), không phải vừa mới bắt
 * đầu, không nên phát chuông.
 *
 * TRƯỚC ĐÂY nhớ "trạng thái trước đó" bằng useRef bên trong hook — lỗi
 * thật đã gặp: useRef gắn liền vòng đời CHÍNH COMPONENT gọi hook này,
 * bị xoá sạch mỗi khi component đó unmount (VD Bàn thư ký bấm chuyển
 * qua tab khác rồi quay lại "Điều hành đối kháng" — tab đó unmount rồi
 * mount lại, useRef về lại giá trị ban đầu y hệt lúc F5 trang thật).
 * Trận đang "dang_thi" sẵn từ trước lúc quay lại tab bị hiểu NHẦM thành
 * "vừa mới bắt đầu", phát chuông sai dù không ai vừa bấm gì cả.
 *
 * Sửa bằng cách nhớ Ở NGOÀI vòng đời mọi component — theo TỪNG SÂN
 * riêng (Map cấp module, sống suốt phiên làm việc của cả app, không
 * unmount theo bất kỳ component nào) — dù tab có unmount/mount lại bao
 * nhiêu lần, Map này vẫn nhớ đúng "sân này đã từng ở trạng thái gì",
 * không còn hiểu nhầm quay-lại-tab thành vừa-bắt-đầu nữa.
 */
interface TrangThaiDaGhiNhan {
  trangThai: string;
  hetHiepLuc: number;
}
const trangThaiTruocDoTheoSan = new Map<string, TrangThaiDaGhiNhan>();

export function useMatchBell(
  courtId: string | undefined,
  trangThai: string | undefined,
  hetHiepLuc: number | undefined,
) {
  useEffect(() => {
    if (!courtId || trangThai === undefined || hetHiepLuc === undefined) {
      return;
    }

    const hienTai: TrangThaiDaGhiNhan = { trangThai, hetHiepLuc };
    const truoc = trangThaiTruocDoTheoSan.get(courtId);
    trangThaiTruocDoTheoSan.set(courtId, hienTai);

    // Sân này CHƯA TỪNG được ghi nhận trạng thái nào (app vừa mở, hoặc
    // đây là lần đầu tiên bất kỳ component nào theo dõi đúng sân này) —
    // không đủ căn cứ để biết đây có phải "vừa mới chuyển sang/vừa hết
    // giờ" hay không, nên bỏ qua, không phát chuông.
    if (!truoc) return;

    if (trangThai === "dang_thi" && truoc.trangThai !== "dang_thi") {
      playBellSound(); // bắt đầu hiệp
      return;
    }

    if (hetHiepLuc !== truoc.hetHiepLuc) {
      playBellSound(); // hết giờ hiệp
    }
  }, [courtId, trangThai, hetHiepLuc]);
}

