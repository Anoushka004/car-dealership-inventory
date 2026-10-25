# Car dealership inventory — V1 scaffold

Cloneable source for the approved-tester dealership demo: backend foundation, approved frontend B prototype, and settled implementation plans. The complete V1 API and frontend/backend integration remain future work.

## Clone and run

```powershell
git clone https://github.com/Anoushka004/car-dealership-inventory.git
cd car-dealership-inventory
npm --prefix frontend ci
npm --prefix frontend run dev
```

Use Node 22. Open http://127.0.0.1:4500/?variant=B. Build with `npm --prefix frontend run build`.

The frontend uses React/Tailwind and in-memory sample accounts, inventory and Orders. B is the approved gallery/journey design; inherited A/C comparison code is historical prototype material. The UI does not yet call the backend. See [frontend instructions](frontend/README.md).

For the backend, use Python 3.13 and PostgreSQL 17:

```powershell
py -3.13 -m venv .venv
.\.venv\Scripts\python.exe -m pip install --no-deps -r requirements-dev.lock
.\.venv\Scripts\python.exe -m pip check
Copy-Item .env.example .env
```

Follow the [backend setup guide](docs/development/backend.md) from the repository root to generate secrets, start PostgreSQL/Mailpit, create the runtime role, migrate and initialize protection configuration. It covers Docker Compose and native Windows. Then run Uvicorn with runtime credentials and `--no-proxy-headers`.

## Structure and current behavior

| Path | Purpose |
| --- | --- |
| `app/`, `manage.py` | FastAPI, standalone Django ORM/migrations, protection-state schema/configuration |
| `frontend/` | Approved design source, required assets and npm lockfile |
| `tests/` | Real PostgreSQL HTTP, migration and independent-worker tests |
| `scripts/`, `compose.yaml` | Local environment and PostgreSQL/Mailpit lifecycle |
| `docs/planning/` | Specification, delivery plan and accepted amendments |
| `docs/backend/`, `docs/frontend/` | API/domain decisions and approved frontend plan |
| `docs/development/` | Detailed backend setup instructions |
| `docs/agents/`, `AGENTS.md`, `GLOSSARY.md` | Contributor/agent workflow and domain vocabulary |
| `tools/`, `.github/workflows/` | Packaging and CI checks |

`GET /health` works without a database. `GET /internal/ready` requires `X-Readiness-Key` and checks PostgreSQL/schema/configuration. Account, inventory and Order endpoints under `/api/v1` still need implementation.

## Continue development

Start with the [plan index](docs/planning/README.md) and [GitHub implementation graph](https://github.com/Anoushka004/car-dealership-inventory/issues/8). Accept the backend before integrating the frontend. The selected stack is Python 3.13, FastAPI, Django ORM/migrations, PostgreSQL, React/Tailwind, React Router and GitHub Actions. The prototype currently uses hash navigation; React Router and real API sessions are integration work.

Vercel Hobby/Neon Free are selected hosting targets; no hosted deployment is included. Credentials, verified content and actual email delivery remain release inputs. The [recorded CI run](https://github.com/Anoushka004/car-dealership-inventory/actions/runs/40192403847) passed backend bootstrap and failed the Vercel packaging tooling check. That failure remains open; publication is not release acceptance. See [verification evidence](docs/verification/ticket-14-foundation.md).

Git contains source, required assets, plans, migrations, configuration examples and lockfiles. Local secrets, databases, downloaded tools, dependencies and generated output are ignored. Clone `main` and create your own working branch. The original approved design history is preserved by tag `frontend-v1-approved-2026-10-25`.
