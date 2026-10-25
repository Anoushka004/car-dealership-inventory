# Resolution: backend REST API contract

This contract consolidates the decisions accepted in the live discussion for [Define the backend REST API contract](https://github.com/Anoushka004/car-dealership-inventory/issues/5), including final confirmation to close the ticket. The resolution comment on that ticket is canonical; any local review copy is not a second source of decisions.

This is planning only. No application code, deployment, credentials, or provider accounts are created by this decision.

## 1. Contract conventions

- All routes below are relative to `/api/v1`.
- JSON request/response bodies use `snake_case`. IDs are opaque UUIDs. Timestamps are UTC ISO-8601 strings with `Z`.
- Prices are decimal strings with two fractional digits, in INR only. Responses include `currency: "INR"`; taxes and fees are excluded. Clients cannot choose a different currency.
- Unknown request fields and query parameters, invalid types, invalid enum values, and invalid ranges produce `422 validation_error`.
- Collection envelope: `{ "items": [], "page": 1, "page_size": 20, "total": 0 }`. Pages start at 1; page size defaults to 20, minimum 1, maximum 100. An out-of-range page is empty, not an error.
- Default sorting is newest first. Use the resource ID as a deterministic tie-breaker. Offset pagination does not promise a stable snapshot across concurrent changes.
- Single-resource responses are JSON objects without an additional data envelope. Optional absent values are `null`; collections are arrays, including when empty.
- Every API error uses `{ "error": { "code": "stable_machine_code", "message": "Human-readable explanation.", "details": [] } }`. Validation details identify the field, code, and message; do not echo passwords or tokens.
- A `204` response has no body. Authenticated responses and token responses must not be stored in shared caches.

## 2. Permissions and resource routes

Public visitors browse/search. Customers place orders and access only their own account/orders. Admins manage inventory and all orders; admins cannot purchase. Admin creation remains a trusted deployment command, never a public role-selection or promotion API.

| Method | Route | Permission / behavior |
| --- | --- | --- |
| GET | `/vehicle-metadata` | Public; static allowed category values |
| GET | `/vehicle-listings` | Public; filtered, paginated listing summaries |
| GET | `/vehicle-listings/{listing_id}` | Public; active listing and active options |
| POST | `/orders` | Customer; purchase one unit of one option |
| GET | `/orders` | Customer; own orders only |
| GET | `/orders/{order_id}` | Customer; own order only |
| POST | `/orders/{order_id}/cancel` | Customer; own placed order |
| GET | `/admin/vehicle-listings` | Admin; paginated inventory |
| POST | `/admin/vehicle-listings` | Admin; create listing and one or more options atomically |
| GET | `/admin/vehicle-listings/{listing_id}` | Admin; listing and options, including inactive records |
| PATCH | `/admin/vehicle-listings/{listing_id}` | Admin; edit listing with version check |
| DELETE | `/admin/vehicle-listings/{listing_id}` | Admin; deactivate listing with version check |
| POST | `/admin/vehicle-listings/{listing_id}/options` | Admin; add option |
| PATCH | `/admin/vehicle-listings/{listing_id}/options/{option_id}` | Admin; edit option with version check |
| DELETE | `/admin/vehicle-listings/{listing_id}/options/{option_id}` | Admin; deactivate option with version check |
| PUT | `/admin/vehicle-listings/{listing_id}/options/{option_id}/stock` | Admin; set available stock with version check |
| GET | `/admin/orders` | Admin; all orders |
| GET | `/admin/orders/{order_id}` | Admin; any order |
| POST | `/admin/orders/{order_id}/cancel` | Admin; cancel any placed order |
| POST | `/admin/orders/{order_id}/complete` | Admin; record handover of a placed order |
| GET | `/me` | Customer or admin; own account |

An option ID must belong to the listing in its route. A missing resource, inactive public listing, or another customer's order returns `404 resource_not_found`. Authenticated callers with the wrong role receive `403 forbidden`.

## 3. Inventory schemas

### Listing fields

- Required: `make`, `model`, `model_year`, `condition`, `body_style`.
- `photo_urls`: ordered array of HTTPS URLs. May be empty only when every option supplies its required photos.
- Optional: `description`, `features` (array of strings).
- Server fields: `id`, `created_at`, `updated_at`. Admin representations additionally expose `active` and `version`.
- `condition` is immutable after creation. New and used offers are separate listings.
- Create request includes `options`, a nonempty array of option-create objects. Either all records are created or none are.

### Option fields

- Required: `trim`, `color`, `fuel_type`, `transmission`, `price`, `stock`.
- `photo_urls`: ordered array of HTTPS URLs. A new option can use representative listing photos; a used option must have at least one photo of that physical vehicle.
- Used options also require `mileage_km`, `previous_owner_count`, `condition_notes`, `vin`.
- New options do not accept used-only fields.
- Use `"Standard"` as the trim where no named trim exists.
- Server fields: `id`, `listing_id`, `currency`, `available`, `created_at`, `updated_at`.
- Admin representations additionally expose `stock`, `version`, `active`, and used-option `vin`.
- Public representations omit exact stock, version, and VIN. VIN is available to the purchasing customer only through the order snapshot.
- Availability means that the listing and option are active and stock is positive.

### Allowed category values

| Field | Values |
| --- | --- |
| `condition` | `new`, `used` |
| `body_style` | `hatchback`, `sedan`, `suv`, `crossover`, `coupe`, `convertible`, `wagon`, `van`, `pickup`, `other` |
| `fuel_type` | `petrol`, `diesel`, `electric`, `hybrid`, `plug_in_hybrid`, `cng`, `lpg`, `other` |
| `transmission` | `manual`, `automatic`, `other` |

`GET /vehicle-metadata` returns arrays named `conditions`, `body_styles`, `fuel_types`, and `transmissions`. It does not query the database.

### Validation

- Make, model, trim, color: trimmed, nonblank, 1–100 characters.
- Description and condition notes: at most 5,000 characters; required condition notes cannot be blank.
- Features: at most 50 entries, each trimmed and 1–100 characters.
- Photos: at most 20 URLs per listing or option; each HTTPS URL is at most 2,048 characters. URLs are supplied by admins; uploading or fetching remote image bytes is outside this API.
- VIN: uppercase-normalized, 1–50 alphanumeric characters, unique across used options including inactive options. It is not restricted to 17 characters, to allow older vehicles.
- Model year: integer from 1886 through the next calendar year.
- Price: decimal string from `"0.01"` through `"999999999.99"`, at most two fractional digits on input, exactly two on output. No exponent notation.
- Stock, mileage, previous-owner count: nonnegative integers, at most 2,147,483,647. Used-option stock is only 0 or 1.
- Effective photos and all condition-specific requirements are checked after every mutation, not just creation.

### Editing, stock, and removal

- `PATCH` accepts editable fields plus `expected_version`. Omitted fields stay unchanged. Arrays replace their previous contents. Only optional scalar fields can be cleared with `null`; use `[]` to clear arrays where valid.
- Stock is supplied on creation, then changed only through the dedicated stock endpoint: `{ "stock": 3, "expected_version": 7 }`.
- Listings and options each have an integer version, beginning at 1. Successful edits increment the affected resource's version. Purchases and cancellations increment the option version when stock changes.
- `DELETE` takes `expected_version` as a required query parameter. Edits, deletion, and stock changes use atomic version checks; stale versions return `409 version_conflict`.
- Removal deactivates the resource permanently for this release. Deactivating a listing makes all its options unavailable for purchase. Removing the last active option excludes the listing from public browsing.
- Removed resources and order references are retained. No restore endpoint. Admin reads can still inspect inactive records; this release does not expose further manual mutation of inactive inventory.
- Cancelling an order for inactive inventory restores one stock unit without reactivating anything.

## 4. Browse and search

Query parameters: `q`, `year_min`, `year_max`, `price_min`, `price_max`, `body_style`, `fuel_type`, `transmission`, `condition`, `include_unavailable`, `sort`, `page`, `page_size`.

- `q` performs case-insensitive text matching across make, model, and trim. Omitted or whitespace-only `q` means no text filter.
- Range bounds are inclusive; a lower bound greater than its upper bound is invalid.
- `include_unavailable` defaults to `false`; this excludes sold-out options from matching. It never exposes inactive inventory publicly.
- All option-level conditions, including trim text matching where relevant, must be satisfied by the same option.
- Listing-level text matches on make/model apply to the listing; other option filters still have to match one option within it.
- Sort values: `price_asc`, `price_desc`, `year_asc`, `year_desc`, `newest`, `oldest`; default `newest`.
- Price display/sort uses the minimum price among matching options, not unrelated options in the listing.
- A listing summary contains `id`, make/model/year/condition/body style, `photo_url`, `available`, `lowest_matching_price`, `currency`, `matching_option_ids`, `created_at`, `updated_at`.
- Summary availability describes whether any matching option is available. Choose a representative photo from a matching option, falling back to its permitted listing photo.
- Public listing detail contains listing fields and `options`: all active options, including sold-out ones. It does not inherit collection filters. A listing with active but sold-out options remains accessible by ID.
- Admin listing collections accept the same filters plus `include_inactive=false`; administrators can explicitly include inactive inventory. Admin summaries additionally expose `active` and `version`; detail supplies exact option stock and versions.

## 5. Orders and concurrency

### Purchase

`POST /orders` accepts only `{ "vehicle_option_id": "<uuid>" }` and requires an `Idempotency-Key` header containing a UUID.

- A customer purchases exactly one unit. No cart, reservation, approval, payment, or caller-supplied customer ID, price, or status.
- The server atomically checks active inventory/positive stock, deducts one unit, and creates an order with `status: "placed"`.
- Snapshot the server-current price and vehicle details at processing time. A change since browsing does not require another confirmation.
- Concurrent purchases of the last unit yield one success; the loser receives `409 out_of_stock`, with no order or negative stock.
- Successful idempotency keys are scoped to the customer and retained for the lifetime of the order.
- A completed duplicate request with the same key and option returns that original order (`200`), even if it is now completed or cancelled. It never purchases another unit.
- The same successful key with a different option returns `409 idempotency_key_conflict`.
- While a request with that key is processing, an overlapping request returns `409 request_in_progress`. Creating the order and binding the key must be atomic.
- A failed purchase creates no order and does not permanently bind the key. A later retry evaluates current price/availability again.

### Representation

Order fields: `id`, `vehicle_listing_id`, `vehicle_option_id`, `status`, `price`, `currency`, `vehicle_snapshot`, `created_at`, `completed_at`, `cancelled_at`.

`vehicle_snapshot` retains make, model, model year, condition, body style, trim, color, fuel type, transmission, effective photo URLs, and the used-vehicle mileage/previous-owner count/condition notes/VIN where applicable. It does not include live stock or inventory versions. Snapshot URLs preserve the URL values, not copies of externally hosted image bytes.

Customer responses contain only their own orders. Admin order responses also contain `customer_id` and `customer_email`.

### Lifecycle

- Only `placed`, `completed`, and `cancelled` states exist. Completed and cancelled are final.
- Cancel/complete actions accept an empty body. Completion records handover and does not change stock.
- Cancellation restores one stock unit exactly once, including to an inactive original option.
- Repeating a terminal transition, or trying a different transition after completion/cancellation, returns `409 invalid_order_transition`.
- Concurrent cancellation and completion: the first successful transition wins; the other fails. Restore stock only if cancellation wins.

### Order collections

Support `status`, inclusive UTC `created_from`/`created_to`, `sort` (`newest` or `oldest`), `page`, and `page_size`. Admins can additionally filter by `customer_id`. Default newest first, with deterministic ID tie-breaker. Invalid timestamp ranges return `422`.

## 6. Accounts and authentication

All auth routes below use `POST` under `/auth`; request and response payloads are JSON except cookies. Account shape is `{ "id": "<uuid>", "email": "customer@example.com", "role": "customer" }`, with role `customer` or `admin`.

| Route | Request | Success |
| --- | --- | --- |
| `/register` | `email`, `password` | `201`, account object; does not log in |
| `/login` | `email`, `password` | `200`, token/account response; sets refresh cookie |
| `/refresh` | Empty body; refresh cookie | `200`, token/account response; replaces refresh cookie |
| `/logout` | Empty body; optional refresh cookie | `204`, revoke current refresh session and clear cookie |
| `/logout-all` | Empty body; valid bearer access token | `204`, revoke all account refresh sessions and clear cookie |
| `/forgot-password` | `email` | `202`, neutral message for every syntactically valid address |
| `/reset-password` | `token`, `new_password` | `204`, consume reset token and revoke all account refresh sessions |

- Email is trimmed, normalized to lowercase, and unique case-insensitively. Reject malformed email addresses.
- Passwords are 12–128 characters, preserved exactly, allowing spaces and Unicode, without mandatory character classes. Hash with Argon2id.
- Registration is restricted to the deployment-configured approved tester email allowlist. Reject nonapproved emails with `403 registration_not_allowed`; duplicates with `409 email_already_registered`.
- Failed login uses one `401 invalid_credentials` response for nonexistent accounts and incorrect passwords.
- Login/refresh response: `{ "access_token": "...", "token_type": "bearer", "expires_in": 900, "account": { "id": "...", "email": "...", "role": "customer" } }`.
- Signed JWT access tokens expire after 15 minutes. Validate algorithm, signature, issuer, audience, expiry, and authorization. Keep frontend access tokens in memory, not browser storage.
- Refresh tokens are opaque; store a verifier server-side and deliver the token only through a `Secure`, `HttpOnly`, `SameSite=Lax` cookie scoped to `/api/v1/auth`.
- Deployed frontend/API share one origin. Cookie-authenticated refresh/logout require an exact allowed Origin and a custom header. Local development explicitly allows its frontend origin; relax Secure only for local HTTP development.
- Each successful refresh rotates the token and renews the session to seven days from that refresh, capped at 30 days from login. Concurrent device sessions are allowed.
- Reusing an already rotated refresh token revokes its session family; login is required again. The frontend serializes refresh across tabs as well as within each tab.
- Missing, expired, or revoked refresh credentials return `401 invalid_refresh_token` and clear the cookie.
- Logout is idempotent for missing/expired cookies. Logout-everywhere requires a valid access token. Existing access tokens can remain valid for their remaining 15 minutes after logout/password reset.
- Password-reset tokens are single-use and expire after 30 minutes. Issuing a new token invalidates older tokens for that account. Invalid, expired, or used tokens share `400 invalid_reset_token`.
- Forgot-password always uses the same `202` message for syntactically valid emails, including unknown accounts, suppressed sends, and provider failure. Invalid email syntax still receives `422`; IP rate exhaustion receives `429`.
- Deployment uses SendGrid SMTP with the verified Single Sender and approved testers; local development uses Mailpit. Alert the operator on delivery failures without logging reset tokens or full reset URLs. Real-inbox reset checks remain a release requirement.
- Email verification and admin MFA remain deferred.

## 7. Token-bucket protection

### Scope

Protect every endpoint that reads or writes the database, handles login, sends email, or performs expensive computation. Cheap operations without those effects are exempt: static vehicle metadata, static assets, and a basic process-health response.

Database readiness checks must be internal/restricted or protected. New expensive operations need an explicit budget; being outside authentication is not an exemption.

### Semantics

- Buckets start full, refill gradually at the specified rate, and cannot exceed capacity. Each request costs one token. Successful requests do not refill buckets.
- Each endpoint group shares a bucket for its owner. Bucket identity includes the group and owner so unrelated workloads do not consume each other's allowance.
- Where multiple buckets apply, require capacity in all of them and debit them atomically, or debit none. State and enforcement are shared across backend instances.
- Exhaustion returns the shared error envelope with `429 rate_limited` and `Retry-After` in whole seconds, rounded up to when all necessary buckets can admit the request.
- Malformed/invalid authentication requests are rejected before database access where possible. Apply applicable IP protection before expensive authentication work.
- Trusted deployment proxy configuration must determine client IP; do not trust arbitrary caller-supplied forwarding headers.
- These are configurable initial budgets, not a guarantee of capacity. Backend delivery must verify behavior under concurrent requests.

| Endpoint group | Capacity | Refill | Owner |
| --- | ---: | --- | --- |
| Public listing/search/detail | 60 | 1 token/second | IP |
| `/me` and customer order reads | 120 | 2 tokens/second | Account |
| Customer purchase/cancellation | 10 | 1 token/6 seconds | Account |
| Admin inventory/order reads | 120 | 2 tokens/second | Account |
| Admin inventory/order mutations | 30 | 1 token/2 seconds | Account |
| Login | 5 | 1 token/3 minutes | Normalized email, including nonexistent accounts |
| Login additional protection | 30 | 1 token/30 seconds | IP |
| Registration | 10 | 1 token/6 minutes | IP |
| Forgot-password delivery | 3 | 1 token/20 minutes | Normalized email, including nonexistent accounts |
| Forgot-password requests | 20 | 1 token/3 minutes | IP |
| Reset-password | 10 | 1 token/90 seconds | IP |
| Refresh | 60 | 1 token/second | Session |
| Logout | 10 | 1 token/6 seconds | Session, when identifiable |
| Logout-everywhere | 5 | 1 token/3 minutes | Account |
| Refresh/logout/logout-everywhere additional protection, shared across those routes | 60 | 1 token/second | IP |

Forgot-password is the deliberate exception to all-buckets-or-429: first enforce its IP bucket; then check the normalized-email bucket before querying the database. If the email bucket is empty, silently skip the database query and send, returning the normal `202`. The request still consumes its IP token. Do not reveal account existence through email-bucket behavior.

### Separate concurrency guards

- One in-flight login per normalized email.
- One in-flight refresh per session.
- One in-flight password reset per reset token.
- Overlaps return `409 request_in_progress`; their already consumed rate tokens are not refunded.
- Guards must be shared across instances and recover from worker failure; store no raw secrets in limiter/guard identifiers.
- Browsing remains concurrent. Purchase idempotency, inventory version checks, and atomic order transitions remain separate correctness guarantees.

## 8. Status and error conventions

| Outcome | Status / code |
| --- | --- |
| Resource creation, first purchase | `201` |
| Read, edit, transition, successful purchase replay | `200` |
| Delete/deactivate, logout, successful password reset | `204` |
| Accepted forgot-password request | `202` |
| Invalid/expired/used reset token | `400 invalid_reset_token` |
| Missing/invalid bearer authentication | `401 authentication_required` / `invalid_access_token` |
| Bad login / refresh | `401 invalid_credentials` / `invalid_refresh_token` |
| Wrong role | `403 forbidden` |
| Rejected cookie Origin/custom-header check | `403 csrf_check_failed` |
| Registration email not approved | `403 registration_not_allowed` |
| Missing/hidden resource | `404 resource_not_found` |
| Out of stock | `409 out_of_stock` |
| Stale inventory version | `409 version_conflict` |
| Final/invalid order transition | `409 invalid_order_transition` |
| Retry key reused for another option | `409 idempotency_key_conflict` |
| Concurrent guarded operation / purchase retry | `409 request_in_progress` |
| Duplicate email / VIN | `409 email_already_registered` / `vin_already_registered` |
| Invalid request fields/parameters/header formats | `422 validation_error` |
| Rate exhausted | `429 rate_limited`, with `Retry-After` |
| Unexpected internal failure | `500 internal_error`, without internal details |

Inactive inventory cannot be purchased; use `404 resource_not_found`. A sold-out but active option uses `409 out_of_stock`. A successful purchase replay is resolved before rechecking current inventory eligibility.

## 9. Confirmed serialization and edge-case details

The final confirmation also covers these concrete serialization and edge-case details:

1. Auth paths all sit below `/auth`; successful registration returns the account object, and refresh returns the same token/account shape as login.
2. Empty out-of-range collection pages return `200`; optional scalars are `null`; unknown query parameters are rejected. Validation detail entries use `{ "field": "price", "code": "invalid_decimal", "message": "..." }`.
3. Inventory versions begin at 1. Inactive inventory is inspectable but cannot be manually edited/restocked or receive new options in this release. Listing deactivation must serialize safely with concurrent child creation/purchase; restoring stock through cancellation remains allowed.
4. Public collection availability is relative to matching options; detail includes all active options. New-option payloads reject used-only fields. Historical order photos preserve URL strings, not hosted files.
5. Use cookie name `refresh_token` and header `X-CSRF-Protection: 1`; clear the cookie using the same path and security attributes. Missing/invalid Origin or header rejects cookie-authenticated refresh/logout.
6. For an admin collection explicitly including inactive records, listing selection is controlled by `include_inactive`; option matching still obeys `include_unavailable`. A listing with no matching options is omitted. Direct admin detail remains the way to inspect a listing with no options.

## 10. Resolution and follow-on work

This resolves [Define the backend REST API contract](https://github.com/Anoushka004/car-dealership-inventory/issues/5). [Plan the staged car dealership inventory system](https://github.com/Anoushka004/car-dealership-inventory/issues/1) retains only a short linked pointer to this decision.

[Define the first frontend experience](https://github.com/Anoushka004/car-dealership-inventory/issues/6) is the next existing decision; this session does not resolve it. The implementation/deployment sequence remains map fog until frontend delivery boundaries are settled. Shared rate-limit state, proxy/IP handling, deployment layout, database migrations, and test execution belong in that later delivery planning; this contract requires their observable behavior without choosing infrastructure now.

