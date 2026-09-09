import { test, expect } from "@playwright/test";

test.describe("auth", () => {
  test("signup creates an account and lands on /account", async ({ page }) => {
    const email = `e2e-${Date.now()}@example.com`;

    await page.goto("/signup");
    await page.getByLabel("Full name").fill("E2E Tester");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("correcthorse1");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page).toHaveURL(/\/account$/);
    await expect(
      page.getByRole("heading", { name: "Welcome, E2E Tester" }),
    ).toBeVisible();
    await expect(page.getByText("Unverified")).toBeVisible();
  });

  test("wrong password shows a generic error and does not sign in", async ({ page }) => {
    const email = `e2e-${Date.now()}@example.com`;

    await page.goto("/signup");
    await page.getByLabel("Full name").fill("Wrong Pass Tester");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("correcthorse1");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/account$/);

    await page.getByRole("button", { name: "Sign out" }).first().click();
    await expect(page).toHaveURL(/\/login$/);

    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("totally-wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText("Invalid email or password.")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("logging in as the seeded admin reaches the admin dashboard", async ({ page }) => {
    await page.goto("/login");
    await page
      .getByLabel("Email")
      .fill(process.env.SEED_ADMIN_EMAIL ?? "admin@azurehijabs.com");
    await page
      .getByLabel("Password")
      .fill(process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe!12345");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });

  test("an unauthenticated visitor is bounced from /admin and /account to /login", async ({
    page,
  }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin$/);

    await page.goto("/account");
    await expect(page).toHaveURL(/\/login\?next=%2Faccount$/);
  });
});
