# Accepted amendment: Stock restoration capacity

The owner explicitly accepted this rule on 2026-10-25. This amends sections 3, 5 and 8 of the [canonical REST resolution](https://github.com/Anoushka004/car-dealership-inventory/issues/5#issuecomment-6394771175); the remainder of that contract is unchanged.

The complete rule, rationale and observable acceptance cases are recorded in the [accepted Stock amendment](https://github.com/Anoushka004/car-dealership-inventory/issues/4#issuecomment-6396384497), resolving [the Stock restoration decision](https://github.com/Anoushka004/car-dealership-inventory/issues/9).

- For each Vehicle option, available Stock plus the number of its Placed orders cannot exceed 1 (used) or 2,147,483,647 (new). Manual Stock setting must leave room for every potential cancellation.
- The existing stock PUT route rejects an otherwise valid, current-version setting that exceeds this allowance with `409 stock_capacity_conflict`, using the existing error envelope. Rejection changes neither Stock nor version. Invalid field types/ranges retain `422 validation_error`; a stale expected version retains `409 version_conflict`. Evaluate capacity after the version check.
- Serialize Stock setting, purchase, cancellation and completion for the option across workers, using arithmetic that cannot overflow. Preserve existing successful response shapes, statuses and version behavior.
- A valid cancellation restores exactly one unit once, including for inactive inventory, without reactivation. Completion changes no Stock. Final order transitions and inactive manual-mutation restrictions are unchanged. No cancellation may lose its restored unit or be rejected because an Admin consumed the required capacity.

These are approved implementation acceptance requirements; this amendment does not claim code or runtime verification.
