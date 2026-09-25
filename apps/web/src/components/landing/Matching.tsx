import { MatchCard } from "@/components/need/MatchCard";
import { Icon, type IconName } from "@/components/ui/Icon";
import { exampleMatch } from "./examples";
import { Section } from "./Section";

const principles: Array<{ icon: IconName; title: string; body: string }> = [
  {
    icon: "lock",
    title: "Puan sunucuda hesaplanır",
    body: "Eşleşme puanını uygulama ya da kullanıcılar değiştiremez; herkes için aynı kurallar geçerlidir.",
  },
  {
    icon: "sparkle",
    title: "Yapay zekâ karar vermez",
    body: "Yapay zekâ yalnızca yazdığını anlamlandırır. Kimin kiminle eşleşeceğine sunucudaki eşleştirme kuralları karar verir.",
  },
  {
    icon: "tag",
    title: "Birden çok bileşen birlikte değerlendirilir",
    body: "Kampüs, ilgi alanı, etiketler, beceriler, bölüm ve güvenilirlik birlikte hesaba katılır.",
  },
];

export function Matching() {
  return (
    <Section
      id="eslesme"
      eyebrow="Şeffaf eşleşme"
      title="Sadece bir yüzde değil, nedenini de görürsün"
      lead="Her eşleşmede seni o kişiye neyin yaklaştırdığını açıkça gösteririz."
    >
      <div className="grid items-start gap-10 lg:grid-cols-2">
        <figure className="space-y-3">
          <MatchCard match={exampleMatch} />
          <figcaption className="text-sm text-ink-muted">Örnek eşleşme kartı — gerçek bir kullanıcı değildir.</figcaption>
        </figure>
        <ul className="space-y-6">
          {principles.map((item) => (
            <li key={item.title} className="flex gap-4">
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                <Icon name={item.icon} />
              </span>
              <div>
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="text-ink-muted">{item.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
