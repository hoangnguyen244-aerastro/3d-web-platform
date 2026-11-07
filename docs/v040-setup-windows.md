# Aerastro 3D v0.4.0 — owner setup checklist (Windows)

This document is a guide only. **The v0.4.0 OAuth and cloud library features are not connected yet.** The current public site remains v0.3.4.

## 1. Free domain candidate
Open https://dash.cloudflare.com/ and choose **Workers & Pages**. Create a new Pages project connected to the same GitHub repository. Try naming it `aerastro3d`, resulting in `https://aerastro3d.pages.dev/` **only if Cloudflare confirms availability**. If taken, suggested alternates:
- `aerastro-3d.pages.dev`
- `aerastrostudio3d.pages.dev`
- `aerastroverse3d.pages.dev`

Use a feature-branch preview and a separate Pages project or explicit production branch setting. Do not accidentally publish the untested branch over the stable public GitHub Pages website.

For Vite Pages builds, configure build command `npm run build` and output directory `dist`. The current Vite config has `base: '/3d-web-platform/'` for GitHub Pages; a Cloudflare Pages root deployment requires `base: '/'` or an environment-specific setting. This must be implemented and tested before pointing any OAuth redirects there.

The `pages.dev` subdomain has HTTPS but is controlled by Cloudflare; domain ownership and name availability are not guaranteed. Own a separate registered domain later for branding/business continuity.

## 2. Supabase project
Open https://supabase.com/dashboard and create a project. In Authentication → URL Configuration:
- Site URL = the *actual confirmed* production Pages URL
- Redirect URLs = exact localhost URL used by Vite (normally `http://localhost:5173/**`) and the confirmed Pages URL. Tighten wildcards for production.
- Enable Email OTP/Magic Link and verify sender/deliverability.
- Add Google/GitHub providers only after configuring their OAuth application callback addresses; enter secrets into Supabase/Google/GitHub dashboards, **never in GitHub source code or chat**.

In Supabase project settings, obtain only the project URL and the **publishable** key for the Vite client. Save to a local `.env.local` (ignored by Git), or the deployment's protected project variables. Publishable keys alone do not grant admin privileges **provided RLS/policies are correct**.

## 3. Cloud database and private storage
- Build the SQL schema and RLS policies on a separate migration commit and review them before applying to production.
- Create a private `asset-originals` bucket; reject anonymous writes and allow owner-scoped access.
- Limit upload size, file type and aggregate use.
- Do not expose full original assets as public previews.
- Validate user A vs B access in two separate browser sessions.

## 4. GitHub Desktop development workflow
1. In GitHub Desktop: **Fetch origin**; change branch to `feature/v0.4.0-auth-cloud-library`.
2. **Pull origin**, and run `npm.cmd install` then `npm.cmd run dev` from the project directory.
3. Verify current Boat.fbx, mesh/material picking, importer, Anime Toon and saved presets still work before adding auth.
4. Keep `main` on tag `v0.3.4` until all v0.4.0 manual gates pass.
5. Never commit `.env.local`, OAuth secrets, service-role keys, payment keys, personal user uploads or auth sessions.

## Release criteria
A finished v0.4.0 PR must pass: `npm.cmd run test`, `npm.cmd run build`, Windows acceptance, OAuth redirects (including sign-out and refresh), RLS negative cross-user tests, cloud upload/list/delete, preview integrity, and backward compatibility with v0.3.4. Only the owner authorizes squash merge.
