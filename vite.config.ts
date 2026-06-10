import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "./",
  server: {
    host: "::",
    port: 8082,
    proxy: {
      // dfs-personalization backend (Becken chat, auth token)
      "/dfs-personalization": {
        target: "http://localhost:8081",
        changeOrigin: true,
      },
      // eGov filestore
      "/filestore": {
        target: "http://egov-filestore:8080",
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
