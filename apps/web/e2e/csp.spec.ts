import { expect, test } from "@playwright/test";
import { collectCspViolations } from "./helpers";

for (const path of ["/", "/tasarim", "/aydinlatma-metni"]) {
  test(`${path} CSP ihlali olmadan yüklenir ve etkileşimli çalışır`, async ({ page }) => {
    const violations = collectCspViolations(page);
    const response = await page.goto(path);
    expect(response?.headers()["content-security-policy"]).toContain("script-src 'self' 'unsafe-inline'");
    await page.waitForLoadState("networkidle");
    expect(violations).toEqual([]);
  });
}

test("hidrasyon CSP altında tamamlanır", async ({ page }) => {
  const violations = collectCspViolations(page);
  await page.goto("/");
  const interest = page.locator("figure").first().getByRole("button", { name: /İlgileniyorum/ });
  await interest.click();
  await expect(interest).toHaveAttribute("aria-pressed", "true");
  expect(violations).toEqual([]);
});
