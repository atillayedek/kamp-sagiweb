import { expect, test } from "@playwright/test";
import { expectNoA11yViolations, expectNoHorizontalOverflow } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("temel yapı ve Türkçe dil", async ({ page }) => {
  await expect(page.locator("html")).toHaveAttribute("lang", "tr");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Kampüste ihtiyacını yaz");
  await expect(page.getByRole("heading", { level: 2, name: "Gerçek üniversite öğrencileri, gerçek kampüsler." })).toBeVisible();
  await expect(page.getByText("Örnek gösterim — gerçek bir ilan veya kullanıcı değildir.", { exact: false })).toBeVisible();
});

test("erişilebilirlik ihlali yok", async ({ page }) => {
  await expectNoA11yViolations(page);
});

test("yatay taşma yok", async ({ page }) => {
  await expectNoHorizontalOverflow(page);
});

test("içeriğe geç bağlantısı klavyeyle çalışır", async ({ page }) => {
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "İçeriğe geç" });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#icerik$/);
});

test("TearOffStrip şeritleri basılı durumunu bildirir", async ({ page }) => {
  const hero = page.locator("figure").first();
  const interest = hero.getByRole("button", { name: /İlgileniyorum/ });
  await expect(interest).toHaveAttribute("aria-pressed", "false");
  await interest.click();
  await expect(interest).toHaveAttribute("aria-pressed", "true");
  const save = hero.getByRole("button", { name: /Kaydet/ });
  await save.focus();
  await page.keyboard.press("Space");
  await expect(save).toHaveAttribute("aria-pressed", "true");
  const box = await save.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
});

test("uygulama sekmeleri ok tuşlarıyla gezilir", async ({ page }) => {
  const tablist = page.getByRole("tablist", { name: "Uygulama bölümleri" });
  const first = tablist.getByRole("tab", { name: "Keşfet" });
  await first.focus();
  await page.keyboard.press("ArrowRight");
  const second = tablist.getByRole("tab", { name: "Topluluklar" });
  await expect(second).toBeFocused();
  await expect(second).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel", { name: "Topluluklar" })).toBeVisible();
  await page.keyboard.press("End");
  await expect(tablist.getByRole("tab", { name: "Profil" })).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(first).toBeFocused();
});

test("SSS yanıtları açılır", async ({ page }) => {
  const question = page.getByText("Belgemi kimler görebilir?");
  await question.click();
  await expect(page.getByText("Yalnızca sen ve belgeyi inceleyen moderatör.", { exact: false })).toBeVisible();
});

test("mobil menü açılır ve Escape ile kapanır", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobil-360", "Yalnızca mobil görünümde");
  const toggle = page.getByRole("button", { name: "Menüyü aç" });
  await toggle.click();
  await expect(page.getByRole("button", { name: "Menüyü kapat" })).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("link", { name: "Doğrulama" }).first()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Menüyü aç" })).toBeFocused();
});

test("varsayılan olarak arama motorlarına kapalı", async ({ page, request }) => {
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  const robots = await request.get("/robots.txt");
  expect(await robots.text()).toMatch(/^Disallow: \/$/m);
});

test("güvenlik başlıkları gönderilir", async ({ request }) => {
  const response = await request.get("/");
  const headers = response.headers();
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["x-powered-by"]).toBeUndefined();
});
