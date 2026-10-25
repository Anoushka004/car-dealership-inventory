import os
import subprocess
import sys
import uuid
from urllib.parse import quote, urlsplit, urlunsplit

import psycopg
from psycopg import sql

from tests.conftest import ROOT


def test_failed_database_setup_removes_its_already_created_role(tmp_path):
    admin_url = os.environ["TEST_DATABASE_ADMIN_URL"]
    setup_role = f"test_setup_{uuid.uuid4().hex}"
    password = uuid.uuid4().hex
    parsed = urlsplit(admin_url)
    host = f"[{parsed.hostname}]" if ":" in parsed.hostname else parsed.hostname
    restricted_url = urlunsplit(
        parsed._replace(netloc=f"{setup_role}:{quote(password)}@{host}:{parsed.port or 5432}")
    )
    probe = tmp_path / "test_failed_setup.py"
    probe.write_text("def test_setup_failure(database):\n    pass\n", encoding="utf-8")
    with psycopg.connect(admin_url, autocommit=True) as conn:
        conn.execute(
            sql.SQL("CREATE ROLE {} LOGIN CREATEROLE NOCREATEDB PASSWORD {}").format(
                sql.Identifier(setup_role), sql.Literal(password)
            )
        )
    leaked_roles = []
    try:
        result = subprocess.run(
            [
                sys.executable,
                "-m",
                "pytest",
                "-c",
                str(ROOT / "pyproject.toml"),
                "-p",
                "tests.conftest",
                str(probe),
                "-q",
                "--tb=short",
            ],
            cwd=ROOT,
            env={**os.environ, "TEST_DATABASE_ADMIN_URL": restricted_url},
            capture_output=True,
            text=True,
            timeout=30,
        )
        assert result.returncode == 1
        assert "permission denied to create database" in result.stdout + result.stderr
        with psycopg.connect(admin_url, autocommit=True) as conn:
            leaked_roles = [
                row[0]
                for row in conn.execute(
                    "SELECT owned.rolname FROM pg_roles AS owned "
                    "JOIN pg_auth_members AS membership ON membership.roleid = owned.oid "
                    "JOIN pg_roles AS creator ON creator.oid = membership.member "
                    "WHERE creator.rolname = %s AND owned.rolname LIKE 'test_runtime_%%'",
                    (setup_role,),
                )
            ]
        assert leaked_roles == []
    finally:
        with psycopg.connect(admin_url, autocommit=True) as conn:
            for role in leaked_roles:
                conn.execute(sql.SQL("DROP ROLE {}").format(sql.Identifier(role)))
            conn.execute(sql.SQL("DROP ROLE {}").format(sql.Identifier(setup_role)))
