# Solyra

The frontend for the trading platform — a React + TypeScript single-page app
covering the market dashboard, live quotes, charts, options/gamma analysis,
signals, the trade journal, AI insights, and catalysts.

**This repo holds the frontend only.** The FastAPI backend, the research
pipeline, and the GCP jobs live in the **stocks** repo and are deployed
together as the `trading-platform` Cloud Run service. Solyra's dev server
proxies `/api/*` to that backend, so the browser still sees same-origin
requests and none of the ~73 bare `fetch('/api/...')` call sites need to know
where the API actually is.

Built with [Lovable](https://lovable.dev).

## Development

You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
npm i
npm run dev
```

The app runs on <http://localhost:5173>.

### Where `/api` goes

The dev server picks its proxy target by **probing for a backend**, not by
sniffing environment variables — detecting the backend is more robust than
detecting the environment, and stays correct no matter what Lovable,
Codespaces, or CI happen to set:

| Situation | `/api/*` is proxied to |
| --- | --- |
| Something is listening on `localhost:8000` | that local backend |
| Nothing is (Lovable's cloud preview, a plain checkout) | `trading-platform-staging` on Cloud Run |
| `VITE_API_PROXY_TARGET` is set | that URL, unconditionally |

So a fresh clone gets **real data with no setup**. To run against a local
backend instead, start the API from the stocks repo on port 8000 and restart
the dev server — it will pick it up.

For offline UI work with no backend at all, `VITE_NO_BACKEND=1 npm run dev`
stubs `/api/config/firebase` with open auth so the SPA can boot. It is opt-in
because that stub would otherwise shadow a real backend, reporting `authMode:
'open'` while the API still expects a Firebase ID token — every gated call
would then 401.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on :5173 |
| `npm run build` | `tsc -b` across all three TS projects, then `vite build` |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests (`src/**/*.test.ts{,x}`) |
| `npm run e2e` | Playwright E2E (boots its own Vite on :5199) |

### TypeScript projects

`tsconfig.json` is a solution file referencing three projects: `app` (`src/`),
`node` (`vite.config.ts`), and `test` (`tests/`). The test project exists so
the E2E fixtures are type-checked against the real app contracts — a backend
schema change breaks `tsc -b` instead of silently drifting past a hand-written
mock.

## Tests

**Unit** — Vitest, colocated in `src/` as `*.test.ts{,x}`.

**E2E** — Playwright, in `tests/`. These are **hermetic**: every `/api` call is
intercepted with `page.route`, so they need no backend and no network. Test
data lives in `tests/helpers/`:

- `mocks.ts` — `mockCommon` (the cross-cutting endpoints every page hits) plus
  the `M` fulfil helpers.
- `fixtures/<page>.ts` — per-page typed payloads and a `mockXxxApi(page)`
  helper covering that page's full endpoint fan-out. Fixtures use `satisfies`
  against the real response types, so they can't drift from the contracts.

Playwright boots its **own** Vite on a dedicated port (:5199) with the /api
proxy pinned to a local backend — it never adopts your `npm run dev` server,
so a dev server left pointing at staging can't silently back a test run:

```sh
npm run e2e
```

Interrupted runs are self-healing: the launcher (`scripts/e2e-server.mjs`)
kills a Vite leaked by a hard-killed earlier run before starting its own, and
refuses to start while another Playwright run is active against this repo
(`.e2e-server.lock`) — two runs sharing one strict port would contaminate each
other's results. Playwright still never adopts a server it didn't configure,
on purpose.

Perf-budget tests assert a relaxed 8s ceiling by default (still catches a
route accidentally waiting on live infrastructure); run with `PERF=1` to
assert the strict per-page budgets on a quiet machine.

Backend contract tests — the ones that made live requests to `:8000` and
asserted API response shapes — are **not** here. They test code this repo no
longer contains, so they belong beside it in stocks.

## Build with Lovable

Continue developing in the [Lovable editor](https://lovable.dev/projects/f6c1be2f-245d-4a43-8110-dd05ffafa8af).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

> Avoid rewriting published git history (force-push, or rebasing/amending/
> squashing pushed commits) — it rewrites history on Lovable's side and can
> lose project history. See `AGENTS.md`.
