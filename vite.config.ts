import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages: Repo unter RandoriProAdmin/randori-pro-arcade
  // → https://randoriproadmin.github.io/randori-pro-arcade/
  base: '/randori-pro-arcade/',
})
