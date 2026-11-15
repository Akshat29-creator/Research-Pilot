import { expect, test } from "@playwright/test";

test.describe("Authentication Journeys", () => {
  const uniqueId = Date.now();
  const testEmail = `pilot_${uniqueId}@researchpilot.ai`;
  const testPassword = "SecurePassword123!";

  test("should register a new researcher account and redirect to dashboard", async ({ page }) => {
    await page.goto("/register");

    // Verify registration page title & form elements
    await expect(page.locator("h1")).toContainText(/Create Local Account|Create your account|ResearchPilot/i);

    const emailInput = page.locator('input[type="email"]').first();
    const passwordInputs = page.locator('input[type="password"]');

    await emailInput.fill(testEmail);
    await passwordInputs.nth(0).fill(testPassword);
    await passwordInputs.nth(1).fill(testPassword);

    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();

    // Verify redirection to dashboard or login
    await expect(page).toHaveURL(/\/(dashboard|login)/);
  });

  test("should log in with valid credentials and land on dashboard", async ({ page, request }) => {
    const userEmail = `login_user_${Date.now()}@researchpilot.ai`;
    const userPassword = "ValidPassword123!";

    // Ensure valid user exists via local API
    await request.post("http://127.0.0.1:8000/api/v1/auth/register", {
      data: { email: userEmail, password: userPassword },
    });

    await page.goto("/login");

    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await emailInput.fill(userEmail);
    await passwordInput.fill(userPassword);

    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();

    // Redirection to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("should display validation error on invalid credentials", async ({ page }) => {
    await page.goto("/login");

    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await emailInput.fill("nonexistent_user@pilot.ai");
    await passwordInput.fill("WrongPassword123!");

    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();

    // Verify error message appears
    await expect(page.locator("body")).toContainText(/incorrect|invalid|error|failed/i);
  });
});
