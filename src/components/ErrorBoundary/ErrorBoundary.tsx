/** @format */

import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

// LƯỚI AN TOÀN CUỐI CÙNG cho toàn bộ ứng dụng — Error Boundary phải là
// class component, React chưa có bản Hook tương đương. Không có lớp
// này thì BẤT KỲ lỗi runtime bất ngờ nào ở BẤT KỲ đâu trong cây
// component (dữ liệu lạ, edge case chưa lường hết...) sẽ làm React tự
// gỡ TOÀN BỘ giao diện, để lại đúng 1 màn hình trắng — không có cách
// nào phục hồi ngoài việc tự biết đường bấm F5. Trong ngày thi đấu
// thật, giữa lúc trọng tài đang chấm hoặc BTK đang xử lý dở 1 trận,
// đây là tình huống tệ nhất có thể xảy ra.
//
// CHỦ ĐỘNG không cố "phục hồi tại chỗ" cây component bị lỗi — 1 khi đã
// throw, phần cây đó coi như hỏng, cố render tiếp dễ hỏng thêm. Cách an
// toàn nhất là yêu cầu tải lại trang: mọi trạng thái quan trọng (điểm,
// hiệp, trạng thái sống) đều nằm ở backend qua SignalR, tải lại là tự
// đồng bộ lại đúng hiện trạng — không mất dữ liệu.
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("Lỗi không lường trước, đã chặn lại tại ErrorBoundary:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            height: "100vh",
            padding: 24,
            textAlign: "center",
            fontFamily: "Inter, Roboto, 'Segoe UI', Arial, sans-serif",
            background: "#f7f7f8",
            color: "#1f2937",
          }}>
          <div style={{ fontSize: 44 }}>⚠️</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>
            Đã có lỗi ngoài dự kiến
          </h1>
          <p style={{ maxWidth: 440, color: "#4b5563", margin: 0 }}>
            Dữ liệu trận đấu, điểm số vẫn an toàn ở máy chủ — không mất
            gì cả. Tải lại trang để tiếp tục.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "12px 28px",
              borderRadius: 10,
              border: "none",
              background: "#dc2626",
              color: "#fff",
              fontWeight: 700,
              fontSize: 15,
              cursor: "pointer",
            }}>
            Tải lại trang
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
