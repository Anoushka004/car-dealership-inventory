# Frontend experience prototype

Status: V1 frontend design approved and locked by the owner on 2026-10-25. The final approval was: "lock this frontend for v1 and close the frontend ticket if nothing else is left to finish". The canonical final decision record is the resolution comment on Define the first frontend experience in GitHub. Earlier review notes below are retained as design history, superseded by this approval.

Approved direction: B, Vehicle gallery, including left-to-right photographic reveals and the five-stage scroll-driven purchase journey. A and C are retained only as alternative prototype history. This approves the frontend experience and screen/flow design; production implementation and integration follow the backend-first delivery plan.

Review revision: the owner selected B, the vehicle gallery, as the preferred direction and requested A's left-to-right photographic reveal on scroll. B is now the default direction; its hero and collection photos use Scrollcraft's `left` reveal. Image links and factual labels remain operable, and reduced-motion users see complete static photos. This selection is a revision request, not explicit approval of the revised final design.

Further owner-requested revision: add a purchase-process section below the gallery with stages that advance on scroll. The five stages are Explore, Choose, Order, Prepare, and Handover. A sticky photograph, changing caption, and moving car marker accompany the complete readable narrative; stage buttons also support direct/keyboard navigation. The owner explicitly selected "Handover; confirm delivery availability (Recommended)" when asked about the final stage. Copy therefore describes handover and asks customers to confirm delivery availability/timing directly with the dealership. Preparation and handover arrangements are explanatory steps, not new persisted order statuses or delivery-tracking API requirements. Mobile has its own compact sticky composition; reduced-motion mode removes sticky holding and decorative photo transforms and shortens the text sequence. Final revised design approval remains pending.
Creative basis: the owner supplied Delzell Brothers, Cars.com, and AutoNation USA as references, requested recommendations across eight topics, and replied verbatim: "i accept your recommendation". The decisions below are the accepted recommendations, not invented interview quotations.

## Eight agreed topics

1. Identity: trustworthy, clear, welcoming, contemporary, confident. Dealership name remains unselected; use the visibly temporary name "Dealership".
2. Journey: searchable photographic introduction; new/used, body-style and budget shortcuts; available listings; ordering/handover explanation; a clear inventory close. Main flow: search, listing, option, authentication, order, order details.
3. Energy: expressive but short opening; restrained independent depth; calm results, forms and order screens. Recompose the phone hero rather than shrinking desktop.
4. Emotion: welcome, possibility, clarity, confidence, reassurance. The peak is selecting an option and seeing its photo, price, specifications and availability resolve together.
5. Signature: Find your fit. Actual filter criteria update matching sample inventory, with a truthful explanation of the match. Option selection synchronizes photography and purchase summary.
6. Aesthetic: premium-minimal with practical density; warm white #F7F7F4, charcoal #172126, deep teal #006B64. Readable sans serif and consistent photographic framing.
7. Structure: distinct sections and normal navigation. Three structurally different directions: search-first showroom, photography-led gallery, guided selection workspace. Task screens use a compact working layout.
8. Assets: real user assets remain unknown. Temporary text wordmark; permitted sample vehicle photography with attribution; sample inventory explicitly labeled. No invented address, hours, testimonials, warranties, ratings or company history. Representative demo photography is not evidence of a physical used vehicle.

## Feeling curve, before the score

- Welcome: spacious search-first opening gives visitors an immediate way into inventory.
- Possibility: recognizable body styles and vehicle images expose the available range.
- Clarity: a concise match explanation connects selected criteria to actual results.
- Confidence (peak): the largest working detail area connects the selected option, its facts, photos, availability and price. This is an interaction peak, not an artificially long pinned section.
- Reassurance: explicit order status and handover/cancellation information resolve the action.

Peak sentence: "I could see exactly which car option suited me and what ordering it meant."
Tell-someone sentence: "It's the site where I narrow the cars to my needs, then see the exact option and order clearly in one place."
Authored silence: no forced blank scroll or pinned holds. Transactional screens are intentionally steady.

## Grammar and fingerprint plan

A: a search-first catalog adaptation. Search and inventory access take priority over a strict gallery opening, as accepted by the owner. Compact navigation, architectural photographic hero, quick filters, searchable catalog, useful ordering explanation, inventory close.
B: gallery/catalog. The first labeled vehicle is the opening object; object navigation, horizontal collection, factual labels, option-selection close. No text over photographic scrims or kinetic headline claims.
C: live surface. A working filter workspace is the opening; sidebar navigation, live match count and explanatory criteria, actual vehicle selection as the close. No marketing hero or full-bleed background.
These are variants of one decision artifact, not three independent brand builds. The registry was empty at start; there are no historical rows to clear. A/B/C differ in opening, navigation hierarchy, content sequence and ending. Do not claim a 4/6 pass between variants that intentionally share the Find your fit concept.
Other grammars: filmic one-shot and continuous world obstruct direct inventory access; chaptered editorial prioritizes long-form reading; poster removes useful vehicle imagery; split-stage presumes a two-sided argument; rhythmic cutlist adds unnecessary energy to a careful purchase.

## Scroll score and layer contract

| Beat | Device | Purpose |
| --- | --- | --- |
| Welcome | restrained architectural parallax | Separate far backdrop, photographic vehicle frame and near showroom threshold; readable stable copy |
| Possibility | flow entrances | Category links become available immediately; no disappearing interactive controls |
| Clarity | reveal on nonessential media | Frame the selected photo; facts remain visible |
| Confidence | bespoke synchronized selection | Actual filters and option controls change the summary and image together |
| Reassurance | native horizontal rail / normal flow | Keyboard-accessible collection and a complete, steady close |

The task-oriented variants omit decorative devices that would disrupt their work. Four motion families are not imposed on forms or admin tables.
Hero planes: CSS architectural wall (farthest); photographic frame (mid); CSS showroom sill (near). Frames have physical overlap and different restrained rates. The photographic image remains complete inside its frame, with no fake alpha extraction or duplicate subject. Typography remains on a solid ground. On reduced motion all layers hold their complete static composition.

## Scope and contract

React, semantic HTML, CSS and Tailwind. In-memory mock data shaped to the approved API contract. INR prices exclude taxes/fees. Public availability omits exact stock and VIN. Customers order one option unit; no cart/payment. Admins cannot purchase. New/used listings remain separate. Used options have their own required facts and photos. Removed inventory is permanently inactive; cancelling an order restores stock without reactivation. Order snapshots survive edits. The prototype supports demo authentication, approved-tester registration, password-reset states, customer orders, listing/option creation/editing/deactivation/stock updates, admin order completion/cancellation, version conflicts, stock conflicts, retry/idempotency behavior and rate-limit presentations.

Assets and technical limits: local still photographs; no video generation or Kie account. Scrollcraft preflight found Chrome and Node; ffmpeg was missing, which blocks video encoding. This prototype has no video pipeline. Playwright is installed locally for verification. Browser inspection of reference sites was unavailable; reference findings were based on retrieved content, not observed animation.

No production integration, promotion or ticket closure before explicit final design approval. Existing project guidance remains untracked and preserved. Capture only prototype files in a throwaway branch when appropriate; this repository currently has no initial commit or remote, so do not manufacture an unrelated baseline or push project guidance.
