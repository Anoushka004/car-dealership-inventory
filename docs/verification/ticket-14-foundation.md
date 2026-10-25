# Ticket #14 foundation verification

Local record, 2026-10-25. This describes executed foundation checks; later feature, hosted routing/pooling and release checks remain outstanding. Canonical requirements: [ticket #14](https://github.com/Anoushka004/car-dealership-inventory/issues/14), the delivery blueprint and the shared-protection decision linked in README.

## Environment and scope

Windows PowerShell; Python 3.13.5; Django 5.2.18; FastAPI 0.162.0; psycopg 3.3.6; PostgreSQL 17.11 portable binaries; Mailpit 1.32.0. Dependencies were resolved into a new Python 3.13 virtual environment and frozen as complete exact runtime/development locks. `python -m pip check` reported no broken requirements.

The machine had no Docker. Real isolated native PostgreSQL and Mailpit supplied the same services used in the committed Compose/CI configuration. No SQLite, database mocks, fake limiter service, hosted account or public deployment was used. PostgreSQL initially launched in the automation sandbox could not signal its Windows checkpointer during database teardown. Restarting the isolated postmaster outside that sandbox fixed the environment problem; the real-database suite then completed with cleanup.

## Red/green evidence

- Process health test: failed because the application module did not exist, then passed after adding the real Uvicorn application and `/health`.
- Restricted readiness tests: failed with `404`, then passed after adding credential checking before database access and canonical dependency errors.
- Schema readiness test: failed because a bare `SELECT 1` incorrectly reported an unmigrated database ready. After initial migrations, trusted configuration setup and runtime-role checks were added, the four health/readiness tests passed.
- Canonical validation field names: three failures showed `body.quantity`, `body.token` and `query.unknown`; serializer correction yielded three passes with the specified field names and no submitted secret values.

## Meaningful suite

`python -m pytest tests/api tests/concurrency tests/migrations -q` completed **20 passed in 75.35 seconds** against the real local services. The suite exercises clean/repeatable migrations and migration drift, restricted readiness, unexpected dependency failure envelopes, strict field/query validation, runtime DDL denial, configuration mismatch refusal, PostgreSQL 17 timeout-setting support, actual SMTP capture and separate Uvicorn workers observing one shared protection configuration. Tests use fresh random databases/roles and bounded worker process cleanup. The suite fails when dependency configuration is absent; it does not mark those checks skipped.

`python -m ruff check app tests manage.py` passed; `ruff format --check` reported all Python files formatted. A subsequent targeted validation run passed three cases after the field-name fix. Final readiness timeout/header and unique SMTP-capture checks passed four tests in 15.22 seconds. Independent clean-install integration verification and hosted CI results should be recorded by the integration owner.

The committed native helper was executed with the actual PostgreSQL/Mailpit binaries on separate loopback ports (25432, 21025, 28025). It initialized its own cluster, reached both service readiness checks and shut both processes down successfully. No system service was installed.

The integration owner independently installed the complete development lock into a fresh Python 3.13 environment. Dependency/lint checks passed, and the real-service integration suite passed **20 tests in 77.07 seconds**. Review subsequently identified failed-setup cleanup and native-state upload exclusions; those corrections are separately verified below and in final CI.

The failed-setup regression invokes pytest's actual database fixture in a separate CLI process using a real PostgreSQL login with CREATEROLE but no CREATEDB permission. Before the fix it failed because the successfully created runtime role remained after database creation was denied. After the cleanup guard covered setup and independently attempted each resource cleanup, the regression passed in 2.34 seconds and retained the original permission failure. No internal collaborators were mocked. Native state and sandbox cache directories are now explicitly excluded by `.vercelignore`, packaging input, builder configuration and final bundle validation. The CI bootstrap additionally validates Compose syntax with `docker compose config --quiet`; local Docker remains unavailable. Python lint/format, Node syntax and whitespace checks passed after these narrow corrections.

## Evidence boundaries

The committed Linux CI workflow runs the bootstrap suite and a credential-free official Vercel-builder packaging smoke. Actual hosted CI results must be linked after execution; this local record does not claim an unrun job passed. Compose lifecycle and Linux packaging need their own executed verification records. Foundation schema/configuration and worker harness do not establish future endpoint rate-debit, guard, authentication, Stock or Order correctness. No hosted Vercel/Neon, SendGrid entitlement or real-inbox check has run as part of this local implementation record.
