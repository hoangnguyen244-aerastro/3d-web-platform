# Cloudflare Worker white page — diagnosis and fix (v0.4.0 preview)

Observed 2026-11-08 on the user's Cloudflare deployment:
- Existing Worker URL: https://aerastro3d.hoangnguyen-artist.workers.dev/
- Build completed, assets uploaded, including /models/Boat.fbx, and Worker deployed successfully.
- Browser loaded a blank white page.
- Cloudflare build logs show the **main** branch and `npm run build` / `npx wrangler deploy`.
- This repo historically defaults to the GitHub Pages Vite base `/3d-web-platform/`, which makes built JS/CSS/Boat paths wrong at a Cloudflare root URL.
- The build also invokes Vite a second time from Wrangler's auto-configuration, so changing just the first build command is insufficient. An environment variable is applied across all build processes.

## Implemented source fix
`vite.config.js` now chooses:
- `/3d-web-platform/` by default, preserving GitHub Pages and local behavior.
- `/` **only if** Cloudflare build variable `VITE_SITE_BASE` is set to `/`.
- Invalid path values fail fast.

Regression tests in `tests/viteBase.test.js` check both paths.

## Cloudflare Dashboard — step-by-step

1. Open https://dash.cloudflare.com/ → **Workers & Pages** → **aerastro3d**.
2. Go to **Settings** and locate **Build** (or Build configuration / Builds).
3. Find **Production branch**, currently `main` in the screenshot. Change to `feature/v0.4.0-auth-cloud-library` **for this experimental Worker only**, then save. This does NOT change the GitHub main branch or its Pages site.
4. Find **Build variables** (could appear under **Build**, or **Variables and Secrets** with an option for build-time variables). Add plain text:
   - **Name:** `VITE_SITE_BASE`
   - **Value:** `/`
   This is not a secret, it only chooses the correct Vite public root.
5. Confirm **Build command** `npm run build`, **Deploy command** `npx wrangler deploy`, **Root directory** `/`. Leave these unchanged while using the environment-variable fix.
6. Start a new deployment using the **feature branch's latest commit**, not Retry on a stale `main` build. If needed, use the current Deployments screen's "Retry build" only after the branch and variables have been saved, or create a fresh build from feature branch.
7. After deployment, open the Worker URL using Ctrl+Shift+R. In browser DevTools → Network check that `/assets/index-*.js`, CSS and `/models/Boat.fbx` respond 200.
8. Expected: Aerastro v0.3.4 UI and Boat display on Cloudflare as a v0.4.0 *preview*, while GitHub Pages v0.3.4 remains intact.

## If white page remains
- Press F12 → Console and Network. Copy only error messages / failing resource URL and HTTP code (no credentials).
- If an asset request contains `/3d-web-platform/assets/...` on the Cloudflare Worker, then the new base variable was not used by the build.
- If browser requests `/assets/...js` and returns HTML instead of JS, inspect Worker static asset routing / SPA fallback config.
- Do not change production GitHub Pages to debug Cloudflare.
- No Supabase Auth or Cloud Library UI is active yet; fix hosting before enabling user accounts.

References:
- https://vite.dev/guide/build#public-base-path
- https://developers.cloudflare.com/workers/static-assets/
