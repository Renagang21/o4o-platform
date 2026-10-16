import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ["react", "react-dom", "react-router", "react-router-dom"],
  },
  test: {
    environment: "jsdom",
    include: ["services/web-pharmacy-coop/src/**/*.test.{ts,tsx}"],
    passWithNoTests: false,
  },
});
