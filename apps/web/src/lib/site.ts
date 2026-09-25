export const siteConfig = {
  name: "KampüsAğı",
  tagline: "Kampüste ihtiyacını yaz, doğru kişiyle buluş.",
  description:
    "KampüsAğı, doğrulanmış üniversite öğrencilerinin kampüsteki ihtiyaçlarını doğal Türkçe ile paylaşıp doğru öğrencilerle buluşmasını sağlayan sosyal platformdur.",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  indexingAllowed: process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true",
} as const;

export const legalPages = [
  { href: "/aydinlatma-metni", title: "Aydınlatma Metni" },
  { href: "/gizlilik-politikasi", title: "Gizlilik Politikası" },
  { href: "/kullanim-sartlari", title: "Kullanım Şartları" },
  { href: "/cerez-politikasi", title: "Çerez Politikası" },
] as const;

export const landingSections = [
  { href: "/#nasil-calisir", label: "Nasıl çalışır" },
  { href: "/#dogrulama", label: "Doğrulama" },
  { href: "/#eslesme", label: "Eşleşme" },
  { href: "/#gizlilik", label: "Gizlilik" },
  { href: "/#sss", label: "SSS" },
] as const;
