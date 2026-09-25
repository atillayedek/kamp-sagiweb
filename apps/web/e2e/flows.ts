import { expect, type Page, type TestInfo } from "@playwright/test";

export const PASSWORD = "gecici-sifre-123";

export function uniqueEmail(testInfo: Pick<TestInfo, "testId" | "project">, label = "e2e") {
  return `${label}-${testInfo.project.name}-${testInfo.testId}-${Date.now()}@example.com`;
}

export function uniqueName(prefix: string) {
  return `${prefix} ${Math.random().toString(36).slice(2, 8)}`;
}

export async function signUp(page: Page, email: string) {
  await page.goto("/kayit");
  await page.getByLabel("E-posta").fill(email);
  await page.getByRole("textbox", { name: "Şifre", exact: true }).fill(PASSWORD);
  await page.getByRole("textbox", { name: "Şifre (tekrar)", exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Hesap oluştur" }).click();
  await expect(page).toHaveURL(/\/baslangic$/);
}

export async function completeOnboarding(page: Page, displayName = "Deniz Yılmaz", universityId = "odtu") {
  await page.getByLabel("Üniversiten").selectOption(universityId);
  await page.getByLabel("Görünen ad").fill(displayName);
  await page.getByLabel("Bölüm").fill("Bilgisayar Mühendisliği");
  await page.getByLabel("İlgi alanların").fill("Basketbol, Satranç");
  await page.getByLabel("Becerilerin").fill("Python");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Profilimi oluştur" }).click();
  await expect(page).toHaveURL(/\/profil$/);
}

export async function signIn(page: Page, email: string, next?: string) {
  await page.goto(next ? `/giris?next=${encodeURIComponent(next)}` : "/giris");
  await page.getByLabel("E-posta").fill(email);
  await page.getByLabel("Şifre").fill(PASSWORD);
  await page.getByRole("button", { name: "Giriş yap" }).click();
}

export const MINIMAL_PDF = Buffer.from(
  "%PDF-1.4\n1 0 obj <</Type/Catalog/Pages 2 0 R>> endobj\n2 0 obj <</Type/Pages/Kids[3 0 R]/Count 1>> endobj\n3 0 obj <</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>> endobj\ntrailer <</Root 1 0 R>>\n%%EOF\n",
);
