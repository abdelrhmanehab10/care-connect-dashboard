
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          vue: ['vue'],
          primevue: ['primevue'],
          vuetify: ['vuetify'],
          vendor: [
            '@tanstack/vue-query',
            'axios',
            'bootstrap',
            'lucide-vue-next',
          ],
        },
      },
    },
  },
})
