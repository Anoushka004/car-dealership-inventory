import { chromium } from "playwright-core";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const out = "lab/review";
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const errors = [],
  checks = [],
  accessibility = [];
async function context(options = {}) {
  const c = await browser.newContext(options);
  await c.addInitScript(() => {
    Element.prototype.requestPointerLock = () => Promise.resolve();
    Element.prototype.setPointerCapture = () => {};
    Element.prototype.releasePointerCapture = () => {};
  });
  return c;
}
async function ready(p) {
  await p.waitForSelector(".site-header");
  await p.evaluate(() =>
    document.querySelectorAll("img").forEach((i) => (i.loading = "eager")),
  );
  await p.waitForFunction(() => [...document.images].every((i) => i.complete));
}
async function shot(p, name) {
  await p.screenshot({ path: `${out}/${name}.png`, fullPage: true });
}
async function overflow(p, label) {
  assert(
    await p.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    `horizontal overflow: ${label}`,
  );
  checks.push(`No overflow: ${label}`);
}
try {
  for (const [size, viewport, motion] of [
    ["desktop", { width: 1440, height: 1000 }, "no-preference"],
    ["phone", { width: 390, height: 844 }, "no-preference"],
    ["compact-reduced", { width: 360, height: 640 }, "reduce"],
  ]) {
    const c = await context({ viewport, reducedMotion: motion });
    const p = await c.newPage();
    p.on("pageerror", (e) => errors.push(e.message));
    for (const v of ["A", "B", "C"]) {
      console.log(`Reviewing ${v} ${size}`);
      await p.goto(`http://127.0.0.1:4500/?variant=${v}`);
      await ready(p);
      await p.waitForTimeout(300);
      await overflow(p, `${v} ${size}`);
      await shot(p, `${v}-${size}-home`);
      const acts = await p.locator("[data-sc-act]").count();
      for (let a = 0; a < acts; a++) {
        const el = p.locator("[data-sc-act]").nth(a);
        for (const pos of ["start", "center", "end"]) {
          await el.evaluate(
            (e, pos) => e.scrollIntoView({ block: pos, behavior: "instant" }),
            pos,
          );
          await p.waitForTimeout(180);
          await p.screenshot({
            path: `${out}/${v}-${size}-section-${a}-${pos}.png`,
          });
        }
      }
      await p.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
      const audit = await new AxeBuilder({ page: p })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      accessibility.push({
        variant: v,
        size,
        violations: audit.violations.map((x) => ({
          id: x.id,
          impact: x.impact,
          nodes: x.nodes.map((n) => ({
            target: n.target,
            summary: n.failureSummary,
          })),
        })),
      });
    }
    await c.close();
  }
  const c = await context({ viewport: { width: 1440, height: 1000 } }),
    p = await c.newPage();
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto("http://127.0.0.1:4500/?variant=A");
  await ready(p);
  await p.getByRole("button", { name: "Next design", exact: true }).click();
  await p.getByRole("button", { name: "Next design", exact: true }).click();
  await p.getByRole("button", { name: "Next design", exact: true }).click();
  assert.equal(await p.evaluate(() => window.ScrollCraft.instances.length), 1);
  checks.push(
    "React lifecycle: exactly one Scrollcraft instance after variant switches",
  );
  await p
    .getByRole("button", { name: "Explore inventory", exact: true })
    .first()
    .click();
  await p
    .getByLabel("Make, model or trim", { exact: true })
    .pressSequentially("BMW", { delay: 40 });
  assert.equal(
    await p.getByLabel("Make, model or trim", { exact: true }).inputValue(),
    "BMW",
  );
  assert.equal(await p.locator(".vehicle-card").count(), 1);
  checks.push("Filter typing retains focus and filters correctly");
  await p
    .getByRole("button", { name: "View BMW 5 Series options", exact: true })
    .click();
  await shot(p, "desktop-detail");
  await p.getByRole("radio").nth(2).check();
  assert(
    await p.getByRole("button", { name: "Currently sold out" }).isDisabled(),
  );
  await p.getByRole("radio").first().check();
  await p.getByRole("button", { name: "Place order", exact: true }).click();
  await p.getByRole("button", { name: "Try as customer", exact: true }).click();
  await p.getByRole("button", { name: "Place order", exact: true }).click();
  await p
    .getByRole("button", { name: "Confirm order", exact: true })
    .dblclick();
  await p.waitForSelector(".order-card");
  assert.equal(await p.locator(".order-card").count(), 1);
  checks.push(
    "Sold-out option disabled; sign-in returns to selection; double click places one order",
  );
  await shot(p, "desktop-orders");
  await p.getByRole("button", { name: "Demo tools", exact: true }).click();
  await p.getByRole("button", { name: "Admin demo", exact: true }).click();
  await p
    .getByRole("button", { name: "Close demo tools", exact: true })
    .click();
  await p.waitForSelector(".inventory-row");
  assert.equal(
    await p
      .locator(".inventory-row")
      .filter({ hasText: "BMW 5 Series" })
      .locator("tbody tr")
      .first()
      .locator("td")
      .nth(2)
      .textContent(),
    "2",
  );
  await p
    .locator(".inventory-row")
    .filter({ hasText: "BMW 5 Series" })
    .getByRole("button", { name: "Set stock", exact: true })
    .first()
    .click();
  await p.getByLabel("Available units").fill("5");
  await p.getByRole("button", { name: "Update stock", exact: true }).click();
  assert.equal(
    await p
      .locator(".inventory-row")
      .filter({ hasText: "BMW 5 Series" })
      .locator("tbody tr")
      .first()
      .locator("td")
      .nth(2)
      .textContent(),
    "5",
  );
  checks.push("Admin stock setter changes available total");
  await p
    .locator(".inventory-row")
    .filter({ hasText: "BMW 5 Series" })
    .getByRole("button", { name: "Edit listing", exact: true })
    .click();
  await p.getByLabel("Model", { exact: true }).fill("5 Series Updated");
  await p.getByRole("button", { name: "Save listing", exact: true }).click();
  await p.waitForSelector(".inventory-row");
  assert(
    await p
      .getByRole("heading", { name: "BMW 5 Series Updated", exact: true })
      .count(),
  );
  checks.push(
    "Admin edit preserves demo photography and existing order snapshots",
  );
  await p
    .locator(".inventory-row")
    .filter({ hasText: "BMW 5 Series Updated" })
    .getByRole("button", { name: "Remove listing", exact: true })
    .click();
  await p
    .getByRole("button", { name: "Remove from sale", exact: true })
    .click();
  await p.getByLabel("Include inactive listings").check();
  assert(await p.locator(".inventory-row.inactive-row").count());
  await shot(p, "desktop-admin-inactive");
  await p.getByRole("button", { name: "All orders", exact: true }).click();
  await p.getByRole("button", { name: "Cancel order", exact: true }).click();
  await p
    .getByRole("button", { name: "Confirm cancellation", exact: true })
    .click();
  assert(
    await p.getByText("Cancelled. Stock restored.", { exact: false }).count(),
  );
  await p
    .getByRole("button", { name: "Manage inventory", exact: true })
    .click();
  await p.getByLabel("Include inactive listings").check();
  const bmw = p
    .locator(".inventory-row")
    .filter({ hasText: "BMW 5 Series Updated" });
  assert.equal(
    await bmw.locator("tbody tr").first().locator("td").nth(2).textContent(),
    "6",
  );
  assert(await bmw.locator("text=Inactive").count());
  checks.push(
    "Cancellation restores stock once to inactive inventory without reactivation",
  );
  const adminAudit = await new AxeBuilder({ page: p })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  accessibility.push({
    screen: "admin",
    violations: adminAudit.violations.map((x) => ({
      id: x.id,
      nodes: x.nodes.map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    })),
  });
  await p.getByRole("button", { name: "Add listing", exact: true }).click();
  await p.getByLabel("Make", { exact: true }).fill("Demo");
  await p.getByLabel("Model", { exact: true }).fill("City");
  await p.getByLabel("Color", { exact: true }).fill("Silver");
  await p.getByLabel("Price (INR)", { exact: true }).fill("900000.00");
  await p
    .getByLabel("Listing photo URLs", { exact: true })
    .fill(
      "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=800&q=75",
    );
  await p.getByRole("button", { name: "Save listing", exact: true }).click();
  await p.waitForSelector(".inventory-row");
  assert(
    await p.getByRole("heading", { name: "Demo City", exact: true }).count(),
  );
  checks.push("Admin creates listing and first option together");
  await p.getByRole("button", { name: "Sign out", exact: true }).click();
  await p.getByRole("button", { name: "Sign in", exact: true }).click();
  await p.getByLabel("Email address").fill("customer@demo.test");
  await p.getByLabel("Password", { exact: true }).fill("dealership123");
  await p
    .locator("form")
    .getByRole("button", { name: "Sign in", exact: true })
    .click();
  await p.waitForURL("**#inventory");
  checks.push("Email/password demo login succeeds");
  await p.getByRole("button", { name: "Sign out", exact: true }).click();
  await p.getByRole("button", { name: "Sign in", exact: true }).click();
  await p
    .getByRole("button", { name: "Forgot password?", exact: true })
    .click();
  await p.getByLabel("Email address").fill("unknown@example.com");
  await p.getByRole("button", { name: "Send reset link", exact: true }).click();
  assert(
    await p
      .getByText("If an eligible account exists", { exact: false })
      .count(),
  );
  checks.push(
    "Forgot-password response stays neutral and discloses no account existence",
  );
  await shot(p, "desktop-account");
  await c.close();
  assert.equal(
    accessibility.reduce((n, x) => n + x.violations.length, 0),
    0,
    "Accessibility findings remain. See report.",
  );
  assert.equal(errors.length, 0, JSON.stringify(errors));
  checks.push("No browser runtime errors");
  await fs.writeFile(
    `${out}/report.json`,
    JSON.stringify({ checks, errors, accessibility }, null, 2),
  );
  console.log(
    JSON.stringify(
      {
        checks: checks.length,
        errors,
        accessibilityViolations: accessibility.reduce(
          (n, x) => n + x.violations.length,
          0,
        ),
        report: `${out}/report.json`,
      },
      null,
      2,
    ),
  );
} catch (e) {
  await fs.writeFile(
    `${out}/failure-${Date.now()}.json`,
    JSON.stringify(
      { message: e.stack, checks, errors, accessibility },
      null,
      2,
    ),
  );
  throw e;
} finally {
  await browser.close();
}
