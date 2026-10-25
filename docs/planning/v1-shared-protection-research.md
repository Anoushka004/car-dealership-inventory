# Shared request protection: primary-source research

Research date: 2026-10-25. Supports [ticket #11](https://github.com/Anoushka004/car-dealership-inventory/issues/11). This note is evidence and design guidance, not runtime verification or a new API contract. The canonical [REST resolution](https://github.com/Anoushka004/car-dealership-inventory/issues/5#issuecomment-6394771175) and accepted [delivery blueprint](https://github.com/Anoushka004/car-dealership-inventory/issues/10#issuecomment-6396998623) govern implementation.

## Storage choice

Recommendation: use the already selected PostgreSQL database for both durable token buckets and transaction-owned operation guards. This is an engineering inference from the mechanisms below. It avoids a second account, deployment dependency, secret, outage domain and local service for this free learning demo. It consumes PostgreSQL transactions, writes and pool slots; it is not an upstream network-abuse shield or a guarantee that free quotas suffice.

Neon explicitly supports pooled connections for serverless traffic and uses PgBouncer transaction mode. Backend assignment lasts for a transaction; session-level advisory locks and assumptions about session settings are unsuitable. Keep every guarded operation in one explicit transaction, use transaction-local settings, and retain the direct connection only for migrations/administration. [Neon connection pooling](https://neon.com/docs/connect/connection-pooling), [PgBouncer features](https://www.pgbouncer.org/features.html).

Redis is technically possible. Upstash supplies atomic REST transactions, but its documentation distinguishes pipelines from transactions and notes that runtime errors in a transaction do not roll back earlier commands. A conditional, all-buckets-or-none decision needs a correctly implemented atomic script or equivalent, not a pipeline of independent GET/DECR calls. [Upstash REST API](https://upstash.com/docs/redis/features/restapi).

Upstash currently advertises a Free plan with finite storage, bandwidth and commands. Selecting that service would still require an account, credentials and lifecycle/outage handling; it does not follow automatically from the Vercel/Neon choices. No Upstash provisioning is recommended or authorized here. Recheck terms if reconsidered. [Upstash pricing](https://upstash.com/pricing/redis).

## Atomic bucket admission

PostgreSQL row locks serialize concurrent modification and last until transaction end. Consistent lock ordering reduces deadlock risk. These are the mechanisms for an atomic multi-row admission transaction, separate from endpoint work. [PostgreSQL 17 explicit locking](https://www.postgresql.org/docs/17/explicit-locking.html).

Derived implementation procedure:

1. Construct the deduplicated bucket keys, including endpoint group, owner kind and pseudonymous owner identifier. Sort by a single stable binary ordering used by every worker.
2. In one short transaction, create missing rows with their full initial capacity and acquire every required row lock in the same ordering. Concurrent first creation must be handled through unique keys and `INSERT ... ON CONFLICT`; subsequent statements at Read Committed see committed state. Do not read balances outside their locked transaction. [PostgreSQL INSERT](https://www.postgresql.org/docs/17/sql-insert.html), [transaction isolation](https://www.postgresql.org/docs/17/transaction-iso.html).
3. Sample one database time after the locks have been acquired; calculate each available balance at that time. If every bucket has a token, subtract one from every bucket and commit. Otherwise subtract none and commit only any time/refill bookkeeping. Do not return admission before the commit succeeds.
4. Commit admission independently of the operation transaction. Thus a later `409 request_in_progress`, bad credentials, endpoint failure or rollback cannot refund admitted rate tokens.

The design must not reject one of the multi-bucket stages after separately committing a debit to another. Login's email/IP pair and identifiable refresh/logout's session/IP pair need the same atomic decision. Forgot-password is the contract's explicit exception: commit IP admission, then check/debit the email bucket before account lookup; email exhaustion consumes the IP token and suppresses lookup/send with neutral `202`.

## Time and refill precision

PostgreSQL timestamps have microsecond resolution. `now()` is transaction-start time; `clock_timestamp()` reflects the actual sampling instant. Sampling once after locks avoids giving waiting transactions a stale admission time. [Date/time types](https://www.postgresql.org/docs/17/datatype-datetime.html), [date/time functions](https://www.postgresql.org/docs/17/functions-datetime.html).

Suggested exact representation, derived for this contract: for refill of `p` tokens per `q` microseconds, store integer `credit` where one token costs `q`, maximum is `capacity*q`, and each elapsed microsecond adds `p`. Current rates fit this representation, including `p=2, q=1_000_000` for two tokens/second. Set:

```text
effective_time = max(database_sample, stored_time)
elapsed_us = effective_time - stored_time
available_credit = min(capacity*q, credit + p*elapsed_us)
admit iff available_credit >= q for every required bucket
on admission: credit = available_credit - q
on denial: credit = available_credit
stored_time = effective_time
wait_us_i = 0                                      if available_credit_i >= q_i
wait_us_i = (effective_time_i - database_sample)
            + ceil((q_i - available_credit_i)/p_i) otherwise
Retry-After = ceil(max_i(wait_us_i)/1_000_000)
```

Calculate ceilings using integer arithmetic and bound elapsed time at the amount needed to reach capacity before multiplication. No binary float or rounding-away fractional refill. Here `effective_time_i = max(database_sample, stored_time_i)`. A backward database clock adjustment must not move stored time backwards and mint the same elapsed time twice; a deficient bucket's delay also includes the time needed for the database clock to catch up to its stored time. A genuine denied request has a positive whole-second delay. The response is an earliest possible admission time, not a reservation against competing traffic.

Use `bigint` for bounded credits and timestamps or PostgreSQL `numeric` for intermediate calculations with explicit bounds. PostgreSQL documents integer ranges and exact arbitrary-precision arithmetic. [Numeric types](https://www.postgresql.org/docs/17/datatype-numeric.html).

## Operation guards and recovery

For an exact identifier, a committed guard identity row can be locked with `SELECT ... FOR UPDATE NOWAIT` throughout the operation's transaction. `NOWAIT` fails immediately on a conflicting row lock; it does not skip the guard. `SKIP LOCKED` is inappropriate for guard admission. Table locks still require bounded waits. [PostgreSQL SELECT locking clause](https://www.postgresql.org/docs/17/sql-select.html).

A guard row must be created and committed before the operation transaction starts, or pre-created with the related session/token. If its initial insert is left inside the operation transaction, another first-use insert can block on uniqueness and then run after completion rather than report overlap. Avoid that bootstrap race. Row cleanup must also coordinate against concurrent admission so that deleting/recreating an identity cannot split guard ownership. A design retaining identity rows until a safe lifetime boundary is easier to reason about than aggressive TTL deletion.

Keep successful login session creation, refresh rotation, and password-reset consumption/password/session changes in the same transaction that owns the relevant guard. Release on commit/rollback; on lost worker connection the database eventually ends the abandoned transaction. Use PostgreSQL 17 `transaction_timeout` for an explicit upper bound on live transactions and `idle_in_transaction_session_timeout` for abandoned off-database intervals. `statement_timeout` alone cannot bound idle intervals between commands. Timeouts should be configured and verified on the selected hosted PostgreSQL version, and measured around Argon2 work. [PostgreSQL client connection defaults](https://www.postgresql.org/docs/17/runtime-config-client.html).

No TTL row field may authorize a replacement worker while the original transaction still owns the guard. A stale worker whose transaction/connection has ended must terminate that attempt: never reconnect and continue the previously authorized mutation, never emit success or credentials from uncommitted state. The database transaction is the authority; a lease expiration, process-local flag or background heartbeat is not. This preserves database effects even when the old process resumes after a pause. Return only the existing sanitized `500 internal_error` if a valid attempt loses its dependency/transaction; guard contention itself retains `409 request_in_progress`.

Redis's own lock guide limits mutual exclusion to a validity window and explicitly recommends fencing for processes that can outlast it. An ownership token and compare-delete prevent deleting a successor's lease; they do not by themselves prevent a stale owner from updating PostgreSQL after expiry. This is a reason to prefer transaction-owned guards for these database-changing operations. [Redis distributed locks](https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/).

Django's `select_for_update(nowait=True)` requires an active transaction and raises a database error on conflict. Catch errors outside the failed atomic block or use an appropriate savepoint; do not continue SQL inside a transaction left in error. Real lock tests should use transaction-aware integration tests rather than SQLite or a unit test wrapper that hides autocommit behavior. [Django QuerySet reference](https://docs.djangoproject.com/en/5.2/ref/models/querysets/#select-for-update).

## Required verification consequences

This recommendation still needs two distinct application workers against one real PostgreSQL instance. Verify atomic no-partial-debit, fractional refill boundaries, per-group/owner isolation, rounded-up maximum retry time, forgot-password suppression before account lookup, immediate guard conflict, worker termination/recovery, paused stale-worker rejection, and persisted state across application restarts. Separately verify purchase idempotency and Stock/order transitions: rate guards never replace those correctness transactions.

The foundation should migrate bucket/guard state with the rest of PostgreSQL and provide bounded cleanup that never deletes depleted buckets before their full-refill time or active guard identities. Local/CI use the existing PostgreSQL service, with no Redis service. Hosted pooled-connection tests, timeout permissions and actual crash recovery remain acceptance work; no runtime tests were executed in this research task.
