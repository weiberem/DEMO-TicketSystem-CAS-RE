import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// NEXT_PUBLIC_ wird zusätzlich akzeptiert, damit die Vercel-Supabase-Integration
// ihre Variablen ohne Umbenennung liefern kann.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  build: { chunkSizeWarningLimit: 900 },
})
