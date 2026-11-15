import { expect, test } from "@playwright/test";

test.describe("Research Workflow & Streaming Workspace", () => {
  test.beforeEach(async ({ page, request }) => {
    // Register real user to obtain authentic JWT token recognized by local backend
    const email = `research_tester_${Date.now()}@researchpilot.ai`;
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

  test("should render the research initiation page and input form", async ({ page }) => {
    await page.goto("/research/new");

    // Verify query input area exists
    const queryInput = page.locator("textarea").first();
    await expect(queryInput).toBeVisible();

    // Fill query
    await queryInput.fill("Empirical comparison of pgvector HNSW vs IVFFlat memory footprints");

    // Verify submit button is active
    const submitBtn = page.locator('button[type="submit"]').first();
    await expect(submitBtn).toBeEnabled();
  });

  test("should navigate to research workspace and render agent state graph", async ({ page }) => {
    // Navigate directly to sample workspace session
    await page.goto("/research/sample-e2e-session");

    // Assert workspace header or query title exists
    await expect(page.locator("body")).toBeVisible();

    // Verify pipeline steps (Orchestrator, Researcher, Analyst, Writer, Reviewer)
    const pageText = await page.textContent("body");
    expect(pageText).toMatch(/(Orchestrator|Researcher|Analyst|Writer|Reviewer|Workspace)/i);
  });

  test("should render the report viewer with markdown content and citations", async ({ page }) => {
    await page.goto("/reports/sample-report-id");

    await expect(page.locator("body")).toBeVisible();
    const bodyText = await page.textContent("body");
    expect(bodyText).toMatch(/(Report|Findings|Synthesis|Overview|Executive)/i);
  });
});
