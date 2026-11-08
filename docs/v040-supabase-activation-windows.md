# Aerastro 3D v0.4.0 — Activate Email Login and Private Library (Windows)

This document is for the feature preview hosted at:
https://aerastro3d.hoangnguyen-artist.workers.dev/

Stable GitHub Pages v0.3.4 is not modified. **Do not merge main.**

## A — Verify the Cloudflare build (no code changes needed)
1. Open Cloudflare → Workers & Pages → `aerastro3d` → **Settings → Builds**.
2. Production branch should be `feature/v0.4.0-auth-cloud-library`.
3. Check build variables:
   - `VITE_SITE_BASE` = `/`
   - `VITE_SUPABASE_URL` = your `https://<ref>.supabase.co` URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = publishable key (never secret)
4. Leave `VITE_ENABLE_SOCIAL_AUTH` unset. Google/GitHub buttons are intentionally hidden until email login works.
5. Open Deployments, ensure latest feature commit shows Ready. Refresh the Cloudflare site with Ctrl+Shift+R.

## B — Install database and storage policies
1. Go to **Supabase Dashboard → your dev project → SQL Editor** (</> icon in the left sidebar).
2. Click **New query**.
3. In GitHub, on branch `feature/v0.4.0-auth-cloud-library`, open:
   [Private library migration](../supabase/migrations/20261108_000001_aerastro_private_library.sql).
4. Click **Raw**, copy the full SQL into the Supabase SQL editor, read/review it, then click **Run**.
5. Confirm green **Success**. The script creates `public.profiles`, `public.assets`, and private Storage bucket `asset-originals`. It also adds access policies for the signed-in owner.
6. Check **Table Editor → assets** and **Storage → asset-originals**, where `asset-originals` must be Private.
7. Never switch the bucket to Public. No `service_role` key goes into the frontend.

If SQL fails, save the error text (without credentials) and stop; do not manually disable RLS.

## C — Test Email Magic Link
1. Open the Cloudflare Worker address above.
2. Under **Aerastro 3D Account**, enter your email, click **Send Magic Link**.
3. Open your inbox and click the sign-in link in **the same browser**. PKCE uses data stored by that browser.
4. Confirm your email appears under **Signed in as**; refresh the page to check session persistence.
5. Click **Sign out**. Refresh again to confirm the session is gone.

If mail doesn't arrive: check Supabase Authentication → Logs and SMTP sending/rate-limit settings. A test SMTP service may be limited to verified addresses.

## D — Test private Cloud Library
1. Sign back in.
2. Open **My Cloud Library** and choose **Upload a 3D file** (FBX/GLB/OBJ, under 50 MB).
3. Confirm the file appears with its filename and size.
4. Click **Open in Viewer**. The selected model should load with existing viewer controls.
5. Click **Delete** and confirm. Verify it disappears.
6. With two different accounts, verify that the second account cannot list/open/remove the first account's models. Privacy is enforced by Supabase RLS, not only by buttons.

Cloud Library currently saves the uploaded **original file**, not subsequent shader/material editor changes. There is no paid download, public share, quota enforcement or AI generation yet.

## E — Social login, only after email acceptance
Google and GitHub are implemented behind the build flag `VITE_ENABLE_SOCIAL_AUTH=true`. They must not be enabled until each OAuth provider is configured and redirect flows have been tested. OAuth secret keys stay in provider/Supabase dashboards; never copy them into Vite variables.

If you change the Cloudflare domain in the future, update Supabase Site URL, Redirect URL allowlist, and OAuth configuration before relying on sign-in links.

## F — Release conditions
- CI `npm ci`, `npm run test`, `npm run build` pass.
- Cloudflare confirms latest feature-branch deployment.
- Manual login, logout, page-refresh, cloud upload/open/delete pass.
- Two-account cross-access denial tested.
- Boat.fbx, click material selection, Anime Toon and 14-format local importer regressions pass.
- Project owner explicitly authorizes a PR merge; otherwise keep `main` on v0.3.4.
