import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    // Arahkan output build langsung ke folder backend (sesuaikan nama foldernya jika berbeda)
    outDir: '../backendGo/dist', 
    emptyOutDir: true, // Otomatis bersihkan file lama di folder backend saat build baru
  },
})