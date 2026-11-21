import { test, expect } from "@playwright/test";

test("newsroom search, grouped coverage, extractive briefing and bookmarks", async ({ page, request }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem("intelmatrix_lang", "en"));
  const result = await request.get("/api/news?limit=1&language=en");
  expect(result.ok()).toBeTruthy();
  const firstPage = await result.json();
  expect(firstPage.nextCursor).toBe(1);
  expect(firstPage.items[0].event.publishers).toBe(2);
  expect(firstPage.items[0].evidence).toBeUndefined();

  await page.goto("/");
  const cards = page.locator("[data-news-id]");
  await expect(cards.first()).toContainText("2 publishers");
  await expect(cards.first()).toContainText("Global impact");

  const search = page.getByRole("searchbox");
  await search.fill("unusual planets Vega");
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText("Telescope maps unusual planets near Vega");
  await search.fill("no-such-report");
  await expect(page.getByText("No matching reports in the current feed.")).toBeVisible();
  await search.fill("riverside");
  await expect(cards).toHaveCount(1);
  await cards.first().getByRole("link", { name: /riverside/i }).click();

  await expect(page.getByRole("heading", { name: "Related coverage" })).toBeVisible();
  await page.getByText("Publication timeline", { exact: true }).click();
  await expect(page.getByRole("link", { name: /holiday parade disrupted/i })).toBeVisible();
  await expect(page.getByText("Publishers reported different fatality counts")).toBeVisible();
  await page.getByText("Score evidence", { exact: true }).click();
  await expect(page.getByText("Geographic reach", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Prepare briefing" }).click();
  await expect(page.getByRole("heading", { name: "Source briefing" })).toBeVisible();
  await expect(page.getByText(/Publisher passages/)).toBeVisible();
  await page.getByRole("button", { name: "Detailed", exact: true }).click();
  await expect(page.getByRole("button", { name: "Detailed", exact: true })).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("link", { name: /back to agenda/i }).first().click();
  await page.getByRole("button", { name: "Saved", exact: true }).click();
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText("Riverside");
  await page.reload();
  await page.getByRole("button", { name: "Saved", exact: true }).click();
  await expect(cards).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));
  expect(errors).toEqual([]);
});
