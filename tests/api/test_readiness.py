import httpx

from tests.conftest import management_command

READINESS_KEY = "test-readiness-secret-at-least-32-characters"


def test_readiness_rejects_untrusted_callers_before_database_access(worker_factory):
    worker = worker_factory(
        database_url="postgresql://invalid:invalid@127.0.0.1:1/unavailable",
        extra_env={"READINESS_KEY": READINESS_KEY},
    )
    response = httpx.get(f"{worker}/internal/ready", timeout=5)
    assert response.status_code == 403
    assert response.json() == {
        "error": {"code": "forbidden", "message": "Access denied.", "details": []}
    }


def test_readiness_reports_dependency_failure_without_exposing_connection_details(worker_factory):
    worker = worker_factory(
        database_url="postgresql://secret-user:secret-password@127.0.0.1:1/unavailable",
        extra_env={"READINESS_KEY": READINESS_KEY},
    )
    response = httpx.get(
        f"{worker}/internal/ready", headers={"X-Readiness-Key": READINESS_KEY}, timeout=10
    )
    assert response.status_code == 500
    assert response.json() == {
        "error": {"code": "internal_error", "message": "An internal error occurred.", "details": []}
    }


def test_readiness_requires_migrated_schema_and_matching_trusted_setup(database, worker_factory):
    env = database["env"]
    worker = worker_factory(extra_env=env)
    headers = {"X-Readiness-Key": READINESS_KEY}
    assert httpx.get(f"{worker}/internal/ready", headers=headers).status_code == 500
    management_command(env, "migrate", "--noinput")
    assert httpx.get(f"{worker}/internal/ready", headers=headers).status_code == 500
    management_command(env, "setup_protection", "--runtime-role", database["role"])
    response = httpx.get(f"{worker}/internal/ready", headers=headers)
    assert response.status_code == 200
    assert response.json() == {"status": "ready"}
