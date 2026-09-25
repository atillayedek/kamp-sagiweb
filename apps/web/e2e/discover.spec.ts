import { expect, test, type Browser, type Page } from "@playwright/test";
import { createNeed, createSuggestedMatch, createVerifiedStudent } from "../../../scripts/seed-emulator.mjs";
import { PASSWORD, signIn, uniqueEmail, uniqueName } from "./flows";
import { collectCspViolations, expectNoA11yViolations, expectNoHorizontalOverflow } from "./helpers";

type Info = Parameters<typeof uniqueEmail>[0];

const campusId = () => `e2e-${Math.random().toString(36).slice(2, 10)}`;

async function student(testInfo: Info, label: string, universityId: string, interests: string[] = ["resim"]) {
  const email = uniqueEmail(testInfo, label);
  const displayName = uniqueName(label);
  const uid = await createVerifiedStudent({ email, password: PASSWORD, displayName, universityId, interests, skills: [] });
  return { email, displayName, uid };
}

async function openDiscover(browser: Browser, email: string) {
  const context = await browser.newContext({ locale: "tr-TR" });
  const page = await context.newPage();
  await signIn(page, email, "/kesfet");
  await expect(page).toHaveURL(/\/kesfet$/);
  return { page, context };
}

const feed = (page: Page) => page.getByRole("tabpanel");

test("kampüs ve genel akış, kaydetme, ilgi bildirme ve ilanı kapatma", async ({ page, browser }, testInfo) => {
  const violations = collectCspViolations(page);
  const campus = campusId();
  const other = campusId();
  const author = await student(testInfo, "Yazar", campus);
  const viewer = await student(testInfo, "Okur", campus);
  const suffix = Math.random().toString(36).slice(2, 7);
  const titles = {
    campus: `Kampüs basketbol ${suffix}`,
    global: `Genel satranç ${suffix}`,
    hidden: `Diğer kampüs gizli ${suffix}`,
    otherGlobal: `Diğer kampüs genel ${suffix}`,
  };
  const campusNeed = await createNeed({ authorUid: author.uid, universityId: campus, title: titles.campus });
  await createNeed({ authorUid: author.uid, universityId: campus, visibility: "global", title: titles.global });
  await createNeed({ authorUid: `yazar-${other}`, universityId: other, title: titles.hidden });
  await createNeed({ authorUid: `yazar-${other}`, universityId: other, visibility: "global", title: titles.otherGlobal });

  await signIn(page, viewer.email, "/kesfet");
  await expect(page).toHaveURL(/\/kesfet$/);
  const card = feed(page).getByRole("article", { name: titles.campus });
  await expect(card).toBeVisible();
  await expect(feed(page).getByRole("article", { name: titles.global })).toBeVisible();
  await expect(feed(page).getByRole("article", { name: titles.hidden })).toHaveCount(0);
  await expect(feed(page).getByRole("article", { name: titles.otherGlobal })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
  await expectNoA11yViolations(page);

  await page.getByRole("tab", { name: "Tüm üniversiteler" }).click();
  await expect(feed(page).getByRole("article", { name: titles.otherGlobal })).toBeVisible();
  await expect(feed(page).getByRole("article", { name: titles.global })).toBeVisible();
  await expect(feed(page).getByRole("article", { name: titles.campus })).toHaveCount(0);
  await expect(feed(page).getByRole("article", { name: titles.hidden })).toHaveCount(0);

  await page.getByRole("tab", { name: "Kampüsüm" }).click();
  await card.getByRole("button", { name: /^Kaydet/ }).click();
  await expect(page.getByRole("status").filter({ hasText: "İlan kaydedildi" })).toBeVisible();
  await card.getByRole("button", { name: /^İlgileniyorum/ }).click();
  await expect(page.getByRole("status").filter({ hasText: "İlgin ilan sahibine iletildi" })).toBeVisible();
  await expect(card.getByRole("button", { name: /^İlgileniyorum/ })).toHaveAttribute("aria-pressed", "true");

  await page.reload();
  await expect(card.getByRole("button", { name: /^İlgileniyorum/ })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("tab", { name: "Kaydettiklerim" }).click();
  await expect(feed(page).getByRole("article", { name: titles.campus })).toBeVisible();

  const owner = await openDiscover(browser, author.email);
  await owner.page.goto(`/kesfet/ilan/${campusNeed}`);
  const interested = owner.page.getByRole("region", { name: "İlgilenenler" });
  await expect(interested.getByText(viewer.displayName)).toBeVisible();
  await owner.page.getByRole("button", { name: "İlanı kapat" }).click();
  await owner.page.getByRole("dialog", { name: "İlanı kapat" }).getByRole("button", { name: "İlanı kapat" }).click();
  await expect(owner.page.getByText("Kapandı", { exact: true })).toBeVisible();
  await expect(owner.page.getByRole("button", { name: "İlanı kapat" })).toHaveCount(0);
  await expectNoA11yViolations(owner.page);
  await owner.context.close();

  await page.goto("/kesfet");
  await expect(feed(page).getByRole("article", { name: titles.global })).toBeVisible();
  await expect(feed(page).getByRole("article", { name: titles.campus })).toHaveCount(0);

  await page.getByRole("tab", { name: "Kaydettiklerim" }).click();
  const closedCard = feed(page).getByRole("article", { name: titles.campus });
  await expect(closedCard.getByText("Kapandı", { exact: true })).toBeVisible();
  await closedCard.getByRole("button", { name: /^Kaydet/ }).click();
  await expect(page.getByRole("status").filter({ hasText: "İlan kayıtlardan çıkarıldı" })).toBeVisible();
  await expect(closedCard).toHaveCount(0);
  await expect(feed(page).getByText("Kaydettiğin ilan yok")).toBeVisible();
  expect(violations).toEqual([]);
});

test("akış sayfa sayfa yüklenir", async ({ page }, testInfo) => {
  const campus = campusId();
  const viewer = await student(testInfo, "Sayfa", campus);
  const start = Date.now() - 60 * 60 * 1000;
  for (let index = 0; index < 22; index += 1) {
    await createNeed({
      authorUid: `yazar-${campus}`,
      universityId: campus,
      title: `Sıralı ilan ${String(index).padStart(2, "0")}`,
      createdAt: new Date(start + index * 1000),
      matchStatus: "done",
    });
  }
  await signIn(page, viewer.email, "/kesfet");
  const cards = feed(page).getByRole("article");
  await expect(cards).toHaveCount(20);
  await expect(cards.first()).toHaveAccessibleName("Sıralı ilan 21");
  await page.getByRole("button", { name: "Daha fazla göster" }).click();
  await expect(cards).toHaveCount(22);
  await expect(cards.last()).toHaveAccessibleName("Sıralı ilan 00");
  await expect(page.getByRole("button", { name: "Daha fazla göster" })).toHaveCount(0);
});

test("eşleşilen ilan “Sana uygun ilanlar”da gerekçesiyle görünür", async ({ page }, testInfo) => {
  const campus = campusId();
  const candidate = await student(testInfo, "Aday", campus, ["basketbol"]);
  const title = `Akşam basketbol ${Math.random().toString(36).slice(2, 7)}`;
  const needAuthorUid = `yazar-${campus}`;
  const needId = await createNeed({ authorUid: needAuthorUid, universityId: campus, title, tags: ["basketbol"], matchStatus: "done" });
  const closedId = await createNeed({
    authorUid: needAuthorUid,
    universityId: campus,
    title: `${title} kapalı`,
    matchStatus: "done",
    status: "closed",
  });
  const reasons = ["Aynı kampüstesiniz", "Ortak ilgi alanı: basketbol"];
  await createSuggestedMatch({ needId, needAuthorUid, candidateUid: candidate.uid, score: 92, reasons });
  await createSuggestedMatch({ needId: closedId, needAuthorUid, candidateUid: candidate.uid, score: 95, reasons });

  await signIn(page, candidate.email, "/kesfet");
  const suggestions = page.getByRole("region", { name: "Sana uygun ilanlar" });
  const card = suggestions.getByRole("article", { name: title });
  await expect(card).toBeVisible();
  await expect(suggestions.getByRole("article", { name: `${title} kapalı` })).toHaveCount(0);
  await expect(suggestions).toContainText("%92 uyum");
  await expect(suggestions).toContainText("Ortak ilgi alanı: basketbol");
  await expect(card.getByRole("button", { name: /^İlgileniyorum/ })).toBeVisible();
  await expectNoA11yViolations(page);
});
