# Approved frontend B scaffold

Source copied from approved commit `01c70baef1c5fdba26f7f5efd4260712b3e81161`, preserved as tag `frontend-v1-approved-2026-10-25`. The [canonical frontend resolution](https://github.com/Anoushka004/car-dealership-inventory/issues/6#issuecomment-6396001079) governs the design.

From the repository root with Node 22:

```powershell
npm --prefix frontend ci
npm --prefix frontend run dev
npm --prefix frontend run build
```

Open http://127.0.0.1:4500/?variant=B. B is the default approved direction; inherited A/C comparison controls are prototype history. Gallery, photographic reveals, purchase journey, phone layout, keyboard controls and reduced-motion behavior are retained.

All accounts, inventory and Orders are sample in-memory state. Reload resets them. There is no API integration or email sending. Fictional local login: `customer@demo.test` or `admin@demo.test`, password `dealership123`; sample registration uses `tester@demo.test`.

Backend acceptance precedes real API, React Router and session integration. Replace placeholder identity and used-vehicle photography with verified content for release. See [asset provenance](ASSETS.md) and the [frontend plan](../docs/frontend/v1-plan.md).
