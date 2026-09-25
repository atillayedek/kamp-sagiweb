import { expect, test, type Browser } from "@playwright/test";
import { createUser } from "../../../scripts/seed-emulator.mjs";
import { completeOnboarding, MINIMAL_PDF, PASSWORD, signIn, signUp, uniqueEmail, uniqueName } from "./flows";
import { collectCspViolations, expectNoA11yViolations } from "./helpers";

async function moderatorPage(browser: Browser, email: string) {
  await createUser({ email, password: PASSWORD, claims: { moderator: true } });
  const context = await browser.newContext({ locale: "tr-TR" });
  const page = await context.newPage();
  await signIn(page, email, "/admin");
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Moderatör paneli" })).toBeVisible();
  return { page, context };
}

test("doğrulanmamış öğrenci kampüs bölümlerinde kilit görür", async ({ page }, testInfo) => {
  await signUp(page, uniqueEmail(testInfo));
  await completeOnboarding(page);
  for (const path of ["/kesfet", "/topluluklar", "/mesajlar"]) {
    await page.goto(path);
    await expect(page.getByText("Öğrenci doğrulaması gerekli")).toBeVisible();
  }
  await page.getByRole("link", { name: "Doğrulama sayfasına git" }).click();
  await expect(page).toHaveURL(/\/dogrulama$/);
  await expectNoA11yViolations(page);
});

test("moderatör olmayan kullanıcı paneli göremez", async ({ page }, testInfo) => {
  await signUp(page, uniqueEmail(testInfo));
  await page.goto("/admin");
  await expect(page.getByText("Bu sayfaya erişim yetkin yok")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Moderatör paneli" })).toHaveCount(0);
});

test("belge yükleme, moderatör onayı ve kilidin açılması", async ({ page, browser }, testInfo) => {
  const violations = collectCspViolations(page);
  const name = uniqueName("Onay");
  await signUp(page, uniqueEmail(testInfo, "ogrenci"));
  await completeOnboarding(page, name);
  await page.goto("/dogrulama");
  await page.locator('input[type="file"]').setInputFiles({ name: "belge.pdf", mimeType: "application/pdf", buffer: MINIMAL_PDF });
  await page.getByRole("button", { name: "Belgeyi gönder" }).click();
  await expect(page.getByText("Belgen inceleniyor")).toBeVisible();

  const moderator = await moderatorPage(browser, uniqueEmail(testInfo, "mod"));
  const modViolations = collectCspViolations(moderator.page);
  const card = moderator.page.getByRole("article", { name });
  await expect(card).toBeVisible();
  await expectNoA11yViolations(moderator.page);
  await card.getByRole("button", { name: "Belgeyi görüntüle" }).click();
  const preview = moderator.page.getByRole("dialog", { name: "Öğrenci belgesi" });
  if (await moderator.page.evaluate(() => navigator.pdfViewerEnabled)) {
    await expect(preview.locator("iframe")).toBeVisible();
    await expect(preview.frameLocator("iframe").locator('embed[type="application/pdf"]')).toBeAttached();
  } else {
    await expect(preview.getByText("Bu tarayıcı PDF önizlemeyi desteklemiyor")).toBeVisible();
    await expect(preview.locator("iframe")).toHaveCount(0);
  }
  await preview.getByRole("button", { name: "Kapat" }).click();
  await card.getByRole("button", { name: "Onayla" }).click();
  await expect(moderator.page.getByRole("status").filter({ hasText: "Başvuru onaylandı" })).toBeVisible();
  await expect(card).toHaveCount(0);
  expect(modViolations).toEqual([]);
  await moderator.context.close();

  await expect(page.getByText("Doğrulandın")).toBeVisible();
  await page.goto("/kesfet");
  await expect(page.getByRole("heading", { name: "Bir ihtiyacın mı var?" })).toBeVisible();
  await page.goto("/profil");
  await expect(page.getByText("Doğrulanmış öğrenci", { exact: true })).toBeVisible();
  expect(violations).toEqual([]);
});

test("moderatör reddeder, öğrenci sebebi görür ve yeniden yükleyebilir", async ({ page, browser }, testInfo) => {
  const name = uniqueName("Red");
  await signUp(page, uniqueEmail(testInfo, "ogrenci"));
  await completeOnboarding(page, name);
  await page.goto("/dogrulama");
  await page.locator('input[type="file"]').setInputFiles({ name: "belge.pdf", mimeType: "application/pdf", buffer: MINIMAL_PDF });
  await page.getByRole("button", { name: "Belgeyi gönder" }).click();
  await expect(page.getByText("Belgen inceleniyor")).toBeVisible();

  const moderator = await moderatorPage(browser, uniqueEmail(testInfo, "mod"));
  const card = moderator.page.getByRole("article", { name });
  await card.getByRole("button", { name: "Reddet" }).click();
  const dialog = moderator.page.getByRole("dialog", { name: "Başvuruyu reddet" });
  await dialog.getByRole("button", { name: "Reddet" }).click();
  await expect(dialog.getByText("Bir sebep seç.")).toBeVisible();
  await dialog.getByLabel("Sebep").selectOption("unreadable");
  await dialog.getByLabel("Öğrenciye not").fill("Belge bulanık görünüyor.");
  await dialog.getByRole("button", { name: "Reddet" }).click();
  await expect(moderator.page.getByRole("status").filter({ hasText: "Başvuru reddedildi" })).toBeVisible();
  await moderator.context.close();

  await expect(page.getByText("Belgen onaylanmadı")).toBeVisible();
  await expect(page.getByText("Sebep: Belge okunamıyor")).toBeVisible();
  await expect(page.getByText("Moderatör notu: Belge bulanık görünüyor.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Belgeyi gönder" })).toBeVisible();
  await page.goto("/kesfet");
  await expect(page.getByText("Öğrenci doğrulaması gerekli")).toBeVisible();
});

test("PDF gibi adlandırılmış sahte dosya istemcide reddedilir", async ({ page }, testInfo) => {
  await signUp(page, uniqueEmail(testInfo));
  await completeOnboarding(page);
  await page.goto("/dogrulama");
  await page.locator('input[type="file"]').setInputFiles({ name: "sahte.pdf", mimeType: "application/pdf", buffer: Buffer.from("merhaba") });
  await expect(page.getByRole("alert").filter({ hasText: "Dosya geçerli bir PDF değil." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Belgeyi gönder" })).toBeDisabled();
});
