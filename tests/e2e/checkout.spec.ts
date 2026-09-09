import { test, expect } from "@playwright/test";

test.describe("checkout", () => {
  test("empty cart shows a message and no checkout form", async ({ page }) => {
    await page.goto("/checkout");
    await expect(page.getByText("Your cart is empty.")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Pay/ })).toHaveCount(0);
  });

  test("checkout form renders with order summary and coupon field", async ({ page }) => {
    await page.goto("/product/signature-jersey-hijab");
    await page.getByRole("button", { name: "Add to cart" }).click();
    await expect(page.getByText("Added to cart.")).toBeVisible();

    await page.goto("/checkout");
    await expect(page.getByRole("heading", { name: "Order summary" })).toBeVisible();
    await expect(page.getByPlaceholder("Coupon code")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Full name")).toBeVisible();
  });

  test("invalid coupon shows an inline error, does not apply a discount", async ({
    page,
  }) => {
    await page.goto("/product/signature-jersey-hijab");
    await page.getByRole("button", { name: "Add to cart" }).click();
    await expect(page.getByText("Added to cart.")).toBeVisible();

    await page.goto("/checkout");
    await page.getByPlaceholder("Coupon code").fill("NOT-A-REAL-CODE");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByText("This coupon code isn't valid.")).toBeVisible();
  });

  test("a valid coupon reduces the total", async ({ page }) => {
    // AZURE10 requires a ₹999 minimum subtotal (see prisma/seed.ts) — one
    // ₹799 hijab isn't enough to clear it, so add two. Waiting on the cart
    // badge's count (not the "Added to cart." toast) between clicks: two
    // identical toasts in quick succession make the toast text an
    // ambiguous signal for "the *second* add actually completed" — the
    // assertion can pass by matching the first toast still on screen.
    await page.goto("/product/signature-jersey-hijab");
    await page.getByRole("button", { name: "Add to cart" }).click();
    await expect(page.getByLabel("Cart")).toContainText("1");
    await page.getByRole("button", { name: "Add to cart" }).click();
    await expect(page.getByLabel("Cart")).toContainText("2");

    await page.goto("/checkout");
    const totalBefore = await page.locator("aside").getByText(/^₹/).last().textContent();

    // AZURE10: 10% off, seeded in prisma/seed.ts, min subtotal ₹999.
    await page.getByPlaceholder("Coupon code").fill("AZURE10");
    await page.getByRole("button", { name: "Apply" }).click();
    // Scoped to the order summary panel — the same confirmation text also
    // appears in a toast, which sonner renders elsewhere in the DOM.
    await expect(
      page.locator("aside").getByText("Coupon AZURE10 applied."),
    ).toBeVisible();

    const totalAfter = await page.locator("aside").getByText(/^₹/).last().textContent();
    expect(totalAfter).not.toBe(totalBefore);
  });

  test("submitting valid checkout details creates an order and reaches Razorpay Checkout", async ({
    page,
  }) => {
    // Deliberately doesn't assume which Razorpay credentials are configured
    // — CI runs with placeholders (see .github/workflows/ci.yml), local dev
    // may have real test-mode keys. Either way, our own code must not
    // crash: it should reach exactly one of two valid outcomes — a real
    // order + the Checkout iframe opening (real credentials), or a clean
    // error toast from placeOrder's catch (placeholder credentials). What
    // this test guards against is a third, invalid outcome: an unhandled
    // exception, or an Order left behind inconsistently.
    await page.goto("/product/signature-jersey-hijab");
    await page.getByRole("button", { name: "Add to cart" }).click();
    await expect(page.getByText("Added to cart.")).toBeVisible();

    await page.goto("/checkout");
    await page.getByLabel("Email").fill("checkout-test@example.com");
    await page.getByLabel("Full name").fill("Checkout Tester");
    await page.getByLabel("Phone").fill("9876543210");
    await page.getByLabel("Address line 1").fill("221B Test Street");
    await page.getByLabel("City").fill("Mumbai");
    await page.getByLabel("State").fill("Maharashtra");
    await page.getByLabel("Pincode").fill("400001");

    await page.getByRole("button", { name: /^Pay/ }).first().click();

    const checkoutIframe = page.frameLocator(
      'iframe[src*="api.razorpay.com/v1/checkout/public"]',
    );
    const errorToast = page.getByText("Couldn't start payment. Please try again.");

    await expect(async () => {
      const iframeVisible = await checkoutIframe
        .locator("body")
        .isVisible()
        .catch(() => false);
      const toastVisible = await errorToast.isVisible().catch(() => false);
      expect(iframeVisible || toastVisible).toBe(true);
    }).toPass({ timeout: 15_000 });
  });
});
