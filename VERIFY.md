# Verification checklist

Nothing below has been run yet. Tick each box yourself. Stop at the first failure and fix it before continuing.

## A. Build health (no external accounts needed)

- [ ] `npm install` completes. If a version is not found, adjust `@farcaster/miniapp-sdk` / `@farcaster/quick-auth` ranges in `package.json`.
- [ ] `npm run typecheck` passes.
  - If `sdk.isInMiniApp`, `sdk.context`, `sdk.quickAuth.fetch` or `sdk.actions.composeCast` fail to type-check, compare with the installed SDK's types and the docs at miniapps.farcaster.xyz. These are in `src/lib/client/*.ts` and `src/components/HubApp.tsx`.
  - If `Errors` or `createClient` are not exported from `@farcaster/quick-auth`, fix `src/lib/auth.ts`.
- [ ] `npm run lint` passes (warnings about `<img>` are not expected; none are used).
- [ ] `npm test` passes. Expect the PostgreSQL suite to show as skipped.
- [ ] `npm run build` succeeds. `next/font/google` needs network at build time to fetch Manrope.

## B. Database

- [ ] `DATABASE_URL=... npm run db:migrate` prints `apply 001_init.sql`; running it again prints `skip`.
- [ ] `TEST_DATABASE_URL=<disposable db> npm test` runs the integration suite and it passes (concurrent limit test, cross-user isolation, history cap).

## C. Local run

- [ ] `npm run dev` starts; `/` shows "Open this app in Farcaster" (expected outside a client).
- [ ] `curl -i localhost:3000/api/me` returns **401**.
- [ ] `curl -i localhost:3000/.well-known/farcaster.json` returns JSON with a `miniapp` object.
- [ ] `/api/icon`, `/api/og`, `/api/splash` return PNGs (1024x1024, 1200x800, 200x200).
- [ ] With dev auth on (see README) and a real `AI_API_KEY`: each of the three tools returns a real draft, the usage meter drops, History shows the item, delete works.
- [ ] With `AI_API_KEY` removed: generate shows the "not configured" message and the usage meter does not drop.
- [ ] With `DAILY_GENERATION_LIMIT=2`: the third generation is refused with the daily-limit message.
- [ ] With `GENERATION_ENABLED=false`: tools show "temporarily turned off".
- [ ] Production-mode check: `NODE_ENV=production` build with `DEV_AUTH_ENABLED=true` still returns 401 for `x-dev-fid`.
- [ ] Layout check at 360px width and at desktop width: bottom nav on mobile, nothing clipped, focus rings visible.

## D. In a real Farcaster client (needs deployment)

- [ ] Manifest tool accepts the domain and reports the manifest valid after you add the association env vars.
- [ ] App opens from the client, splash screen clears (proves `ready()` runs).
- [ ] Sign-in works: Home loads and the usage meter appears (proves Quick Auth verification, including audience = domain).
- [ ] A second Farcaster account sees an empty History and cannot open the first account's items.
- [ ] Share opens the composer with the draft text; Copy works in the in-app webview.
- [ ] Sharing the app URL in a cast renders the embed card.

## E. Before launch

- [ ] Provider spend limit set in the provider dashboard, plus a low `DAILY_GENERATION_LIMIT`.
- [ ] Privacy notice reviewed; support/contact route for deletion requests decided.
- [ ] `.env*` files confirmed absent from Git history.
