import httpx


def test_process_health_is_available_without_a_database(worker_factory):
    worker = worker_factory(database_url="postgresql://invalid:invalid@127.0.0.1:1/unavailable")
    response = httpx.get(f"{worker}/health", timeout=5)
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
