import contextlib
import os
import socket
import subprocess
import sys
import time
import uuid
from pathlib import Path
from urllib.parse import quote, urlsplit, urlunsplit

import httpx
import psycopg
import pytest
from psycopg import sql

ROOT = Path(__file__).resolve().parents[1]


class PrivateEnvironment(dict):
    def __repr__(self):
        return "<isolated test configuration>"


def management_command(environment, *arguments, check=True):
    result = subprocess.run(
        [sys.executable, "manage.py", *arguments],
        cwd=ROOT,
        env={**os.environ, **environment},
        text=True,
        capture_output=True,
        timeout=30,
    )
    if check and result.returncode:
        pytest.fail(f"Management command failed: {arguments}\n{result.stdout}\n{result.stderr}")
    return result


@pytest.fixture
def database():
    admin_url = os.environ.get("TEST_DATABASE_ADMIN_URL")
    if not admin_url:
        pytest.fail(
            "TEST_DATABASE_ADMIN_URL must point at isolated PostgreSQL 17; no tests were skipped."
        )
    suffix = uuid.uuid4().hex
    name = f"test_dealership_{suffix}"
    role = f"test_runtime_{suffix}"
    password = uuid.uuid4().hex
    parsed = urlsplit(admin_url)
    migrator_url = urlunsplit(parsed._replace(path=f"/{name}"))
    host = f"[{parsed.hostname}]" if ":" in parsed.hostname else parsed.hostname
    runtime_url = urlunsplit(
        parsed._replace(
            netloc=f"{role}:{quote(password)}@{host}:{parsed.port or 5432}", path=f"/{name}"
        )
    )
    created_role = False
    created_database = False
    try:
        with psycopg.connect(admin_url, autocommit=True, connect_timeout=5) as conn:
            conn.execute(
                sql.SQL("CREATE ROLE {} LOGIN PASSWORD {}").format(
                    sql.Identifier(role), sql.Literal(password)
                )
            )
            created_role = True
            conn.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(name)))
            created_database = True
        environment = PrivateEnvironment(
            {
                "MIGRATION_DATABASE_URL": migrator_url,
                "DATABASE_URL": runtime_url,
                "APP_MODE": "local",
                "READINESS_KEY": "test-readiness-secret-at-least-32-characters",
                "PROTECTION_ID_KEY": uuid.uuid4().hex + uuid.uuid4().hex,
                "PROTECTION_NAMESPACE": "foundation-test",
            }
        )
        yield PrivateEnvironment(env=environment, role=role, migrator_url=migrator_url)
    finally:
        cleanup_errors = []
        for created, statement in (
            (
                created_database,
                sql.SQL("DROP DATABASE {} WITH (FORCE)").format(sql.Identifier(name)),
            ),
            (created_role, sql.SQL("DROP ROLE {}").format(sql.Identifier(role))),
        ):
            if created:
                try:
                    with psycopg.connect(admin_url, autocommit=True, connect_timeout=5) as conn:
                        conn.execute("SET statement_timeout = '10s'")
                        conn.execute(statement)
                except Exception as error:
                    cleanup_errors.append(error)
        if cleanup_errors:
            primary_error = sys.exception()
            if primary_error is None:
                raise ExceptionGroup("Isolated database resource cleanup failed", cleanup_errors)
            primary_error.add_note(
                "Resource cleanup also failed: "
                + ", ".join(type(error).__name__ for error in cleanup_errors)
            )


@pytest.fixture
def worker_factory(tmp_path):
    processes = []
    handles = []

    def start(*, database_url=None, extra_env=None, app="app.main:app"):
        with contextlib.closing(socket.socket()) as sock:
            sock.bind(("127.0.0.1", 0))
            port = sock.getsockname()[1]
        env = os.environ.copy()
        if database_url is not None:
            env["DATABASE_URL"] = database_url
        env.update(extra_env or {})
        for privileged_variable in (
            "MIGRATION_DATABASE_URL",
            "TEST_DATABASE_ADMIN_URL",
            "DEALERSHIP_MANAGEMENT",
        ):
            env.pop(privileged_variable, None)
        log = (tmp_path / f"worker-{port}.log").open("w+", encoding="utf-8")
        handles.append(log)
        process = subprocess.Popen(
            [
                sys.executable,
                "-m",
                "uvicorn",
                app,
                "--host",
                "127.0.0.1",
                "--port",
                str(port),
                "--no-proxy-headers",
            ],
            cwd=ROOT,
            env=env,
            stdout=log,
            stderr=subprocess.STDOUT,
        )
        processes.append(process)
        url = f"http://127.0.0.1:{port}"
        deadline = time.monotonic() + 15
        while time.monotonic() < deadline:
            if process.poll() is not None:
                log.seek(0)
                pytest.fail(f"Worker exited before process health was available:\n{log.read()}")
            try:
                if httpx.get(f"{url}/health", timeout=0.3).status_code == 200:
                    return url
            except httpx.HTTPError:
                pass
            time.sleep(0.05)
        pytest.fail("Worker did not become healthy within 15 seconds")

    try:
        yield start
    finally:
        for process in processes:
            if process.poll() is None:
                if os.name == "nt":
                    subprocess.run(
                        ["taskkill", "/PID", str(process.pid), "/T", "/F"],
                        stdout=subprocess.DEVNULL,
                        stderr=subprocess.DEVNULL,
                        timeout=5,
                        check=False,
                    )
                else:
                    process.terminate()
        for process in processes:
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=5)
        for handle in handles:
            handle.close()
