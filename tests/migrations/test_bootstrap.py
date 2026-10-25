import os
import smtplib
import uuid
from email.message import EmailMessage
from urllib.parse import urlsplit

import httpx
import psycopg
import pytest

from tests.conftest import management_command


def test_empty_database_migrates_repeatably_and_runtime_cannot_change_schema(
    database, worker_factory
):
    env = database["env"]
    first = management_command(env, "migrate", "--noinput")
    assert "Applying protection.0001_initial... OK" in first.stdout
    second = management_command(env, "migrate", "--noinput")
    assert "No migrations to apply" in second.stdout
    management_command(env, "makemigrations", "--check", "--dry-run")
    management_command(env, "setup_protection", "--runtime-role", database["role"])
    management_command(env, "setup_protection", "--runtime-role", database["role"])
    with psycopg.connect(env["DATABASE_URL"]) as conn:
        with pytest.raises(psycopg.errors.InsufficientPrivilege):
            conn.execute("CREATE TABLE forbidden_schema_change (id integer)")
    worker = worker_factory(extra_env=env)
    assert (
        httpx.get(
            f"{worker}/internal/ready", headers={"X-Readiness-Key": env["READINESS_KEY"]}
        ).status_code
        == 200
    )


def test_trusted_setup_refuses_to_replace_existing_identity_configuration(database):
    env = database["env"]
    management_command(env, "migrate", "--noinput")
    management_command(env, "setup_protection", "--runtime-role", database["role"])
    mismatched = {**env, "PROTECTION_ID_KEY": "different-key-with-more-than-32-characters"}
    result = management_command(
        mismatched, "setup_protection", "--runtime-role", database["role"], check=False
    )
    assert result.returncode != 0
    assert "different-key" not in result.stdout + result.stderr


def test_postgresql_17_runtime_accepts_transaction_local_guard_timeouts(database):
    env = database["env"]
    with psycopg.connect(env["DATABASE_URL"]) as conn:
        conn.execute("SET LOCAL transaction_timeout = '20s'")
        conn.execute("SET LOCAL idle_in_transaction_session_timeout = '10s'")
        conn.execute("SET LOCAL statement_timeout = '5s'")
        assert conn.execute("SHOW transaction_timeout").fetchone()[0] == "20s"


def test_local_smtp_is_captured_by_real_mailpit():
    mailpit_url = os.environ.get("MAILPIT_HTTP_URL")
    smtp_host = os.environ.get("SMTP_HOST", "127.0.0.1")
    smtp_port = int(os.environ.get("SMTP_PORT", "1025"))
    if not mailpit_url or urlsplit(mailpit_url).hostname not in {"127.0.0.1", "localhost"}:
        pytest.fail("MAILPIT_HTTP_URL must identify the isolated loopback Mailpit capture inbox.")
    message = EmailMessage()
    message["From"] = "foundation@example.test"
    message["To"] = "tester@example.test"
    message["Subject"] = f"Foundation local SMTP capture {uuid.uuid4().hex}"
    message.set_content("Local foundation verification only; no reset token.")
    with smtplib.SMTP(smtp_host, smtp_port, timeout=5) as smtp:
        smtp.send_message(message)
    response = httpx.get(f"{mailpit_url}/api/v1/messages", timeout=5)
    assert response.status_code == 200
    assert any(item["Subject"] == message["Subject"] for item in response.json()["messages"])
