import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
/* The Lepide Design System packages are linked from ../lepide-design-system (file: dependencies). Resolve their React and Highcharts
   imports from this app's node_modules so there is only one copy of each. */
export default defineConfig({
  plugins: [react()],
  resolve: { preserveSymlinks: true, dedupe: ['react', 'react-dom', 'highcharts'] },
});
