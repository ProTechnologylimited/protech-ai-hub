# Protech AI Hub

**Create Smarter. Build Faster.** A Farcaster Mini App by ProTechnology Limited that drafts casts, replies and
project promotion with AI, and keeps a private history of what you generate.

> **Status: code complete, not yet built or run.** This project was written in an environment with no network access,
> so `npm install`, the production build, lint, the tests and every external integration have **not** been executed.
> Work through [VERIFY.md](./VERIFY.md) before you rely on anything here.

## Features

- **Cast Writer**: topic, objective, tone, length and keywords produce a cast draft (editable, 320-character counter, copy, share, regenerate, clear).
- **Reply Assistant**: paste a *public* post, say how you want to respond, get a draft reply. It never reads private messages and never posts.
- **Project Promoter**: one promotional cast, a short description, three headlines and a call to action, labelled as a draft. Prompts forbid inventing partnerships, funding, listings, user counts or returns.
- **History**: PostgreSQL-backed, per-user, paginated (20 per page), open / copy / delete, capped per user.
- **Auth**: Farcaster Quick Auth. The JWT is verified on the server with `@farcaster/quick-auth`; the FID is the verified `sub` claim.
- **Cost control**: daily allowance enforced in the database, burst throttle, input and output caps, kill switch, configurable model.

## Stack and version choices

| Piece | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 15 (App Router), React 19, TypeScript | Stable, first-class on Vercel |
| Styling | Tailwind CSS 3.4 | Mature config; avoids v4 build differences |
| Mini App SDK | `@farcaster/miniapp-sdk` | Official SDK |
| Auth verification | `@farcaster/quick-auth` | Official server-side JWT verification |
| Database | PostgreSQL via `pg` (parameterised SQL, no ORM) | Works with any provider (Neon, Supabase, Vercel Postgres, RDS) |
| AI | Plain HTTPS to the provider, behind an `AiProvider` interface | No SDK lock-in; Anthropic and OpenAI-compatible included |
| Tests | Vitest | Fast, TypeScript-friendly |

Semver ranges in `package.json` were chosen without registry access. If `npm install` reports a missing version
(most likely `@farcaster/miniapp-sdk` or `@farcaster/quick-auth`, which are pre-1.0), run
`npm view <package> versions` and adjust the range. Check
[miniapps.farcaster.xyz](https://miniapps.farcaster.xyz/) for current SDK API notes.

## Project layout

```
migrations/001_init.sql        schema (users, generations, usage_records)
scripts/migrate.mjs            forward-only migration runner
src/app/                       pages, API routes, manifest, generated icon/OG/splash images
  .well-known/farcaster.json/  Mini App manifest (env-driven)
  api/{me,generate,history}    protected endpoints
  api/{icon,og,splash}         PNGs generated with next/og
src/lib/
  config.ts                    env parsing (server only)
  auth.ts                      Quick Auth verification + dev-only bypass
  generate-service.ts          validation -> throttle -> reserve usage -> AI -> save
  handlers.ts                  request handlers (dependency-injected, unit-testable)
  runtime.ts                   production wiring
  repo.ts / store.ts           PostgreSQL access layer / contract
  ai/                          provider interface, anthropic, openai-compatible
  prompts.ts, postprocess.ts   prompt building, output cleaning, promoter JSON parsing
  validation.ts, constants.ts  shared zod schemas and option lists
  client/                      browser-only helpers (SDK, fetch, clipboard, share)
src/components/                UI
tests/                         vitest suites
```

## Local development

Requires Node 20.11+ and a PostgreSQL database.

```bash
npm install
cp .env.example .env.local        # then fill in real values
npm run db:migrate                # applies migrations/*.sql to DATABASE_URL
npm run dev                       # http://localhost:3000
```

A regular browser is not a Farcaster client, so the app shows an "Open this app in Farcaster" screen. To preview in a
browser **during local development only**, set in `.env.local`:

```
DEV_AUTH_ENABLED=true
NEXT_PUBLIC_DEV_AUTH=true
NEXT_PUBLIC_DEV_FID=1
```

The server honours the `x-dev-fid` header only when `NODE_ENV !== "production"` **and** `DEV_AUTH_ENABLED=true`.
Production builds ignore it regardless of environment variables. This path does not exercise Quick Auth, so it does
not prove authentication works.

To test inside a real client, expose your dev server over HTTPS (for example a tunnel), set `NEXT_PUBLIC_APP_URL` to
that URL (the host must match, because the JWT audience is the domain), and open it with the Farcaster developer tools.

## Environment variables

All are documented in `.env.example`. Secrets are server-only; only `NEXT_PUBLIC_*` values reach the browser and none of
them are secret.

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | yes | Public base URL. Used in the manifest/embed and its host is the Quick Auth audience |
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `AI_PROVIDER` | no | `anthropic` (default) or `openai-compatible` |
| `AI_API_KEY` | yes for generation | Provider key. Missing key returns a clear 503, never a fake result |
| `AI_MODEL` | yes for openai-compatible | Model name. Defaults to `claude-haiku-5-5` for anthropic. Confirm in your provider's docs |
| `AI_BASE_URL` | no | Override base URL (e.g. `https://api.openai.com/v1`) |
| `AI_TIMEOUT_MS` | no | Provider timeout, default 30000 |
| `GENERATION_ENABLED` | no | `false` disables all generation |
| `DAILY_GENERATION_LIMIT` | no | Per user per UTC day, default 10 |
| `MAX_INPUT_CHARS` | no | Total user input per request, default 3000 |
| `MAX_OUTPUT_TOKENS` | no | Model output cap, default 600 |
| `RATE_LIMIT_PER_MINUTE` | no | Burst throttle per user, default 5 |
| `HISTORY_MAX_PER_USER` | no | Saved results kept per user, default 200 |
| `FARCASTER_ACCOUNT_ASSOCIATION_{HEADER,PAYLOAD,SIGNATURE}` | for publishing | From the manifest signing step |
| `DEV_AUTH_ENABLED`, `NEXT_PUBLIC_DEV_AUTH`, `NEXT_PUBLIC_DEV_FID` | no | Local-only auth bypass; leave `false` in deployments |
| `TEST_DATABASE_URL` | no | Enables the PostgreSQL integration tests (use a disposable database) |

## Database

```bash
DATABASE_URL="postgresql://..." npm run db:migrate
```

Creates `users` (unique `fid`), `generations` (indexed by `user_id, created_at desc`) and `usage_records` (unique
`user_id, usage_date`). The runner records applied files in `schema_migrations`. `display_name` is reserved and left
empty: Quick Auth only verifies the FID, and a client-supplied name must not be trusted.

## Cost control and expected cost

- The daily allowance is reserved with a single atomic SQL statement **before** the provider call and refunded if the call fails, so concurrent requests cannot exceed it.
- The burst throttle is in-memory per server instance. On serverless platforms it is best effort; the database allowance is the authoritative limit.
- Set `GENERATION_ENABLED=false` to stop spend immediately.
- Worst-case spend is roughly `users x DAILY_GENERATION_LIMIT x per-request cost`. A request is a short prompt plus at most `MAX_OUTPUT_TOKENS` of output. Check your provider's current pricing for your chosen model and set the limits accordingly. **AI provider usage is chargeable.** Start with a low limit.
- No subscriptions or token payments exist in this version.

## Tests, lint, build

```bash
npm run typecheck
npm run lint
npm test            # TEST_DATABASE_URL=... npm test  to include the PostgreSQL tests
npm run build
```

Covered: input validation, generation endpoint validation, daily-limit and burst-throttle enforcement, authentication
enforcement on every protected endpoint, history authorization across users, provider failure/timeout/bad-response
handling, secret/internal leakage in errors, and (optionally) real SQL behaviour including concurrent limit enforcement.

## Deploying to Vercel

1. Push the repo to GitHub (confirm `.env*` files are not committed) and import it in Vercel.
2. Add every variable from the table above in Project Settings, Environment Variables.
3. Provision PostgreSQL and run `npm run db:migrate` against it once.
4. Deploy and note the production URL. Set `NEXT_PUBLIC_APP_URL` to it and redeploy so the manifest, embed and Quick Auth audience match.
5. If you enable **Vercel Bot Protection / WAF**, add bypass rules for `/.well-known/farcaster.json` and the app's home URL, otherwise Farcaster cannot fetch them and the app hangs on the splash screen.

## Publishing as a Farcaster Mini App

Running in a browser does not publish anything. The app is only recognised after its domain is verified.

1. Deploy to a stable HTTPS domain and confirm `https://YOUR_DOMAIN/.well-known/farcaster.json` loads.
2. Open the Farcaster Mini App manifest tool (Developer settings in a Farcaster client, see the [publishing guide](https://miniapps.farcaster.xyz/docs/guides/publishing)) and sign the domain with your Farcaster account.
3. Copy the resulting `header`, `payload` and `signature` into `FARCASTER_ACCOUNT_ASSOCIATION_HEADER`, `_PAYLOAD`, `_SIGNATURE` in Vercel and redeploy.
4. Re-open the manifest tool and confirm it reports the manifest and metadata as valid. Fix any field it flags. Field names and limits are checked there rather than assumed here.
5. Open the app from your client, confirm sign-in works and the splash screen clears.
6. Share the app URL in a cast and confirm the embed (3:2 image and launch button) renders.

## Privacy

`/privacy` explains what is stored (FID, usage counts, your inputs and results) and that input text is sent to a
third-party AI provider. Have the notice reviewed against your own legal obligations before launch.

## Security notes

- All mutating and data endpoints require a verified Quick Auth token; the user comes from the token, never from request fields.
- Every history query includes `user_id`; cross-user reads and deletes return 404.
- Inputs are validated with zod on the server (and the same schemas on the client). Bodies over 20 KB are rejected.
- Generated text is rendered as text only; no HTML injection path exists.
- User input is wrapped in tagged data blocks and the system prompt tells the model not to follow instructions inside them. This reduces, but cannot eliminate, prompt injection. Output is only ever a draft shown to the user.
- Errors are mapped to fixed messages; provider bodies and stack traces are never returned. Prompts are not logged.
- The app must be embeddable, so it sets no `X-Frame-Options`; it does set `nosniff` and a strict referrer policy.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Infinite splash screen in a client | `sdk.actions.ready()` not reached, or WAF/bot protection blocking the home URL |
| "Open this app in Farcaster" in a client | `sdk.isInMiniApp()` returned false; verify the SDK version and that the client supports Mini Apps |
| 401 right after sign-in | `NEXT_PUBLIC_APP_URL` host does not match the domain the app is served from (JWT audience mismatch) |
| 503 `not_configured` | `AI_API_KEY` (or `AI_MODEL` for openai-compatible) is missing on the server |
| 429 `daily_limit` | Allowance used; resets 00:00 UTC. Raise `DAILY_GENERATION_LIMIT` if intended |
| 502 `ai_bad_response` on Project Promoter | Model did not return the required JSON; retry or try a stronger model |
| Migration cannot connect | Check `DATABASE_URL` and `?sslmode=require` for your provider |
| Manifest tool reports invalid | Association env vars missing, or domain differs from `NEXT_PUBLIC_APP_URL` |

## Known limitations

- Per-instance burst throttling (see Cost control).
- No Farcaster profile or display name is stored; the welcome name is read client-side from `sdk.context` for display only.
- Share uses `sdk.actions.composeCast`; clients that lack it fall back to a message asking the user to copy.
- Cast length is counted against the standard 320-character limit.
