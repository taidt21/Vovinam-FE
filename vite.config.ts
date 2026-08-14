import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    base: "/",
    build: {
        outDir: "dist",
        emptyOutDir: true
    },
    server: {
        host:true,
        proxy: {
            "/api": {
                // Đổi đúng cổng HTTP (không phải HTTPS) backend đang chạy khi bạn
                // gõ "dotnet run" — xem lại dòng "Now listening on: http://..."
                target: "http://localhost:5267",
                changeOrigin: true,
            },
            "/hubs": {
                target: "http://localhost:5267",
                changeOrigin: true,
                ws: true,
            },
        },
    },
    
});