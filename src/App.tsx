/** @format */

import { Routes, Route, Navigate } from "react-router";
import DashboardLayout from "./layouts/DashboardLayout/DashboardLayout";
import ThietLapGiai from "./pages/ThietLapGiai/ThietLapGiai";
import DoanVaVDV from "./pages/DoanVaVDV/DoanVaVDV";
import NoiDungBocTham from "./pages/NoiDungBocTham/NoiDungBocTham";
import BanThuKy from "./pages/BanThuKy/BanThuKy";
import KetQua from "./pages/KetQua/KetQua";
import TrongTaiChamDiem from "./pages/TrongTaiChamDiem/TrongTaiChamDiem";

export default function App() {
  return (
    <Routes>
      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<Navigate to="thiet-lap-giai" replace />} />
        <Route path="thiet-lap-giai" element={<ThietLapGiai />} />
        <Route path="doan-vdv" element={<DoanVaVDV />} />
        <Route path="noi-dung-boc-tham" element={<NoiDungBocTham />} />
        <Route path="ban-thu-ky" element={<BanThuKy />} />
        <Route path="ket-qua" element={<KetQua />} />
      </Route>
      <Route path="/trong-tai" element={<TrongTaiChamDiem />} />
      <Route
        path="/man-hinh-cong-khai"
        element={<h1>Màn hình công khai (làm sau)</h1>}
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
