import logging

from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, ConfigDict
from starlette.exceptions import HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

logger = logging.getLogger("dealership.errors")


class SanitizedFailures(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        try:
            return await call_next(request)
        except Exception:
            logger.error("unexpected_request_failure")
            return error_response(500, "internal_error", "An internal error occurred.")


class StrictBody(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class QueryParameters(BaseModel):
    model_config = ConfigDict(extra="forbid")


def error_response(status, code, message, details=None):
    return JSONResponse(
        {"error": {"code": code, "message": message, "details": details or []}},
        status_code=status,
        headers={"Cache-Control": "no-store"},
    )


def install_error_handlers(app):
    app.add_middleware(SanitizedFailures)

    @app.exception_handler(RequestValidationError)
    async def validation_error(request, exc):
        details = [
            {
                "field": ".".join(str(part) for part in error["loc"][1:]) or str(error["loc"][0]),
                "code": error["type"],
                "message": "Invalid value.",
            }
            for error in exc.errors()
        ]
        return error_response(422, "validation_error", "Invalid request.", details)

    @app.exception_handler(HTTPException)
    async def http_error(request, exc):
        if exc.status_code in {404, 405}:
            return error_response(404, "resource_not_found", "Resource not found.")
        if exc.status_code == 403:
            return error_response(403, "forbidden", "Access denied.")
        logger.error("unmapped_http_failure")
        return error_response(500, "internal_error", "An internal error occurred.")

    @app.exception_handler(Exception)
    async def internal_error(request, exc):
        logger.error("unexpected_request_failure")
        return error_response(500, "internal_error", "An internal error occurred.")
