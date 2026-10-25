# Dealership inventory backend

The Python 3.13 foundation runs FastAPI with standalone Django ORM/migrations and PostgreSQL 17. It provides database-independent process health, restricted database readiness, canonical JSON errors, strict schema base classes, persistent protection-state schema and a real two-worker test harness. Vehicle, account and Order routes belong to subsequent tickets. Frontend B remains the approved design reference.

## Local setup (PowerShell)

Use this implementation checkout rather than the original planning workspace or approved frontend artifact. Install Python 3.13 and Docker with Compose, or use the native alternative below. The exact Python dependency closure is committed in `requirements.lock` and `requirements-dev.lock`.

```powershell
py -3.13 -m venv .venv
.\.venv\Scripts\python.exe -m pip install --no-deps -r requirements-dev.lock
.\.venv\Scripts\python.exe -m pip check
Copy-Item .env.example .env
```

Edit `.env` with separate randomly generated `PROTECTION_ID_KEY` and `READINESS_KEY`, an isolated local PostgreSQL password and matching URLs. Generate at least 32 random bytes per protection/readiness secret; never commit `.env`. This loader reads literal `NAME=value` lines and does not execute them:

```powershell
& .\scripts\load-env.ps1
docker compose up -d --wait postgres mailpit
```

Compose binds PostgreSQL, SMTP and Mailpit HTTP only to loopback and retains PostgreSQL in its own named volume. PostgreSQL is also the shared protection service; no Redis is needed. `docker compose stop` preserves state. Do not delete its volume to fix migrations or restart limits. Mailpit is a local capture inbox, not real-inbox delivery.

Create the local runtime login once with the administrator. The example generates a hex password and feeds SQL through stdin rather than command arguments. Set `DATABASE_URL` in `.env` to this generated runtime password; retain the administrator URL only in `MIGRATION_DATABASE_URL`:

```powershell
$runtimePassword = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
$roleSql = 'CREATE ROLE dealership_runtime LOGIN PASSWORD ''{0}'';' -f $runtimePassword
$roleSql | docker compose exec -T postgres psql -U postgres -d dealership -v ON_ERROR_STOP=1
$env:DATABASE_URL = "postgresql://dealership_runtime:${runtimePassword}@127.0.0.1:5432/dealership"
# Save this runtime URL privately in .env, then discard the temporary variables.
Remove-Variable roleSql,runtimePassword
.\.venv\Scripts\python.exe manage.py migrate --noinput
.\.venv\Scripts\python.exe manage.py setup_protection --runtime-role dealership_runtime
.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run
```

`setup_protection` is a trusted pre-traffic command. It initializes the database singleton once, verifies namespace/registry/key fingerprints on repeat runs, and grants the runtime role only schema usage, configuration SELECT and protection-table SELECT/INSERT/UPDATE. It refuses to replace existing identity configuration. The runtime cannot migrate, create schema, change the singleton or delete retained protection rows. Later feature migrations must explicitly extend its grants.

Run migrations with the direct privileged connection. Start request workers with only the runtime connection; remove migration/test administration credentials before running:

```powershell
Remove-Item Env:MIGRATION_DATABASE_URL,Env:TEST_DATABASE_ADMIN_URL -ErrorAction SilentlyContinue
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --no-proxy-headers
```

The `--no-proxy-headers` option preserves the direct/local socket peer. Future deployed IP protection must use the exact Vercel-only policy in the [delivery blueprint](https://github.com/Anoushka004/car-dealership-inventory/issues/10#issuecomment-6396998623).

## Health and readiness

`GET /health` returns `200 {"status":"ok"}` without opening a database connection, even while PostgreSQL is unavailable. `GET /internal/ready` requires the exact `X-Readiness-Key` before database work. Missing/wrong credentials return canonical `403 forbidden`; missing server configuration or an unavailable/mismatched dependency returns sanitized `500 internal_error`. Authorized readiness verifies PostgreSQL major 17, trusted configuration and the migrated protection tables using the runtime role. It closes the connection on its owning thread on success and failure.

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
Invoke-RestMethod http://127.0.0.1:8000/internal/ready -Headers @{ 'X-Readiness-Key' = $env:READINESS_KEY }
```

Readiness is restricted; it does not expose an unbudgeted public database probe. Generated docs are disabled. Unknown API paths/methods use the `resource_not_found` JSON envelope. Reusable body models reject coercion and extra fields; query models reject unknown parameters. Validation responses contain field/code/message details without submitted values. Unexpected failures return only `500 internal_error`, and application logs use safe categories. Test-only probes exist only in `tests.worker_app` and are excluded from deployment.

## Verification and CI

Use an isolated local/CI cluster with an administrator allowed to create roles and databases. Never point tests at the demo service. Every database test creates a random `test_dealership_*` database and runtime role and removes those exact resources afterward. No database or Mailpit dependency is substituted or silently skipped.

```powershell
& .\scripts\load-env.ps1
.\.venv\Scripts\python.exe -m ruff check .
.\.venv\Scripts\python.exe -m pytest tests/api tests/concurrency tests/migrations
```

The suite proves clean/repeatable migrations, limited runtime schema rights, configuration mismatch refusal, restricted readiness/failure envelopes and real SMTP capture. Its harness starts independent Uvicorn processes on dynamically allocated loopback ports against the same PostgreSQL state. Concurrent readiness calls observe shared singleton changes; this establishes the harness, not yet endpoint token-bucket or Order correctness. Worker process trees, log handles, test databases and roles have bounded cleanup. Missing dependency settings fail the suite rather than count as passes.

The GitHub Actions `Backend foundation` workflow uses isolated Linux PostgreSQL 17.11 and Mailpit 1.32.0 services, a clean Python 3.13 lock installation, dependency checks, lint, migrations and all bootstrap tests. A separate Linux job runs the pinned official Vercel Python builder with Node 22 and checks its Python 3.13 bundle. To run that smoke on Linux with Python 3.13 and Node 22:

```text
npm --prefix tools ci
node tools/vercel-smoke.mjs
```

`tool.vercel.entrypoint` points to `app.main:app`; its custom install script consumes the complete exact runtime lock instead of independently resolving broad project ranges. `requirements.txt` forwards to the same lock. The package smoke requires no Vercel account, project link or deployment token. It does not establish actual Vercel routing, trusted IP overwrite, hosted Neon pooling/timeouts, Argon2id, SMTP entitlement or real-inbox reset readiness. Those are later endpoint/release gates. No production deployment workflow is active here.

## Native Windows alternative

The initial verification machine had no Docker. PostgreSQL 17.11's Windows binary archive from EDB and the Mailpit 1.32.0 Windows release can run without system-service installation. Download/extract official artifacts deliberately, verify published checksums where available, and supply the paths. The helper downloads and installs nothing. Keep binaries outside source control. Start in a trusted PowerShell session; a restricted automation sandbox may prevent PostgreSQL's Windows processes from signalling one another.

```powershell
& .\scripts\load-env.ps1
$pgBin = 'C:\path\to\pgsql\bin'
$mailpitExe = 'C:\path\to\mailpit.exe'
& .\scripts\native-services.ps1 -Action Start -PgBin $pgBin -MailpitExe $mailpitExe
$env:PGPASSWORD = $env:POSTGRES_PASSWORD
& "$pgBin\createdb.exe" -h 127.0.0.1 -p 5432 -U postgres dealership
$runtimePassword = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
('CREATE ROLE dealership_runtime LOGIN PASSWORD ''{0}'';' -f $runtimePassword) | & "$pgBin\psql.exe" -h 127.0.0.1 -p 5432 -U postgres -d dealership -v ON_ERROR_STOP=1
$env:DATABASE_URL = "postgresql://dealership_runtime:${runtimePassword}@127.0.0.1:5432/dealership"
# Save this runtime URL privately in .env, then use the same migrate/setup/test commands above.
Remove-Variable runtimePassword
Remove-Item Env:PGPASSWORD
& .\scripts\native-services.ps1 -Action Stop -PgBin $pgBin -MailpitExe $mailpitExe
```

Native state stays under `.local-state/`; services bind only to loopback and launch hidden. The helper uses finite readiness/shutdown waits and preserves data on stop. Do not run Compose and native services on the same ports. Its custom-port options require matching changes to every URL and SMTP setting.

## Governing decisions

The [canonical REST resolution](https://github.com/Anoushka004/car-dealership-inventory/issues/5#issuecomment-6394771175), [delivery blueprint](https://github.com/Anoushka004/car-dealership-inventory/issues/10#issuecomment-6396998623) and [shared-protection resolution](https://github.com/Anoushka004/car-dealership-inventory/issues/11#issuecomment-6397154852) govern later slices. Protection tables/registry/configuration are present; atomic bucket admission and guarded account operations are implemented with the endpoint tickets. Only the initial empty schema is supported so far; no data backfill or destructive migration is required for this bootstrap.
