# Dealership frontend design prototype

This is the approved V1 design reference, captured as a throwaway, in-memory React/HTML/CSS/Tailwind prototype for [Define the first frontend experience](https://github.com/Anoushka004/car-dealership-inventory/issues/6). The owner explicitly approved and locked the final B direction on 2026-10-25. The ticket's final resolution comment is the canonical frontend decision record. A and C are retained for provenance, not as approved V1 alternatives.

## Run

In PowerShell:

```powershell
Set-Location -LiteralPath 'D:\incubyte project\scrollcraft\builds\dealership-prototype'
npm.cmd install
npm.cmd run dev
```

Open http://127.0.0.1:4500/?variant=A. The server binds only to this computer.

Owner-selected direction: **B, Vehicle gallery**, now the default at http://127.0.0.1:4500/. It includes the requested left-to-right photo reveal on scroll, adapted from A. Explicit variant links still let you compare the alternatives.

Below B's vehicle collection, the purchase journey advances through Explore, Choose, Order, Prepare and Handover as you scroll. The photograph/caption, car marker and active stage stay synchronized. Use stage buttons to jump with a mouse or keyboard. Reduced motion presents a shorter, nonsticky version. Handover copy asks customers to confirm delivery availability and timing with the dealership, as the owner selected. These explanatory stages do not add backend order statuses.

- A: search-first showroom.
- B: photography-led vehicle gallery.
- C: guided Find your fit workspace.

Use the bottom design switcher or Left/Right arrow keys outside form fields. Variants are shareable through `?variant=A`, `B`, or `C`; navigation uses the hash. Reloading resets all inventory, accounts and orders to the initial sample data. The temporary brand is deliberately named "dealership" pending a real name and assets.

## Explore the flows

Browse inventory, use filters, open a listing and select an option. Sold-out options remain visible in detail. Public pages show availability rather than exact stock. Place an order and use **Try as customer** to preview sign-in without entering credentials. Confirm once to create one order; cancel it from My orders to restore stock.

**Try as admin** on the sign-in screen, or **Demo tools → Admin demo**, opens inventory management. Create/edit listings and options, set stock, remove inventory, include inactive listings, and manage all orders. Completion records handover; completed/cancelled orders are final. Removed inventory cannot be manually edited or restored. Customer snapshots retain the original vehicle facts and price.

Demo email/password sign-in: `customer@demo.test` or `admin@demo.test`, password `dealership123`. Registration permits `tester@demo.test` only. These credentials are fictional local data, never sent anywhere. Password reset previews the neutral response and new-password screen; no email is sent and no live reset token is consumed. Demo tools can simulate a sold-out purchase, stale admin record, rate limit, and uncertain network response. These are UI scenarios rather than backend protection tests.

## Verification and build

```powershell
npm.cmd run build
npm.cmd run verify
```

The browser verification script uses the installed Google Chrome, runs headlessly, and disables native pointer lock/capture in every context. Evidence is under ignored `lab/`. `VERIFICATION.md` records the actual results and limits.

`npm.cmd run preview` serves the production build on port 4501. The prototype controls are development-only and are omitted from production output. Production integration is deliberately deferred; the production build is only a packaging check of this design artifact.

The Scrollcraft preflight found no ffmpeg. This build uses still photos and no video generation/encoding. Playwright is installed as a local dev dependency. Use `--configLoader runner` (already included in scripts) to avoid Vite's native-plugin config bundling issue on this Windows environment.

The approved artifact is archived on the repository's `prototype/frontend-v1-approved` branch, outside main, using a separate local checkout. The original workspace's project guidance and planning documents were preserved. The prototype has explicit owner design approval; production implementation, deployment and backend integration remain subsequent work. Selected verification reports and final screenshots are included under `evidence/` in the archived artifact; the full local review history remains under ignored `lab/`.
