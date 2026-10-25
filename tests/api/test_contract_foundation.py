import httpx
import pytest


@pytest.mark.parametrize("method", ["GET", "POST", "PATCH", "DELETE"])
def test_unknown_api_paths_keep_the_canonical_json_error_envelope(worker_factory, method):
    worker = worker_factory()
    response = httpx.request(method, f"{worker}/api/v1/does-not-exist")
    assert response.status_code == 404
    assert response.json() == {
        "error": {"code": "resource_not_found", "message": "Resource not found.", "details": []}
    }


@pytest.mark.parametrize(
    ("payload", "query", "field"),
    [
        ({"quantity": "1", "password": "never-reflect-this-password"}, "", "quantity"),
        (
            {
                "quantity": 1,
                "password": "never-reflect-this-password",
                "token": "never-reflect-this-token",
            },
            "",
            "token",
        ),
        (
            {"quantity": 1, "password": "never-reflect-this-password"},
            "?unknown=never-reflect-this-token",
            "unknown",
        ),
    ],
)
def test_strict_validation_rejects_unknown_fields_and_types_without_secret_values(
    worker_factory, payload, query, field
):
    worker = worker_factory(app="tests.worker_app:app")
    response = httpx.post(f"{worker}/api/v1/_contract-probe{query}", json=payload)
    assert response.status_code == 422
    body = response.json()
    assert body["error"]["code"] == "validation_error"
    assert body["error"]["details"]
    assert body["error"]["details"][0]["field"] == field
    assert all(set(detail) == {"field", "code", "message"} for detail in body["error"]["details"])
    assert "never-reflect-this" not in response.text


def test_strict_schema_accepts_valid_json_and_typed_query_values(worker_factory):
    worker = worker_factory(app="tests.worker_app:app")
    response = httpx.post(
        f"{worker}/api/v1/_contract-probe?page=2", json={"quantity": 1, "password": "unused"}
    )
    assert response.status_code == 200
    assert response.json() == {"quantity": 1, "page": 2}


def test_unexpected_failures_use_the_sanitized_error_envelope(worker_factory):
    worker = worker_factory(app="tests.worker_app:app")
    response = httpx.get(f"{worker}/api/v1/_failure-probe")
    assert response.status_code == 500
    assert response.json() == {
        "error": {"code": "internal_error", "message": "An internal error occurred.", "details": []}
    }


def test_api_docs_and_test_probes_are_not_exposed_by_the_runtime_app(worker_factory):
    worker = worker_factory()
    for path in ("/docs", "/openapi.json", "/redoc", "/api/v1/_contract-probe"):
        assert httpx.get(f"{worker}{path}").status_code == 404
