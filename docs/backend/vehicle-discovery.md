﻿## Decision

### Listing and option model
- A vehicle listing groups make, model, model year, new/used condition, and body style. New and used cars have separate listings even when their make, model, and year match.
- A vehicle option is the purchasable choice under a listing. Each option has its own fixed INR asking price and stock. Tax and fees are outside the first price model.
- New-car options represent trim/color/fuel/transmission combinations and may have stock greater than one. A used-car option represents one physical car and has stock of one.
- Listing description and feature list are optional. Trim and color live on options; the required core fields are make, model, year, condition, body style, fuel type, transmission, price, stock, and at least one photo.
- Used-car options additionally require mileage, number of previous owners, condition notes, VIN, and at least one photo of that specific car. VIN is visible to admins and to the buyer after purchase; it is not public.
- New-car options may use a representative listing photo.

### Search and display
- Public, case-insensitive text search matches make, model, and trim.
- Filters: model-year range, INR price range, body style, fuel type, transmission, new/used condition, and availability. All active option-level filters must match the same option.
- Search shows listings with an available matching option by default. Visitors can explicitly include sold-out options.
- A grouped result displays "from ₹…" using the lowest price among options matching the active filters. Price sorting uses that same matching price.
- Allow sorting by price, model year, and listing creation date. Default to newest listings first.
- Paginate at 20 listings per page.
- Visitors see availability, not exact stock counts. Admins can see exact option stock.

