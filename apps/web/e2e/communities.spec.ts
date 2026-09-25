import { expect, test, type Browser, type Locator, type Page } from "@playwright/test";
import { createUser, createVerifiedStudent, writeDocument } from "../../../scripts/seed-emulator.mjs";
import { PASSWORD, signIn, uniqueEmail, uniqueName } from "./flows";
import { collectCspViolations, expectNoA11yViolations, expectNoHorizontalOverflow } from "./helpers";

type Info = Parameters<typeof uniqueEmail>[0];

const campusId = () => `e2e-${Math.random().toString(36).slice(2, 10)}`;
const suffix = () => Math.random().toString(36).slice(2, 7);

async function student(testInfo: Info, label: string, universityId: string) {
  const email = uniqueEmail(testInfo, label);
  const displayName = uniqueName(label);
  const uid = await createVerifiedStudent({ email, password: PASSWORD, displayName, universityId, interests: [], skills: [] });
  return { email, displayName, uid };
}

async function openAs(browser: Browser, email: string, path: string) {
  const context = await browser.newContext({ locale: "tr-TR", timezoneId: "Europe/Istanbul" });
  const page = await context.newPage();
  await signIn(page, email, path);
  return { page, context };
}

/** Sunucu sayaçları tetikleyicilerle (birbirinden bağımsız) güncellenir; sayfayı yenileyerek hepsini bekler. */
async function expectAfterReload(page: Page, target: () => Locator, ...texts: string[]) {
  await expect(async () => {
    await page.reload();
    for (const text of texts) await expect(target()).toContainText(text, { timeout: 3_000 });
  }).toPass({ timeout: 45_000 });
}

/** Europe/Istanbul saatine göre `datetime-local` değeri. */
function localInput(date: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Istanbul",
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

test("gönderi paylaşma, beğeni, yorum, sunucu sayaçları ve silme", async ({ page, browser }, testInfo) => {
  test.setTimeout(120_000);
  const violations = collectCspViolations(page);
  const campus = campusId();
  const author = await student(testInfo, "Yazar", campus);
  const reader = await student(testInfo, "Okur", campus);
  const outsider = await student(testInfo, "Dis", campusId());
  const text = `Kütüphanede sessiz çalışma grubu ${suffix()}`;

  await signIn(page, author.email, "/topluluklar");
  await expect(page).toHaveURL(/\/topluluklar$/);
  await page.getByLabel("Ne paylaşmak istersin?").fill(text);
  await page.getByRole("button", { name: "Paylaş" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Gönderin paylaşıldı" })).toBeVisible();
  const ownCard = page.getByRole("article").filter({ hasText: text });
  await expect(ownCard).toBeVisible();
  await expect(ownCard.getByRole("button", { name: /^Bildir/ })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
  await expectNoA11yViolations(page);

  const other = await openAs(browser, reader.email, "/topluluklar");
  const card = other.page.getByRole("article").filter({ hasText: text });
  const like = card.getByRole("button", { name: /^Beğen/ });
  await like.click();
  await expect(like).toHaveAttribute("aria-pressed", "true");
  // Yazım sunucuya ulaşmadan sayfadan ayrılınırsa kaybolur; meşgul durumunun bitmesini bekle.
  await expect(like).not.toHaveAttribute("aria-disabled", "true");
  await expect(card).toContainText("1 beğeni");
  await card.getByRole("link", { name: /^Yorumlar/ }).click();
  await expect(other.page).toHaveURL(/\/topluluklar\/gonderi\/[A-Za-z0-9]+$/);
  const postUrl = new URL(other.page.url()).pathname;
  await other.page.getByLabel("Yorum yaz").fill("Ben de katılırım!");
  await other.page.getByRole("button", { name: "Yorumu gönder" }).click();
  const comments = other.page.getByRole("list", { name: "Yorumlar" });
  await expect(comments.getByRole("article", { name: `${reader.displayName} yorumu` })).toContainText("Ben de katılırım!");
  await expect(other.page.getByRole("article").first()).toContainText("1 yorum");
  await expectNoA11yViolations(other.page);

  // Sayaçlar yalnızca sunucu tetikleyicisiyle yazılır; yenilenen sayfa sunucu değerini gösterir.
  const detail = () => other.page.getByRole("article").first();
  await expectAfterReload(other.page, detail, "1 beğeni", "1 yorum");
  await expect(detail().getByRole("button", { name: /^Beğen/ })).toHaveAttribute("aria-pressed", "true");
  await other.context.close();

  const stranger = await openAs(browser, outsider.email, postUrl);
  await expect(stranger.page.getByText("Gönderi bulunamadı")).toBeVisible();
  await stranger.context.close();

  await page.goto(postUrl);
  await expect(page.getByRole("list", { name: "Yorumlar" })).toContainText("Ben de katılırım!");
  await page.getByRole("button", { name: "Sil: gönderin" }).click();
  await page.getByRole("dialog", { name: "Gönderiyi sil" }).getByRole("button", { name: "Gönderiyi sil" }).click();
  await expect(page).toHaveURL(/\/topluluklar$/);
  await expect(page.getByRole("status").filter({ hasText: "Gönderi silindi" })).toBeVisible();
  await expect(page.getByRole("article").filter({ hasText: text })).toHaveCount(0);
  expect(violations).toEqual([]);
});

test("kulüp kurma, katılma ve ayrılma; etkinlik oluşturma ve katılma", async ({ page, browser }, testInfo) => {
  test.setTimeout(120_000);
  const campus = campusId();
  const founder = await student(testInfo, "Kurucu", campus);
  const member = await student(testInfo, "Uye", campus);
  const clubName = `Satranç Kulübü ${suffix()}`;
  const eventTitle = `Hızlı satranç turnuvası ${suffix()}`;

  await signIn(page, founder.email, "/topluluklar?sekme=kulupler");
  await page.getByRole("link", { name: "Kulüp kur" }).click();
  await expect(page).toHaveURL(/\/topluluklar\/kulup\/yeni$/);
  await page.getByRole("button", { name: "Kulübü kur" }).click();
  await expect(page.getByText(/Kulüp adı 3–60 karakter olmalı/)).toBeVisible();
  await page.getByLabel("Kulüp adı").fill(clubName);
  await page.getByLabel("Tanıtım").fill("Her perşembe akşamı kütüphanede oynuyoruz.");
  await expectNoA11yViolations(page);
  await page.getByRole("button", { name: "Kulübü kur" }).click();
  await expect(page).toHaveURL(/\/topluluklar\?sekme=kulupler$/);
  const club = () => page.getByRole("article", { name: clubName });
  await expect(club()).toContainText("Kurucusun");
  await expect(club()).toContainText("Üyesin");
  await expectAfterReload(page, club, "1 üye");

  const other = await openAs(browser, member.email, "/topluluklar?sekme=kulupler");
  const otherClub = other.page.getByRole("article", { name: clubName });
  await otherClub.getByRole("button", { name: `Katıl: ${clubName}` }).click();
  await expect(other.page.getByRole("status").filter({ hasText: `${clubName} kulübüne katıldın` })).toBeVisible();
  await expect(otherClub).toContainText("2 üye");
  await otherClub.getByRole("button", { name: `Ayrıl: ${clubName}` }).click();
  await expect(other.page.getByRole("status").filter({ hasText: `${clubName} kulübünden ayrıldın` })).toBeVisible();
  await expect(otherClub.getByRole("button", { name: `Katıl: ${clubName}` })).toBeVisible();
  await expect(otherClub).toContainText("1 üye");

  await page.goto("/topluluklar/etkinlik/yeni");
  await page.getByLabel("Başlık").fill(eventTitle);
  await page.getByLabel("Başlangıç").fill(localInput(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)));
  await page.getByRole("textbox", { name: "Yer", exact: true }).fill("Merkez kütüphane");
  await expectNoA11yViolations(page);
  await page.getByRole("button", { name: "Etkinliği oluştur" }).click();
  await expect(page).toHaveURL(/\/topluluklar\?sekme=etkinlikler$/);
  await expect(page.getByRole("article", { name: eventTitle })).toContainText("Düzenleyen sensin");

  await other.page.goto("/topluluklar?sekme=etkinlikler");
  const otherEvent = other.page.getByRole("article", { name: eventTitle });
  await otherEvent.getByRole("button", { name: `Katıl: ${eventTitle}` }).click();
  await expect(other.page.getByRole("status").filter({ hasText: "Etkinliğe katılıyorsun" })).toBeVisible();
  await expect(otherEvent).toContainText("Katılıyorsun");
  await expectAfterReload(other.page, () => other.page.getByRole("article", { name: eventTitle }), "2 katılımcı");
  await expectNoHorizontalOverflow(other.page);
  await expectNoA11yViolations(other.page);
  await other.context.close();
});

test("içerik bildirimi moderatör kuyruğuna düşer", async ({ page, browser }, testInfo) => {
  test.setTimeout(90_000);
  const campus = campusId();
  const author = await student(testInfo, "Yazar", campus);
  const reporter = await student(testInfo, "Bildiren", campus);
  const text = `Rahatsız edici gönderi ${suffix()}`;
  await writeDocument(`posts/bildir-${suffix()}${suffix()}`, {
    authorUid: author.uid,
    universityId: campus,
    visibility: "campus",
    text,
    likeCount: 0,
    commentCount: 0,
    createdAt: new Date(),
  });

  await signIn(page, reporter.email, "/topluluklar");
  const card = page.getByRole("article").filter({ hasText: text });
  await card.getByRole("button", { name: /^Bildir/ }).click();
  const dialog = page.getByRole("dialog", { name: "İçeriği bildir" });
  await dialog.getByLabel("Taciz veya zorbalık").check();
  await dialog.getByLabel("Açıklama (isteğe bağlı)").fill("Sürekli aynı kişiyi hedef alıyor.");
  await expectNoA11yViolations(page);
  await dialog.getByRole("button", { name: "Bildir" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Bildirimin alındı" })).toBeVisible();
  await card.getByRole("button", { name: /^Bildir/ }).click();
  await dialog.getByRole("button", { name: "Bildir" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Bu içeriği daha önce bildirmiştin" })).toBeVisible();

  const moderatorEmail = uniqueEmail(testInfo, "mod");
  await createUser({ email: moderatorEmail, password: PASSWORD, claims: { moderator: true } });
  const moderator = await openAs(browser, moderatorEmail, "/admin");
  const queue = moderator.page.getByRole("region", { name: "Açık içerik bildirimleri" });
  const report = queue.getByRole("article").filter({ hasText: text });
  await expect(report).toBeVisible();
  await expect(report).toContainText("Taciz veya zorbalık");
  await expect(report).toContainText("Sürekli aynı kişiyi hedef alıyor.");
  await expectNoA11yViolations(moderator.page);
  await moderator.context.close();
});
