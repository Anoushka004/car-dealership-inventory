import hashlib
import json
from types import MappingProxyType
from typing import NamedTuple


class Budget(NamedTuple):
    capacity: int
    interval_us: int
    owner_kind: str


BUDGETS = MappingProxyType(
    {
        "public_inventory": Budget(60, 1_000_000, "ip"),
        "customer_reads": Budget(120, 500_000, "account"),
        "customer_mutations": Budget(10, 6_000_000, "account"),
        "admin_reads": Budget(120, 500_000, "account"),
        "admin_mutations": Budget(30, 2_000_000, "account"),
        "login_email": Budget(5, 180_000_000, "email"),
        "login_ip": Budget(30, 30_000_000, "ip"),
        "registration_ip": Budget(10, 360_000_000, "ip"),
        "forgot_email": Budget(3, 1_200_000_000, "email"),
        "forgot_ip": Budget(20, 180_000_000, "ip"),
        "reset_ip": Budget(10, 90_000_000, "ip"),
        "refresh_session": Budget(60, 1_000_000, "session"),
        "logout_session": Budget(10, 6_000_000, "session"),
        "logout_all_account": Budget(5, 180_000_000, "account"),
        "session_ip": Budget(60, 1_000_000, "ip"),
    }
)
REGISTRY_VERSION = 1
REGISTRY_DIGEST = hashlib.sha256(
    json.dumps(dict(BUDGETS), sort_keys=True, separators=(",", ":")).encode()
).hexdigest()
