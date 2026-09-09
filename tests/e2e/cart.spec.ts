import { test, expect } from "@playwright/test";

test.describe("cart", () => {
  test("guest can add an item, see it in the drawer, adjust quantity, and it persists across reloads", async ({
    page,
  }) => {
    await page.goto("/product/signature-jersey-hijab");
    await page.getByRole("button", { name: "Add to cart" }).click();
    await expect(page.getByText("Added to cart.")).toBeVisible();

    // Header badge reflects the addition.
    await expect(page.getByLabel("Cart")).toContainText("1");

    // Drawer shows the line item.
    await page.getByLabel("Cart").click();
    await expect(page.getByRole("dialog")).toContainText("Signature Jersey Hijab");
    await expect(page.getByRole("dialog")).toContainText("₹799.00");

    // Bump quantity via the stepper.
    await page.getByRole("button", { name: "Increase quantity" }).click();
    await expect(page.getByRole("dialog")).toContainText("₹1,598.00");

    // Reload — the guest cart cookie should keep the cart intact.
    await page.reload();
    await expect(page.getByLabel("Cart")).toContainText("2");
  });

  test("removing the only item shows the empty state", async ({ page }) => {
    await page.goto("/product/chiffon-drape-hijab");
    await page.getByRole("button", { name: "Add to cart" }).click();
    await expect(page.getByText("Added to cart.")).toBeVisible();

    await page.goto("/cart");
    await expect(page.getByText("Chiffon Drape Hijab")).toBeVisible();

    await page.getByRole("button", { name: "Remove item" }).click();
    await expect(page.getByText("Your cart is empty.")).toBeVisible();
  });

  test("guest cart merges into the account cart on signup", async ({ page }) => {
    await page.goto("/product/signature-jersey-hijab");
    await page.getByRole("button", { name: "Add to cart" }).click();
    await expect(page.getByText("Added to cart.")).toBeVisible();
    await expect(page.getByLabel("Cart")).toContainText("1");

    const email = `cart-merge-${Date.now()}@example.com`;
    await page.goto("/signup");
    await page.getByLabel("Full name").fill("Cart Merge Tester");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("correcthorse1");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/account$/);

    // The item added as a guest should now belong to this new account.
    await page.goto("/cart");
    await expect(page.getByText("Signature Jersey Hijab")).toBeVisible();
  });

  test("cart drawer closes when navigating to the full cart page", async ({ page }) => {
    await page.goto("/product/signature-jersey-hijab");
    await page.getByRole("button", { name: "Add to cart" }).click();
    await expect(page.getByText("Added to cart.")).toBeVisible();

    await page.getByLabel("Cart").click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.getByRole("link", { name: "View cart" }).click();
    await expect(page).toHaveURL(/\/cart$/);
    await expect(page.getByRole("dialog")).toBeHidden();
  });
});
