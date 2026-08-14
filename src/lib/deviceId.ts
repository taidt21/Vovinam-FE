// crypto.randomUUID() chỉ hoạt động trong "ngữ cảnh an toàn" (HTTPS hoặc
// localhost) — thiết bị truy cập qua IP LAN bằng http:// (như điện thoại
// trọng tài) sẽ không có hàm này, ném lỗi ngay khi gọi. Đây là giới hạn
// của trình duyệt, không phải lỗi code — cần dự phòng tự sinh ID, không
// cần độ an toàn mật mã vì chỉ dùng để phân biệt thiết bị.
export function generateDeviceId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`;
}
// Dùng cho ID cần ĐÚNG khuôn GUID thật (VD Match.id — backend lưu dạng
// Guid trong C#, gửi sai khuôn sẽ bị từ chối thẳng) — khác hẳn
// generateDeviceId() ở trên, vốn chỉ cần chuỗi tuỳ ý (id thiết bị trọng
// tài, backend chỉ lưu như chuỗi thường, không đòi khuôn mẫu). Bản dự
// phòng này không an toàn về mặt mật mã học bằng crypto.randomUUID()
// thật, nhưng đủ dùng để sinh ID không trùng, đúng khuôn 8-4-4-4-12.
export function generateGuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}