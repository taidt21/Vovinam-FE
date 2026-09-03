# Vovinam Tournament Management System — Frontend

Giao diện web cho hệ thống quản lý giải đấu Vovinam — gồm 3 nhóm màn hình chạy trên cùng 1 mã nguồn: trang quản trị (Bàn thư ký), trang vận hành tại từng sân (Trọng tài, Màn hình công khai), và các trang in ấn (thẻ VĐV/trọng tài/trưởng đoàn/HLV).

## Công nghệ sử dụng

- **React 18 + TypeScript + Vite**
- **SCSS Modules** — style theo từng component/trang, không đụng lẫn nhau
- **@microsoft/signalr** — client realtime, đồng bộ với backend
- **html2canvas + jsPDF** — xuất thẻ in thành PDF nhiều thẻ/trang
- **xlsx (SheetJS)** — import/export Excel (danh sách VĐV, cán bộ đoàn)
- **react-router** — điều hướng

## Cấu trúc thư mục

```
src/
  pages/        Từng trang theo route (Bàn thư ký, Trọng tài, Màn hình công khai, các trang in...)
  components/   Component dùng chung (AthleteAvatar, LightBoxes, Modal, FittedName...)
  lib/
    api/        Hàm gọi API theo từng domain (trongTaiApi, matchesApi, eventsApi...)
    realtime/   Kết nối SignalR, store trạng thái trận sống (liveMatchStore, usePressedLights...)
    audio/      Âm thanh thông báo (chuông báo hiệp)
    domain/     Logic nghiệp vụ thuần (đánh số trận, tính điểm quyền...)
    utils/      Tiện ích chung
  types/        Định nghĩa kiểu dữ liệu dùng chung với backend
  styles/       Biến SCSS, style dùng chung giữa nhiều trang (theCard.module.scss...)
```

## Các trang chính

| Trang | Vai trò |
|---|---|
| Thiết lập giải | Cấu hình tên giải, số sân, logo/tiêu đề thẻ |
| Đoàn & VĐV | Quản lý đơn vị, vận động viên, import Excel, in thẻ VĐV |
| Nội dung & bốc thăm | Tạo nội dung thi đấu, bốc thăm nhánh đối kháng/quyền |
| Bàn thư ký | Trang vận hành chính ngày thi đấu — nhiều tab con: điều hành đối kháng, điều hành quyền, quản lý trọng tài, quản lý cán bộ đoàn... |
| Trọng tài | Màn hình trên thiết bị của từng trọng tài — tự chọn danh tính, bấm chấm điểm |
| Màn hình công khai | Bảng điểm hiển thị cho khán giả — tối giản, tương phản cao, tự scale theo mọi kích thước màn hình/máy chiếu |
| Kết quả & báo cáo | Tổng hợp kết quả sau giải |
| In thẻ (VĐV / Trọng tài / Cán bộ đoàn) | Xuất PDF nhiều thẻ/trang theo đúng mẫu thiết kế |

## Tính năng nổi bật

- **Realtime hai chiều** — điểm số, đồng hồ, trạng thái hiệp, đèn giám định đồng bộ tức thời giữa Trọng tài ⇄ Bàn thư ký ⇄ Màn hình công khai qua SignalR, không cần tải lại trang.
- **Đèn giám định đúng vị trí** — mỗi lượt bấm chỉ mang theo ID trọng tài; frontend tự khớp với danh sách phân công (sân + vị trí 1-5) để sáng đúng hàng, không suy đoán qua thứ tự bấm.
- **Tự viết tắt tên khi tràn ô** (`FittedName`) — đo trực tiếp bằng trình duyệt (không đoán số ký tự), viết tắt dần từng từ đệm tới khi vừa khung in thẻ.
- **Trọng tài tự nhận diện, chống trùng** — chọn tên 1 lần dùng cho cả giải, tự phát hiện khi bị đổi sân hoặc bị Bàn thư ký reset để chọn lại, không cần chọn lại khi chỉ đổi vị trí hoặc chuyển dự bị.
- **Màn hình công khai chế độ kiosk** — tự vào toàn màn hình, tự co giãn theo mọi tỉ lệ khung hình, kèm chuông báo khi bắt đầu mỗi hiệp (ưu tiên file mp3 tự chọn, tự động chuyển sang âm thanh tổng hợp nếu thiếu file).
- **In thẻ hàng loạt** — ghép nhiều thẻ/trang A4 theo đúng kích thước tuỳ chỉnh, tự tính số thẻ vừa mỗi trang.

## Cài đặt & chạy

Yêu cầu: Node.js 18+.

```bash
npm install
npm run dev       # chạy dev server (HMR)
npm run build     # build production ra thư mục dist/
npm run lint      # kiểm tra bằng oxlint
```

Khi phát triển, frontend cần trỏ đúng tới địa chỉ backend (API + SignalR) — cấu hình theo biến môi trường hoặc file cấu hình dùng chung trong `lib/api/`.

## Triển khai

Sau `npm run build`, copy toàn bộ `dist/` vào `wwwroot/` của backend — backend ASP.NET Core sẽ phục vụ luôn giao diện này cùng lúc với API, chạy trên cùng 1 cổng, không cần server web riêng cho frontend.
