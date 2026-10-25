# V1 backend-first delivery blueprint

Decision record for [the delivery blueprint](https://github.com/Anoushka004/car-dealership-inventory/issues/10), 2026-10-25. Owner choices below are explicitly confirmed in that thread. Remaining technical details are implementation selections made to carry out those choices. This is a delivery plan, not evidence that the application or deployment already works.

## Settled choices and scope

Personal, non-commercial learning demo; entirely free hosting; Vercel Hobby and Neon Free; Python 3.13; FastAPI HTTP API; Django ORM and Django migrations; phased migrations; React Router; GitHub Actions CI. No paid upgrade, new paid domain or automatic public deployment is authorized. Provider quota exhaustion may interrupt the demo; never upgrade automatically. Actual account credentials, email entitlement and verified content remain release inputs.

The [V1 specification](https://github.com/Anoushka004/car-dealership-inventory/issues/8), [REST resolution](https://github.com/Anoushka004/car-dealership-inventory/issues/5#issuecomment-6394771175), [Stock amendment](https://github.com/Anoushka004/car-dealership-inventory/issues/4#issuecomment-6396384497), [API amendment](https://github.com/Anoushka004/car-dealership-inventory/issues/5#issuecomment-6396390633) and [locked frontend resolution](https://github.com/Anoushka004/car-dealership-inventory/issues/6#issuecomment-6396001079) remain governing behavior. Build and accept the backend before production frontend integration.

## Checkout and branch

Use a new independent checkout at `D:\incubyte project\.implementation-v1`, branch `integration/dealership-v1`, based on GitHub `main`. The current main was verified as `14e7ae4b6c35812616df514fa74c7a1fc21cc6a9` (README and gitignore). Fetch again before creating the branch; if main changes, record the new actual base. Preserve the original unborn workspace and `.frontend-v1-artifact` without checkout, reset, staging or baseline commits there.

Implementers use separate worktrees and branches based on the integration tip; merge completed slices into integration as the implement-spec workflow requires. Review at the spec boundary. No main merge or public deployment is implied. The tracker resolves work through explicit resolution comments and issue closure, rather than requiring PRs; no PR is required unless requested. Commit only relevant application files, necessary guidance and decision references in the new checkout. Keep secrets and generated test output out of source control.

Use the immutable frontend at `01c70baef1c5fdba26f7f5efd4260712b3e81161` as the later integration source/reference. Bring across the approved B experience deliberately after backend acceptance, without merging the entire prototype branch or reintroducing A/C into the shipped demo.

## Runtime and persistence

Python 3.13 in `.python-version` and matching project metadata; Django 5.2 LTS line, psycopg 3, FastAPI/Pydantic, Uvicorn locally, pytest and HTTPX for backend verification. Select current compatible patches and commit an exact dependency lock during foundation implementation, with clean Python 3.13 install/build evidence. Use Node 22 and npm lockfiles for React/Vite, React Router browser routing and Playwright/axe. Preserve approved design rather than mandating prototype dependency versions.

Initialize standalone Django settings/application registry before importing models. Keep each transaction-sensitive operation in one synchronous transaction behind a safe FastAPI sync boundary. Provide explicit connection cleanup in the thread that owns the Django connection, including exception paths. No `DJANGO_ALLOW_ASYNC_UNSAFE`, session-scoped database locks or process-local inventory locks as correctness mechanisms.

Use Neon pooled `DATABASE_URL` for request traffic and a direct `MIGRATION_DATABASE_URL` for schema work, both TLS-enabled. Runtime settings use `CONN_MAX_AGE=0`, disable server-side cursors under transaction pooling, and avoid multiplying application pools inside serverless instances. Use transaction-local settings/locks where needed. Keep privileged migration credentials out of the runtime environment and out of browser bundles. The runtime account has only the permissions the implemented operations need.

PostgreSQL 17 is the local/CI target and intended Neon version; verify its availability when provisioning. A different hosted major requires an explicit compatibility check and synchronized local/CI change before release. No SQLite substitution for backend acceptance. Shared protection storage/recovery is deliberately assigned to its dependent decision ticket; this blueprint does not silently select Redis or PostgreSQL for that role.

## Same-origin routing, cookies and trusted IP

One Vercel project and provided HTTPS hostname for the React build and FastAPI function. Browser routes use React Router. Reserve `/api/v1` and every path beneath it for FastAPI, including unknown routes: return the canonical JSON error envelope rather than SPA HTML. Static files precede browser navigation fallback; fallback serves `index.html` only for browser GET/HEAD navigation outside the API namespace. Verify direct links, refresh, trailing slashes, missing assets, unknown API routes and all mutation methods with deployment configuration before release. Disable generated production API docs unless deliberately protected; readiness remains internal/restricted.

Use Vercel's managed HTTPS termination. Configure the exact selected demo origin as `APP_ORIGIN` and reset-link base; never derive it from an arbitrary Host header. Deployed refresh cookies retain Secure, HttpOnly, SameSite=Lax and `/api/v1/auth`; enforce exact Origin plus `X-CSRF-Protection: 1` on the contract's cookie operations. No wildcard trusted origins. Preview deployments get isolated test data/configuration and must not automatically point to the demo database; do not allow every `*.vercel.app` origin.

For local development: browser/Vite at `http://127.0.0.1:4500`, API at `http://127.0.0.1:8000`, with Vite proxying `/api/v1`. Allow that one browser origin; relax cookie Secure only in explicit local HTTP mode. Tests can use isolated loopback ports. Default local mode ignores forwarding headers and uses the socket peer.

For the Vercel deployment mode only, accept the platform-overwritten `x-forwarded-for` as one canonical client IP. Parse a single valid IPv4/IPv6 value, normalize it, and do not take a caller-selected first/last value from an arbitrary chain. No extra Cloudflare/external reverse proxy is part of this topology. Ignore `Forwarded`, `x-real-ip` and geo headers as alternatives for limiter identity. A missing/invalid trusted platform IP is a configuration failure: do not run protected work under a guessed/spoofable identity; return existing sanitized `500 internal_error` and log an operator-safe reason. Verify supplied spoof headers are overwritten in an actual Vercel smoke check. Runtime adaptation must not cause middleware to trust arbitrary forwarded headers in local/direct HTTP mode.

## Phased migrations and ownership

Generate and review Django migrations in development; commit them with the slice. CI runs `makemigrations --check --dry-run`, applies the full history to empty PostgreSQL and exercises upgrade from the preceding supported schema/data fixtures. Use historical models for data migrations. Include backward compatibility between the expanded schema and the old/new code.

Release stages: (1) validate a recoverable backup/export and compatible expansion; (2) one serialized migration runner uses the direct migration connection; (3) deploy compatible code and run bounded, restartable backfills with progress recording where needed; (4) verify data constraints and workflows; (5) perform destructive cleanup only in a later reviewed release after old code no longer depends on those fields. For an initial empty demo, create the initial schema; no artificial backfill is required.

The owner operates release credentials and triggers releases. Provide a manually dispatched GitHub Actions release workflow, serialized with a shared release concurrency group so migrations/releases cannot overlap. Pin a commit SHA and require passing CI for that exact SHA. Keep automatic production deployments disabled while controlled migration sequencing is required. Do not run migrations inside Vercel request handlers or parallel build hooks. Do not deploy application code when expansion fails. Retain old-compatible code after failed new deployment; prefer forward repair for data changes, and restore only from a verified backup with an understood data-loss window. No blind reverse migration after a destructive operation.

## Reproducible local and CI command contract

The foundation ticket must implement and verify these interfaces, with a PowerShell README. These commands are planned interfaces, not files claimed to exist today:

```powershell
py -3.13 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.lock
docker compose up -d --wait postgres mailpit
.\.venv\Scripts\python.exe manage.py migrate --noinput
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run
.\.venv\Scripts\python.exe -m pytest tests/api tests/concurrency tests/migrations
```

Compose defines a pinned PostgreSQL 17 image and Mailpit, health checks, isolated named local data volumes, and any additional shared service selected by its decision ticket. Docker is not currently on PATH in this workspace; local setup must install/enable it or provide an equivalently verified native PostgreSQL/Mailpit setup before tests can claim to run. Do not install services silently. CI uses Linux PostgreSQL service containers and isolated temporary test data rather than consuming Neon quotas for every PR. Shared-service lifecycle is completed by the protection decision.

Later frontend commands, from `frontend/`: `npm ci`, `npm run build`, `npm run dev`, and `npm run test:e2e`. The browser runner starts real API workers and PostgreSQL, not prototype mocks; it must use an isolated database and appropriate initial data. Concurrency tests launch at least two separate Uvicorn processes with one shared database/protection service, wait for readiness, overlap HTTP requests and clean up processes deterministically even after failure.

GitHub Actions runs on relevant pushes/PRs: locked installs, lint, migrations, HTTP API behavior, distinct-worker concurrency, and later frontend build/browser checks. No deployment credentials in untrusted PR jobs. Use free eligible runners/quotas, no paid marketplace add-ons or paid runner instances. Report skipped checks rather than presenting them as passes.

## Secrets, failures and acceptance gates

The owner supplies/configures the Vercel/Neon accounts, approved tester emails, exact demo origin, signing and verifier secrets, SendGrid credentials/verified sender and operational alert destination. Local `.env` is ignored; only names and safe examples belong in `.env.example`. Environment secrets stay server-side. GitHub release secrets are available only to the controlled trusted release workflow. Local reset email uses Mailpit; deployed delivery retains the agreed SendGrid SMTP transport until explicitly amended. Await email sending before the serverless request ends; record failures without reset tokens/full reset URLs, retaining neutral API responses.

Do not accept protected work when its required database/shared protection dependency is unavailable; preserve existing safe error conventions, with exact recovery semantics settled in the protection decision. Static content and contract-exempt metadata/process health may remain available. Never turn a database outage into empty inventory or a claimed successful order. Preserve purchase keys for uncertain outcomes; reconcile state before advising retries. Provider downtime/quota limits, deployment failures and migration failures remain distinguishable in operator logs without leaking secrets. Provide an owner-operated export/restore procedure and rehearse it on disposable data before release; free-tier restore windows are not an unlimited backup guarantee.

Backend gate: all canonical routes, permissions, persistence, transactions, Stock amendments and shared protections pass against real PostgreSQL across workers. Foundation checks Python 3.13 clean installation, Django/psycopg compatibility and Vercel packaging. Integration gate: actual-backend browser journeys, session/cross-tab behavior and locked B visual/keyboard/phone/reduced-motion evidence. Release gate: Vercel routing/IP trust/cookies and runtime Argon2id/transaction/SMTP smoke checks, migrations and recovery rehearsal, truthful assets, and every configured tester's actual inbox reset journey. A failed gate blocks its downstream stage. Account/configuration/content inputs remain in their existing tickets.

## Primary technical sources

- [Vercel Python runtime](https://vercel.com/docs/functions/runtimes/python): supported runtimes and Python deployment configuration.
- [Vercel FastAPI guide](https://vercel.com/docs/frameworks/backend/fastapi): function and static frontend deployment; exact configuration must be tested for the pinned toolchain.
- [Vercel request headers](https://vercel.com/docs/headers/request-headers): platform overwrites forwarding IPs for spoof protection; extra trusted proxies are outside this topology.
- [Neon Django migration guide](https://neon.com/docs/guides/django-migrations): use a direct connection for migrations and pooled connection for traffic.
- [Django PostgreSQL settings](https://docs.djangoproject.com/en/5.2/ref/databases/): transaction-pool cursor constraints.
- [Django standalone initialization](https://docs.djangoproject.com/en/5.2/topics/settings/), [async transaction constraints](https://docs.djangoproject.com/en/5.2/topics/async/): initialize Django and keep transactional ORM work in a safe synchronous boundary.

Sources establish supported mechanisms; the choices and command interfaces above are this project's implementation plan. No new runtime, migration, CI, deployment, backup or inbox check has been executed by this planning record.
