/** @format */

// File thật đặt ở src/assets/ — PHẢI import kiểu này (không được ghi
// thẳng đường dẫn dạng chuỗi "../../assets/...") vì đường dẫn CHUỖI chỉ
// được trình duyệt hiểu là tương đối tính từ URL TRANG ĐANG MỞ (VD
// /dashboard/ban-thu-ky), khác hẳn vị trí file code — hầu như luôn ra
// 404 rồi rơi vào bản dự phòng, đúng như đang gặp. Import thế này thì
// Vite tự xử lý lúc build, trả về đúng URL thật của file bất kể trang
// đang mở ở đâu.
import tiengChuongUrl from "../../assets/tieng_chuong_reo.mp3";

// ============================================================
// CHUÔNG BÁO HIỆU CHO VĐV — quy định nghiêm ngặt, KHÔNG tự thêm
// ============================================================
//
// Chuông ảnh hưởng TRỰC TIẾP tới việc ra hiệu cho VĐV đang thi đấu, nên
// CHỈ được gọi playBellSound() ở ĐÚNG 3 nơi sau, không thêm bất kỳ nơi
// nào khác (mọi tình huống dừng/tạm dừng khác đều do trọng tài dùng
// còi VẬT LÝ xử lý, không phải phần mềm):
//   1. batDauHiep() trong DieuHanhDoiKhangTab.tsx — bắt đầu 1 hiệp đối
//      kháng.
//   2. ketThucHiep() (CHỈ nhánh hetGio thật, xem comment tại đó) +
//      nhánh xử thắng trực tiếp khi hết giờ hiệp cuối, trong CÙNG file
//      đó — hết thời gian 1 hiệp đối kháng.
//   3. batDau() trong DieuHanhQuyenTab.tsx — bắt đầu 1 lượt thi diễn
//      quyền.
//
// CỐ TÌNH gọi TRỰC TIẾP ngay tại đúng hành động (không dùng hook "theo
// dõi trạng thái đổi rồi suy luận ra lúc nào cần reo") — LỖI THẬT đã
// gặp nhiều lần với cách cũ: hook theo dõi state qua effect có thể
// "bắt kịp" 1 lần đổi trạng thái đã xảy ra TỪ TRƯỚC (VD lúc component
// gắn lại sau khi chuyển tab rồi quay lại, hoặc lúc mạng chập chờn rồi
// tự nối lại nhận đúng CourtSnapshot của trạng thái đã có sẵn) — gây
// chuông reo dù KHÔNG ai vừa thao tác gì, đúng hiện tượng "reo bừa
// bãi, không rõ lý do". Gọi thẳng ngay trong đúng hành động thì CHỈ có
// thể reo vì CHÍNH hành động đó — không suy luận gì thêm, không có kẽ
// hở nào để hiểu nhầm.
//
// CỐ TÌNH KHÔNG gọi ở màn hình công khai (ManHinhCongKhai.tsx,
// QuyenCongKhaiScreen.tsx) — theo xác nhận thực tế của người dùng hệ
// thống, màn công khai và Bàn thư ký THƯỜNG LÀ CÙNG 1 THIẾT BỊ vật lý;
// nếu cả 2 nơi cùng tự phát riêng sẽ chồng tiếng, cũng nghe như "reo
// bừa bãi". Chuông chỉ phát từ ĐÚNG 1 nguồn duy nhất: Bàn thư ký.
export function playBellSound() {
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
