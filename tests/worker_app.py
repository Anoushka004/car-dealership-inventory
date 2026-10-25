from typing import Annotated

from fastapi import Query

from app.errors import QueryParameters, StrictBody
from app.main import app


class ProbeBody(StrictBody):
    quantity: int
    password: str


class ProbeQuery(QueryParameters):
    page: int = 1


@app.post("/api/v1/_contract-probe")
def contract_probe(payload: ProbeBody, query: Annotated[ProbeQuery, Query()]):
    return {"quantity": payload.quantity, "page": query.page}


@app.get("/api/v1/_failure-probe")
def failure_probe():
    raise RuntimeError("private-internal-secret")
