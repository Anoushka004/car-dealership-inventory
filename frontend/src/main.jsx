import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  Search,
  SlidersHorizontal,
  X,
  Check,
  CarFront,
  ChevronRight,
  ChevronLeft,
  Plus,
  LogOut,
  LayoutGrid,
  List,
  Package,
  ShieldCheck,
  Menu,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  UserRound,
  MoveUpRight,
} from "lucide-react";
import {
  initialStore,
  emptyFilters,
  categories,
  money,
  title,
  available,
  matching,
  snapshot,
} from "./data";
import "./scrollcraft.css";
import "./style.css";
import "./journey.css";

// Three throwaway dealership directions on /?variant=A|B|C. All mutations are in memory.
const variantNames = {
  A: "Search-first showroom",
  B: "Vehicle gallery",
  C: "Find your fit",
};
const customer = {
  id: "10000000-0000-4000-8000-000000000001",
  email: "customer@demo.test",
  role: "customer",
};
const administrator = {
  id: "10000000-0000-4000-8000-000000000002",
  email: "admin@demo.test",
  role: "admin",
};
const initialVariant = () =>
  ["A", "B", "C"].includes(new URLSearchParams(location.search).get("variant"))
    ? new URLSearchParams(location.search).get("variant")
    : "B";
function useRoute() {
  const [r, set] = useState(location.hash.slice(1) || "home");
  useEffect(() => {
    const fn = () => set(location.hash.slice(1) || "home");
    addEventListener("hashchange", fn);
    return () => removeEventListener("hashchange", fn);
  }, []);
  return r;
}
function go(route) {
  location.hash = route;
  window.scrollTo({ top: 0, behavior: "instant" });
}
function Button({ children, secondary = false, className = "", ...props }) {
  return (
    <button
      className={`${secondary ? "button-secondary" : "button"} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
function Field({ label, children, hint }) {
  const id = React.useId();
  return (
    <label className="field">
      <span>{label}</span>
      {React.cloneElement(children, {
        "aria-label": label,
        "aria-describedby": hint ? id : undefined,
      })}
      {hint && <small id={id}>{hint}</small>}
    </label>
  );
}
function Select({ label, value, onChange, items, all = "Any", ...rest }) {
  return (
    <Field label={label}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...rest}
      >
        <option value="">{all}</option>
        {items.map((x) => (
          <option key={x} value={x}>
            {title(x)}
          </option>
        ))}
      </select>
    </Field>
  );
}
function Modal({ title: heading, children, onClose }) {
  const ref = useRef();
  useEffect(() => {
    const d = ref.current;
    d.showModal();
    const fn = (e) => {
      e.preventDefault();
      onClose();
    };
    d.addEventListener("cancel", fn);
    return () => {
      d.removeEventListener("cancel", fn);
      d.close();
    };
  }, []);
  return (
    <dialog ref={ref} aria-label={heading}>
      <div className="dialog-heading">
        <h2>{heading}</h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
const PrototypeContext = React.createContext(null);
function App() {
  const [variant, setVariant] = useState(initialVariant),
    [store, setStore] = useState(initialStore),
    [account, setAccount] = useState(null),
    [filters, setFilters] = useState({ ...emptyFilters }),
    [menu, setMenu] = useState(false),
    [modal, setModal] = useState(null),
    [notice, setNotice] = useState(null),
    [selected, setSelected] = useState({}),
    [scenario, setScenario] = useState("normal"),
    [inspect, setInspect] = useState(false),
    [authMode, setAuthMode] = useState("login"),
    [pending, setPending] = useState(null),
    [busy, setBusy] = useState(false),
    [orderStatus, setOrderStatus] = useState(""),
    [page, setPage] = useState(1);
  const route = useRoute(),
    mainRef = useRef(),
    pendingKey = useRef(null),
    successfulKeys = useRef(new Map()),
    locked = useRef(false);
  const routeParts = route.split("/"),
    screen = routeParts[0],
    listing = store.listings.find((l) => l.id === routeParts[1]),
    results = matching(store.listings, filters),
    isAdmin = account?.role === "admin";
  const filterError =
    (filters.price_min &&
      filters.price_max &&
      +filters.price_min > +filters.price_max) ||
    (filters.year_min &&
      filters.year_max &&
      +filters.year_min > +filters.year_max);
  const updateFilter = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };
  const switchVariant = (n) => {
    setVariant(n);
    const url = new URL(location.href);
    url.searchParams.set("variant", n);
    history.replaceState({}, "", url);
  };
  useEffect(() => {
    const fn = () => setVariant(initialVariant());
    addEventListener("popstate", fn);
    return () => removeEventListener("popstate", fn);
  }, []);
  useEffect(() => {
    const fn = (e) => {
      const el = e.target;
      if (
        el.closest("input,textarea,select,[contenteditable],dialog") ||
        e.altKey ||
        e.ctrlKey ||
        e.metaKey
      )
        return;
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        const keys = Object.keys(variantNames);
        switchVariant(
          keys[(keys.indexOf(variant) + (e.key === "ArrowRight" ? 1 : 2)) % 3],
        );
      }
    };
    addEventListener("keydown", fn);
    return () => removeEventListener("keydown", fn);
  }, [variant]);
  useEffect(() => {
    setMenu(false);
    setNotice(null);
    if (mainRef.current) {
      mainRef.current.focus({ preventScroll: true });
    }
  }, [route]);
  useEffect(() => {
    let instance;
    let dead = false;
    const mount = () => {
      if (dead) return;
      if (window.ScrollCraft && mainRef.current) {
        instance = window.ScrollCraft.mount(mainRef.current);
        window.__prototypeScrollInstance = instance;
      } else timer = setTimeout(mount, 50);
    };
    let timer = setTimeout(mount, 0);
    return () => {
      dead = true;
      clearTimeout(timer);
      instance?.destroy();
      if (window.__prototypeScrollInstance === instance)
        window.__prototypeScrollInstance = null;
    };
  }, [route, variant]);
  const openListing = (l) => {
    const ids = matching([l], filters)[0]?.matching_option_ids;
    setSelected((s) => ({
      ...s,
      [l.id]:
        ids?.[0] ||
        l.options.find((o) => available(l, o))?.id ||
        l.options.find((o) => o.active)?.id,
    }));
    go(`vehicle/${l.id}`);
  };
  const fail = (text) => {
    setNotice({ error: true, text });
    return false;
  };
  const simulate = (kind) => {
    if (scenario === "rate") {
      fail("Too many requests. Please wait 10 seconds before trying again.");
      setScenario("normal");
      return true;
    }
    if (scenario === "network") {
      fail(
        "We could not confirm the request. Retry with the same request key to avoid a duplicate order.",
      );
      setScenario("normal");
      return true;
    }
    if (scenario === "version" && kind === "admin") {
      fail(
        "This record changed while you were editing. Your values are retained. Reload the latest record, review your changes, and save again.",
      );
      setScenario("normal");
      return true;
    }
    return false;
  };
  function login(a) {
    setAccount(a);
    setNotice({
      text: `Signed in as ${a.role}. This is a local demo session.`,
    });
    if (pending) {
      go(`vehicle/${pending.listing}`);
      setSelected((s) => ({ ...s, [pending.listing]: pending.option }));
      setPending(null);
    } else go(a.role === "admin" ? "admin" : "inventory");
  }
  function beginOrder(l, o) {
    if (!account) {
      setPending({ listing: l.id, option: o.id });
      setAuthMode("login");
      go("account");
      return;
    }
    if (isAdmin) {
      fail(
        "Admins manage inventory and orders. Sign in as a customer to place an order.",
      );
      return;
    }
    pendingKey.current = { key: crypto.randomUUID(), option: o.id };
    setModal({ type: "purchase", listing: l.id, option: o.id });
  }
  async function purchase() {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    try {
      await new Promise((r) => setTimeout(r, 250));
      const { key, option } = pendingKey.current;
      const replay = successfulKeys.current.get(key);
      if (replay) {
        setModal(null);
        go("orders");
        return;
      }
      if (simulate("purchase")) return;
      const l = store.listings.find((l) => l.id === modal.listing),
        o = l?.options.find((o) => o.id === option);
      if (!l?.active || !o?.active) {
        fail(
          "This vehicle option is no longer available. Please choose another.",
        );
        setModal(null);
        return;
      }
      if (scenario === "stock" || !available(l, o)) {
        setStore((s) => ({
          ...s,
          listings: s.listings.map((x) =>
            x.id === l.id
              ? {
                  ...x,
                  options: x.options.map((y) =>
                    y.id === o.id
                      ? { ...y, stock: 0, version: y.version + 1 }
                      : y,
                  ),
                }
              : x,
          ),
        }));
        setScenario("normal");
        setModal(null);
        fail(
          "This option just sold out. No order was placed. Choose another available option.",
        );
        return;
      }
      const order = {
        id: crypto.randomUUID(),
        vehicle_listing_id: l.id,
        vehicle_option_id: o.id,
        status: "placed",
        price: o.price,
        currency: "INR",
        vehicle_snapshot: snapshot(l, o),
        created_at: new Date().toISOString(),
        completed_at: null,
        cancelled_at: null,
        customer_id: account.id,
        customer_email: account.email,
      };
      successfulKeys.current.set(key, order.id);
      setStore((s) => ({
        ...s,
        listings: s.listings.map((x) =>
          x.id === l.id
            ? {
                ...x,
                options: x.options.map((y) =>
                  y.id === o.id
                    ? { ...y, stock: y.stock - 1, version: y.version + 1 }
                    : y,
                ),
              }
            : x,
        ),
        orders: [order, ...s.orders],
      }));
      setModal(null);
      go("orders");
      setNotice({
        text: "Order placed. One vehicle unit is assigned to your order. No payment was taken.",
      });
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  function transition(orderId, status) {
    if (simulate("admin")) return;
    const order = store.orders.find((o) => o.id === orderId);
    if (!order || order.status !== "placed") {
      setModal(null);
      fail("This order has already changed. Its final status is shown below.");
      return;
    }
    setStore((s) => ({
      ...s,
      orders: s.orders.map((o) =>
        o.id === orderId
          ? { ...o, status, [`${status}_at`]: new Date().toISOString() }
          : o,
      ),
      listings:
        status === "cancelled"
          ? s.listings.map((l) =>
              l.id === order.vehicle_listing_id
                ? {
                    ...l,
                    options: l.options.map((o) =>
                      o.id === order.vehicle_option_id
                        ? { ...o, stock: o.stock + 1, version: o.version + 1 }
                        : o,
                    ),
                  }
                : l,
            )
          : s.listings,
    }));
    setModal(null);
    setNotice({
      text:
        status === "completed"
          ? "Handover recorded. This order is completed."
          : "Order cancelled. One unit has been returned to its original option.",
    });
  }
  const selectedOption =
    listing?.options.find((o) => o.id === selected[listing.id]) ||
    listing?.options.find((o) => o.active);
  const publicPhoto = (l, o) => o?.photo_urls?.[0] || l.photo_urls[0];

  const accounts = useRef([
    { ...customer, demoPassword: "dealership123" },
    { ...administrator, demoPassword: "dealership123" },
  ]);

  return (
    <PrototypeContext.Provider
      value={{
        store,
        setStore,
        account,
        setAccount,
        filters,
        setFilters,
        updateFilter,
        page,
        setPage,
        filterError,
        variant,
        switchVariant,
        openListing,
        results,
        listing,
        selectedOption,
        selected,
        setSelected,
        isAdmin,
        beginOrder,
        publicPhoto,
        modal,
        setModal,
        notice,
        setNotice,
        simulate,
        setAuthMode,
        authMode,
        login,
        accounts,
        orderStatus,
        setOrderStatus,
        scenario,
        setScenario,
      }}
    >
      <div className={`app variant-${variant}`}>
        <a
          href="#main-content"
          className="skip-link"
          onClick={(e) => {
            e.preventDefault();
            mainRef.current?.focus();
          }}
        >
          Skip to content
        </a>
        <div className="prototype-notice">
          <span>DESIGN PROTOTYPE</span>
          <p>
            Sample inventory & photography. Actions stay in this browser tab.
          </p>
        </div>
        <header className="site-header">
          <button
            className="wordmark"
            onClick={() => go("home")}
            aria-label="Dealership home"
          >
            <span className="brand-symbol">
              <CarFront size={22} strokeWidth={1.5} />
            </span>
            dealership<span className="wordmark-dot">.</span>
          </button>
          <nav aria-label="Main navigation" className={menu ? "open" : ""}>
            <button
              className={screen === "inventory" ? "nav-active" : ""}
              onClick={() => go("inventory")}
            >
              Explore inventory
            </button>
            <button
              onClick={() => {
                switchVariant("C");
                go("inventory");
              }}
            >
              Find your fit
            </button>
            {account?.role === "customer" && (
              <button onClick={() => go("orders")}>My orders</button>
            )}
            {isAdmin && (
              <>
                <button onClick={() => go("admin")}>Manage inventory</button>
                <button onClick={() => go("admin-orders")}>All orders</button>
              </>
            )}
          </nav>
          <div className="header-actions">
            {account ? (
              <>
                <button
                  className="account-link"
                  onClick={() => go(isAdmin ? "admin" : "orders")}
                >
                  <UserRound size={18} />
                  <span>{title(account.role)}</span>
                </button>
                <button
                  className="icon-button"
                  aria-label="Sign out"
                  onClick={() => {
                    setAccount(null);
                    go("home");
                  }}
                >
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <button
                className="account-link"
                onClick={() => {
                  setAuthMode("login");
                  go("account");
                }}
              >
                <UserRound size={18} />
                <span>Sign in</span>
              </button>
            )}
            <button
              className="icon-button mobile-menu"
              aria-label="Toggle navigation"
              aria-expanded={menu}
              onClick={() => setMenu((m) => !m)}
            >
              <Menu size={22} />
            </button>
          </div>
        </header>
        {notice && (
          <div
            className={`notice ${notice.error ? "notice-error" : ""}`}
            role={notice.error ? "alert" : "status"}
          >
            <AlertCircle size={19} />
            <p>{notice.text}</p>
            <button
              className="icon-button"
              aria-label="Dismiss message"
              onClick={() => setNotice(null)}
            >
              <X size={18} />
            </button>
          </div>
        )}
        <main
          id="main-content"
          tabIndex="-1"
          ref={mainRef}
          key={`${variant}-${route}`}
        >
          {screen === "home" &&
            (variant === "A" ? (
              <HomeA />
            ) : variant === "B" ? (
              <HomeB />
            ) : (
              <div className="inventory-layout guided-layout">
                <aside>
                  <Filters guided />
                </aside>
                <Results guided />
              </div>
            ))}
          {screen === "inventory" && (
            <div
              className={`inventory-layout ${variant === "C" ? "guided-layout" : ""}`}
            >
              <aside>
                <Filters guided={variant === "C"} />
              </aside>
              <Results guided={variant === "C"} />
            </div>
          )}
          {screen === "vehicle" && <Detail />}
          {screen === "account" && <Account key={authMode} />}{" "}
          {screen === "orders" && <Orders />}
          {screen === "admin-orders" && <Orders admin />}
          {screen === "admin" && <Admin />}
          {![
            "home",
            "inventory",
            "vehicle",
            "account",
            "orders",
            "admin",
            "admin-orders",
          ].includes(screen) && (
            <Empty
              title="Page not found"
              text="Return to the showroom to continue."
              action={() => go("home")}
              label="Go home"
            />
          )}
        </main>
        <footer className="site-footer">
          <div>
            <span className="footer-brand">dealership.</span>
            <p>A good place for your next chapter.</p>
          </div>
          <div>
            <button onClick={() => go("inventory")}>
              Explore inventory <ArrowUpRight size={15} />
            </button>
            <button
              onClick={() =>
                go(account?.role === "admin" ? "admin-orders" : "orders")
              }
            >
              Your orders <ArrowUpRight size={15} />
            </button>
          </div>
          <small>
            Temporary brand · Representative images · INR prices exclude taxes
            and fees
          </small>
        </footer>
        {modal?.type === "purchase" && (
          <Modal
            title="Place your order?"
            onClose={() => {
              if (!busy) setModal(null);
            }}
          >
            <p>
              {listing?.make} {listing?.model} · {selectedOption?.trim} ·{" "}
              {selectedOption?.color}
            </p>
            <strong className="dialog-price">
              {money(selectedOption?.price)}
            </strong>
            <p>
              One vehicle unit. The current price and option details are
              recorded when the order is placed. Taxes and fees are excluded. No
              online payment is collected.
            </p>
            <p>You can cancel before vehicle handover.</p>
            <div className="dialog-actions">
              <Button secondary disabled={busy} onClick={() => setModal(null)}>
                Keep browsing
              </Button>
              <Button disabled={busy} onClick={purchase}>
                {busy ? "Placing order…" : "Confirm order"}
              </Button>
            </div>
          </Modal>
        )}
        {modal?.type === "transition" && (
          <Modal
            title={
              modal.status === "completed"
                ? "Record vehicle handover?"
                : "Cancel this order?"
            }
            onClose={() => setModal(null)}
          >
            <p>
              {modal.status === "completed"
                ? "Confirm the vehicle has been handed over. This completes the order permanently."
                : "This cancels the placed order and returns one unit to its original option. Cancellation is final."}
            </p>
            <div className="dialog-actions">
              <Button secondary onClick={() => setModal(null)}>
                Keep unchanged
              </Button>
              <Button onClick={() => transition(modal.order, modal.status)}>
                {modal.status === "completed"
                  ? "Confirm handover"
                  : "Confirm cancellation"}
              </Button>
            </div>
          </Modal>
        )}
        {["listing-editor", "option-editor"].includes(modal?.type) && (
          <AdminEditor />
        )}
        {["stock", "deactivate"].includes(modal?.type) && <SmallMutation />}
        {import.meta.env.DEV && (
          <>
            <div className="prototype-switcher" aria-label="Prototype controls">
              <button
                className="icon-button"
                aria-label="Previous design"
                onClick={() =>
                  switchVariant(
                    Object.keys(variantNames)[
                      (Object.keys(variantNames).indexOf(variant) + 2) % 3
                    ],
                  )
                }
              >
                <ChevronLeft size={18} />
              </button>
              <label>
                <span>DESIGN DIRECTION</span>
                <select
                  aria-label="Design direction"
                  value={variant}
                  onChange={(e) => switchVariant(e.target.value)}
                >
                  {Object.entries(variantNames).map(([k, v]) => (
                    <option key={k} value={k}>
                      {k} · {v}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="icon-button"
                aria-label="Next design"
                onClick={() =>
                  switchVariant(
                    Object.keys(variantNames)[
                      (Object.keys(variantNames).indexOf(variant) + 1) % 3
                    ],
                  )
                }
              >
                <ChevronRight size={18} />
              </button>
              <span className="switcher-divider" />
              <button
                className="text-button"
                onClick={() => setInspect((x) => !x)}
                aria-expanded={inspect}
              >
                Demo tools
              </button>
            </div>
            {inspect && (
              <aside className="demo-tools" aria-label="Demo tools">
                <div className="dialog-heading">
                  <h2>Prototype state</h2>
                  <button
                    className="icon-button"
                    aria-label="Close demo tools"
                    onClick={() => setInspect(false)}
                  >
                    <X size={18} />
                  </button>
                </div>
                <p>
                  Role: {account?.role || "visitor"} · Screen: {screen}
                  <br />
                  {store.listings.length} listings · {store.orders.length}{" "}
                  orders
                </p>
                <div className="demo-role-buttons">
                  <Button secondary onClick={() => login(customer)}>
                    Customer demo
                  </Button>
                  <Button secondary onClick={() => login(administrator)}>
                    Admin demo
                  </Button>
                </div>
                <Field label="Next request scenario">
                  <select
                    value={scenario}
                    onChange={(e) => setScenario(e.target.value)}
                  >
                    <option value="normal">Normal</option>
                    <option value="stock">Last unit sold (purchase)</option>
                    <option value="version">Record changed (admin save)</option>
                    <option value="rate">Rate limit</option>
                    <option value="network">Network uncertainty</option>
                  </select>
                </Field>
                <details>
                  <summary>Relevant mock state</summary>
                  <pre>
                    {JSON.stringify(
                      {
                        variant,
                        account,
                        filters,
                        selected,
                        orders: store.orders.map((o) => ({
                          id: o.id,
                          status: o.status,
                          price: o.price,
                        })),
                        inventory: store.listings.map((l) => ({
                          id: l.id,
                          active: l.active,
                          version: l.version,
                          options: l.options.map((o) => ({
                            id: o.id,
                            stock: o.stock,
                            version: o.version,
                            active: o.active,
                          })),
                        })),
                      },
                      null,
                      2,
                    )}
                  </pre>
                </details>
                <button
                  className="text-button"
                  onClick={() => {
                    setStore(initialStore());
                    successfulKeys.current.clear();
                    setFilters({ ...emptyFilters });
                    setNotice(null);
                    setScenario("normal");
                    go("home");
                  }}
                >
                  <RotateCcw size={15} />
                  Reset sample inventory
                </button>
              </aside>
            )}
          </>
        )}
      </div>
    </PrototypeContext.Provider>
  );
}
function VehicleCard({ l, wide = false, reveal = false }) {
  const {
    store,
    setStore,
    account,
    setAccount,
    filters,
    setFilters,
    updateFilter,
    page,
    setPage,
    filterError,
    variant,
    switchVariant,
    openListing,
    results,
    listing,
    selectedOption,
    selected,
    setSelected,
    isAdmin,
    beginOrder,
    publicPhoto,
    modal,
    setModal,
    notice,
    setNotice,
    simulate,
    setAuthMode,
    authMode,
    login,
    accounts,
    orderStatus,
    setOrderStatus,
    scenario,
    setScenario,
  } = React.useContext(PrototypeContext);
  return (
    <article className={`vehicle-card ${wide ? "vehicle-card-wide" : ""}`}>
      <button
        className="vehicle-photo"
        onClick={() => openListing(l)}
        aria-label={`View ${l.make} ${l.model} options`}
      >
        <img
          data-sc-reveal={reveal ? "left" : undefined}
          src={publicPhoto(
            l,
            l.options.find((o) => o.id === l.matching_option_ids?.[0]),
          )}
          alt={`${l.make} ${l.model}, representative demo photograph`}
          width="1400"
          height="900"
          loading="lazy"
        />
        <span className="photo-arrow">
          <ArrowUpRight size={21} />
        </span>
      </button>
      <div className="vehicle-copy">
        <div className="vehicle-meta">
          <span>
            {title(l.condition)} · {l.model_year}
          </span>
          <span>{title(l.body_style)}</span>
        </div>
        <h3>
          <button onClick={() => openListing(l)}>
            {l.make} {l.model}
          </button>
        </h3>
        <p className="vehicle-spec">
          {title(
            l.options.find((o) => o.id === l.matching_option_ids?.[0])
              ?.fuel_type || l.options[0].fuel_type,
          )}{" "}
          <span>·</span> {title(l.options[0].transmission)}
        </p>
        <div className="vehicle-bottom">
          <div>
            <small>From</small>
            <strong>
              {money(
                l.lowest_matching_price ||
                  Math.min(...l.options.map((o) => +o.price)),
              )}
            </strong>
          </div>
          <span
            className={`availability ${l.available === false ? "unavailable" : ""}`}
          >
            {l.available === false ? "Sold out" : "Available"}
          </span>
        </div>
      </div>
    </article>
  );
}

function SearchForm({ compact = false }) {
  const {
    store,
    setStore,
    account,
    setAccount,
    filters,
    setFilters,
    updateFilter,
    page,
    setPage,
    filterError,
    variant,
    switchVariant,
    openListing,
    results,
    listing,
    selectedOption,
    selected,
    setSelected,
    isAdmin,
    beginOrder,
    publicPhoto,
    modal,
    setModal,
    notice,
    setNotice,
    simulate,
    setAuthMode,
    authMode,
    login,
    accounts,
    orderStatus,
    setOrderStatus,
    scenario,
    setScenario,
  } = React.useContext(PrototypeContext);
  const [query, setQuery] = useState(filters.q);
  return (
    <form
      className={`search-form ${compact ? "compact-search" : ""}`}
      onSubmit={(e) => {
        e.preventDefault();
        updateFilter("q", query);
        go("inventory");
      }}
    >
      <label className="search-input">
        <Search size={21} />
        <span className="sr-only">Search make, model or trim</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Make, model or trim"
        />
      </label>
      <Button type="submit">
        Search cars <ArrowRight size={18} />
      </Button>
    </form>
  );
}

function Filters({ guided = false }) {
  const {
    store,
    setStore,
    account,
    setAccount,
    filters,
    setFilters,
    updateFilter,
    page,
    setPage,
    filterError,
    variant,
    switchVariant,
    openListing,
    results,
    listing,
    selectedOption,
    selected,
    setSelected,
    isAdmin,
    beginOrder,
    publicPhoto,
    modal,
    setModal,
    notice,
    setNotice,
    simulate,
    setAuthMode,
    authMode,
    login,
    accounts,
    orderStatus,
    setOrderStatus,
    scenario,
    setScenario,
  } = React.useContext(PrototypeContext);
  return (
    <div className={`filters ${guided ? "guided-filters" : ""}`}>
      <div className="filter-head">
        <h2>{guided ? "Your preferences" : "Refine your search"}</h2>
        <button
          className="text-button"
          onClick={() => {
            setFilters({ ...emptyFilters });
            setPage(1);
          }}
        >
          Reset
        </button>
      </div>
      <Field label="Make, model or trim">
        <input
          value={filters.q}
          onChange={(e) => updateFilter("q", e.target.value)}
          placeholder="e.g. BMW or Sport"
        />
      </Field>
      <Select
        label="Condition"
        value={filters.condition}
        onChange={(v) => updateFilter("condition", v)}
        items={categories.condition}
        all="New & used"
      />
      <div className="field-pair">
        <Field label="Min price (₹)">
          <input
            type="number"
            min="0"
            value={filters.price_min}
            onChange={(e) => updateFilter("price_min", e.target.value)}
            placeholder="Any"
          />
        </Field>
        <Field label="Max price (₹)">
          <input
            type="number"
            min="0"
            value={filters.price_max}
            onChange={(e) => updateFilter("price_max", e.target.value)}
            placeholder="Any"
          />
        </Field>
      </div>
      <Select
        label="Body style"
        value={filters.body_style}
        onChange={(v) => updateFilter("body_style", v)}
        items={categories.body_style}
      />
      <Select
        label="Fuel"
        value={filters.fuel_type}
        onChange={(v) => updateFilter("fuel_type", v)}
        items={categories.fuel_type}
      />
      <Select
        label="Transmission"
        value={filters.transmission}
        onChange={(v) => updateFilter("transmission", v)}
        items={categories.transmission}
      />
      <details>
        <summary>Model year</summary>
        <div className="field-pair">
          <Field label="From year">
            <input
              type="number"
              min="1886"
              max="2027"
              value={filters.year_min}
              onChange={(e) => updateFilter("year_min", e.target.value)}
            />
          </Field>
          <Field label="To year">
            <input
              type="number"
              min="1886"
              max="2027"
              value={filters.year_max}
              onChange={(e) => updateFilter("year_max", e.target.value)}
            />
          </Field>
        </div>
      </details>
      <label className="checkbox">
        <input
          type="checkbox"
          checked={filters.include_unavailable}
          onChange={(e) =>
            updateFilter("include_unavailable", e.target.checked)
          }
        />{" "}
        Include sold-out options
      </label>
      {filterError && (
        <p role="alert" className="error-inline">
          Minimum must be no greater than maximum.
        </p>
      )}
    </div>
  );
}

function Results({ guided = false }) {
  const {
    store,
    setStore,
    account,
    setAccount,
    filters,
    setFilters,
    updateFilter,
    page,
    setPage,
    filterError,
    variant,
    switchVariant,
    openListing,
    results,
    listing,
    selectedOption,
    selected,
    setSelected,
    isAdmin,
    beginOrder,
    publicPhoto,
    modal,
    setModal,
    notice,
    setNotice,
    simulate,
    setAuthMode,
    authMode,
    login,
    accounts,
    orderStatus,
    setOrderStatus,
    scenario,
    setScenario,
  } = React.useContext(PrototypeContext);
  const chips = Object.entries(filters).filter(
    ([k, v]) => v && k !== "sort" && k !== "include_unavailable",
  );
  return (
    <div className="results">
      <div className="results-header">
        <div>
          <span className="eyebrow">
            {guided ? "Your next chapter" : "THE COLLECTION"}
          </span>
          <h1>{guided ? "Let’s find your fit." : "Find your next car."}</h1>
          <p>
            {filterError
              ? "Adjust your ranges to see matches."
              : `${results.length} matching vehicle listings`}
          </p>
        </div>
        <label className="sort-label">
          Sort by
          <select
            value={filters.sort}
            onChange={(e) => updateFilter("sort", e.target.value)}
          >
            {[
              "newest",
              "oldest",
              "price_asc",
              "price_desc",
              "year_asc",
              "year_desc",
            ].map((s) => (
              <option key={s} value={s}>
                {{
                  price_asc: "Price: low to high",
                  price_desc: "Price: high to low",
                  year_asc: "Year: oldest first",
                  year_desc: "Year: newest first",
                }[s] || title(s)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {chips.length > 0 && (
        <div className="chips">
          {chips.map(([k, v]) => (
            <button key={k} onClick={() => updateFilter(k, "")}>
              {k === "q" ? v : `${title(k)}: ${title(v)}`}
              <X size={13} />
              <span className="sr-only">Remove filter</span>
            </button>
          ))}
        </div>
      )}
      {guided && (
        <div className="match-explanation">
          <CheckCircle2 size={20} />
          <p>
            {chips.length
              ? `These listings match ${chips.map(([k, v]) => (k === "q" ? `“${v}”` : k.includes("price") ? `${title(k)} ${money(v)}` : title(v))).join(", ")}. All option criteria are met by the same vehicle option.`
              : "Start with what matters to you. Your results update as you choose."}
          </p>
        </div>
      )}
      {filterError || !results.length ? (
        <div className="empty-state">
          <Search size={32} />
          <h2>No matching vehicles</h2>
          <p>Try a wider budget or remove a filter to explore more options.</p>
          <Button secondary onClick={() => setFilters({ ...emptyFilters })}>
            Clear filters
          </Button>
        </div>
      ) : (
        <>
          <div className={guided ? "guided-list" : "vehicle-grid"}>
            {results.slice((page - 1) * 4, page * 4).map((l) => (
              <VehicleCard key={l.id} l={l} wide={guided} />
            ))}
          </div>
          <div className="pagination">
            <span>
              Showing {(page - 1) * 4 + 1}–{Math.min(page * 4, results.length)}{" "}
              of {results.length}
            </span>
            <div>
              <button
                className="icon-button"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                aria-label="Previous page"
              >
                <ChevronLeft size={19} />
              </button>
              <button
                className="icon-button"
                disabled={page * 4 >= results.length}
                onClick={() => setPage((p) => p + 1)}
                aria-label="Next page"
              >
                <ChevronRight size={19} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function HomeA() {
  const {
    store,
    setStore,
    account,
    setAccount,
    filters,
    setFilters,
    updateFilter,
    page,
    setPage,
    filterError,
    variant,
    switchVariant,
    openListing,
    results,
    listing,
    selectedOption,
    selected,
    setSelected,
    isAdmin,
    beginOrder,
    publicPhoto,
    modal,
    setModal,
    notice,
    setNotice,
    simulate,
    setAuthMode,
    authMode,
    login,
    accounts,
    orderStatus,
    setOrderStatus,
    scenario,
    setScenario,
  } = React.useContext(PrototypeContext);
  return (
    <>
      <section className="showroom-hero" data-sc-act="flow">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="little-line" /> A GOOD PLACE TO BEGIN
          </div>
          <h1>
            Your next chapter.
            <br />
            <span>Your next car.</span>
          </h1>
          <p>
            Explore new and used cars.
            <br />
            Find the one that feels right for you.
          </p>
          <SearchForm />
          <div className="hero-links">
            <button
              onClick={() => {
                updateFilter("condition", "new");
                go("inventory");
              }}
            >
              Shop new <ArrowUpRight size={16} />
            </button>
            <button
              onClick={() => {
                updateFilter("condition", "used");
                go("inventory");
              }}
            >
              Shop used <ArrowUpRight size={16} />
            </button>
          </div>
        </div>
        <div className="hero-scene">
          <div className="scene-wall" data-sc-parallax="0.035" />
          <div className="scene-photo" data-sc-parallax="-0.035">
            <img
              src="/images/bmw.jpg"
              width="1400"
              height="900"
              alt="BMW in an architectural setting, representative demo photograph"
              fetchPriority="high"
            />
          </div>
          <div className="scene-sill" data-sc-parallax="-0.065" />
          <div className="hero-object-label">
            <span>IN THE SHOWROOM</span>
            <div>
              <strong>BMW 5 Series</strong>
              <button
                onClick={() => openListing(store.listings[0])}
                className="icon-button"
                aria-label="Explore BMW 5 Series"
              >
                <ArrowUpRight />
              </button>
            </div>
            <p>2025 · New · From {money("4590000")}</p>
          </div>
        </div>
      </section>
      <section className="category-strip container" data-sc-act="flow">
        <p>
          A car for every kind
          <br />
          of everyday.
        </p>
        <div data-sc-in>
          {[
            ["sedan", "Sedans"],
            ["suv", "SUVs"],
            ["coupe", "Coupes"],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => {
                updateFilter("body_style", value);
                go("inventory");
              }}
            >
              <CarFront size={26} strokeWidth={1.25} />
              {label}
              <ArrowUpRight size={16} />
            </button>
          ))}
          <button
            onClick={() => {
              setFilters({ ...emptyFilters });
              go("inventory");
            }}
          >
            <LayoutGrid size={23} strokeWidth={1.25} />
            All vehicles
            <ArrowUpRight size={16} />
          </button>
        </div>
      </section>
      <section className="collection container" data-sc-act="flow">
        <div className="section-heading">
          <div>
            <span className="eyebrow">ROOM FOR POSSIBILITIES</span>
            <h2>Worth a closer look.</h2>
          </div>
          <button className="text-button" onClick={() => go("inventory")}>
            Explore inventory <ArrowUpRight size={18} />
          </button>
        </div>
        <div className="home-grid">
          {matching(store.listings, emptyFilters)
            .slice(0, 3)
            .map((l) => (
              <VehicleCard key={l.id} l={l} />
            ))}
        </div>
      </section>
      <section className="fit-invite container" data-sc-act="flow">
        <div className="fit-photo" data-sc-reveal="left">
          <img
            src="/images/suv.jpg"
            width="1400"
            height="900"
            loading="lazy"
            alt="SUV, representative demo photograph"
          />
        </div>
        <div>
          <span className="eyebrow">START WITH YOU</span>
          <h2>
            Your needs.
            <br />
            Your kind of car.
          </h2>
          <p>
            Budget, body style, or what powers your drive. Start with what
            matters and see the options that fit.
          </p>
          <Button
            onClick={() => {
              switchVariant("C");
              go("inventory");
            }}
          >
            Find your fit <ArrowUpRight size={18} />
          </Button>
        </div>
      </section>
      <section className="how-it-works container" data-sc-act="flow">
        <h2>A clear road ahead.</h2>
        <div className="steps">
          <div>
            <span>Choose</span>
            <p>Explore a listing and select an available vehicle option.</p>
          </div>
          <div>
            <span>Place your order</span>
            <p>Sign in and order one unit. No online payment is collected.</p>
          </div>
          <div>
            <span>Next, handover</span>
            <p>
              Follow your order status. The dealership records completion at
              handover.
            </p>
          </div>
        </div>
        <button className="text-button" onClick={() => go("inventory")}>
          Explore inventory <ArrowRight size={18} />
        </button>
      </section>
    </>
  );
}

function HomeB() {
  const {
    store,
    setStore,
    account,
    setAccount,
    filters,
    setFilters,
    updateFilter,
    page,
    setPage,
    filterError,
    variant,
    switchVariant,
    openListing,
    results,
    listing,
    selectedOption,
    selected,
    setSelected,
    isAdmin,
    beginOrder,
    publicPhoto,
    modal,
    setModal,
    notice,
    setNotice,
    simulate,
    setAuthMode,
    authMode,
    login,
    accounts,
    orderStatus,
    setOrderStatus,
    scenario,
    setScenario,
  } = React.useContext(PrototypeContext);
  const l = matching(store.listings, emptyFilters)[0] || store.listings[0];
  return (
    <div className="gallery-home">
      <section className="gallery-opening" data-sc-act="flow">
        <div className="gallery-index">
          <span>THE SHOWROOM</span>
          <h1>
            {l.make}
            <br />
            {l.model}
          </h1>
          <p>
            {l.model_year} · {title(l.condition)} · {title(l.body_style)}
          </p>
          <strong>
            From {money(l.lowest_matching_price || l.options[0].price)}
          </strong>
          <Button onClick={() => openListing(l)}>
            Explore options <ArrowUpRight size={18} />
          </Button>
        </div>
        <div className="gallery-hero-photo" data-sc-reveal="left">
          <img
            src={l.photo_urls[0]}
            width="1400"
            height="900"
            alt={`${l.make} ${l.model}, representative demo photograph`}
          />
        </div>
      </section>
      <section className="gallery-collection container" data-sc-act="flow">
        <div className="section-heading">
          <h2>The collection.</h2>
          <button className="text-button" onClick={() => go("inventory")}>
            Search inventory <Search size={18} />
          </button>
        </div>
        <div className="gallery-rail">
          {matching(store.listings, emptyFilters).map((x) => (
            <VehicleCard key={x.id} l={x} reveal />
          ))}
        </div>
      </section>
      <PurchaseJourney />
      <section className="gallery-close container">
        <h2>A closer look changes everything.</h2>
        <SearchForm />
      </section>
    </div>
  );
}

const purchaseSteps = [
  {
    key: "explore",
    label: "Explore",
    heading: "Start with possibility.",
    text: "Browse the collection by budget, body style, or what powers your drive. Take a closer look at the cars that feel right.",
    detail: "Your search. Your starting point.",
    caption: "Room for possibilities",
    note: "Explore the collection",
  },
  {
    key: "choose",
    label: "Choose",
    heading: "Get to know your car.",
    text: "Review the photos, specifications, and condition. Select an available vehicle option and see its trim, color, and price together.",
    detail: "One clear view of the option you choose.",
    caption: "The details come together",
    note: "Review your vehicle option",
  },
  {
    key: "order",
    label: "Order",
    heading: "Make your next move.",
    text: "Sign in and place an order for one vehicle. The price and vehicle details are recorded with your order. No payment is collected online.",
    detail: "Your order details stay in your account.",
    caption: "A clear next step",
    note: "Place your order",
  },
  {
    key: "prepare",
    label: "Prepare",
    heading: "We take it from here.",
    text: "The dealership coordinates preparation and the arrangements for handover. Your order remains placed until the vehicle is handed over.",
    detail: "You can cancel a placed order before handover.",
    caption: "Getting ready for the road",
    note: "Coordinate with the dealership",
  },
  {
    key: "handover",
    label: "Handover",
    heading: "Your next chapter begins.",
    text: "Agree on your handover arrangements with the dealership. If you would like the car brought to you, confirm delivery availability and timing directly with the team.",
    detail: "Your order is completed when handover is recorded.",
    caption: "The start of something new",
    note: "Handover, arranged with you",
  },
];

function PurchaseJourney() {
  const root = useRef(null),
    steps = useRef([]),
    [active, setActive] = useState(0);
  useEffect(() => {
    let frame = 0,
      visible = false;
    const update = () => {
      frame = 0;
      if (!visible) return;
      const line =
        innerHeight *
        (matchMedia("(prefers-reduced-motion: reduce)").matches
          ? 0.5
          : innerWidth <= 760
            ? 0.71
            : 0.53);
      let next = 0,
        distance = Infinity;
      steps.current.forEach((step, index) => {
        if (!step) return;
        const rect = step.getBoundingClientRect();
        const d = Math.abs(rect.top + rect.height * 0.5 - line);
        if (d < distance) {
          distance = d;
          next = index;
        }
      });
      setActive((current) => (current === next ? current : next));
    };
    const onScroll = () => {
      if (visible && !frame) frame = requestAnimationFrame(update);
    };
    const observer = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      if (visible) onScroll();
    });
    observer.observe(root.current);
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);
  const current = purchaseSteps[active];
  const focusStep = (index) => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    steps.current[index]?.scrollIntoView({
      block: "center",
      behavior: reduce ? "instant" : "smooth",
    });
  };
  return (
    <section
      className="purchase-journey"
      ref={root}
      aria-labelledby="purchase-journey-heading"
      data-journey-stage={current.key}
      data-sc-act="flow"
      data-sc-verify-state={current.key}
    >
      <div className="container">
        <div className="journey-heading">
          <span className="eyebrow">
            FROM THE FIRST LOOK TO THE FIRST DRIVE
          </span>
          <h2 id="purchase-journey-heading">A clear road to your next car.</h2>
          <p>Every step, a little closer to the driver’s seat.</p>
        </div>
        <div className="journey-layout">
          <div className="journey-visual">
            <div
              className={`journey-scene journey-scene-${current.key}`}
              aria-hidden="true"
            >
              <div className="journey-photo">
                <img
                  src="/images/bmw.jpg"
                  alt=""
                  width="1400"
                  height="933"
                  loading="lazy"
                />
              </div>
              <div className="journey-scene-caption">
                <span>{current.caption}</span>
                <strong>{current.note}</strong>
              </div>
              <div className="journey-route">
                <svg viewBox="0 0 500 145" role="presentation">
                  <path
                    d="M36 80 H464"
                    stroke="#becfc1"
                    strokeWidth="2"
                    fill="none"
                  />
                  <path
                    d="M36 80 H464"
                    stroke="#006b64"
                    strokeWidth="3"
                    fill="none"
                    pathLength="100"
                    strokeDasharray={`${active * 25} 100`}
                  />
                  {[0, 1, 2, 3, 4].map((i) => (
                    <circle
                      key={i}
                      cx={36 + i * 107}
                      cy="80"
                      r={i <= active ? 5 : 3}
                      fill={i <= active ? "#006b64" : "#a6baab"}
                    />
                  ))}
                  <g
                    className="journey-car-marker"
                    style={{ transform: `translateX(${active * 107}px)` }}
                  >
                    <rect
                      x="15"
                      y="62"
                      width="42"
                      height="34"
                      rx="8"
                      fill="#006b64"
                    />
                    <path
                      d="m23 79 3-8h16l4 8v7H23zm2 0h18m-16 8v3m14-3v3"
                      stroke="white"
                      fill="none"
                      strokeWidth="1.5"
                    />
                  </g>
                  <text x="36" y="124" textAnchor="start">
                    THE SHOWROOM
                  </text>
                  <text x="464" y="124" textAnchor="end">
                    YOUR NEXT CHAPTER
                  </text>
                </svg>
              </div>
            </div>
            <nav
              className="journey-stage-nav"
              aria-label="Purchase journey stages"
            >
              {purchaseSteps.map((s, i) => (
                <button
                  key={s.key}
                  onClick={() => focusStep(i)}
                  aria-current={active === i ? "step" : undefined}
                >
                  <span>{i < active ? <Check size={12} /> : i + 1}</span>
                  {s.label}
                </button>
              ))}
            </nav>
          </div>
          <ol className="journey-steps">
            {purchaseSteps.map((s, i) => (
              <li
                key={s.key}
                ref={(el) => (steps.current[i] = el)}
                className={`journey-step ${active === i ? "is-current" : ""}`}
                aria-current={active === i ? "step" : undefined}
              >
                <div className="journey-step-marker" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div>
                  <h3>{s.heading}</h3>
                  <p>{s.text}</p>
                  <span className="journey-detail">
                    <CheckCircle2 size={16} />
                    {s.detail}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="journey-ending">
          <div>
            <h3>It starts with a closer look.</h3>
            <p>Find the vehicle option that feels right for you.</p>
          </div>
          <Button onClick={() => go("inventory")}>
            Explore inventory <ArrowUpRight size={18} />
          </Button>
        </div>
      </div>
    </section>
  );
}

function Detail() {
  const {
    store,
    setStore,
    account,
    setAccount,
    filters,
    setFilters,
    updateFilter,
    page,
    setPage,
    filterError,
    variant,
    switchVariant,
    openListing,
    results,
    listing,
    selectedOption,
    selected,
    setSelected,
    isAdmin,
    beginOrder,
    publicPhoto,
    modal,
    setModal,
    notice,
    setNotice,
    simulate,
    setAuthMode,
    authMode,
    login,
    accounts,
    orderStatus,
    setOrderStatus,
    scenario,
    setScenario,
  } = React.useContext(PrototypeContext);
  if (!listing || !listing.active || !selectedOption)
    return (
      <Empty
        title="Vehicle unavailable"
        text="This listing is no longer available to browse."
        action={() => go("inventory")}
        label="Explore inventory"
      />
    );
  const o = selectedOption;
  return (
    <div className="container detail-page">
      <button className="text-button back-link" onClick={() => go("inventory")}>
        <ArrowLeft size={17} /> Back to results
      </button>
      <div className="detail-title">
        <div>
          <span className="eyebrow">
            {listing.model_year} · {title(listing.condition)}
          </span>
          <h1>
            {listing.make} {listing.model}
          </h1>
          <p>{title(listing.body_style)} · Representative demo photography</p>
        </div>
        <span
          className={`availability ${available(listing, o) ? "" : "unavailable"}`}
        >
          {available(listing, o) ? "Available to order" : "Sold out"}
        </span>
      </div>
      <div className="detail-grid">
        <div>
          <div className="detail-image">
            <img
              key={o.id}
              src={publicPhoto(listing, o)}
              width="1400"
              height="900"
              alt={`${listing.make} ${listing.model}, representative photo; chosen color ${o.color}`}
            />
          </div>
          <p className="photo-note">
            Sample photo. Exact color and specification are shown in the option
            details.
          </p>
          <h2>Made for a closer look.</h2>
          <p>{listing.description}</p>
          <div className="spec-grid">
            {[
              ["Year", listing.model_year],
              ["Condition", title(listing.condition)],
              ["Fuel", title(o.fuel_type)],
              ["Transmission", title(o.transmission)],
              ["Color", o.color],
              ["Trim", o.trim],
            ].map(([k, v]) => (
              <div key={k}>
                <span>{k}</span>
                <strong>{v}</strong>
              </div>
            ))}
          </div>
          {listing.condition === "used" && (
            <section className="used-details">
              <h2>This vehicle’s condition</h2>
              <p>
                {o.mileage_km.toLocaleString("en-IN")} km ·{" "}
                {o.previous_owner_count} previous owner(s)
              </p>
              <p>{o.condition_notes}</p>
              <small>
                The VIN is included in your order details after purchase.
              </small>
            </section>
          )}
          <h2>Features</h2>
          <ul className="features">
            {listing.features.map((x) => (
              <li key={x}>
                <Check size={16} />
                {x}
              </li>
            ))}
          </ul>
        </div>
        <aside className="option-panel">
          <h2>Make it yours.</h2>
          <p>Choose a vehicle option</p>
          <fieldset className="option-list">
            <legend className="sr-only">Vehicle options</legend>
            {listing.options
              .filter((x) => x.active)
              .map((x) => (
                <label
                  key={x.id}
                  className={`option-row ${x.id === o.id ? "chosen" : ""}`}
                >
                  <input
                    type="radio"
                    name="vehicle-option"
                    checked={x.id === o.id}
                    onChange={() =>
                      setSelected((s) => ({ ...s, [listing.id]: x.id }))
                    }
                  />
                  <span>
                    <strong>{x.trim}</strong>
                    <small>
                      {x.color} · {title(x.fuel_type)}
                    </small>
                    <small>
                      {available(listing, x) ? "Available" : "Sold out"}
                    </small>
                  </span>
                  <b>{money(x.price)}</b>
                </label>
              ))}
          </fieldset>
          <div className="purchase-summary" aria-live="polite">
            <span>Selected option</span>
            <strong>{money(o.price)}</strong>
            <small>INR · Taxes and fees excluded</small>
            <p>
              {o.trim} · {o.color}
              <br />
              {title(o.fuel_type)} · {title(o.transmission)}
            </p>
          </div>
          <Button
            className="full-width"
            disabled={!available(listing, o) || isAdmin}
            onClick={() => beginOrder(listing, o)}
          >
            {isAdmin
              ? "Admin account"
              : available(listing, o)
                ? "Place order"
                : "Currently sold out"}
            <ArrowUpRight size={18} />
          </Button>
          <p className="order-note">
            One vehicle per order. No payment collected online. Orders can be
            cancelled before handover.
          </p>
        </aside>
      </div>
    </div>
  );
}

function Empty({ title: heading, text, action, label }) {
  const {
    store,
    setStore,
    account,
    setAccount,
    filters,
    setFilters,
    updateFilter,
    page,
    setPage,
    filterError,
    variant,
    switchVariant,
    openListing,
    results,
    listing,
    selectedOption,
    selected,
    setSelected,
    isAdmin,
    beginOrder,
    publicPhoto,
    modal,
    setModal,
    notice,
    setNotice,
    simulate,
    setAuthMode,
    authMode,
    login,
    accounts,
    orderStatus,
    setOrderStatus,
    scenario,
    setScenario,
  } = React.useContext(PrototypeContext);
  return (
    <div className="empty-state container">
      <Package size={36} />
      <h1>{heading}</h1>
      <p>{text}</p>
      {action && <Button onClick={action}>{label}</Button>}
    </div>
  );
}

function Orders({ admin = false }) {
  const {
    store,
    setStore,
    account,
    setAccount,
    filters,
    setFilters,
    updateFilter,
    page,
    setPage,
    filterError,
    variant,
    switchVariant,
    openListing,
    results,
    listing,
    selectedOption,
    selected,
    setSelected,
    isAdmin,
    beginOrder,
    publicPhoto,
    modal,
    setModal,
    notice,
    setNotice,
    simulate,
    setAuthMode,
    authMode,
    login,
    accounts,
    orderStatus,
    setOrderStatus,
    scenario,
    setScenario,
  } = React.useContext(PrototypeContext);
  if (!account)
    return (
      <Empty
        title="Your cars, your orders."
        text="Sign in to view and manage your orders."
        action={() => {
          setAuthMode("login");
          go("account");
        }}
        label="Sign in"
      />
    );
  if (admin && !isAdmin)
    return (
      <Empty
        title="Admin access required"
        text="This area is available to dealership admins."
      />
    );
  const orders = store.orders.filter(
    (o) =>
      (admin || o.customer_id === account.id) &&
      (!orderStatus || o.status === orderStatus),
  );
  return (
    <div className="container orders-page">
      <div className="section-heading">
        <div>
          <span className="eyebrow">
            {admin ? "DEALERSHIP WORKSPACE" : "YOUR ACCOUNT"}
          </span>
          <h1>{admin ? "All orders" : "Your orders"}</h1>
          <p>
            {admin
              ? "Manage placed orders and record vehicle handover."
              : "Every next step, clearly in view."}
          </p>
        </div>
        <label className="sort-label">
          Status
          <select
            value={orderStatus}
            onChange={(e) => setOrderStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            {["placed", "completed", "cancelled"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      {!orders.length ? (
        <Empty
          title="No orders here yet"
          text="Orders matching this status will appear here."
          action={() => go(admin ? "admin" : "inventory")}
          label={admin ? "Manage inventory" : "Explore inventory"}
        />
      ) : (
        <div className="orders-list">
          {orders.map((o) => (
            <article className="order-card" key={o.id}>
              <img
                src={o.vehicle_snapshot.photo_urls[0]}
                width="300"
                height="200"
                alt={`${o.vehicle_snapshot.make} ${o.vehicle_snapshot.model}, demo photo`}
              />
              <div className="order-facts">
                <div className="order-top">
                  <span className={`status status-${o.status}`}>
                    {title(o.status)}
                  </span>
                  <small>
                    {new Date(o.created_at).toLocaleDateString("en-IN")}
                  </small>
                </div>
                <h2>
                  {o.vehicle_snapshot.make} {o.vehicle_snapshot.model}
                </h2>
                <p>
                  {o.vehicle_snapshot.model_year} · {o.vehicle_snapshot.trim} ·{" "}
                  {o.vehicle_snapshot.color}
                </p>
                <strong>{money(o.price)}</strong>
                <small>Order {o.id.slice(0, 8).toUpperCase()}</small>
                {admin && <p>Customer: {o.customer_email}</p>}
                <details>
                  <summary>Order details</summary>
                  <dl>
                    {Object.entries(o.vehicle_snapshot)
                      .filter(([k]) => k !== "photo_urls")
                      .map(([k, v]) => (
                        <div key={k}>
                          <dt>{title(k)}</dt>
                          <dd>{String(v)}</dd>
                        </div>
                      ))}
                  </dl>
                  <p>
                    Placed: {new Date(o.created_at).toLocaleString("en-IN")}
                  </p>
                  {o.cancelled_at && (
                    <p>
                      Cancelled:{" "}
                      {new Date(o.cancelled_at).toLocaleString("en-IN")}
                    </p>
                  )}
                  {o.completed_at && (
                    <p>
                      Handover:{" "}
                      {new Date(o.completed_at).toLocaleString("en-IN")}
                    </p>
                  )}
                </details>
              </div>
              <div className="order-actions">
                {o.status === "placed" ? (
                  <>
                    {admin && (
                      <Button
                        onClick={() =>
                          setModal({
                            type: "transition",
                            order: o.id,
                            status: "completed",
                          })
                        }
                      >
                        Record handover
                      </Button>
                    )}
                    <Button
                      secondary
                      onClick={() =>
                        setModal({
                          type: "transition",
                          order: o.id,
                          status: "cancelled",
                        })
                      }
                    >
                      Cancel order
                    </Button>
                  </>
                ) : (
                  <p>
                    {o.status === "completed"
                      ? "Handover recorded."
                      : "Cancelled. Stock restored."}
                    <br />
                    This status is final.
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function Account() {
  const {
    store,
    setStore,
    account,
    setAccount,
    filters,
    setFilters,
    updateFilter,
    page,
    setPage,
    filterError,
    variant,
    switchVariant,
    openListing,
    results,
    listing,
    selectedOption,
    selected,
    setSelected,
    isAdmin,
    beginOrder,
    publicPhoto,
    modal,
    setModal,
    notice,
    setNotice,
    simulate,
    setAuthMode,
    authMode,
    login,
    accounts,
    orderStatus,
    setOrderStatus,
    scenario,
    setScenario,
  } = React.useContext(PrototypeContext);
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  const submit = (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (simulate("auth")) return;
    if (authMode === "forgot") {
      setSuccess(
        "If an eligible account exists, password reset instructions will be sent. This demo sends no email.",
      );
      return;
    }
    if (authMode === "reset") {
      setSuccess("Demo password reset complete. Sign in to continue.");
      return;
    }
    if (authMode === "register") {
      if (email !== "tester@demo.test") {
        setError(
          "Registration is limited to approved demo testers. Use tester@demo.test in this prototype.",
        );
        return;
      }
      if (accounts.current.some((a) => a.email === email)) {
        setError("This email is already registered. Please sign in.");
        return;
      }
      accounts.current.push({
        id: crypto.randomUUID(),
        email,
        role: "customer",
        demoPassword: password,
      });
      setSuccess("Account created. Please sign in.");
      return;
    }
    const found = accounts.current.find(
      (a) => a.email === email && a.demoPassword === password,
    );
    if (!found) {
      setError("Email or password is incorrect.");
      return;
    }
    const { demoPassword, ...session } = found;
    login(session);
  };
  return (
    <div className="account-layout container">
      <div className="account-story">
        <span className="eyebrow">A LITTLE CLOSER TO YOUR NEXT CAR</span>
        <h1>
          {authMode === "register"
            ? "Your journey starts here."
            : authMode === "forgot" || authMode === "reset"
              ? "Let’s get you back in."
              : "Welcome back."}
        </h1>
        <p>Keep your choices clear and your orders close.</p>
        <img
          src="/images/hatch.jpg"
          width="800"
          height="600"
          alt="Porsche, representative demo photograph"
        />
      </div>
      <div className="account-form">
        <h2>
          {
            {
              login: "Sign in",
              register: "Create an account",
              forgot: "Reset your password",
              reset: "Choose a new password",
            }[authMode]
          }
        </h2>
        <form onSubmit={submit}>
          {authMode !== "reset" && (
            <Field label="Email address">
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value.trim().toLowerCase())}
              />
            </Field>
          )}
          {authMode !== "forgot" && (
            <Field
              label={authMode === "reset" ? "New password" : "Password"}
              hint={
                authMode === "login"
                  ? "Demo password: dealership123"
                  : "12–128 characters. Spaces are welcome."
              }
            >
              <input
                name="password"
                type="password"
                required
                minLength={12}
                maxLength={128}
                autoComplete={
                  authMode === "login" ? "current-password" : "new-password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
          )}
          {authMode === "login" && (
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setAuthMode("forgot");
                setSuccess("");
                setError("");
              }}
            >
              Forgot password?
            </button>
          )}
          {error && (
            <p role="alert" className="error-inline">
              {error}
            </p>
          )}
          {success && (
            <p role="status" className="success-inline">
              {success}
            </p>
          )}
          <Button type="submit" className="full-width">
            {
              {
                login: "Sign in",
                register: "Create account",
                forgot: "Send reset link",
                reset: "Update password",
              }[authMode]
            }
            <ArrowRight size={17} />
          </Button>
        </form>
        <button
          className="text-button"
          onClick={() => {
            setAuthMode(authMode === "login" ? "register" : "login");
            setError("");
            setSuccess("");
          }}
        >
          {authMode === "login"
            ? "New here? Create an account"
            : "Back to sign in"}
        </button>
        <div className="demo-login">
          <span>EXPLORE THE PROTOTYPE</span>
          <p>Local sample sessions. No credentials or emails are sent.</p>
          <div>
            <Button secondary onClick={() => login(customer)}>
              Try as customer
            </Button>
            <Button secondary onClick={() => login(administrator)}>
              Try as admin
            </Button>
          </div>
          {authMode === "forgot" && (
            <button
              className="text-button"
              onClick={() => {
                setAuthMode("reset");
                setSuccess("");
              }}
            >
              Preview demo reset link
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Admin() {
  const {
    store,
    setStore,
    account,
    setAccount,
    filters,
    setFilters,
    updateFilter,
    page,
    setPage,
    filterError,
    variant,
    switchVariant,
    openListing,
    results,
    listing,
    selectedOption,
    selected,
    setSelected,
    isAdmin,
    beginOrder,
    publicPhoto,
    modal,
    setModal,
    notice,
    setNotice,
    simulate,
    setAuthMode,
    authMode,
    login,
    accounts,
    orderStatus,
    setOrderStatus,
    scenario,
    setScenario,
  } = React.useContext(PrototypeContext);
  const [includeInactive, setIncludeInactive] = useState(false),
    [query, setQuery] = useState("");
  if (!isAdmin)
    return (
      <Empty
        title="Admin access required"
        text="Sign in with an admin account to manage inventory."
        action={() => {
          setAuthMode("login");
          go("account");
        }}
        label="Sign in"
      />
    );
  const inventory = store.listings.filter(
    (l) =>
      (includeInactive || l.active) &&
      `${l.make} ${l.model}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="container admin-page">
      <div className="workspace-tabs">
        <button className="active" onClick={() => go("admin")}>
          <CarFront size={17} />
          Inventory
        </button>
        <button onClick={() => go("admin-orders")}>
          <Package size={17} />
          Orders
        </button>
      </div>
      <div className="section-heading">
        <div>
          <span className="eyebrow">DEALERSHIP WORKSPACE</span>
          <h1>Inventory, in view.</h1>
          <p>{inventory.length} listings · Manage vehicle options and stock.</p>
        </div>
        <Button onClick={() => setModal({ type: "listing-editor" })}>
          <Plus size={18} />
          Add listing
        </Button>
      </div>
      <div className="admin-toolbar">
        <label className="search-input">
          <Search size={18} />
          <span className="sr-only">Search inventory</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search inventory"
          />
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
          />
          Include inactive listings
        </label>
      </div>
      <div className="inventory-list">
        {inventory.map((l) => (
          <article
            key={l.id}
            className={`inventory-row ${l.active ? "" : "inactive-row"}`}
          >
            <div className="inventory-heading">
              <img
                src={l.photo_urls[0] || l.options[0]?.photo_urls[0]}
                width="120"
                height="80"
                alt="Representative vehicle"
              />
              <div>
                <h2>
                  {l.make} {l.model}
                </h2>
                <p>
                  {l.model_year} · {title(l.condition)} · {title(l.body_style)}
                </p>
                <span
                  className={`status ${l.active ? "status-placed" : "status-cancelled"}`}
                >
                  {l.active ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="inventory-actions">
                {l.active && (
                  <>
                    <button
                      className="text-button"
                      onClick={() =>
                        setModal({
                          type: "listing-editor",
                          listing: l.id,
                          version: l.version,
                        })
                      }
                    >
                      Edit listing
                    </button>
                    <button
                      className="text-button"
                      onClick={() =>
                        setModal({
                          type: "deactivate",
                          listing: l.id,
                          version: l.version,
                        })
                      }
                    >
                      Remove listing
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="table-scroll">
              <table>
                <caption className="sr-only">
                  Options for {l.make} {l.model}
                </caption>
                <thead>
                  <tr>
                    <th>Vehicle option</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Status</th>
                    <th>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {l.options.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <strong>{o.trim}</strong>
                        <small>
                          {o.color} · {title(o.fuel_type)}
                        </small>
                      </td>
                      <td>{money(o.price)}</td>
                      <td>{o.stock}</td>
                      <td>{o.active ? "Active" : "Inactive"}</td>
                      <td>
                        {l.active && o.active && (
                          <div className="table-actions">
                            <button
                              className="text-button"
                              onClick={() =>
                                setModal({
                                  type: "stock",
                                  listing: l.id,
                                  option: o.id,
                                  version: o.version,
                                })
                              }
                            >
                              Set stock
                            </button>
                            <button
                              className="text-button"
                              onClick={() =>
                                setModal({
                                  type: "option-editor",
                                  listing: l.id,
                                  option: o.id,
                                  version: o.version,
                                })
                              }
                            >
                              Edit
                            </button>
                            <button
                              className="text-button"
                              onClick={() =>
                                setModal({
                                  type: "deactivate",
                                  listing: l.id,
                                  option: o.id,
                                  version: o.version,
                                })
                              }
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {l.active && (
              <button
                className="text-button add-option"
                onClick={() =>
                  setModal({ type: "option-editor", listing: l.id })
                }
              >
                <Plus size={16} />
                Add vehicle option
              </button>
            )}
          </article>
        ))}
      </div>
      {!inventory.length && (
        <Empty
          title="No listings found"
          text="Try a different search or include inactive inventory."
        />
      )}
    </div>
  );
}

function AdminEditor() {
  const {
    store,
    setStore,
    account,
    setAccount,
    filters,
    setFilters,
    updateFilter,
    page,
    setPage,
    filterError,
    variant,
    switchVariant,
    openListing,
    results,
    listing,
    selectedOption,
    selected,
    setSelected,
    isAdmin,
    beginOrder,
    publicPhoto,
    modal,
    setModal,
    notice,
    setNotice,
    simulate,
    setAuthMode,
    authMode,
    login,
    accounts,
    orderStatus,
    setOrderStatus,
    scenario,
    setScenario,
  } = React.useContext(PrototypeContext);
  const isListing = modal.type === "listing-editor",
    l = store.listings.find((l) => l.id === modal.listing),
    o = l?.options.find((o) => o.id === modal.option),
    [error, setError] = useState(""),
    [version, setVersion] = useState(modal.version);
  const save = (e) => {
    e.preventDefault();
    setError("");
    if (simulate("admin")) {
      setError("The save did not complete. Review the message and retry.");
      return;
    }
    const f = Object.fromEntries(new FormData(e.currentTarget));
    if ((l && !l.active) || (o && !o.active)) {
      setError("Inactive inventory cannot be edited.");
      return;
    }
    const target = isListing ? l : o;
    if (target && target.version !== version) {
      setError("This record changed. Reload the latest record before saving.");
      return;
    }
    const condition = isListing ? l?.condition || f.condition : l.condition;
    const price = f.price;
    if (
      price !== undefined &&
      (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(price) ||
        +price < 0.01 ||
        +price > 999999999.99)
    ) {
      setError(
        "Enter a price from ₹0.01 to ₹999,999,999.99, with at most two decimal places.",
      );
      return;
    }
    if (
      f.stock !== undefined &&
      (!Number.isInteger(+f.stock) ||
        +f.stock < 0 ||
        +f.stock > 2147483647 ||
        (condition === "used" && +f.stock > 1))
    ) {
      setError(
        "Used-option stock must be 0 or 1. New-option stock must be a nonnegative whole number.",
      );
      return;
    }
    const photos = (f.photo_urls || "")
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);
    if (
      photos.some((x) => {
        try {
          return new URL(x).protocol !== "https:";
        } catch {
          return true;
        }
      })
    ) {
      setError("Use one HTTPS photo URL per line.");
      return;
    }
    const optionPhotos = (f.option_photos || "")
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);
    if (
      optionPhotos.some((x) => {
        try {
          return new URL(x).protocol !== "https:";
        } catch {
          return true;
        }
      })
    ) {
      setError("Option photos must use HTTPS URLs.");
      return;
    }
    if (!isListing || !l) {
      if (
        condition === "used" &&
        (!f.vin?.trim() ||
          !f.condition_notes?.trim() ||
          (!optionPhotos.length && !o?.photo_urls.length))
      ) {
        setError(
          "Used options need a VIN, condition notes and their own photo.",
        );
        return;
      }
      if (
        condition === "new" &&
        !optionPhotos.length &&
        !(isListing ? photos.length : l.photo_urls.length)
      ) {
        setError("Add at least one listing or option photo.");
        return;
      }
      const vin = f.vin?.trim().toUpperCase();
      if (condition === "used" && !/^[A-Z0-9]{1,50}$/.test(vin)) {
        setError("VIN must contain 1–50 letters or numbers.");
        return;
      }
      if (
        condition === "used" &&
        store.listings.some((x) =>
          x.options.some((y) => y.id !== o?.id && y.vin === vin),
        )
      ) {
        setError(
          "This VIN is already registered, including in removed inventory.",
        );
        return;
      }
    }
    const now = new Date().toISOString();
    const makeOption = (listingId) => ({
      id: o?.id || crypto.randomUUID(),
      listing_id: listingId,
      trim: f.trim.trim(),
      color: f.color.trim(),
      fuel_type: f.fuel_type,
      transmission: f.transmission,
      price: Number(f.price).toFixed(2),
      stock: o?.stock ?? +f.stock,
      photo_urls: optionPhotos.length
        ? optionPhotos
        : o?.photo_urls.filter((x) => x.startsWith(location.origin)) || [],
      currency: "INR",
      active: true,
      version: (o?.version || 0) + 1,
      created_at: o?.created_at || now,
      updated_at: now,
      ...(condition === "used"
        ? {
            mileage_km: +f.mileage_km,
            previous_owner_count: +f.previous_owner_count,
            condition_notes: f.condition_notes.trim(),
            vin: f.vin.trim().toUpperCase(),
          }
        : {}),
    });
    if (isListing) {
      const listingId = l?.id || crypto.randomUUID();
      const updated = {
        ...l,
        id: listingId,
        make: f.make.trim(),
        model: f.model.trim(),
        model_year: +f.model_year,
        condition,
        body_style: f.body_style,
        description: f.description,
        photo_urls: photos.length
          ? photos
          : l?.photo_urls.filter((x) => x.startsWith(location.origin)) || [],
        features: f.features
          .split("\n")
          .map((x) => x.trim())
          .filter(Boolean),
        active: true,
        version: (l?.version || 0) + 1,
        created_at: l?.created_at || now,
        updated_at: now,
        options: l?.options || [makeOption(listingId)],
      };
      if (
        !updated.photo_urls.length &&
        updated.options.some((x) => x.active && !x.photo_urls.length)
      ) {
        setError(
          "Each active option must have photos when listing photos are empty.",
        );
        return;
      }
      setStore((s) => ({
        ...s,
        listings: l
          ? s.listings.map((x) => (x.id === l.id ? updated : x))
          : [updated, ...s.listings],
      }));
    } else {
      const updated = makeOption(l.id);
      setStore((s) => ({
        ...s,
        listings: s.listings.map((x) =>
          x.id === l.id
            ? {
                ...x,
                options: o
                  ? x.options.map((y) => (y.id === o.id ? updated : y))
                  : [...x.options, updated],
              }
            : x,
        ),
      }));
    }
    setModal(null);
    setNotice({
      text: "Inventory saved. Existing order details keep their original vehicle snapshot.",
    });
  };
  const optionFields = () => (
    <>
      <h3>{isListing ? "First vehicle option" : "Vehicle option details"}</h3>
      <div className="field-pair">
        <Field label="Trim">
          <input
            name="trim"
            required
            maxLength={100}
            defaultValue={o?.trim || "Standard"}
          />
        </Field>
        <Field label="Color">
          <input
            name="color"
            required
            maxLength={100}
            defaultValue={o?.color || ""}
          />
        </Field>
      </div>
      <div className="field-pair">
        <Field label="Fuel">
          <select name="fuel_type" defaultValue={o?.fuel_type || "petrol"}>
            {categories.fuel_type.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </Field>
        <Field label="Transmission">
          <select
            name="transmission"
            defaultValue={o?.transmission || "automatic"}
          >
            {categories.transmission.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </Field>
      </div>
      <div className="field-pair">
        <Field label="Price (INR)">
          <input
            name="price"
            required
            inputMode="decimal"
            defaultValue={o?.price || ""}
          />
        </Field>
        {!o && (
          <Field label="Initial stock">
            <input
              name="stock"
              type="number"
              min="0"
              max="2147483647"
              required
              defaultValue="1"
            />
          </Field>
        )}
      </div>
      <Field
        label="Option photo URLs"
        hint="One HTTPS URL per line. Used vehicles need their own photos."
      >
        <textarea
          name="option_photos"
          defaultValue={
            o?.photo_urls.filter((x) => x.startsWith("https:")).join("\n") || ""
          }
        />
      </Field>
      <details open={l?.condition === "used"}>
        <summary>Used vehicle details (used options only)</summary>
        <p className="small muted">
          Required when condition is used. These fields are omitted for new
          options.
        </p>
        <Field label="VIN">
          <input name="vin" maxLength={50} defaultValue={o?.vin || ""} />
        </Field>
        <div className="field-pair">
          <Field label="Mileage (km)">
            <input
              type="number"
              min="0"
              max="2147483647"
              name="mileage_km"
              defaultValue={o?.mileage_km || 0}
            />
          </Field>
          <Field label="Previous owners">
            <input
              type="number"
              min="0"
              max="2147483647"
              name="previous_owner_count"
              defaultValue={o?.previous_owner_count || 0}
            />
          </Field>
        </div>
        <Field label="Condition notes">
          <textarea
            name="condition_notes"
            maxLength={5000}
            defaultValue={o?.condition_notes || ""}
          />
        </Field>
      </details>
    </>
  );
  return (
    <Modal
      title={
        isListing
          ? l
            ? "Edit vehicle listing"
            : "Add vehicle listing"
          : o
            ? "Edit vehicle option"
            : "Add vehicle option"
      }
      onClose={() => setModal(null)}
    >
      <form className="editor-form" onSubmit={save}>
        {isListing && (
          <>
            <div className="field-pair">
              <Field label="Make">
                <input
                  name="make"
                  required
                  maxLength={100}
                  defaultValue={l?.make}
                />
              </Field>
              <Field label="Model">
                <input
                  name="model"
                  required
                  maxLength={100}
                  defaultValue={l?.model}
                />
              </Field>
            </div>
            <div className="field-pair">
              <Field label="Model year">
                <input
                  type="number"
                  name="model_year"
                  required
                  min="1886"
                  max="2027"
                  defaultValue={l?.model_year || 2026}
                />
              </Field>
              <Field label="Condition">
                <select
                  name="condition"
                  defaultValue={l?.condition || "new"}
                  disabled={!!l}
                >
                  {categories.condition.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Body style">
              <select name="body_style" defaultValue={l?.body_style || "sedan"}>
                {categories.body_style.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>
            <Field label="Description">
              <textarea
                name="description"
                maxLength={5000}
                defaultValue={l?.description || ""}
              />
            </Field>
            <Field label="Features" hint="One feature per line.">
              <textarea
                name="features"
                defaultValue={l?.features.join("\n") || ""}
              />
            </Field>
            <Field
              label="Listing photo URLs"
              hint="One HTTPS URL per line. Demo local photos are retained when editing without replacement."
            >
              <textarea
                name="photo_urls"
                defaultValue={
                  l?.photo_urls
                    .filter((x) => x.startsWith("https:"))
                    .join("\n") || ""
                }
              />
            </Field>
          </>
        )}
        {(!isListing || !l) && optionFields()}
        {error && (
          <p role="alert" className="error-inline">
            {error}
          </p>
        )}
        {(l || o) && (
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setVersion(
                (isListing
                  ? store.listings.find((x) => x.id === l.id)
                  : store.listings
                      .find((x) => x.id === l.id)
                      .options.find((x) => x.id === o.id)
                ).version,
              );
              setError(
                "Latest record loaded. Review the current inventory before saving your retained changes.",
              );
            }}
          >
            <RotateCcw size={15} />
            Reload latest version
          </button>
        )}
        <div className="dialog-actions">
          <Button secondary type="button" onClick={() => setModal(null)}>
            Cancel
          </Button>
          <Button type="submit">Save {isListing ? "listing" : "option"}</Button>
        </div>
      </form>
    </Modal>
  );
}

function SmallMutation() {
  const {
    store,
    setStore,
    account,
    setAccount,
    filters,
    setFilters,
    updateFilter,
    page,
    setPage,
    filterError,
    variant,
    switchVariant,
    openListing,
    results,
    listing,
    selectedOption,
    selected,
    setSelected,
    isAdmin,
    beginOrder,
    publicPhoto,
    modal,
    setModal,
    notice,
    setNotice,
    simulate,
    setAuthMode,
    authMode,
    login,
    accounts,
    orderStatus,
    setOrderStatus,
    scenario,
    setScenario,
  } = React.useContext(PrototypeContext);
  const l = store.listings.find((l) => l.id === modal.listing),
    o = l?.options.find((o) => o.id === modal.option),
    [stock, setStock] = useState(o?.stock || 0),
    [error, setError] = useState("");
  const save = (e) => {
    e.preventDefault();
    if (simulate("admin")) return;
    const current = o || l;
    if (!current?.active || !l.active) {
      setError("This inventory is inactive.");
      return;
    }
    if (current.version !== modal.version) {
      setError(
        "This record changed. Close this dialog, reload the record, and try again.",
      );
      return;
    }
    if (
      modal.type === "stock" &&
      (!Number.isInteger(+stock) ||
        +stock < 0 ||
        +stock > 2147483647 ||
        (l.condition === "used" && +stock > 1))
    ) {
      setError("Enter valid whole-unit stock. Used options allow only 0 or 1.");
      return;
    }
    setStore((s) => ({
      ...s,
      listings: s.listings.map((x) =>
        x.id === l.id
          ? o
            ? {
                ...x,
                options: x.options.map((y) =>
                  y.id === o.id
                    ? {
                        ...y,
                        ...(modal.type === "stock"
                          ? { stock: +stock }
                          : { active: false }),
                        version: y.version + 1,
                      }
                    : y,
                ),
              }
            : { ...x, active: false, version: x.version + 1 }
          : x,
      ),
    }));
    setModal(null);
    setNotice({
      text:
        modal.type === "stock"
          ? "Available stock updated."
          : "Inventory removed from sale. Historical orders are retained.",
    });
  };
  return (
    <Modal
      title={
        modal.type === "stock"
          ? "Set available stock"
          : `Remove ${o ? "vehicle option" : "vehicle listing"}?`
      }
      onClose={() => setModal(null)}
    >
      <form onSubmit={save}>
        <p>
          <strong>
            {l.make} {l.model}
          </strong>
          {o && ` · ${o.trim} · ${o.color}`}
        </p>
        {modal.type === "stock" ? (
          <Field
            label="Available units"
            hint={
              l.condition === "used"
                ? "Used options allow 0 or 1 unit."
                : "Sets total available stock, rather than adding units."
            }
          >
            <input
              type="number"
              min="0"
              max={l.condition === "used" ? 1 : 2147483647}
              required
              value={stock}
              onChange={(e) => setStock(e.target.value)}
            />
          </Field>
        ) : (
          <p>
            This permanently removes{" "}
            {o ? "this option" : "this listing and its options"} from sale for
            this release. Existing orders remain available. Cancelling an order
            restores stock without restoring public availability.
          </p>
        )}
        {error && (
          <p role="alert" className="error-inline">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <Button secondary type="button" onClick={() => setModal(null)}>
            Keep unchanged
          </Button>
          <Button type="submit">
            {modal.type === "stock" ? "Update stock" : "Remove from sale"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
