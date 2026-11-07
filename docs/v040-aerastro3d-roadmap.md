# Aerastro 3D — v0.4.0 implementation plan
Status: **planning / integration pending**. Branch: `feature/v0.4.0-auth-cloud-library` branched from the stable v0.3.4 release commit `520764805cb56eade133a70fb8da3b6cadd81d3c`. **Do not merge main until owner acceptance.**

## Confirmed decisions
- Brand: **Aerastro 3D** (`aerastro3d`).
- Free HTTPS hosting address first. Preferred candidate: `aerastro3d.pages.dev`; **availability has not been confirmed or reserved**.
- Keep https://hoangnguyen244-aerastro.github.io/3d-web-platform/ live as the stable v0.3.4 fallback while developing.
- Next milestone is **v0.4.0 Accounts + Cloud Library**. Social sharing, 2-free-downloads-per-8h quota, AI generation and real payments are later separately gated releases.

## Architecture
```text
Browser: React/Vite/Three.js + Auth UI + Cloud Library
          | HTTPS                  | public previews
          v                        v
Supabase Auth              Private Supabase Storage
Google / GitHub / Email    originals + previews separated
          |                        ^
          v                        |
Postgres: profiles, assets, ownership, processing status
          |
RLS policies and server functions govern writes and reads
```

### Domain: free HTTPS without destabilizing main
1. Choose Cloudflare Pages project ID for candidate `aerastro3d.pages.dev` (only the account owner can reserve it; check name availability in Cloudflare dashboard).
2. Deploy a **preview** using the `feature/v0.4.0-auth-cloud-library` branch; set Vite `base` for the deployment root (`/`) and configure SPA fallback.
3. Verify static assets (including `/models/Boat.fbx`) load under Pages; compare with existing GitHub Pages `/3d-web-platform/` base path.
4. Enable HTTPS automatic service; never disable TLS or expose tokens in public URLs.
5. Before social OAuth, record the exact final Pages URL in Supabase Authentication URL Configuration. Site URL should be the chosen production domain, with exact allowlisted localhost and preview redirect URLs.
6. GitHub Pages stays unchanged until Cloudflare website, auth callbacks and cloud library pass QA. A free `pages.dev` subdomain is **not a personally owned registrable domain** and Cloudflare Pages says it cannot be renamed without replacing the project.

### Authentication: Supabase Auth
- Signup/signin: Email OTP or magic link first, then Google and GitHub OAuth. Password optional later.
- Users must control their own sessions and be able to sign out; no custom password or OAuth token storage.
- Frontend may use `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, but never service-role keys, OAuth provider secrets or Stripe secret keys.
- Read initial session and subscribe/unsubscribe to auth state changes; show clear loading, missing-config and error states.
- Configure email templates, rate limits, redirect allowlist, abuse protection and session expiration in Supabase Dashboard.
- Account linking requires explicit authenticated authorization, not matching email strings blindly.
- Manual checks: signup/login/logout/refresh, OAuth on localhost and Pages, bad redirects, cancelled auth, expired links, duplicate account and mobile browsers.

### Cloud Library: safe first iteration
- Every authenticated user has `profiles` and `assets`, with non-guessable asset IDs.
- Store original files in a **private** bucket (`asset-originals`) under `<auth.uid()>/<asset-id>/original.<ext>`.
- Use separate `asset-previews` bucket for public, optimized/low-resolution previews only after explicit publication. **Never publish the private full original** merely because someone enabled sharing.
- A user can create/list/update/delete only their assets (Postgres Row Level Security, storage object owner/path restrictions). Public viewing uses explicitly published preview metadata and sanitized thumbnail references.
- Upload must validate extension, size and content; processing/re-encoding done server-side or a trusted worker. The current browser importer supports up to 50 MB; first cloud upload limit proposed: 50 MB per file, maximum 5 assets and 250 MB total per free account (subject to actual Supabase quota).
- File status: `uploading` → `processing` → `ready` or `failed`. Store MIME, original filename, content hash, size, author, visibility, created_at and updated_at.
- Never serve a signed original download URL in the free public viewer. Use an intentionally limited derived preview. Once paid downloads arrive, a server function atomically checks entitlements/quota before issuing a short-lived signed URL.
- For v0.4.0, **the paywall and 2/8-hour quota are not enabled**. No real payments or free-download enforcement is claimed.

## Incremental implementation and acceptance gates

| Step | Deliverable | Acceptance gate |
|---|---|---|
| A: domain preview | Candidate `aerastro3d.pages.dev`, Cloudflare build, HTTPS, GitHub Pages unchanged | Boat asset, 3D Viewer, fallback, refresh and routes pass |
| B: Auth core | Supabase client adapter, Email Magic Link, signed-in/out UI and profile | End-to-end email auth, session restore, errors, logout on Windows/mobile |
| C: OAuth | Google and GitHub sign-in | Separate new/existing accounts, safe redirects, no duplicate user or open redirect |
| D: DB/storage | Versioned SQL migrations: profiles/assets, private originals and RLS, cloud upload/list/delete | User A cannot read or modify B's files, oversized/invalid file rejected |
| E: Viewer integration | Save current upload to cloud library, choose existing asset to open in Viewer | Material selection/shader/Boat default and all v0.3.4 regressions pass |
| F: release | CI tests, feature preview, threat check, PR review and explicit owner approval | No production secrets in git; only then squash merge |

## Hard security / product requirements
- Read/write protected by **server-side** RLS, not only client UI.
- RLS for both Postgres and Storage. No anonymous arbitrary upload.
- Never use client-only counts for quota enforcement. 2 downloads per rolling 8 hours is a later backend transaction, not a v0.4.0 promise.
- Uploaded models and textures may contain hostile payloads; enforce size/type limits and consider worker-side processing/sanitization.
- An open 3D preview cannot completely stop extraction of geometry sent to a browser. Distinct limited previews versus private originals is a business control, not DRM.
- Retention, data deletion, copyright reporting, age/legal requirements, and a privacy policy must be addressed before public signups.
- Free-tier hosting/storage/GPU limits are subject to provider changes; monitor spending and abuse.

## Setup required from the owner (not credentials in chat)
1. Create Cloudflare account/Pages project, choose an available short `pages.dev` identifier, grant repo access.
2. Create a new Supabase project, configure Authentication URLs/providers and storage policies.
3. Put *public* `VITE_*` configuration in trusted deployment environment settings or local `.env.local`; keep private credentials only inside provider dashboards/server secrets.
4. Confirm final Pages host and Supabase project reference (non-secret) before live OAuth integration.

## References
- https://developers.cloudflare.com/pages/how-to/redirect-to-custom-domain/
- https://developers.cloudflare.com/pages/platform/known-issues/
- https://supabase.com/docs/guides/auth/redirect-urls
- https://supabase.com/docs/guides/auth/social-sign-in/auth-github
- https://supabase.com/docs/guides/auth/social-login/auth-google
- https://supabase.com/docs/guides/storage/security/signing-keys
