import { expect, test } from "@playwright/test";

test.describe("Document Library & Knowledge Base", () => {
  test.beforeEach(async ({ page, request }) => {
    // Register real user to obtain authentic JWT token recognized by local backend
    const email = `doc_tester_${Date.now()}@researchpilot.ai`;
    const password = "TesterPassword123!";
    const res = await request.post("http://127.0.0.1:8000/api/v1/auth/register", {
      data: { email, password },
    });
    const authData = await res.json();

    await page.goto("/login");
    await page.evaluate(
      ({ token, user }) => {
        localStorage.setItem("researchpilot_token", token);
        localStorage.setItem("researchpilot_user", JSON.stringify(user));
      },
      { token: authData.access_token, user: authData.user }
    );
  });

  test("should render documents page with upload drop zone", async ({ page }) => {
    await page.goto("/documents");

    await expect(page.locator("body")).toBeVisible();
    const pageText = await page.textContent("body");
    expect(pageText).toMatch(/(Documents|Library|Upload|Knowledge Base)/i);

    // Verify upload zone element exists
    const uploadTrigger = page
      .locator('[data-testid="upload-zone"], button:has-text("Upload"), div:has-text("Drag & drop")')
      .first();
    await expect(uploadTrigger).toBeVisible();
  });
});
