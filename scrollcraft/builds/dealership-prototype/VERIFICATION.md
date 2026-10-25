# Verification of the first review prototype

Status: V1 frontend design explicitly approved and locked by the owner on 2026-10-25. This is an approved design reference, not production-ready integration. Verified using installed headless Google Chrome. Native pointer lock and pointer capture were disabled in every automated browser context. Historical review-pending statements below refer to earlier iterations and are superseded by the final approval recorded here.

## Gallery revision after owner feedback

### Scroll-driven purchase journey

Added the owner-requested five-stage journey beneath B's gallery collection, followed by the existing search close. The owner chose handover with delivery availability confirmed directly by the dealership. The narrative introduces no new order statuses or guaranteed delivery service. A separate `PurchaseJourney` component owns its scroll observation, requestAnimationFrame scheduling and cleanup; the shared Scrollcraft engine remains unchanged. All narrative text is in a semantic ordered list, and the changing visual is decorative.

`node scripts/review-journey.mjs` passed all five stages at 1440×1000, 390×844, 360×640, and 390×844 with reduced motion. It checked the active stage and moving marker, sticky-panel bounds and mobile heading visibility, stage-button keyboard navigation, inventory action, loaded photography, and absence of horizontal overflow/runtime errors. Four targeted axe WCAG 2/2.1 A/AA scans reported zero findings. Reduced motion uses a nonsticky visual, no decorative photo transform, and shorter content spans. Actual desktop and phone intermediate/final-stage screenshots were inspected. The initial scan caught a dark-gallery eyebrow color inherited onto the new light section; this was fixed and the successful rerun supersedes the retained timestamped failure. The production build passed after the correction. Evidence: `lab/journey-revision/report.json` and stage screenshots. Existing purchase/admin workflows were not changed or rerun for this isolated explanatory section. Physical phone testing remains outstanding.

### Left-to-right gallery reveal

The owner preferred B and requested A's left-to-right photo reveal. B is now the default. Its collection images reuse Scrollcraft's `data-sc-reveal="left"`, matching the existing A photo wipe and B hero reveal. The shared card accepts this as an opt-in, keeping the change confined to B's gallery collection.

`npm.cmd run build` passed after this revision. `node scripts/review-gallery.mjs` verified intermediate and complete reveal states at 1440×1000 and 390×844, with the clipped right edge decreasing to zero as scrolling advances. At 360×640 with reduced motion, all photos remained fully visible with no clipping. Vehicle-photo navigation passed in each case, with no overflow or browser runtime errors. Desktop midpoint and phone completed-state screenshots were visually inspected. Evidence: `lab/gallery-revision/report.json` and its screenshot series. The wider workflow checks below predate this small animation revision; they were not rerun because order/admin behavior did not change.

## Final results

- `npm.cmd run build`: passes with React 19.3.1, Vite 8.3.5 and Tailwind 4.3.3. The production package was served at its root on port 4501; scripts, local images, navigation and listing detail loaded. Development-only prototype controls were absent.
- `npm.cmd run verify`: **19 checks passed**, no browser runtime errors. All three directions were captured at 1440×1000 desktop, 390×844 phone, and 360×640 phone with reduced motion. No page-level horizontal overflow. Ten automated axe WCAG 2/2.1 A/AA audits (nine variant/viewport combinations plus admin) reported **zero violations**. This is not a claim of full accessibility certification.
- `node scripts/review-extras.mjs`: **four additional checks passed**, no failed resource responses or runtime errors in those runs. Phone menu, search, selected-option detail, demo sign-in, purchase, native dialog Escape dismissal and admin tables were exercised. The phone admin accessibility audit had zero findings. Production-package resource loading and detail navigation also passed.
- Flow checks cover sold-out options, returning to a selected option after sign-in, double-click purchase producing one order, exact stock setting, listing editing, atomic creation of a listing with its first option, order snapshot retention, and cancellation restoring stock to inactive inventory without reactivation. Email/password demo login and neutral forgot-password responses passed.
- Scrollcraft's own `shoot.mjs` sampled 11 desktop, 13 phone and 14 reduced-motion scroll states of direction A. Its final phone and reduced-motion runs reported no dead scroll and no console errors. The desktop run reported no dead scroll, with a missing favicon subsequently fixed and resource loading verified in the extra checks. There are no scrub videos or pinned acts in this task-oriented prototype. The harness had no cue-text contrast samples; solid-ground text contrast was checked by axe instead.
- Manually inspected actual A/B/C desktop screenshots, A phone detail and order dialog, and the phone and reduced-motion scroll contact sheets. Essential copy and controls remained visible. The three directions have distinct openings and information hierarchy.
- Scrollcraft engine JS and CSS were copied without project modifications. Mount cleanup calls `destroy()`; the lifecycle check confirmed exactly one live Scrollcraft instance after repeated variant switches under React Strict Mode.
- Dependency installation reported zero vulnerabilities at the time of installation.

## Evidence

- `lab/review/report.json`: final successful 19-check report and axe findings.
- `lab/review/`: final full-page variant screenshots, intermediate section samples, customer order, account, and admin screens.
- `lab/extras/report.json` and screenshots: phone flow and production checks.
- `lab/scroll-desktop/`, `lab/scroll-phone/`, `lab/scroll-reduced/`: Scrollcraft reports, intermediate viewport frames and manually generated contact sheets.
- `lab/directions.png`: compact comparison of the three review directions.

Earlier failed evidence is retained separately in `lab/review/initial-failure.json`, `failure.json`, and timestamped failure files. They were superseded by the final successful report: the initial screenshot harness waited on lazy images before scrolling, a form label included its help text in the accessible name, a hero label narrowly missed contrast, an older check retained a renamed model string, and a run was interrupted by development-server hot reload while source was being finalized. These issues were corrected before the final pass.

## Design review and limits

Intended curve: welcome, possibility, clarity, confidence, reassurance. Pixel review found the layout readable and the final ordering explanation complete. The initial hero vehicle image did not match its label and was replaced; the collection's sample model labels were corrected to match the representative image families. A joined mobile heading was fixed. The option-selection panel provides the proposed confidence peak through synchronized facts and pricing; stock photos are shared by multiple mock options, so exact color-specific imagery is still pending. Only the owner can validate whether the intended emotional response succeeds.

No real phone/iOS decoder, touch hardware, assistive-technology session, live backend, cross-tab refresh, real email, or multi-process concurrency was tested. Password reset previews UI states rather than delivering mail or consuming real reset tokens. Error scenarios are mock presentations. Prices/stock are fictional, and all data resets on reload. True per-vehicle photos, dealership identity/contact details, backend integration and production validation remain later work.

The preflight found no ffmpeg, preventing its built-in video encoding/contact-sheet step. This project uses no video; contact sheets were composed from the captured PNGs with Pillow instead. No provider key or paid asset generation was configured. Desktop/phone verification here is evidence of this prototype, not a production delivery guarantee.

The owner explicitly approved and locked the revised working design after reviewing the B gallery, photographic reveal and scroll-driven purchase journey. The approved source and selected evidence are captured on the linked throwaway artifact branch; the final GitHub resolution records the implementation acceptance criteria and deferred production work.
