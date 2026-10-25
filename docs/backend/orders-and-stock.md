## Decision

### Purchase and order lifecycle
- A signed-in Customer purchases exactly one unit of one active Vehicle option per Order. There is no cart, reservation, approval step, or online payment in the first release.
- A successful purchase immediately creates a Placed order and decreases that option's available Stock by one. An Admin marks the order Completed after vehicle handover.
- The order retains the option/listing details and INR price as they stood when the purchase was processed. If an Admin changes the asking price between browsing and purchase, the purchase uses the new server-current price without an additional confirmation step.
- The only states are Placed, Completed, and Cancelled. Completed and Cancelled are final; neither can be reopened in the first release.

### Cancellation and stock
- A Customer may cancel their own Placed order. An Admin may cancel any Placed order. Neither may cancel a Completed or already Cancelled order.
- Cancelling a Placed order restores exactly one unit to the original Vehicle option, exactly once. A Completed order remains deducted from available Stock.
- Admins adjust available Stock only, never an existing order. Stock cannot become negative. A used-car option can have only zero or one available unit.
- Removing a listing or option makes it unavailable for new purchases, while existing orders remain accessible. A Placed order for a removed option can still be cancelled; its unit returns to that inactive option's Stock, without making the option purchasable again.

### Concurrent and repeated requests
- A purchase and its stock deduction succeed together or fail together. When customers race for the last unit, exactly one purchase succeeds; the other receives an out-of-stock result, with no order created and no negative Stock.
- A repeated purchase attempt caused by a double click or network retry returns the original order rather than creating a second order. The API contract should define the retry identifier and response details.
- Concurrent cancellation and completion cannot both succeed. The first successful transition determines the final state; the other request is rejected. Stock changes only when cancellation wins.

The API contract ticket should specify endpoint shapes and error codes for these outcomes.

