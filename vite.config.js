import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// base './' + HashRouter = aman untuk GitHub Pages (repo apa pun)
export default defineConfig({ plugins: [react()], base: './' });
