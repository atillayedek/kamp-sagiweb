import { expect, test, type Browser, type Page } from "@playwright/test";
import { createVerifiedStudent } from "../../../scripts/seed-emulator.mjs";
import { PASSWORD, signIn, uniqueEmail, uniqueName } from "./flows";
import { collectCspViolations, expectNoA11yViolations, expectNoHorizontalOverflow } from "./helpers";

type Info = Parameters<typeof uniqueEmail>[0];

async function verifiedStudent(page: Page, testInfo: Info, label: string, universityId = "odtu") {
  const email = uniqueEmail(testInfo, label);
  const displayName = uniqueName("Öğrenci");
  await createVerifiedStudent({ email, password: PASSWORD, displayName, universityId });
  await signIn(page, email, "/kesfet");
  await expect(page).toHaveURL(/\/kesfet$/);
  return displayName;
}

async function writeNeed(page: Page, text: string) {
  await page.goto("/kesfet/yeni");
  await page.getByRole("textbox", { name: "Neye ihtiyacın var?" }).fill(text);
  await page.getByRole("button", { name: "Devam et" }).click();
  await expect(page.getByRole("heading", { name: "İlanını kontrol et" })).toBeVisible();
}

async function publish(page: Page) {
  await page.getByRole("button", { name: "Yayınla" }).click();
  await expect(page.getByRole("heading", { name: "İlanın yayında" })).toBeVisible();
  await page.getByRole("link", { name: "İlanı görüntüle" }).click();
  await expect(page).toHaveURL(/\/kesfet\/ilan\/[A-Za-z0-9_-]+$/);
  return page.url();
}

async function otherStudentOpens(browser: Browser, testInfo: Info, url: string, universityId: string) {
  const context = await browser.newContext({ locale: "tr-TR" });
  const page = await context.newPage();
  await verifiedStudent(page, testInfo, `diger-${universityId}`, universityId);
  await page.goto(url);
  return { page, context };
}

test("ihtiyaç yazma, önerileri düzenleme ve yayımlama", async ({ page }, testInfo) => {
  const violations = collectCspViolations(page);
  await verifiedStudent(page, testInfo, "yazar");
  await page.getByRole("link", { name: "İhtiyacını yaz" }).click();
  await expect(page).toHaveURL(/\/kesfet\/yeni$/);
  await expectNoA11yViolations(page);

  await writeNeed(page, "Yarın 18:00'de spor salonunda basket oynayacak 3 kişi arıyorum. Numaram 0532 123 45 67");
  await expect(page.getByText("Kişisel bilgilerin gizlendi")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Başlık" })).toHaveValue(/Yarın 18:00/);
  await expect(page.getByRole("combobox", { name: "Kategori" })).toHaveValue("spor");
  await expect(page.getByRole("spinbutton", { name: "En az" })).toHaveValue("3");
  await expect(page.getByRole("combobox", { name: "Zaman türü" })).toHaveValue("exact");
  await expectNoHorizontalOverflow(page);
  await expectNoA11yViolations(page);

  await page.getByRole("textbox", { name: "Başlık" }).fill("Akşam basketbolu için 3 kişi");
  await page.getByRole("radio", { name: /Tüm üniversiteler/ }).check();
  await expect(page.getByRole("article", { name: "Akşam basketbolu için 3 kişi" })).toBeVisible();
  await publish(page);

  await expect(page.getByRole("heading", { level: 2, name: "Akşam basketbolu için 3 kişi" })).toBeVisible();
  await expect(page.getByText("Senin ilanın")).toBeVisible();
  await expect(page.getByText("Tüm üniversiteler")).toBeVisible();
  const text = page.getByRole("region", { name: "İlan metni" });
  await expect(text).toContainText("[telefon]");
  await expect(text).not.toContainText("0532");
  await expectNoA11yViolations(page);
  expect(violations).toEqual([]);
});

test("form doğrulaması hatalı alanları gösterir", async ({ page }, testInfo) => {
  await verifiedStudent(page, testInfo, "dogrulama");
  await writeNeed(page, "Kütüphanede birlikte çalışacak arkadaş arıyorum");
  await page.getByRole("textbox", { name: "Başlık" }).fill("a");
  await page.getByRole("spinbutton", { name: "En fazla" }).fill("0");
  await page.getByRole("button", { name: "Yayınla" }).click();
  await expect(page.getByText("Bazı alanları düzeltmen gerekiyor.")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Başlık" })).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText(/Kişi sayısı 1–50 arasında olmalı/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "İlanın yayında" })).toHaveCount(0);
});

test("yapay zekâ yanıt veremezse ilan elle doldurulup yayımlanır", async ({ page }, testInfo) => {
  await verifiedStudent(page, testInfo, "elle");
  await writeNeed(page, "Kitap ödünç almak istiyorum #sahte-hata");
  await expect(page.getByText("Metnini şu an işleyemedik")).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Kategori" })).toHaveValue("diger");
  await page.getByRole("combobox", { name: "Kategori" }).selectOption("esya");
  await page.getByRole("textbox", { name: "Başlık" }).fill("Ödünç kitap arıyorum");
  await publish(page);
  await expect(page.getByRole("heading", { level: 2, name: "Ödünç kitap arıyorum" })).toBeVisible();
});

test("reddedilen metin yayımlanamaz", async ({ page }, testInfo) => {
  await verifiedStudent(page, testInfo, "ret");
  await writeNeed(page, "Bu metin reddedilecek bir örnek #sahte-ret");
  await expect(page.getByText("Bu metin işlenemedi ve yayımlanamaz")).toBeVisible();
  await expect(page.getByRole("button", { name: "Yayınla" })).toHaveCount(0);
  await page.getByRole("button", { name: "Metne dön" }).click();
  await expect(page.getByRole("textbox", { name: "Neye ihtiyacın var?" })).toHaveValue(/#sahte-ret/);
});

test("kampüs ilanını başka üniversiteden öğrenci göremez", async ({ page, browser }, testInfo) => {
  await verifiedStudent(page, testInfo, "kampus");
  await writeNeed(page, "Vize haftası için ders çalışma grubu kuruyoruz, 4 kişi");
  const url = await publish(page);

  const same = await otherStudentOpens(browser, testInfo, url, "odtu");
  await expect(same.page.getByRole("heading", { level: 2, name: /Vize haftası/ })).toBeVisible();
  await expect(same.page.getByText("Senin ilanın")).toHaveCount(0);
  await same.context.close();

  const other = await otherStudentOpens(browser, testInfo, url, "itu");
  await expect(other.page.getByText("İlan bulunamadı")).toBeVisible();
  await expect(other.page.getByText(/Vize haftası/)).toHaveCount(0);
  await other.context.close();
});

test("geçersiz ilan kimliği bulunamadı gösterir", async ({ page }, testInfo) => {
  await verifiedStudent(page, testInfo, "gecersiz");
  await page.goto("/kesfet/ilan/..%2Fusers");
  await expect(page.getByText("İlan bulunamadı")).toBeVisible();
});

test("yayınlanan ilan için eşleşmeler sunucuda hesaplanır ve gizlenebilir", async ({ page }, testInfo) => {
  const violations = collectCspViolations(page);
  const campus = `e2e-${Math.random().toString(36).slice(2, 10)}`;
  const otherCampus = `${campus}-diger`;
  const candidate = uniqueName("Ada");
  const unrelated = uniqueName("Bora");
  const elsewhere = uniqueName("Can");
  const seed = (label: string, displayName: string, universityId: string, interests: string[]) =>
    createVerifiedStudent({ email: uniqueEmail(testInfo, label), password: PASSWORD, displayName, universityId, interests, skills: [] });
  await seed("aday", candidate, campus, ["basketbol"]);
  await seed("ilgisiz", unrelated, campus, ["resim"]);
  await seed("diger", elsewhere, otherCampus, ["basketbol"]);

  await verifiedStudent(page, testInfo, "eslesme", campus);
  await writeNeed(page, "Yarın 18:00'de spor salonunda basket oynayacak 3 kişi arıyorum");
  await publish(page);

  const matches = page.getByRole("region", { name: "Eşleşmeler" });
  const card = matches.getByRole("article", { name: candidate });
  await expect(card).toBeVisible({ timeout: 20_000 });
  await expect(card).toContainText("Aynı kampüstesiniz");
  await expect(card).toContainText("Spor alanına ilgi var");
  await expect(matches.getByRole("article", { name: unrelated })).toHaveCount(0);
  await expect(matches.getByRole("article", { name: elsewhere })).toHaveCount(0);
  await expectNoA11yViolations(page);

  await card.getByRole("button", { name: "Gizle" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Eşleşme gizlendi" })).toBeVisible();
  await expect(card).toHaveCount(0);
  await expect(matches.getByText("Şimdilik uygun öğrenci bulunamadı")).toBeVisible();
  expect(violations).toEqual([]);
});
