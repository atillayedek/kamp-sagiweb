import { expect, test } from "@playwright/test";
import { completeOnboarding, PASSWORD, signUp, uniqueEmail } from "./flows";
import { collectCspViolations, expectNoA11yViolations } from "./helpers";

test("oturumsuz kullanıcı korumalı sayfadan girişe yönlendirilir", async ({ page }) => {
  await page.goto("/profil");
  await expect(page).toHaveURL(/\/giris\?next=%2Fprofil$/);
  await expect(page.getByRole("heading", { name: "Giriş yap" })).toBeVisible();
});

test("uygulama rotaları nonce CSP ile ihlalsiz çalışır", async ({ page }) => {
  const violations = collectCspViolations(page);
  const response = await page.goto("/giris");
  expect(response?.headers()["content-security-policy"]).toMatch(/'nonce-[^']+' 'strict-dynamic'/);
  await page.getByLabel("E-posta").fill("x");
  await page.getByRole("button", { name: "Giriş yap" }).click();
  await expect(page.getByText("Geçerli bir e-posta adresi gir.")).toBeVisible();
  expect(violations).toEqual([]);
});

test("giriş ve kayıt formları erişilebilir", async ({ page }) => {
  await page.goto("/giris");
  await expect(page.getByRole("button", { name: "Giriş yap" })).toBeVisible();
  await expectNoA11yViolations(page);
  await page.goto("/kayit");
  await expect(page.getByRole("button", { name: "Hesap oluştur" })).toBeVisible();
  await expectNoA11yViolations(page);
});

test("hatalı giriş Türkçe hata gösterir", async ({ page }) => {
  await page.goto("/giris");
  await page.getByLabel("E-posta").fill("olmayan-kullanici@example.com");
  await page.getByLabel("Şifre").fill("yanlis-sifre-123");
  await page.getByRole("button", { name: "Giriş yap" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "E-posta veya şifre hatalı." })).toBeVisible();
});

test("kayıt, profil oluşturma, düzenleme, çıkış ve yeniden giriş", async ({ page }, testInfo) => {
  const violations = collectCspViolations(page);
  const email = uniqueEmail(testInfo);
  await signUp(page, email);
  await expectNoA11yViolations(page);

  await page.getByRole("button", { name: "Profilimi oluştur" }).click();
  await expect(page.getByText("Adın 2–40 karakter olmalı.")).toBeVisible();
  await expect(page.getByText("Üniversiteni seç.")).toBeVisible();
  await expect(page.getByText("Devam etmek için Kullanım Şartları'nı kabul etmelisin.")).toBeVisible();

  await completeOnboarding(page);
  await expect(page.getByText("Deniz Yılmaz")).toBeVisible();
  await expect(page.getByText("Orta Doğu Teknik Üniversitesi", { exact: false })).toBeVisible();
  await expect(page.getByText("basketbol", { exact: true })).toBeVisible();
  await expect(page.getByText("satranç", { exact: true })).toBeVisible();
  await expect(page.getByText("Öğrenci doğrulaman henüz yapılmadı")).toBeVisible();
  await expectNoA11yViolations(page);

  const nav = page.getByRole("navigation", { name: "Uygulama menüsü" }).locator("visible=true");
  await expect(nav.getByRole("link", { name: "Profil" })).toHaveAttribute("aria-current", "page");

  await page.getByRole("button", { name: "Profili düzenle" }).click();
  await page.getByLabel("Kısa tanıtım").fill("Akşamları basketbol oynamayı severim.");
  await page.getByRole("button", { name: "Kaydet" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Profilin güncellendi" })).toBeVisible();
  await expect(page.getByText("Akşamları basketbol oynamayı severim.")).toBeVisible();

  await page.getByRole("button", { name: "Çıkış yap" }).click();
  await expect(page).toHaveURL(/\/giris(\?next=%2Fprofil)?$/);

  await page.getByLabel("E-posta").fill(email);
  await page.getByLabel("Şifre").fill(PASSWORD);
  await page.getByRole("button", { name: "Giriş yap" }).click();
  await expect(page).toHaveURL(/\/profil$/);
  await expect(page.getByText("Akşamları basketbol oynamayı severim.")).toBeVisible();
  expect(violations).toEqual([]);
});

test("oturum açıkken dış adrese yönlendirme yapılmaz", async ({ page }, testInfo) => {
  await signUp(page, uniqueEmail(testInfo));
  await page.goto("/giris?next=https%3A%2F%2Fkotu.example.com");
  await expect(page).toHaveURL(/^http:\/\/localhost:\d+\/baslangic\?next=%2Fprofil$/);
  await page.goto("/giris?next=%2F%2Fkotu.example.com");
  await expect(page).toHaveURL(/^http:\/\/localhost:\d+\/baslangic\?next=%2Fprofil$/);
});

test("profili olmayan kullanıcı başlangıca yönlendirilir ve sonra gitmek istediği sekmeye döner", async ({ page }, testInfo) => {
  await signUp(page, uniqueEmail(testInfo));
  await page.goto("/mesajlar");
  await expect(page).toHaveURL(/\/baslangic\?next=%2Fmesajlar$/);
  await page.getByLabel("Üniversiten").selectOption("ege");
  await page.getByLabel("Görünen ad").fill("Ece");
  await page.getByLabel("Bölüm").fill("Mimarlık");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Profilimi oluştur" }).click();
  await expect(page).toHaveURL(/\/mesajlar$/);
  await expect(page.getByRole("heading", { name: "Mesajlar" })).toBeVisible();
});

test("kayıt sırasında giriş sayfasından gelen hedef korunur", async ({ page }, testInfo) => {
  await page.goto("/giris?next=%2Ftopluluklar");
  await page.getByRole("link", { name: "Hesabın yok mu? Kayıt ol" }).click();
  await expect(page).toHaveURL(/\/kayit\?next=%2Ftopluluklar$/);
  await page.getByLabel("E-posta").fill(uniqueEmail(testInfo));
  await page.getByRole("textbox", { name: "Şifre", exact: true }).fill(PASSWORD);
  await page.getByRole("textbox", { name: "Şifre (tekrar)", exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Hesap oluştur" }).click();
  await expect(page).toHaveURL(/\/baslangic\?next=%2Ftopluluklar$/);
});
