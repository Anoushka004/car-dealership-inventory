# Dealership V1 implementation specification

Status: specification of settled V1 behavior, with explicit blockers below. Testing boundaries confirmed by the owner on 2026-10-25. This specification does not declare the entire release ready to implement or deploy while those blockers remain open.

## Problem Statement

Visitors need to find available new and used vehicles and understand the exact vehicle option they are ordering. Customers need reliable ordering, cancellation, account access, and password recovery. Admins need to maintain vehicle listings and stock and record vehicle handover without overselling inventory or losing purchase history.

The project currently has settled product decisions and an approved, in-memory frontend prototype. It has no production FastAPI backend, persistence layer, migrations, or backend test suite. Prototype interactions do not establish real authentication, email delivery, cross-worker concurrency, or deployment correctness.

## Solution

Deliver an approved-tester full-stack demo using FastAPI, PostgreSQL, token-based authentication, and the locked React/semantic HTML5/CSS3/Tailwind vehicle-gallery experience. Deliver and verify the backend REST API first, then integrate the frontend against it. The deployed frontend and API share one origin.

Treat the linked decisions as normative dependencies of this specification. The summaries here explain the build; exact endpoint schemas, validation, response codes, budgets, and edge cases remain governed by the approved REST contract. No product rule or locked frontend decision is amended by this specification. The stock-rule conflict below requires an explicit resolution before the affected functionality can be accepted.

### Authoritative inputs

- [Plan the staged car dealership inventory system](https://github.com/Anoushka004/car-dealership-inventory/issues/1): destination, backend-first sequence, scope, and remaining planning.
- [Define vehicle listing fields and search behavior — decision](https://github.com/Anoushka004/car-dealership-inventory/issues/2#issuecomment-6394336977).
- [Define accounts and admin access — decision](https://github.com/Anoushka004/car-dealership-inventory/issues/3#issuecomment-6394396272).
- [Define purchase, cancellation, and stock rules — decision](https://github.com/Anoushka004/car-dealership-inventory/issues/4#issuecomment-6394467170).
- [Choose password reset email delivery — decision](https://github.com/Anoushka004/car-dealership-inventory/issues/7#issuecomment-6394519697).
- [Define the backend REST API contract — canonical resolution](https://github.com/Anoushka004/car-dealership-inventory/issues/5#issuecomment-6394771175).
- [Define the first frontend experience — canonical resolution](https://github.com/Anoushka004/car-dealership-inventory/issues/6#issuecomment-6396001079).
- [Immutable approved frontend source and evidence](https://github.com/Anoushka004/car-dealership-inventory/tree/01c70baef1c5fdba26f7f5efd4260712b3e81161/scrollcraft/builds/dealership-prototype): commit `01c70baef1c5fdba26f7f5efd4260712b3e81161`, preserved on the separate prototype branch.

## User Stories

### Visitors and vehicle discovery

1. As a visitor, I want to browse without signing in, so that I can evaluate available vehicles first.
2. As a visitor, I want the approved photographic vehicle gallery, so that I can explore vehicles through the selected V1 experience.
3. As a visitor, I want to search make, model, and trim without case sensitivity, so that I can find relevant vehicle listings.
4. As a visitor, I want model-year and INR price ranges and body-style, fuel, transmission, and condition filters, so that results reflect my requirements.
5. As a visitor, I want all option filters to match one vehicle option, so that a result actually offers the combination I requested.
6. As a visitor, I want available matching options shown by default and an explicit sold-out inclusion control, so that availability is clear.
7. As a visitor, I want the displayed starting price and price sorting to use matching options, so that unrelated cheaper options do not mislead me.
8. As a visitor, I want price, year, and creation-date sorting and paginated results, so that I can explore a large collection.
9. As a visitor, I want a detail page showing all active options, including sold-out options, so that I can compare the listing's actual choices.
10. As a visitor, I want the selected option's facts, photograph, price, and availability to stay synchronized, so that I know which option I am considering.
11. As a visitor, I want used-vehicle mileage, previous-owner count, condition notes, and actual-vehicle photography, so that I can assess that physical vehicle.
12. As a visitor, I want availability without exact stock or public VIN, so that shopping exposes the agreed information.
13. As a visitor, I want clear empty, unavailable, loading, and recoverable-error states, so that I understand what happened and can continue.
14. As a visitor, I want Explore, Choose, Order, Prepare, and Handover explained, so that I understand ordering and can confirm delivery arrangements with the dealership.

### Accounts and sessions

15. As an approved tester, I want to register a Customer account with email and password, so that I can order vehicles.
16. As a Customer, I want to sign in and return to my intended vehicle option, so that authentication does not interrupt my selection.
17. As a Customer or Admin, I want renewable sessions across navigation and page reloads, so that I do not repeatedly sign in during permitted session lifetimes.
18. As a Customer or Admin, I want refresh coordinated across browser tabs, so that simultaneous refresh does not accidentally revoke my session.
19. As a Customer or Admin, I want to inspect my account, so that I know which identity and role are active.
20. As a Customer or Admin, I want to sign out of this device or all devices, so that I can revoke refresh access as needed.
21. As a Customer, I want a password-reset link in my approved real inbox, so that I can recover access.
22. As a Customer, I want expired, used, and superseded reset links rejected and successful reset to revoke refresh sessions, so that recovery is controlled.
23. As a person requesting recovery, I want a neutral response that does not reveal account membership, so that private account information is protected.

### Customer orders

24. As a Customer, I want to order one unit of one available vehicle option, so that I can arrange its purchase without a cart or online payment.
25. As a Customer, I want purchase to use the server-current price and vehicle facts, so that the accepted order records what was processed.
26. As a Customer, I want a double click or network retry to return my original order, so that I do not purchase twice accidentally.
27. As a Customer, I want an explicit out-of-stock response when another purchase wins the last unit, so that I do not receive a false confirmation.
28. As a Customer, I want to list, filter, and inspect only my own orders, so that my purchase history remains private.
29. As a Customer, I want order snapshots to retain the original price and vehicle details, including my purchased used-vehicle VIN, so that later inventory changes do not rewrite my order.
30. As a Customer, I want to cancel my own Placed order and have its unit restored once, so that cancellation has a consistent stock effect.
31. As a Customer, I want Completed and Cancelled orders to remain final, so that the history clearly represents the outcome.
32. As a Customer, I want orders to remain accessible after inventory removal, so that removal does not erase my purchase history.

### Admin operations

33. As an operator, I want a trusted command to provision Admin accounts, so that public registration cannot grant inventory privileges.
34. As an Admin, I want a separate inventory workspace with exact stock, versions, and permitted VIN access, so that I can manage inventory accurately.
35. As an Admin, I want to create a listing and its first options atomically, so that partially created offers do not appear.
36. As an Admin, I want to add options and edit permitted listing and option fields, so that inventory facts remain current.
37. As an Admin, I want condition-specific validation and unique used-vehicle VINs, so that new and used inventory retain their agreed meaning.
38. As an Admin, I want to set exact available stock through its dedicated operation, so that stock changes are explicit and version checked.
39. As an Admin, I want stale edits rejected, so that I do not silently overwrite purchases or another Admin's changes.
40. As an Admin, I want to deactivate listings or options permanently for V1, so that they stop accepting purchases while historical orders remain.
41. As an Admin, I want to inspect inactive records without manually editing, restoring, or restocking them, so that retained history is visible.
42. As an Admin, I want to inspect all orders with Customer identity and supported filters, so that I can handle dealership work.
43. As an Admin, I want to cancel any Placed order or mark it Completed after handover, so that order status reflects the actual outcome.
44. As an Admin, I want racing cancellation and completion to choose one final outcome, so that stock is restored only when cancellation wins.
45. As an Admin, I want purchasing prohibited for my role, so that the agreed role boundary holds.

### Accessible use and operational confidence

46. As a phone or keyboard user, I want readable screens, reachable controls, and usable dialogs and journey navigation, so that all primary flows are available to me.
47. As a person requesting reduced motion, I want complete static photographs and a shorter nonsticky journey, so that content remains available without decorative movement.
48. As an operator, I want rate limits and concurrency guards shared across workers, so that additional instances do not bypass protection.
49. As an operator, I want safe delivery-failure alerts, so that I can repair reset email without exposing secrets.
50. As an operator, I want verified migrations, deployment configuration, and end-to-end evidence, so that the approved-tester demo can be released deliberately.

## Implementation Decisions

### Settled platform and module responsibilities

- FastAPI owns the versioned REST API; PostgreSQL persists accounts, inventory, orders, and the durable data required by the session and retry contracts. Exact schema, ORM, driver, migration tooling, and package versions remain implementation selections subject to the constraints below.
- Organize behavior around accounts/sessions/recovery, vehicle listings/options/search, ordering/stock transitions, shared request protection, and the frontend API/session boundary. These are responsibilities rather than a mandated file layout.
- Backend behavior is authoritative. Replace the prototype's in-memory account, inventory, purchase, and transition behavior with real API operations while preserving the approved screen hierarchy and visual interaction.
- Use the project's glossary. A Vehicle listing groups Vehicle options; an Order purchases one option unit. Preparation and handover narrative do not introduce order states.
- No ADR files were found during repository inspection. Existing project guidance, planning documents, the unborn original workspace, and the separate approved-artifact checkout must be preserved. Implementation requires a deliberate checkout/base-branch choice; this specification does not create a baseline or merge prototype history into main.

### Exact API obligations

- Implement every resource and authentication route, request/response shape, validation range, permission, status, machine error code, and token-bucket rule in the canonical REST resolution. Its numbered sections 1–9 are required acceptance inputs, including the final serialization and edge-case clarifications.
- Preserve `/api/v1`, UUID identifiers, UTC timestamps, `snake_case`, INR decimal-string prices, collection envelopes, deterministic sorting, page-size limits, and the shared error envelope. Reject unknown fields and query parameters. Do not expose secrets in validation or internal errors.
- Public routes expose static category metadata, search, and active listing detail. Customer routes cover own account and orders; Admin routes cover inventory and all orders. Wrong roles are forbidden; another Customer's order remains hidden as not found.
- Persist grouping, condition-specific required fields, effective photographs, unique normalized used-option VINs, version counters, and retained inactive inventory. Apply validation after every mutation. Stock changes after creation use only the dedicated stock operation, apart from purchase/cancellation effects.
- Search must match all option predicates against one option and compute displayed/sorted price from matching options. Detail does not inherit collection filters. Include sold-out and inactive records only under the contract's separate public/Admin rules.

### Transactions, retries, and lifecycle

- Purchase eligibility, stock deduction, order snapshot, and successful idempotency binding commit together or fail together. Preserve customer-scoped successful keys for the order lifetime; replay the original order before rechecking current inventory eligibility.
- Preserve distinct outcomes for an in-progress duplicate, a successful key reused for another option, out-of-stock inventory, and an inactive resource. Failed purchases do not permanently bind the key.
- Use database-safe concurrency for purchase, stock version checks, deactivation versus purchase/child creation, and final order transitions. In-process locks alone cannot satisfy the cross-worker guarantees.
- Order snapshots preserve processed price, vehicle facts, and effective photo URL values; they do not preserve hosted image bytes. Only Admin order representations include Customer ID/email.
- Completion records handover without changing stock. Cancellation restores exactly one unit once, even for inactive inventory, without reactivation. The stock-capacity contradiction identified below must be resolved before accepting all combinations of stock setting and cancellation.

### Accounts, sessions, and request protection

- Restrict Customer registration to configured approved tester emails. Normalize email, enforce uniqueness, use the agreed 12–128-character password policy and Argon2id, and provision Admins through a trusted command.
- Preserve 15-minute signed JWT access tokens and validation of algorithm, signature, issuer, audience, expiration, and role. Keep frontend access tokens in memory.
- Preserve opaque verifier-backed refresh tokens, rotation, seven-day renewal capped at 30 days from login, session-family revocation on replay, and device/all-device logout semantics. Already-issued access tokens may remain valid for their remaining lifetime after revocation/reset.
- Use the exact refresh cookie name, path, Secure/HttpOnly/SameSite attributes, allowed-Origin check, and custom CSRF header from the REST resolution. Deployed frontend/API share one origin; local HTTP may use only the documented local exception. Coordinate refresh within and across tabs without persistent access-token storage.
- Reset tokens expire after 30 minutes, are single-use, and are superseded by a newer token. Reset completion revokes all refresh sessions. Unknown accounts, suppressed sends, and provider failures retain the same outward forgot-password response.
- Implement every workload-specific bucket capacity, refill interval, ownership scope, atomic multi-bucket debit, rounded-up Retry-After, exemption, and forgot-password suppression exception exactly as approved. Login, refresh, and reset guards are separate, shared across instances, recover after worker failure, and do not expose raw secrets in identifiers.
- Select a shared-state implementation and trusted-proxy policy before finalizing protection infrastructure. The contract requires observable behavior without selecting Redis, PostgreSQL coordination, or another specific mechanism.

### Email and frontend delivery

- Local reset email goes to Mailpit; deployed demo email goes through SendGrid SMTP with the verified Single Sender, Mail Send secret, and configured approved recipients. Do not log raw reset tokens or full reset links. Record send failures for operator alerting.
- The email decision records a time-bounded trial assumption, not a permanent service entitlement. Validate actual provider availability and credentials when configuring deployment; any required change in delivery approach needs a new explicit decision.
- Preserve approved direction B, its warm white/charcoal/deep teal system, factual vehicle labels, gallery composition, left-to-right hero/collection photo reveals, synchronized option selection, and direct inventory access. A and C remain prototype history.
- Preserve Explore → Choose → Order → Prepare → Handover, readable narrative, synchronized active stage/caption/car marker, keyboard stage buttons, phone composition, and reduced-motion static/nonsticky behavior. Retain correct React mount/cleanup for Scrollcraft and journey observers.
- Preserve visitor, Customer, and Admin screens; selection through sign-in; order confirmation and snapshot views; cancellation/handover feedback; and recoverable stock, version, rate-limit, authentication, and uncertain-network states. Reuse the purchase key while reconciling the same uncertain attempt, consistent with the contract.
- Use real verified identity and inventory assets for release, with actual physical-vehicle photos for used options. Do not invent dealership claims or promise universal delivery. Demo shortcuts, fictional credentials, and simulated protection are not production authentication or release functionality.

### Remaining decisions and their blocking scope

| Decision or readiness item | Evidence and open question | What it blocks |
| --- | --- | --- |
| Stock restoration after manual stock increase | A used option starts at 1; purchase makes it 0; Admin sets stock to 1 while the order is Placed; cancellation must restore 1, producing 2 despite the used-option maximum of 1. Analogous restoration can exceed the integer maximum for new stock. The approved contract does not define how to prevent or resolve this combination. Decide which mutations are allowed and what error behavior applies, then explicitly amend/clarify the canonical decision. Do not silently cap stock, lose the restored unit, or choose an unapproved rejection. | Acceptance of stock-setting/cancellation combinations, related concurrency tests, and full backend sign-off. Independent discovery, account, and inventory work can proceed. |
| Shared protection storage and recovery | The map explicitly defers shared rate-limit state. Select the shared backend, atomic coordination mechanism, guard expiry/recovery policy, and behavior if that dependency is unavailable. | Protection implementation and multi-instance backend acceptance. |
| Deployment layout and trusted client IP | Same-origin deployment is settled; hosting, routing/TLS, trusted proxy chain, operational state services, and permitted origin configuration are not. | Final deployment/security configuration, reliable IP limits, and deployed demo acceptance. |
| Backend delivery workflow | The map still defers implementation/deployment sequencing, migrations, and test execution. Select application base branch/checkout, migration tooling and execution ownership, reproducible local services/test commands, and CI/release gates. Backend first and frontend afterward remain fixed. | A fully executable ticket graph and reproducible integrated delivery; these selections do not require reopening settled product/design decisions. |
| Release configuration and verified assets | Sender verification/secrets, tester addresses, real identity/contact details, photo sources, and deployed reset-link origin need actual values and access. These are provisioning/content inputs, not unresolved gallery design. | Real-inbox reset checks and release readiness; local build can use explicit test configuration and fixtures. |

The user authorized identification of blockers and creation of this specification. This does not authorize silently resolving the open product conflict, provisioning paid services, production deployment, or changing the locked frontend. No new decision tickets are created by this specification.

## Testing Decisions

The owner confirmed the following boundaries on 2026-10-25: exercise backend behavior through HTTP against real PostgreSQL, including concurrent requests across workers; then exercise key visitor/Customer/Admin journeys in a browser against that backend.

### Primary backend boundary

- Prefer API-level behavior tests over direct repository calls, internal-method assertions, or tests that simply mirror implementation. Use isolated PostgreSQL test data and the real chosen shared-state service; SQLite or per-process fake protection cannot establish the required concurrency semantics.
- Verify canonical route coverage, serialization, validation limits, pagination, metadata, public field exclusions, role checks, own-order isolation, condition-specific data, photo rules, and same-option filtering. Include fixtures where different options individually satisfy filters but none satisfies them together.
- Verify transactional listing creation, persistent snapshots, price changes between browse and purchase, inactive inventory retention, version conflicts, stock updates, and all final-transition outcomes.
- Run overlapping requests through at least two application worker processes sharing the same database/protection state. Cover last-unit purchases with different keys; overlapping same-key purchases; replay after completion/cancellation/removal; key conflicts; cancellation versus completion; Admin edits versus purchase; and deactivation versus purchase/option creation. Assert both HTTP outcomes and resulting observable inventory/orders.
- Add the stock-restoration/manual-increase cases after the canonical conflict resolution establishes their expected behavior. Their acceptance gate remains blocked until then.
- Verify registration allowlisting, normalized uniqueness, password rules, token validity and expiry, refresh rotation/reuse, session caps, per-device/all-device revocation, reset supersession/expiry/one-time use, and CSRF/cookie behavior. A controlled test clock may support time-based cases; do not wait through real token lifetimes.
- Verify all bucket groups, fractional refill/capacity, atomic debit, separate owners, cross-worker enforcement, rounded Retry-After, guard overlap/recovery, cheap-route exemptions, and forwarding-header trust under the selected proxy configuration. Prove forgot-password email-bucket suppression preserves its response and avoids database/send work.
- Verify local capture of reset email and neutral provider-failure behavior without secret leakage. SMTP acceptance is not real-inbox proof.

### Integrated browser boundary

- Use the implemented API and PostgreSQL for visitor search → detail → option → authentication → order → order detail → cancellation and Admin inventory creation/editing/stock/deactivation → order inspection/handover. Do not substitute the in-memory prototype for these tests.
- Test refresh across page reload and simultaneous tabs, expiry/recovery, sign-out, reset links, role navigation, purchase retry after a lost response, stale Admin updates, and rate-limit feedback. Confirm access tokens are not persisted in browser storage.
- Compare final direction B to the immutable approved evidence at desktop and phone sizes. Prior art uses 1440×1000, 390×844, and 360×640; include reduced motion and intermediate/final reveal and journey stages. Check keyboard access, focus/dialog behavior, image loading, runtime errors, and horizontal overflow.
- Reuse the existing Playwright and axe approach as frontend verification prior art. The prototype recorded 19 principal checks, four extra checks, and targeted gallery/journey checks; these establish design evidence only. Adapt scenarios for real integration and direction B rather than requiring historical A/C variants in the production app.
- Automated accessibility audits supplement visual, keyboard, assistive-technology, and physical-phone checks; they do not establish full accessibility certification. Record any release limitations explicitly.

### Delivery acceptance gates

1. Backend gate: reproducible setup and migrations, complete approved API behavior, real persistence, security/permissions, resolved stock conflict, and cross-worker protection/concurrency evidence. Backend gate precedes frontend integration acceptance.
2. Integration gate: real browser workflows and session coordination pass against the backend; approved B layout/motion remains intact; demo state is replaced by persistent API behavior.
3. Release gate: chosen same-origin TLS/proxy configuration, migration execution and operational failure handling are verified; release identity/assets are truthful; each approved tester receives and successfully uses a reset link in their real inbox. A delivery failure keeps the demo unready until corrected.

There is no existing production backend test suite to cite or rerun. This continuation is specification work; historical prototype checks were inspected rather than rerun, and no claim of new runtime verification is made.

## Out of Scope

- Online payments, carts, reservations, approval queues, multiple-unit orders, and additional persisted order states.
- Public registration outside the approved tester list, public password-reset rollout to arbitrary recipients, authenticated-domain production email, email verification, and Admin MFA.
- Public Admin registration, role selection/promotion APIs, inventory restoration, reopening final orders, or editing historical snapshots.
- Uploading images or fetching remote image bytes through this API, copying snapshot image files, or introducing a video-generation pipeline.
- Redesigning approved B, shipping A/C as equivalent V1 alternatives, restarting the creative interview, or interpreting placeholder identity/assets as pending layout approval.
- Guaranteed home delivery, delivery tracking, or unverified dealership claims.
- Choosing unresolved infrastructure/product policies by implication, implementing application code, publishing a deployment, or creating implementation tickets during this specification task.

## Further Notes

- All six decision issues were freshly read, including comments; they are closed. The planning map remains open with implementation/deployment sequence still in Not yet specified. This specification does not close or rewrite that map.
- The linked resolutions and immutable frontend artifact are primary sources. This specification assembles them into an implementation reference and records their unresolved boundary; it is not a replacement REST contract or frontend design record.
- The stock conflict is a synthesis finding, not an owner-approved change. Resolve it in the authoritative decision record before finalizing affected implementation acceptance criteria.
- Next planning work can turn settled, independent behavior into tickets while keeping blocked slices explicit. A complete dependency graph and unrestricted implementation require the blocking choices above to be settled. No ticket may claim full-release readiness solely because this specification carries a work-ready triage label.
- A local fetched decision snapshot supports traceability during drafting; GitHub remains authoritative and must be reloaded when implementing or amending decisions.

