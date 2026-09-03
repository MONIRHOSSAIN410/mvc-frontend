import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
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
      // In development the browser calls /api and Vite forwards it to the
      // real backend. Going through the proxy keeps it same-origin, so the
      // browser never blocks the answer on CORS grounds.
      //
      // Point this at http://localhost:5000 instead when you are running the
      // backend on your own machine.
      "/api": {
        target: "https://mvc-backend-b5wn.vercel.app",
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
