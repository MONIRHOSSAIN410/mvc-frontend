import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  // Where /api goes during development.
  //
  // Default: the deployed CookMe API, so the shop works without running
  // anything else.
  //
  // To develop against the backend on your own machine (npm run dev in the
  // backend folder), put this in .env:
  //   VITE_PROXY_TARGET="http://localhost:5000"
  const proxyTarget = env.VITE_PROXY_TARGET || "https://mv-new-backend.vercel.app";

  return {
    plugins: [react()],
    build: {
      rollupOptions: {
        output: {
          // Libraries change far less often than the shop does, so they get
          // their own files and stay in the browser cache across deploys.
          manualChunks: {
            react: ["react", "react-dom", "react-router-dom"],
            redux: ["@reduxjs/toolkit", "react-redux"],
            motion: ["framer-motion"],
          },
        },
      },
    },
    server: {
      port: 5173,
      proxy: {
        // Going through the proxy keeps the request same-origin, so the
        // browser never blocks the answer on CORS grounds.
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
          secure: !proxyTarget.startsWith("http://"),
        },
      },
    },
  };
});
