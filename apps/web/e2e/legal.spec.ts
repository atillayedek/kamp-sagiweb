import { expect, test } from "@playwright/test";
import { expectNoA11yViolations, expectNoHorizontalOverflow } from "./helpers";

const pages = ["/aydinlatma-metni", "/gizlilik-politikasi", "/kullanim-sartlari", "/cerez-politikasi"];

for (const path of pages) {
  test(`${path} taslak olarak işaretli ve erişilebilir`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByText("Bu metin taslaktır ve yürürlükte değildir.")).toBeVisible();
    await expect(page).toHaveTitle(/Taslak/);
    await expectNoA11yViolations(page);
    await expectNoHorizontalOverflow(page);
  });
}

test("footer'daki yasal bağlantılar taslak etiketi taşır", async ({ page }) => {
  await page.goto("/");
  const legalNav = page.getByRole("navigation", { name: "Yasal metinler" });
  await expect(legalNav.getByRole("link")).toHaveCount(4);
  await expect(legalNav.getByText("taslak")).toHaveCount(4);
});

test("bilinmeyen sayfa Türkçe 404 gösterir", async ({ page }) => {
  const response = await page.goto("/olmayan-sayfa");
  expect(response?.status()).toBe(404);
  await expect(page.getByText("Aradığın sayfayı bulamadık")).toBeVisible();
});
