import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: {
    // 外部 CDN を使わない方針のため、アセットは全てバンドルに含める
    assetsInlineLimit: 0,
  },
});
