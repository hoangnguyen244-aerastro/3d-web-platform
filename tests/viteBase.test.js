import test from 'node:test';
import assert from 'node:assert/strict';

test('Vite defaults to the stable GitHub Pages path', async () => {
  delete process.env.VITE_SITE_BASE;
  const { default: config } = await import('../vite.config.js?github-pages');
  assert.equal(config.base, '/3d-web-platform/');
});

test('Cloudflare root base is selected by its build environment variable', async () => {
  process.env.VITE_SITE_BASE = '/';
  try {
    const { default: config } = await import('../vite.config.js?cloudflare-root');
    assert.equal(config.base, '/');
  } finally {
    delete process.env.VITE_SITE_BASE;
  }
});

test('invalid Vite base path is rejected', async () => {
  process.env.VITE_SITE_BASE = 'relative';
  try {
    await assert.rejects(import('../vite.config.js?invalid-base'), /VITE_SITE_BASE must be/);
  } finally {
    delete process.env.VITE_SITE_BASE;
  }
});
