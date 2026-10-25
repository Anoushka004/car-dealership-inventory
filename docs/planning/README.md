# V1 handoff plan

This index describes the scaffold on `main`. Decision/specification snapshots retain historical wording; later accepted amendments and live GitHub comments supersede old blocker/status statements.

- [V1 specification](v1-specification.md) and [implementation graph](https://github.com/Anoushka004/car-dealership-inventory/issues/8).
- [REST contract](../backend/rest-api-contract.md), [vehicle discovery](../backend/vehicle-discovery.md), [accounts](../backend/accounts.md), [Orders/Stock](../backend/orders-and-stock.md) and [email delivery](../backend/email-delivery.md).
- [Accepted Stock rule](stock-restoration-approved.md) and [API amendment](stock-restoration-api-amendment.md): preserve capacity for every Placed-order cancellation; these amend the original Stock/API decisions.
- [Approved frontend B plan](../frontend/v1-plan.md), with source in `frontend/`.
- [Delivery blueprint](v1-delivery-blueprint.md): selected runtimes, free hosting targets, migrations, routing and acceptance gates.
- [Shared protection design](v1-shared-protection-design.md) and [research](v1-shared-protection-research.md).

Stock restoration, delivery and shared-state decisions are resolved. Backend foundation code is present. Authentication, discovery, inventory changes, purchases, Order transitions and endpoint protection remain behavior-ticket work. Frontend state is still in memory. Backend acceptance precedes API integration.

Clone `main` anywhere and follow the root README. Earlier blueprint references to a specific Windows workspace/integration checkout record provenance, not a required directory. Hosted credentials, approved tester configuration, verified content and email entitlement remain release inputs. Backend bootstrap CI passed; the Vercel packaging tooling check currently fails and is still open.
