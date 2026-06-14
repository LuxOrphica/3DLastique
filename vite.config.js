import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isVseMode = mode === "vse";
  return {
    plugins: [react()],
    server: {
      port: 5175,
      host: "0.0.0.0",
      watch: {
        ignored: [
          "**/public/vse/**",
          "**/dist/**",
          "**/dist-check*/**",
          "**/dist-vse-preview/**",
          "**/tools/vse/reports/**",
          "**/INFO/**",
          "**/test/**",
        ],
      },
    },
    optimizeDeps: isVseMode
      ? {
          noDiscovery: true,
          include: ["react", "react-dom", "react-dom/client", "react-router-dom"],
        }
      : {
          entries: ["index.html"],
        },
  };
})
