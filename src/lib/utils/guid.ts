// Dùng cho ID cần ĐÚNG khuôn GUID thật (VD Match.id — backend lưu dạng
// Guid trong C#, gửi sai khuôn sẽ bị từ chối thẳng). crypto.randomUUID()
// chỉ hoạt động trong "ngữ cảnh an toàn" (HTTPS hoặc localhost) — thiết bị
// truy cập qua IP LAN bằng http:// sẽ không có hàm này, ném lỗi ngay khi
// gọi. Bản dự phòng bên dưới không an toàn về mặt mật mã học bằng
// crypto.randomUUID() thật, nhưng đủ dùng để sinh ID không trùng, đúng
// khuôn 8-4-4-4-12.
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
