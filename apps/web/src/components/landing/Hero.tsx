import { NeedCard } from "@/components/need/NeedCard";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Tag } from "@/components/ui/Tag";
import { basketballNeed, basketballRawText } from "./examples";

export function Hero() {
  return (
    <section aria-labelledby="hero-baslik" className="overflow-hidden">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_1fr]">
        <div className="space-y-6">
          <Tag tone="accent">Türkiye&apos;deki üniversite öğrencileri için</Tag>
          <h1 id="hero-baslik" className="text-4xl font-bold leading-[1.1] tracking-tight text-ink sm:text-5xl">
            Kampüste ihtiyacını yaz, <span className="text-primary">doğru kişiyle buluş.</span>
          </h1>
          <p className="max-w-xl text-lg text-ink-muted">
            KampüsAğı, günlük Türkçeyle yazdığın ihtiyacı anlar; kampüsündeki doğrulanmış öğrenciler arasından sana
            uygun olanları, neden uygun olduklarıyla birlikte gösterir.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="#nasil-calisir">
              Nasıl çalıştığını gör
              <Icon name="arrow-right" />
            </ButtonLink>
            <ButtonLink href="#dogrulama" variant="secondary">
              Doğrulama nasıl işliyor?
            </ButtonLink>
          </div>
          <p className="text-sm text-ink-muted">Kayıtlar henüz açık değil.</p>
        </div>

        <figure className="board-dots relative rounded-[20px] border border-line bg-sunken p-5 sm:p-8">
          <div className="mx-auto flex max-w-sm flex-col gap-4">
            <div className="rounded-card border border-line bg-surface px-4 py-3 shadow-card">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                <Icon name="pencil" className="size-3.5" />
                Öğrencinin yazdığı
              </p>
              <p className="text-ink">&ldquo;{basketballRawText}&rdquo;</p>
            </div>
            <p className="flex items-center justify-center gap-2 text-sm font-semibold text-primary">
              <Icon name="sparkle" className="size-4.5" />
              Yapılandırılmış ilana dönüşür
            </p>
            <NeedCard
              need={basketballNeed}
              headingLevel="h2"
              pinned
              actions={[
                { id: "interest", label: "İlgileniyorum", icon: "hand", toggle: true },
                { id: "save", label: "Kaydet", icon: "bookmark", toggle: true },
              ]}
            />
          </div>
          <figcaption className="mt-5 text-center text-sm text-ink-muted">
            Örnek gösterim — gerçek bir ilan veya kullanıcı değildir. Düğmeler yalnızca görünümü değiştirir.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
