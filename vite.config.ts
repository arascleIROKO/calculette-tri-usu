import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base relative : l'app fonctionne aussi bien à la racine d'un domaine que sous un sous-chemin (GitHub Pages)
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
