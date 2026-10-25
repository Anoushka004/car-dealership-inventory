# Accepted Stock restoration rule

Owner accepted this proposal in live discussion on 2026-10-25: "i accept". Resolution of [Stock restoration decision](https://github.com/Anoushka004/car-dealership-inventory/issues/9).

This explicitly amends the [Stock decision](https://github.com/Anoushka004/car-dealership-inventory/issues/4#issuecomment-6394467170) and the inventory/concurrency/error portions of the [canonical REST contract](https://github.com/Anoushka004/car-dealership-inventory/issues/5#issuecomment-6394771175). Existing decisions remain in force except for this added restriction on manual Stock setting.

## Accepted rule

For each Vehicle option, available Stock plus its number of Placed orders must not exceed the option limit: 1 for used options; 2,147,483,647 for new options. Completed and Cancelled orders do not count toward the allowance.

An Admin may set Stock only when `requested Stock + number of Placed orders <= option limit`. Count orders for the original option, regardless of Customer. This preserves room for every possible cancellation. Creation has no existing orders and retains the existing field limits.

An otherwise valid, current-version Stock request exceeding this allowance returns `409 stock_capacity_conflict` in the existing error envelope, with no mutation or version increment. Out-of-range or invalid fields retain `422 validation_error`; stale `expected_version` retains `409 version_conflict`. Evaluate capacity against current state after the version check. Successful Stock setting retains the existing success response and version behavior.

Purchase, manual Stock setting, cancellation and completion must serialize for the affected option, across separate application workers. A purchase moves one unit from available Stock into a Placed order; cancellation moves it back; completion removes a Placed order without changing Stock. These transitions preserve the invariant atomically. Capacity arithmetic must not overflow.

Cancellation remains guaranteed for a valid Placed order and restores exactly one unit exactly once. Never silently cap restoration, drop the returned unit or reject cancellation because a manual Stock increase consumed its room. Completed and Cancelled orders remain final; repeats and losing final transitions retain `409 invalid_order_transition`.

Inactive inventory remains inspectable and cannot be manually restocked. Cancellation still restores Stock to the inactive original option without reactivating the option or listing. This rule does not add a restore endpoint, additional order states or new public fields.

## Observable acceptance cases for implementation

All outcomes assume otherwise valid permissions, authentication, protection and payloads. These are acceptance specifications, not executed tests. Verify through HTTP with real PostgreSQL and separate workers for concurrency.

1. Used option: Stock 1; purchase returns 201 and leaves Stock 0 with one Placed order. A current-version manual set to 1 returns `409 stock_capacity_conflict`; Stock/version are unchanged. Set to 0 remains permitted. Cancel returns 200, leaves Stock 1 and a Cancelled order; repeat returns `409 invalid_order_transition` without another restoration.
2. New option with three Placed orders: manual Stock 2,147,483,644 is permitted; 2,147,483,645 through 2,147,483,647 returns `409 stock_capacity_conflict`. Cancelling all three restores to 2,147,483,647 exactly. Inputs above the integer maximum or used Stock 2 still return `422 validation_error`.
3. A stale Stock request returns `409 version_conflict`, including where its requested value would also violate capacity; no mutation occurs.
4. Manual Stock setting versus purchase: results correspond to one serial order; purchase increments the option version, so a later request using the prior version fails. A winning manual change cannot permit purchases plus outstanding cancellations to exceed the limit. Last-unit losers retain `409 out_of_stock`.
5. Manual setting versus cancellation: if cancellation wins, its Stock/version change makes the earlier expected version stale; if setting wins, it must leave room for restoration. No lost unit, negative Stock or overflow is permitted.
6. Two Admin Stock requests using the same version cannot both succeed. Concurrent cancellations of distinct Placed orders each restore one unit once; duplicate cancellation restores only once. Observe final Stock, versions and order states.
7. Completion releases one unit of the cancellation allowance without changing available Stock. For a used option with Stock 0, completing its sole Placed order permits a subsequent otherwise-valid manual set to 1. Completion versus Stock setting must correspond to one serial order. Do not introduce a new option-version increment for completion, which does not change Stock.
8. Cancellation versus completion has one successful final transition and one `409 invalid_order_transition`; restore only when cancellation wins. Neither final state can be reopened or cancelled again.
9. After option or parent-listing deactivation, manual restocking remains prohibited by the existing inactive-inventory contract. Cancelling an existing Placed order restores its unit exactly once, keeps inventory inactive and unpurchasable, and preserves historical snapshots. Deactivation versus cancellation also retains those outcomes.

No application implementation or runtime test evidence is claimed by this decision. Downstream Stock editing, order transition and multi-worker backend acceptance tickets must use these cases.
