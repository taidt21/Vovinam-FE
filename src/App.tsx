/** @format */

import { Routes, Route, Navigate } from "react-router";
import DashboardLayout from "./layouts/DashboardLayout/DashboardLayout";
import ThietLapGiai from "./pages/ThietLapGiai/ThietLapGiai";
import DoanVaVDV from "./pages/DoanVaVDV/DoanVaVDV";
import NoiDungBocTham from "./pages/NoiDungBocTham/NoiDungBocTham";
import BanThuKy from "./pages/BanThuKy/BanThuKy";
import KetQua from "./pages/KetQua/KetQua";
import TrongTai from "./pages/TrongTai/TrongTai";
import AdminLogin from "./pages/AdminLogin/AdminLogin";
import RequireAdmin from "./components/RequireAdmin/RequireAdmin";
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
        <Route index element={<Navigate to="thiet-lap-giai" replace />} />
        <Route path="thiet-lap-giai" element={<ThietLapGiai />} />
        <Route path="doan-vdv" element={<DoanVaVDV />} />
        <Route path="noi-dung-boc-tham" element={<NoiDungBocTham />} />
        <Route path="ban-thu-ky" element={<BanThuKy />} />
        <Route path="ket-qua" element={<KetQua />} />
      </Route>
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
