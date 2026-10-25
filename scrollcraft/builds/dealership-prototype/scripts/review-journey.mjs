import { chromium } from "playwright-core";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const root = "lab/journey-revision";
await fs.mkdir(root, { recursive: true });
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const results = [],
  errors = [];
try {
  for (const [name, viewport, reducedMotion] of [
    ["desktop", { width: 1440, height: 1000 }, "no-preference"],
    ["phone", { width: 390, height: 844 }, "no-preference"],
    ["compact", { width: 360, height: 640 }, "no-preference"],
    ["reduced", { width: 390, height: 844 }, "reduce"],
  ]) {
    const c = await browser.newContext({ viewport, reducedMotion });
    await c.addInitScript(() => {
      Element.prototype.requestPointerLock = () => Promise.resolve();
      Element.prototype.setPointerCapture = () => {};
      Element.prototype.releasePointerCapture = () => {};
    });
    const p = await c.newPage();
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto("http://127.0.0.1:4500/?variant=B");
    await p.waitForSelector(".purchase-journey");
    const stages = ["explore", "choose", "order", "prepare", "handover"],
      states = [];
    for (let i = 0; i < 5; i++) {
      const line =
        viewport.height *
        (reducedMotion === "reduce"
          ? 0.5
          : viewport.width <= 760
            ? 0.71
            : 0.53);
      await p
        .locator(".journey-step")
        .nth(i)
        .evaluate((el, line) => {
          const r = el.getBoundingClientRect();
          scrollTo({
            top: scrollY + r.top + r.height / 2 - line,
            behavior: "instant",
          });
        }, line);
      await p.waitForTimeout(450);
      assert.equal(
        await p.locator(".purchase-journey").getAttribute("data-journey-stage"),
        stages[i],
      );
      await p.screenshot({ path: `${root}/${name}-${stages[i]}.png` });
      const photo = p.locator(".journey-photo img");
      assert.equal(await photo.evaluate((el) => el.naturalWidth > 0), true);
      if (reducedMotion !== "reduce") {
        const bounds = await p.locator(".journey-visual").boundingBox();
        assert(bounds.y >= -1, `${name} sticky visual above viewport`);
        if (viewport.width <= 760) {
          const heading = await p
            .locator(".journey-step")
            .nth(i)
            .locator("h3")
            .boundingBox();
          assert(
            heading.y >= bounds.y + bounds.height - 4,
            `${name} heading hidden by sticky visual`,
          );
        }
      }
      states.push({
        stage: stages[i],
        marker: await p
          .locator(".journey-car-marker")
          .evaluate((el) => getComputedStyle(el).transform),
      });
    }
    const nav = p.getByRole("navigation", { name: "Purchase journey stages" });
    await nav.getByRole("button", { name: "Choose", exact: false }).click();
    await p.waitForTimeout(1200);
    assert.equal(
      await p.locator(".purchase-journey").getAttribute("data-journey-stage"),
      "choose",
    );
    await p.keyboard.press("Tab");
    await p.keyboard.press("Enter");
    await p.waitForTimeout(1200);
    assert.equal(
      await p.locator(".purchase-journey").getAttribute("data-journey-stage"),
      "order",
    );
    const audit = await new AxeBuilder({ page: p })
      .include(".purchase-journey")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    assert.equal(
      audit.violations.length,
      0,
      JSON.stringify(
        audit.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => ({
            target: n.target,
            summary: n.failureSummary,
          })),
        })),
      ),
    );
    assert(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    if (reducedMotion === "reduce") {
      assert.equal(
        await p
          .locator(".journey-visual")
          .evaluate((el) => getComputedStyle(el).position),
        "relative",
      );
      assert.equal(
        await p
          .locator(".journey-photo img")
          .evaluate((el) => getComputedStyle(el).transform),
        "none",
      );
    }
    assert(
      await p
        .locator(".journey-step")
        .last()
        .getByText("confirm delivery availability", { exact: false })
        .count(),
    );
    await p
      .locator(".journey-ending")
      .getByRole("button", { name: "Explore inventory" })
      .click();
    await p.waitForSelector(".inventory-layout");
    results.push({
      name,
      states,
      keyboard: "passed",
      accessibilityFindings: audit.violations.length,
      inventoryAction: "passed",
    });
    await c.close();
  }
  assert.equal(errors.length, 0, JSON.stringify(errors));
  await fs.writeFile(
    `${root}/report.json`,
    JSON.stringify({ results, errors }, null, 2),
  );
  console.log(JSON.stringify({ results, errors }, null, 2));
} catch (e) {
  await fs.writeFile(
    `${root}/failure-${Date.now()}.json`,
    JSON.stringify({ message: e.stack, results, errors }, null, 2),
  );
  throw e;
} finally {
  await browser.close();
}
