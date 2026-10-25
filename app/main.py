import hmac
import logging
import os

from django.db import close_old_connections, connections, transaction
from fastapi import FastAPI, Header
from starlette.responses import JSONResponse

from app.bootstrap import initialize_django
from app.errors import error_response, install_error_handlers

initialize_django()

from app.protection.configuration import verify_protection_configuration  # noqa: E402
from app.protection.models import OperationGuard, ProtectionBucket  # noqa: E402

app = FastAPI(openapi_url=None, docs_url=None, redoc_url=None, redirect_slashes=False)
install_error_handlers(app)


@app.get("/health")
def process_health():
    return {"status": "ok"}


@app.get("/internal/ready")
def database_readiness(x_readiness_key: str = Header(default="")):
    expected = os.environ.get("READINESS_KEY", "")
    if len(expected) < 32:
        return error_response(500, "internal_error", "An internal error occurred.")
    if not hmac.compare_digest(x_readiness_key.encode(), expected.encode()):
        return error_response(403, "forbidden", "Access denied.")
    try:
        close_old_connections()
        with transaction.atomic():
            with connections["default"].cursor() as cursor:
                cursor.execute("SHOW server_version_num")
                if not 170000 <= int(cursor.fetchone()[0]) < 180000:
                    raise RuntimeError("Unsupported database major version")
                cursor.execute("SET LOCAL transaction_timeout = '20s'")
                cursor.execute("SET LOCAL statement_timeout = '5s'")
                cursor.execute("SET LOCAL lock_timeout = '2s'")
            verify_protection_configuration()
            ProtectionBucket.objects.exists()
            OperationGuard.objects.exists()
        return JSONResponse({"status": "ready"}, headers={"Cache-Control": "no-store"})
    except Exception:
        logging.getLogger("dealership.readiness").error("database_readiness_failed")
        return error_response(500, "internal_error", "An internal error occurred.")
    finally:
        connections.close_all()
