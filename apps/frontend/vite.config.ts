import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react()],
	optimizeDeps: {
		exclude: ["lucide-react"],
	},
	server: {
		host: true, // This allows Vite to be accessible from external network
		port: 5173,
		strictPort: true, // Fail if port is already in use
		proxy: {
			'/api': {
				target: 'http://localhost:3001',
				changeOrigin: true,
			},
		},
	},
});
