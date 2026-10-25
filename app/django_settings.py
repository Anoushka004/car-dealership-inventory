import os
from ipaddress import ip_address
from urllib.parse import parse_qs, unquote, urlsplit

from django.core.exceptions import ImproperlyConfigured


def database_configuration():
    variable = (
        "MIGRATION_DATABASE_URL" if os.environ.get("DEALERSHIP_MANAGEMENT") else "DATABASE_URL"
    )
    raw = os.environ.get(variable, "postgresql://unconfigured@127.0.0.1:1/unconfigured")
    parsed = urlsplit(raw)
    if (
        parsed.scheme not in {"postgres", "postgresql"}
        or not parsed.hostname
        or not parsed.path[1:]
    ):
        raise ImproperlyConfigured(f"{variable} must identify a PostgreSQL database.")
    options = parse_qs(parsed.query, strict_parsing=True)
    if set(options) - {"sslmode"}:
        raise ImproperlyConfigured("Unsupported database URL option.")
    sslmode = options.get("sslmode", ["disable"])[0]
    try:
        loopback = ip_address(parsed.hostname).is_loopback
    except ValueError:
        loopback = parsed.hostname == "localhost"
    mode = os.environ.get("APP_MODE", "local")
    if mode not in {"local", "vercel"}:
        raise ImproperlyConfigured("APP_MODE must be local or vercel.")
    if (mode == "vercel" or not loopback) and sslmode not in {
        "require",
        "verify-ca",
        "verify-full",
    }:
        raise ImproperlyConfigured("Remote database connections must use TLS.")
    return {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": unquote(parsed.path[1:]),
        "USER": unquote(parsed.username or ""),
        "PASSWORD": unquote(parsed.password or ""),
        "HOST": parsed.hostname,
        "PORT": parsed.port or 5432,
        "CONN_MAX_AGE": 0,
        "DISABLE_SERVER_SIDE_CURSORS": True,
        "OPTIONS": {"connect_timeout": 3, "sslmode": sslmode},
    }


DATABASES = {"default": database_configuration()}
INSTALLED_APPS = ["app.protection"]
SECRET_KEY = "unused-by-the-standalone-orm"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
USE_TZ = True
TIME_ZONE = "UTC"
