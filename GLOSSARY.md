# Dealership Inventory

The language used to describe cars offered by the dealership and customer orders.

## Language

**Customer**:
A registered buyer who can place and view their own orders.
_Avoid_: User, buyer account

**Admin**:
A dealership staff member authorized to manage vehicle listings and view all orders.
_Avoid_: Regular user

**Vehicle listing**:
A grouped offer for a make, model, model year, and new or used condition. A listing contains one or more purchasable vehicle options.
_Avoid_: Physical car, VIN record

**Vehicle option**:
A specific choice within a vehicle listing with its own price and availability. A new-car option may represent multiple identical units; a used-car option represents one physical car.
_Avoid_: Vehicle listing, variant

**Stock**:
The number of units currently available for purchase from a vehicle option.
_Avoid_: Inventory count

**Order**:
A record of a customer's purchase of one unit from a vehicle option, retaining the price and option details at purchase.
_Avoid_: Payment, transaction

**Placed order**:
An accepted order awaiting vehicle handover.

**Completed order**:
An order whose vehicle handover has been recorded.

**Cancelled order**:
An order ended before vehicle handover.
