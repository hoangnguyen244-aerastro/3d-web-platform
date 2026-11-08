import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves from /3d-web-platform/; Cloudflare Workers serves from /.
// Set VITE_SITE_BASE=/ in Cloudflare Build Variables to use the root path.
// Using an explicit environment variable avoids altering the stable GitHub Pages URL.
const siteBase = process.env.VITE_SITE_BASE || '/3d-web-platform/';
if (!/^\/(?:[A-Za-z0-9._~-]+\/)*$/.test(siteBase)) {
  throw new Error('VITE_SITE_BASE must be / or an absolute path ending with /');
}

export default defineConfig({
  plugins: [react()],
  base: siteBase,
});
