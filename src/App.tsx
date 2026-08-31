/** @format */

import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router";
import DashboardLayout from "./layouts/DashboardLayout/DashboardLayout";
import RequireAdmin from "./components/RequireAdmin/RequireAdmin";
import RequireRole from "./components/RequireRole/RequireRole";
import { laAdmin } from "./lib/api/adminAuth";

// Lazy-load từng trang theo route — trước đây import thẳng nên
// /trong-tai và /man-hinh-cong-khai (mở trên điện thoại trọng tài, máy
// thường yếu hơn) phải tải + parse chung 1 bundle với toàn bộ trang
// admin, kéo theo xlsx/jsPDF/html2canvas dù không bao giờ dùng tới.
const ThietLapGiai = lazy(() => import("./pages/ThietLapGiai/ThietLapGiai"));
const DoanVaVDV = lazy(() => import("./pages/DoanVaVDV/DoanVaVDV"));
const NoiDungBocTham = lazy(
  () => import("./pages/NoiDungBocTham/NoiDungBocTham"),
);
const InSoDoDoiKhang = lazy(
  () => import("./pages/InSoDoDoiKhang/InSoDoDoiKhang"),
);
const InLichThiDauDoiKhang = lazy(
  () => import("./pages/InLichThiDauDoiKhang/InLichThiDauDoiKhang"),
);
const InLichThiDauQuyen = lazy(
  () => import("./pages/InLichThiDauQuyen/InLichThiDauQuyen"),
);
const InTheVDV = lazy(() => import("./pages/InTheVDV/InTheVDV"));
const InTheTrongTai = lazy(() => import("./pages/InTheTrongTai/InTheTrongTai"));
const BanThuKy = lazy(() => import("./pages/BanThuKy/BanThuKy"));
const KetQua = lazy(() => import("./pages/KetQua/KetQua"));
const TrongTai = lazy(() => import("./pages/TrongTai/TrongTai"));
const AdminLogin = lazy(() => import("./pages/AdminLogin/AdminLogin"));
const ManHinhCongKhai = lazy(
  () => import("./pages/ManHinhCongKhai/ManHinhCongKhai"),
);

export default function App() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Đang tải...</div>}>
      <Routes>
        <Route path="/admin-dang-nhap" element={<AdminLogin />} />
        <Route
          path="/dashboard"
          element={
            <RequireAdmin>
              <DashboardLayout />
            </RequireAdmin>
          }>
          {/* Về đúng trang chính theo vai trò — Admin vào Thiết lập giải như
            trước, BanThuKy (không có quyền vào đó) về thẳng Bàn thư ký. */}
          <Route
            index
            element={
              <Navigate
                to={laAdmin() ? "thiet-lap-giai" : "ban-thu-ky"}
                replace
              />
            }
          />
          <Route
            path="thiet-lap-giai"
            element={
              <RequireRole role="Admin">
                <ThietLapGiai />
              </RequireRole>
            }
          />
          <Route path="doan-vdv" element={<DoanVaVDV />} />
          <Route path="noi-dung-boc-tham" element={<NoiDungBocTham />} />
          <Route path="ban-thu-ky" element={<BanThuKy />} />
          <Route path="ket-qua" element={<KetQua />} />
        </Route>
        {/* Trang in/xuất file — KHÔNG lồng trong DashboardLayout, để khi
          window.print() chỉ in đúng nội dung, không dính sidebar/header. */}
        <Route
          path="/dashboard/in-so-do-doi-khang"
          element={
            <RequireAdmin>
              <InSoDoDoiKhang />
            </RequireAdmin>
          }
        />
        <Route
          path="/dashboard/in-lich-thi-dau-quyen"
          element={
            <RequireAdmin>
              <InLichThiDauQuyen />
            </RequireAdmin>
          }
        />
        <Route
          path="/dashboard/in-lich-thi-dau-doi-khang"
          element={
            <RequireAdmin>
              <InLichThiDauDoiKhang />
            </RequireAdmin>
          }
        />
        <Route
          path="/dashboard/in-the-vdv"
          element={
            <RequireAdmin>
              <InTheVDV />
            </RequireAdmin>
          }
        />
        <Route
          path="/dashboard/in-the-trong-tai"
          element={
            <RequireAdmin>
              <InTheTrongTai />
            </RequireAdmin>
          }
        />
        <Route path="/trong-tai" element={<TrongTai />} />
        <Route
          path="/trong-tai-doi-khang"
          element={<Navigate to="/trong-tai" replace />}
        />
        <Route
          path="/trong-tai-quyen"
          element={<Navigate to="/trong-tai" replace />}
        />
        <Route path="/man-hinh-cong-khai" element={<ManHinhCongKhai />} />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
