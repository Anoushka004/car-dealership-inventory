import hashlib
import hmac
import os
import re

from django.core.exceptions import ImproperlyConfigured

from app.protection.models import ProtectionConfiguration
from app.protection.registry import REGISTRY_DIGEST, REGISTRY_VERSION


def expected_configuration():
    namespace = os.environ.get("PROTECTION_NAMESPACE", "")
    key = os.environ.get("PROTECTION_ID_KEY", "")
    if not re.fullmatch(r"[a-zA-Z0-9_-]{1,64}", namespace) or len(key.encode()) < 32:
        raise ImproperlyConfigured("Protection configuration is missing or invalid.")
    fingerprint = hmac.new(
        key.encode(), b"dealership/protection-configuration/v1", hashlib.sha256
    ).hexdigest()
    return {
        "namespace": namespace,
        "registry_version": REGISTRY_VERSION,
        "registry_digest": REGISTRY_DIGEST,
        "key_fingerprint": fingerprint,
    }


def verify_protection_configuration():
    expected = expected_configuration()
    configured = ProtectionConfiguration.objects.get(pk=1)
    if any(
        not hmac.compare_digest(str(getattr(configured, name)), str(value))
        for name, value in expected.items()
    ):
        raise ImproperlyConfigured("Protection configuration does not match the database.")
