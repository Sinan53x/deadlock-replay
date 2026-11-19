import { defineConfig } from 'vite';

export default defineConfig({
    // GitHub Pages serves the site from /<repo>/.
    base: process.env.PAGES_BASE ?? '/',
    build: { target: 'es2022' }
});
