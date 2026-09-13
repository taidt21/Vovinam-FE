# Vovinam Tournament Management System — Frontend

Giao diện web cho hệ thống quản lý giải đấu Vovinam — gồm 4 nhóm màn hình chạy trên cùng 1 mã nguồn: trang đăng nhập/quản trị (Admin, Bàn thư ký), trang vận hành tại từng sân (Trọng tài, Màn hình công khai), trang kết quả/báo cáo, và các trang in ấn (thẻ VĐV/trọng tài/trưởng đoàn/HLV, lịch thi đấu, sơ đồ nhánh đối kháng).

## Công nghệ sử dụng

- **React 19 + TypeScript + Vite**
- **SCSS Modules** — style theo từng component/trang, không đụng lẫn nhau
- **@microsoft/signalr** — client realtime, đồng bộ với backend
- **html2canvas + jsPDF + jspdf-autotable** — xuất thẻ/lịch thi đấu/kết quả thành PDF nhiều trang, kèm bảng biểu
- **docx** — xuất kết quả ra file Word
- **xlsx (SheetJS)** — import/export Excel (danh sách VĐV, cán bộ đoàn, nội dung thi đấu)
- **lucide-react** — icon
- **react-router v7** — điều hướng, kèm route guard theo vai trò

## Cấu trúc thư mục

```
src/
  pages/        Từng trang theo route (AdminLogin, ThietLapGiai, DoanVaVDV, NoiDungBocTham,
                 BanThuKy, TrongTai, ManHinhCongKhai, KetQua, các trang In*...)
  components/   Component dùng chung (AthleteAvatar, LightBoxes, Modal, FittedName,
                 BracketView, LichThiDau, MatchLogPanel, LiveLightsPanel, SquadManager,
                 RequireAdmin, RequireRole, ErrorBoundary...)
  lib/
    api/        Hàm gọi API theo từng domain (trongTaiApi, matchesApi, eventsApi...)
    realtime/   Kết nối SignalR, store trạng thái trận sống (liveMatchStore, usePressedLights...)
    audio/      Âm thanh thông báo (chuông báo hiệp)
    domain/     Logic nghiệp vụ thuần (đánh số trận, tính điểm quyền...)
    excel/      Đọc/ghi file Excel (import VĐV, cán bộ đoàn, nội dung thi đấu)
    pdf/        Dựng layout PDF dùng chung (thẻ in, sơ đồ, lịch thi đấu)
    utils/      Tiện ích chung
  types/        Định nghĩa kiểu dữ liệu dùng chung với backend
  styles/       Biến SCSS, style dùng chung giữa nhiều trang (theCard.module.scss...)
```

## Các trang chính

| Trang | Vai trò |
|---|---|
| Đăng nhập BTC | Đăng nhập Admin/Bàn thư ký, phát JWT dùng cho các trang quản trị |
| Thiết lập giải | Cấu hình tên giải, số sân, logo/tiêu đề thẻ, tài khoản Bàn thư ký theo từng người |
| Đoàn & VĐV | Quản lý đơn vị, vận động viên, cán bộ đoàn, import Excel, in thẻ |
| Nội dung & bốc thăm | Tạo nội dung thi đấu, bốc thăm nhánh đối kháng/quyền |
| Bàn thư ký | Trang vận hành chính ngày thi đấu — nhiều tab con: điều hành đối kháng, điều hành quyền, quản lý trọng tài, quản lý cán bộ đoàn... |
| Trọng tài | Màn hình trên thiết bị của từng trọng tài — tự chọn danh tính, bấm chấm điểm |
| Màn hình công khai | Bảng điểm hiển thị cho khán giả — tối giản, tương phản cao, tự scale theo mọi kích thước màn hình/máy chiếu |
| Kết quả & báo cáo | Tổng hợp huy chương, sơ đồ nhánh, xuất PDF/Word |
| In lịch thi đấu (đối kháng / quyền) | Xuất lịch thi đấu theo sân/nội dung ra PDF |
| In sơ đồ đối kháng | Xuất sơ đồ nhánh đối kháng ra PDF |
| In thẻ (VĐV / Trọng tài / Cán bộ đoàn) | Xuất PDF nhiều thẻ/trang theo đúng mẫu thiết kế |

## Tính năng nổi bật

- **Realtime hai chiều** — điểm số, đồng hồ, trạng thái hiệp, đèn giám định đồng bộ tức thời giữa Trọng tài ⇄ Bàn thư ký ⇄ Màn hình công khai qua SignalR, không cần tải lại trang.
- **Đèn giám định đúng vị trí** — mỗi lượt bấm chỉ mang theo ID trọng tài; frontend tự khớp với danh sách phân công (sân + vị trí 1-5) để sáng đúng hàng, không suy đoán qua thứ tự bấm.
- **Tự viết tắt tên khi tràn ô** (`FittedName`) — đo trực tiếp bằng trình duyệt (không đoán số ký tự), viết tắt dần từng từ đệm tới khi vừa khung in thẻ.
- **Trọng tài tự nhận diện, chống trùng** — chọn tên 1 lần dùng cho cả giải, tự phát hiện khi bị đổi sân hoặc bị Bàn thư ký reset để chọn lại, không cần chọn lại khi chỉ đổi vị trí hoặc chuyển dự bị.
- **Màn hình công khai chế độ kiosk** — tự vào toàn màn hình, tự co giãn theo mọi tỉ lệ khung hình, kèm chuông báo khi bắt đầu mỗi hiệp (ưu tiên file mp3 tự chọn, tự động chuyển sang âm thanh tổng hợp nếu thiếu file).
- **In thẻ hàng loạt** — ghép nhiều thẻ/trang A4 theo đúng kích thước tuỳ chỉnh, tự tính số thẻ vừa mỗi trang.
- **Phân quyền theo route** (`RequireAdmin`, `RequireRole`) — chặn thẳng ở phía frontend các trang quản trị nếu chưa đăng nhập đúng vai trò, song song với việc backend cũng tự kiểm tra lại.
- **Tài khoản Bàn thư ký theo từng người** — Admin tạo/sửa/xoá tài khoản riêng cho mỗi Bàn thư ký ngay trong trang Thiết lập giải, không còn dùng chung 1 tài khoản.

## Cài đặt & chạy

Yêu cầu: Node.js 18+.

```bash
npm install
npm run dev       # chạy dev server (HMR)
npm run build     # build production ra thư mục dist/ (chạy tsc -b trước để kiểm tra kiểu dữ liệu)
npm run lint      # kiểm tra bằng oxlint
```

Khi phát triển, frontend cần trỏ đúng tới địa chỉ backend (API + SignalR) — cấu hình theo biến môi trường hoặc file cấu hình dùng chung trong `lib/api/`.

## Xử lý lỗi mạng LAN

Nếu máy chạy chương trình vào được nhưng điện thoại/máy khác trong cùng WiFi không vào được (thường gặp ngày thi đấu, do Windows Firewall, sai mạng WiFi, hoặc router bật "AP Isolation"), xem hướng dẫn chi tiết từng bước trong [`huong-dan-xu-ly-loi-mang-lan.md`](./huong-dan-xu-ly-loi-mang-lan.md).

## Triển khai

Sau `npm run build`, copy toàn bộ `dist/` vào `wwwroot/` của backend — backend ASP.NET Core sẽ phục vụ luôn giao diện này cùng lúc với API, chạy trên cùng 1 cổng, không cần server web riêng cho frontend. Nếu frontend nằm cùng thư mục cha với `vovinam-backend`, có thể dùng thẳng script `build-publish.bat` trong backend để tự làm bước này rồi publish luôn thành file `.exe`.
