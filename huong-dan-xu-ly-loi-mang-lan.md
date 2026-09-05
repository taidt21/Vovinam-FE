# Xử lý lỗi: Không truy cập được hệ thống từ điện thoại/thiết bị khác trong cùng mạng LAN

Tài liệu này dành cho người vận hành hệ thống (Bàn thư ký, Trọng tài) khi gặp tình huống: **máy tính chạy chương trình (.exe) truy cập bình thường, nhưng điện thoại hoặc máy tính khác trong cùng mạng WiFi lại không vào được.**

## 1. Nhận diện đúng lỗi này

Bạn đang gặp đúng lỗi này nếu:

- Trên **máy tính đang chạy file .exe**, mở trình duyệt vào địa chỉ dạng `http://192.168.x.x:2004/` thì vào được bình thường.
- Trên **điện thoại hoặc máy tính khác**, vào **đúng địa chỉ y hệt đó** thì báo lỗi, thường là:
  - "Không thể truy cập trang web này"
  - "Trang này mất quá nhiều thời gian để phản hồi"
  - `ERR_CONNECTION_TIMED_OUT`

Đặc điểm quan trọng: lỗi hiện ra **sau một khoảng chờ khá lâu** (không phải báo lỗi ngay lập tức) — đây là dấu hiệu cho thấy thiết bị của bạn gửi yêu cầu đi nhưng không ai trả lời, không phải do gõ sai địa chỉ.

## 2. Vì sao lại xảy ra lỗi này

Máy tính tự truy cập vào chính nó thì luôn thông suốt, không đi qua các lớp kiểm soát mạng như khi có 1 thiết bị **khác** kết nối tới. Ba nguyên nhân thường gặp nhất, xếp theo khả năng xảy ra:

1. **Windows Firewall trên máy tính đang chạy chương trình chặn kết nối đến từ bên ngoài** (phổ biến nhất). Đây là hàng rào bảo vệ có sẵn của Windows — mặc định nó thường chặn các kết nối lạ đi tới trừ khi được cho phép rõ ràng.
2. **Điện thoại và máy tính không thật sự cùng 1 mạng WiFi** — trông giống nhau nhưng có thể 1 bên đang dùng 4G/5G, hoặc kết nối vào mạng WiFi khách (guest) tách biệt với mạng chính.
3. **Router/modem WiFi bật sẵn chế độ cách ly thiết bị** ("AP Isolation" / "Client Isolation") — khiến các máy trong cùng 1 mạng WiFi không nhìn thấy nhau, dù vẫn ra Internet bình thường. Tính năng này thường có trên WiFi công cộng, một số modem của nhà mạng, hoặc mạng khách trong công ty/khách sạn.

## 3. Cách khắc phục — làm theo đúng thứ tự

### Bước 1 — Kiểm tra 2 thiết bị có thật sự cùng 1 mạng WiFi

Trên điện thoại: vào **Cài đặt → WiFi**, xem tên mạng đang kết nối. So sánh với tên mạng máy tính đang dùng — phải **giống hệt nhau từng chữ**. Nếu điện thoại đang dùng 4G/5G (không phải WiFi), hoặc tên mạng khác đi (kể cả chỉ khác đúng chữ "-guest"/"-5G" phía sau), hãy đổi cho khớp rồi thử lại trước khi làm các bước sau.

### Bước 2 — Kiểm tra xem có đúng do Windows Firewall không

Trên máy tính đang chạy file .exe:

1. Mở **Control Panel → Windows Defender Firewall**.
2. Chọn **Turn Windows Defender Firewall on or off** (menu bên trái).
3. Chọn **Turn off Windows Defender Firewall** cho cả 2 mục (Private và Public), bấm OK.
4. Quay lại thử vào trang web trên điện thoại.

**Đây chỉ là bước kiểm tra, không phải cách sửa lâu dài** — nếu điện thoại vào được ngay sau khi tắt, bạn đã xác định đúng nguyên nhân, chuyển sang Bước 3. Nếu vẫn không vào được, bật lại Firewall (**Turn on**) và chuyển sang Bước 4.

### Bước 3 — Nếu đúng do Firewall: mở đúng 1 cổng thay vì tắt hẳn tường lửa

Không nên để Firewall tắt lâu dài (mất lớp bảo vệ chung cho cả máy). Thay vào đó, bật lại Firewall rồi mở riêng đúng cổng ứng dụng đang dùng:

1. Bật lại Firewall như Bước 2.
2. Mở **Windows Defender Firewall → Advanced settings**.
3. Chọn **Inbound Rules** (bên trái) → **New Rule...** (bên phải).
4. Chọn **Port** → Next.
5. Chọn **TCP**, ô **Specific local ports** gõ đúng số cổng ứng dụng (mặc định là **2004**) → Next.
6. Chọn **Allow the connection** → Next.
7. Tick cả 3 ô (Domain, Private, Public) → Next.
8. Đặt tên gợi nhớ, ví dụ `Vovinam App` → **Finish**.

Thử lại trên điện thoại. Từ giờ về sau không cần lặp lại bước này nữa trên đúng máy tính đó, trừ khi cài lại Windows.

### Bước 4 — Nếu tắt Firewall vẫn không vào được: kiểm tra Router/modem WiFi

1. Mở trình duyệt, vào trang quản trị router — thường là `192.168.0.1` hoặc `192.168.1.1` (xem tem dán mặt sau router để biết chính xác, hoặc hỏi nhà cung cấp mạng).
2. Tìm mục **Wireless Settings** / **WiFi Settings**.
3. Tìm tuỳ chọn tên gần giống **"AP Isolation"**, **"Client Isolation"**, hoặc **"Cách ly thiết bị"** — nếu đang bật, chuyển sang tắt.
4. Lưu lại, thử kết nối lại WiFi trên cả 2 thiết bị rồi thử lại.

Giao diện quản trị khác nhau tuỳ hãng router — nếu không tìm thấy mục này, có thể liên hệ nhà cung cấp mạng (FPT, Viettel, VNPT...) hoặc người phụ trách mạng tại địa điểm thi đấu để được hỗ trợ.

### Bước 5 — Xác nhận đúng địa chỉ IP hiện tại

Địa chỉ IP của máy tính (phần số như `192.168.0.3`) có thể **tự đổi** mỗi khi khởi động lại router hoặc máy tính. Nếu đã làm đúng các bước trên mà vẫn không vào được, kiểm tra lại địa chỉ hiện tại trước khi thử tiếp:

1. Trên máy tính, mở **Command Prompt** (gõ `cmd` vào ô tìm kiếm Windows).
2. Gõ lệnh: `ipconfig` rồi Enter.
3. Tìm dòng **IPv4 Address** — đây là địa chỉ IP hiện tại, dùng đúng địa chỉ này trên điện thoại (kèm `:2004` phía sau).

## 4. Ghi chú cho lần sau

- Bước 3 (mở cổng qua Firewall) chỉ cần làm **1 lần duy nhất** trên mỗi máy tính — những lần chạy chương trình sau này không cần lặp lại, trừ khi cài lại Windows hoặc đổi sang máy tính khác.
- Nếu đổi sang máy tính khác để chạy chương trình, cần làm lại Bước 2–3 trên máy tính mới đó.
- Nên kiểm tra kết nối này **trước khi giải đấu bắt đầu**, không nên để tới lúc đang thi đấu mới phát hiện — dành ra vài phút thử từ điện thoại trọng tài/màn hình công khai trước giờ khai mạc.
