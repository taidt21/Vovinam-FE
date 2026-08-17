/** @format */

import { Routes, Route, Navigate } from "react-router";
import DashboardLayout from "./layouts/DashboardLayout/DashboardLayout";
import ThietLapGiai from "./pages/ThietLapGiai/ThietLapGiai";
import DoanVaVDV from "./pages/DoanVaVDV/DoanVaVDV";
import NoiDungBocTham from "./pages/NoiDungBocTham/NoiDungBocTham";
import InSoDoDoiKhang from "./pages/InSoDoDoiKhang/InSoDoDoiKhang";
import InLichThiDauDoiKhang from "./pages/InLichThiDauDoiKhang/InLichThiDauDoiKhang";
import InLichThiDauQuyen from "./pages/InLichThiDauQuyen/InLichThiDauQuyen";
import BanThuKy from "./pages/BanThuKy/BanThuKy";
import KetQua from "./pages/KetQua/KetQua";
import TrongTai from "./pages/TrongTai/TrongTai";
import AdminLogin from "./pages/AdminLogin/AdminLogin";
import RequireAdmin from "./components/RequireAdmin/RequireAdmin";
import RequireRole from "./components/RequireRole/RequireRole";
import { laAdmin } from "./lib/api/adminAuth";
import ManHinhCongKhai from "./pages/ManHinhCongKhai/ManHinhCongKhai";
import DangNhap from "./pages/Portal/DangNhap";
import DangKy from "./pages/Portal/DangKy";
import PortalLayout from "./pages/Portal/PortalLayout";
import TongQuan from "./pages/Portal/TongQuan";
import VdvCuaDoan from "./pages/Portal/VdvCuaDoan";

export default function App() {
  return (
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
          element={<Navigate to={laAdmin() ? "thiet-lap-giai" : "ban-thu-ky"} replace />}
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

      <Route path="/dang-ky" element={<DangNhap />} />
      <Route path="/dang-ky/tao-tai-khoan" element={<DangKy />} />
      <Route path="/dang-ky/quan-ly" element={<PortalLayout />}>
        <Route index element={<Navigate to="tong-quan" replace />} />
        <Route path="tong-quan" element={<TongQuan />} />
        <Route path="vdv" element={<VdvCuaDoan />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
