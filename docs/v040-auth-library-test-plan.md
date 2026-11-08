# Aerastro 3D v0.4.0 — Auth and private library acceptance checklist

**Development only.** Branch: `feature/v0.4.0-auth-cloud-library`. GitHub Pages v0.3.4 main stays untouched. Do not merge until the owner accepts.

## Current feature implementation
- Supabase Auth session restoration, Email Magic Link sign-in, sign-out and account display.
- Google/GitHub OAuth code is included but **off by default**. Enable only after email flow passes and both Supabase providers have correctly configured OAuth credentials.
- Private Cloud Library: 14 supported model formats, upload to `asset-originals`, owner-only list, authenticated download to **open in the viewer** and owner delete.
- This is a private owner workspace. Public share URLs, payment, AI generation, download pricing/2-per-8h quota, public preview conversion, texture asset library and marketplace are **not yet implemented**.
- Material/texture edits in the viewer remain local and are not synced to the stored original.

## Preflight — Supabase (owner must do)
1. In Supabase SQL Editor of the *dev project*, review and run `supabase/migrations/20261108_000001_aerastro_private_library.sql` once.
2. Verify `public.profiles`, `public.assets` have RLS enabled and private Storage bucket `asset-originals` exists. Never turn bucket public.
3. In Authentication → URL Configuration confirm Site URL `https://aerastro3d.hoangnguyen-artist.workers.dev` and redirect entries for exact Cloudflare/localhost. Development wildcard may be narrowed before wider launch.
4. Authentication → Sign In / Providers: Email enabled and Confirm Email enabled. Test provider email deliverability; built-in SMTP has limits and may only send to verified destinations until a suitable SMTP service is configured.
5. Cloudflare Worker → Settings → Builds → Variables and secrets (build-time):
   - `VITE_SITE_BASE` = `/`
   - `VITE_SUPABASE_URL` = the dev project URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = the project's **publishable** key
   - `VITE_ENABLE_SOCIAL_AUTH` **unset**, until OAuth manual tests pass.
6. Never add `sb_secret_`, `service_role`, DB password or social OAuth secrets to `VITE_*` or GitHub.

## Windows test A — Email Magic Link + session
- Open deployed Cloudflare Worker and confirm Aerastro account form exists. If it says config missing, check build vars and redeploy the latest feature commit.
- Enter your email and click Send Magic Link **once**. It should show a send confirmation or a clear rate-limit error.
- Open email link **in the same browser** (PKCE verifier is stored in that browser) and confirm signed-in email appears.
- Press F5; session should restore without a new email. Open another tab and verify.
- Sign out; the account should disappear and library should be hidden. Reload and confirm signed out.
- Verify wrong email, old/expired links, cancelled sign-in, and error states. Do not share links or tokens.

## Windows test B — Private Cloud Library
- After applying SQL, upload an FBX/OBJ/GLB under 50MB. Confirm it appears in My Cloud Library.
- Click Open in Viewer. Verify mesh names, textures and material slots survive loading (for self-contained assets).
- Verify local shader/material edits are not automatically saved back into Supabase.
- Delete one model and confirm it disappears. Test 0-byte/unsupported/>50MB rejection.
- Use two independent users A and B in separate profiles. B must **not** see, fetch, delete, or overwrite A's file (via authenticated API calls, not only UI).
- Ensure original storage bucket stays private; avoid public download links.
- Regression: default Boat.fbx, raycast slot picking, shader outline/roughness, other import formats still work.

## Stage C — OAuth (ONLY after Stage A)
- Configure Google and GitHub OAuth **inside Supabase and the provider dashboards**; ensure correct Supabase provider callback and Cloudflare redirect allowlist. The Supabase dashboard's Enabled label alone is not proof of working provider credentials.
- Enable `VITE_ENABLE_SOCIAL_AUTH=true` in Cloudflare *build variables* and rebuild the feature branch. Then test Google/GitHub flows and logout with clean/returning accounts.
- Disable the flag and redeploy on any unexpected redirect behavior.

## Notes / limitations
- No production guarantee yet until real Auth+Storage acceptance is complete.
- Application-side file limits are not a substitute for trusted server-side storage quotas; SQL currently enforces 50MB metadata max, and bucket size limit is 50MB; **total storage/account limits and uploads not represented by metadata need server-side enforcement** before opening unrestricted public signup.
- Original file authenticated fetch is intended for its owner to reopen/edit, not for a paid-download public marketplace.
- Supabase free SMTP sending quotas and provider settings can prevent login emails; troubleshoot inside Authentication logs.
- Never use the Supabase dashboard 'main PRODUCTION' label to infer it is your GitHub `main` branch; they are unrelated.
