from concurrent.futures import ThreadPoolExecutor

import httpx
import psycopg

from tests.conftest import management_command


def test_independent_workers_observe_the_same_durable_protection_configuration(
    database, worker_factory
):
    env = database["env"]
    management_command(env, "migrate", "--noinput")
    management_command(env, "setup_protection", "--runtime-role", database["role"])
    workers = [worker_factory(extra_env=env), worker_factory(extra_env=env)]
    headers = {"X-Readiness-Key": env["READINESS_KEY"]}

    def statuses():
        with ThreadPoolExecutor(max_workers=2) as executor:
            return list(
                executor.map(
                    lambda worker: (
                        httpx.get(f"{worker}/internal/ready", headers=headers).status_code
                    ),
                    workers,
                )
            )

    assert statuses() == [200, 200]
    with psycopg.connect(database["migrator_url"], autocommit=True) as conn:
        conn.execute("DELETE FROM protection_protectionconfiguration")
    assert statuses() == [500, 500]
    management_command(env, "setup_protection", "--runtime-role", database["role"])
    assert statuses() == [200, 200]


def test_worker_with_mismatched_identity_key_cannot_report_database_readiness(
    database, worker_factory
):
    env = database["env"]
    management_command(env, "migrate", "--noinput")
    management_command(env, "setup_protection", "--runtime-role", database["role"])
    worker = worker_factory(
        extra_env={**env, "PROTECTION_ID_KEY": "mismatched-key-at-least-32-characters"}
    )
    response = httpx.get(
        f"{worker}/internal/ready", headers={"X-Readiness-Key": env["READINESS_KEY"]}
    )
    assert response.status_code == 500
