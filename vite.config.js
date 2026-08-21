const { defineConfig } = require("vite");
const react = require("@vitejs/plugin-react");
const path = require("node:path");

module.exports = defineConfig({
  root: "src",
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true
  },
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true
  }
});
