import { Icon, type IconName } from "@/components/ui/Icon";
import { Section } from "./Section";

const points: Array<{ icon: IconName; title: string; body: string }> = [
  {
    icon: "file",
    title: "e-Devlet öğrenci belgesi",
    body: "Kayıt olurken e-Devlet'ten aldığın öğrenci belgesini PDF olarak yüklersin.",
  },
  {
    icon: "shield-check",
    title: "Moderatör incelemesi",
    body: "Belgen bir moderatör tarafından incelenir. Onaylanana kadar kampüs içeriği ve eşleşmeler kapalı kalır.",
  },
  {
    icon: "lock",
    title: "Belgen yalnızca sana ve moderatöre açık",
    body: "Belge diğer kullanıcılara hiçbir zaman gösterilmez; saklama süresi dolduğunda veya hesabını sildiğinde silinir.",
  },
];

export function Verification() {
  return (
    <Section
      id="dogrulama"
      tone="dark"
      eyebrow="Öğrenci doğrulaması"
      title="Gerçek üniversite öğrencileri, gerçek kampüsler."
      lead="KampüsAğı'na herkes anonim olarak girip kampüs içeriğini göremez. Her hesap öğrenci belgesiyle doğrulanır."
    >
      <ul className="grid gap-4 md:grid-cols-3">
        {points.map((point) => (
          <li key={point.title} className="rounded-card border border-on-primary/20 bg-primary-hover p-5">
            <Icon name={point.icon} className="mb-3 size-7 text-accent" />
            <h3 className="mb-2 text-lg font-semibold">{point.title}</h3>
            <p className="text-on-primary/85">{point.body}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
