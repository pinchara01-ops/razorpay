import { expect, test, type Page } from "playwright/test";

async function signIn(page: Page) {
  await page.goto("/login");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/shop$/);
  await expect(page.getByRole("heading", { name: "Shop all care" })).toBeVisible();
}

async function startGiftSession(page: Page) {
  await page.locator(".guide-launcher").click();
  await page.getByRole("button", { name: "Gift for my brother under 1000, oily skin" }).click();
  await expect(page.getByText(/catalog-verified option/)).toBeVisible();
  await page.getByRole("button", { name: "Choose" }).first().click();
  await expect(page.getByText(/Exact total with this offer/)).toBeVisible();
}

async function acceptGiftOfferFromCart(page: Page) {
  await page.goto("/cart");
  await expect(page.getByText(/Gift experience boundary/).first()).toBeVisible();
  await page.getByRole("button", { name: "Add", exact: true }).click();
}

test("landing is separate and an unsupported request never enters the cart", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "GlowCart" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ask GlowGuide" })).toHaveCount(0);

  await signIn(page);
  await page.locator(".guide-launcher").click();
  await page.getByRole("button", { name: "I want a phone under 50000 for photography" }).click();
  await expect(page.getByText("No catalog match")).toBeVisible();
  await expect(page.getByText("No new money action was taken.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open cart" })).toContainText("0");
});

test("Find-it dashboard renders the 500-scenario evaluation", async ({ page }) => {
  await page.goto("/findit");

  await expect(page.getByRole("heading", { name: /Find-it checks/ })).toBeVisible();
  await expect(page.getByText("500").first()).toBeVisible();
  await expect(page.getByText("500/500 scenarios passed")).toBeVisible();
  await expect(page.getByText("Catalog grounding").first()).toBeVisible();
  await expect(page.getByText("Review-only deals").first()).toBeVisible();
});

test("buyer choice, playbook auto-approval, and price-change guard run in order", async ({ page }) => {
  await signIn(page);
  await startGiftSession(page);
  await acceptGiftOfferFromCart(page);

  await page.goto("/merchant");
  await expect(page.getByText("Integrity test")).toBeVisible();
  await page.getByRole("button", { name: /Change price by/ }).click();

  await page.goto("/cart");
  await page.getByRole("button", { name: /Approve .* and continue/ }).click();
  await expect(page.getByText("Checkout paused")).toBeVisible();
  await expect(page.getByText("No money action was taken.")).toBeVisible();
});

test("changing the merchant playbook changes the same cart outcome", async ({ page }) => {
  await signIn(page);
  await startGiftSession(page);
  await page.goto("/merchant");
  await page.getByRole("button", { name: "Growth playbook" }).click();

  const giftRule = page.locator(".rules-table article").filter({ hasText: "Gift experience boundary" });
  await expect(giftRule.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  await giftRule.getByRole("switch").click();
  await expect(page.getByText("No enabled rule matched")).toBeVisible();

  await page.goto("/cart");
  await expect(page.getByText(/Gift experience boundary/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Approve .* and continue/ })).toBeVisible();
});

test("voice controls are visible and conversational approval opens Razorpay from GlowGuide", async ({ page }) => {
  await signIn(page);
  await startGiftSession(page);

  await expect(page.getByRole("button", { name: "Voice off" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start voice input" })).toBeVisible();
  await expect(page.getByText(/Exact total with this offer/)).toBeVisible();

  await page.getByRole("textbox", { name: "Message GlowGuide" }).fill("okay");
  await page.getByRole("button", { name: "Send message" }).click();

  await expect(page.getByText(/Razorpay test order is ready/)).toBeVisible();
  await expect(page.locator("iframe").last()).toBeVisible();
  await expect.poll(() => page.frames().some((frame) => frame.url().includes("api.razorpay.com/v1/checkout/public"))).toBe(true);
});
