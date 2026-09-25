import { expect, test } from "@playwright/test";
import { expectNoA11yViolations, expectNoHorizontalOverflow } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/tasarim");
});

test("galeri erişilebilir ve taşmıyor", async ({ page }) => {
  await expectNoA11yViolations(page);
  await expectNoHorizontalOverflow(page);
});

test("modal Escape ile kapanır ve odak geri döner", async ({ page }) => {
  const opener = page.getByRole("button", { name: "Modal aç" });
  await opener.click();
  const dialog = page.getByRole("dialog", { name: "Hesabını silmek istiyor musun?" });
  await expect(dialog).toBeVisible();
  await expectNoA11yViolations(page);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});

test("dosya alanı PDF olmayan dosyayı reddeder", async ({ page }) => {
  const input = page.locator('input[type="file"]').first();
  await input.setInputFiles({ name: "resim.png", mimeType: "image/png", buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]) });
  await expect(page.getByRole("alert").filter({ hasText: "Yalnızca PDF dosyası yükleyebilirsin." })).toBeVisible();
});

test("dosya alanı uzantısı değiştirilmiş dosyayı reddeder", async ({ page }) => {
  const input = page.locator('input[type="file"]').first();
  await input.setInputFiles({ name: "sahte.pdf", mimeType: "application/pdf", buffer: Buffer.from("merhaba dünya") });
  await expect(page.getByRole("alert").filter({ hasText: "Dosya geçerli bir PDF değil." })).toBeVisible();
});

test("dosya alanı geçerli PDF'i kabul eder", async ({ page }) => {
  const input = page.locator('input[type="file"]').first();
  await input.setInputFiles({ name: "belge.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.7\n%%EOF") });
  await expect(page.getByText("belge.pdf")).toBeVisible();
  await expect(page.getByRole("button", { name: "belge.pdf dosyasını kaldır" })).toBeVisible();
});

test("filtre çipleri seçim durumunu bildirir", async ({ page }) => {
  const chip = page.getByRole("button", { name: "Etkinlik" });
  await expect(chip).toHaveAttribute("aria-pressed", "false");
  await chip.click();
  await expect(chip).toHaveAttribute("aria-pressed", "true");
});

test("toast bildirimi canlı bölgede duyurulur", async ({ page }) => {
  await page.getByRole("button", { name: "Başarılı bildirim" }).click();
  await expect(page.getByRole("status").filter({ hasText: "İlan kaydedildi" })).toBeVisible();
});

test("modal Kapat düğmesiyle ve arka plana tıklayınca kapanır", async ({ page }) => {
  const opener = page.getByRole("button", { name: "Alt sayfa aç" });
  await opener.click();
  const dialog = page.getByRole("dialog", { name: "Hesabını silmek istiyor musun?" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Kapat" }).click();
  await expect(dialog).toBeHidden();
  await opener.click();
  await expect(dialog).toBeVisible();
  await page.mouse.click(5, 5);
  await expect(dialog).toBeHidden();
  await opener.click();
  await expect(dialog).toBeVisible();
});
