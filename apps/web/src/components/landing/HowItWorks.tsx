import { Card } from "@/components/ui/Card";
import { Icon, type IconName } from "@/components/ui/Icon";
import { pythonParsed, pythonRawText } from "./examples";
import { Section } from "./Section";

const steps: Array<{ icon: IconName; title: string; body: string }> = [
  { icon: "pencil", title: "İhtiyacını yaz", body: "Aklındakini günlük Türkçeyle yaz: ne, ne zaman, kaç kişi." },
  {
    icon: "sparkle",
    title: "İlanın yapılandırılsın",
    body: "Yapay zekâ metnini başlık, kategori, zaman ve etiketlere ayırır. Yayınlamadan önce kontrol eder, istersen düzenlersin.",
  },
  {
    icon: "users",
    title: "Eşleş",
    body: "Eşleşme puanı sunucuda, açık kurallarla hesaplanır. Kiminle neden eşleştiğini her zaman görürsün.",
  },
  { icon: "chat", title: "Mesajlaş", body: "Uygun öğrencilerle uygulama içinden yazış, buluşmayı planla." },
];

export function HowItWorks() {
  return (
    <Section id="nasil-calisir" eyebrow="Nasıl çalışır" title="Dört adımda doğru kişiye ulaş">
      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => (
          <li key={step.title}>
            <Card className="flex h-full flex-col gap-3 p-5">
              <div className="flex items-center justify-between">
                <span className="inline-flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <Icon name={step.icon} />
                </span>
                <span className="text-sm font-semibold text-ink-muted">Adım {index + 1}</span>
              </div>
              <h3 className="text-lg font-semibold">{step.title}</h3>
              <p className="text-ink-muted">{step.body}</p>
            </Card>
          </li>
        ))}
      </ol>

      <Card className="mt-8 grid gap-6 p-5 sm:p-8 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent-ink">Örnek</p>
          <p className="text-xl font-semibold text-ink">&ldquo;{pythonRawText}&rdquo;</p>
        </div>
        <Icon name="arrow-right" className="mx-auto size-7 rotate-90 text-primary lg:rotate-0" />
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-card bg-sunken p-4">
          {pythonParsed.map((row) => (
            <div key={row.label} className="contents">
              <dt className="text-ink-muted">{row.label}</dt>
              <dd className="font-semibold text-ink">{row.value}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </Section>
  );
}
