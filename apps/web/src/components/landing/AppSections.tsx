import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { Section } from "./Section";

const panels: Array<{ id: string; label: string; icon: TabItem["icon"]; summary: string; bullets: string[] }> = [
  {
    id: "kesfet",
    label: "Keşfet",
    icon: "compass",
    summary: "İhtiyaç ilanlarını, sana uygun eşleşmeleri ve önerileri tek akışta gör.",
    bullets: ["Kampüsündeki ihtiyaç ilanları", "Neden eşleştiğini gösteren eşleşme kartları", "Kategori ve zamana göre filtreler"],
  },
  {
    id: "topluluklar",
    label: "Topluluklar",
    icon: "users",
    summary: "Kampüs akışı, kulüpler ve etkinlikler bir arada.",
    bullets: [
      "Yalnızca kendi üniversitendeki öğrencilerin gördüğü kampüs paylaşımları",
      "Kulüplere katıl, etkinlikleri keşfet",
      "Uygunsuz içeriği moderatörlere bildir",
    ],
  },
  {
    id: "mesajlar",
    label: "Mesajlar",
    icon: "chat",
    summary: "Eşleştiğin ve iletişime geçtiğin öğrencilerle yazış.",
    bullets: ["Gerçek zamanlı sohbet", "Sana kimlerin yazabileceğini sen belirlersin", "İstemediğin kişiyi engelle"],
  },
  {
    id: "profil",
    label: "Profil",
    icon: "user",
    summary: "Bilgilerin, doğrulama durumun ve gizlilik ayarların.",
    bullets: ["İlgi alanların ve becerilerin", "Öğrenci doğrulama durumun", "Verilerimi indir ve Hesabımı sil"],
  },
];

export function AppSections() {
  const items: TabItem[] = panels.map((panel) => ({
    id: panel.id,
    label: panel.label,
    icon: panel.icon,
    content: (
      <Card className="grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:p-8">
        <span className="inline-flex size-14 items-center justify-center rounded-card bg-primary-soft text-primary">
          {panel.icon && <Icon name={panel.icon} className="size-7" />}
        </span>
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">{panel.label}</h3>
          <p className="text-lg text-ink-muted">{panel.summary}</p>
          <ul className="space-y-2">
            {panel.bullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-2">
                <Icon name="check" className="mt-0.5 size-5 text-primary" />
                {bullet}
              </li>
            ))}
          </ul>
        </div>
      </Card>
    ),
  }));

  return (
    <Section id="bolumler" tone="sunken" eyebrow="Uygulama" title="Dört bölüm, tek kampüs">
      <Tabs items={items} label="Uygulama bölümleri" />
    </Section>
  );
}
