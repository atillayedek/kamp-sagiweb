import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Section } from "./Section";

const controls: Array<{ icon: IconName; title: string; body: string }> = [
  { icon: "download", title: "Verilerimi indir", body: "Hakkında tuttuğumuz verilerin bir kopyasını istediğin zaman indir." },
  { icon: "trash", title: "Hesabımı sil", body: "Hesabını sildiğinde öğrenci belgen ve kişisel verilerin kaldırılır." },
  { icon: "eye", title: "Görünürlük ayarları", body: "Profilinde neyin, kimlere görüneceğine sen karar verirsin." },
  { icon: "chat", title: "Mesajlaşma ayarları", body: "Sana kimlerin mesaj gönderebileceğini belirle." },
  { icon: "ban", title: "Engellenen kullanıcılar", body: "Engellediğin kişiler seninle iletişime geçemez." },
];

export function Privacy() {
  return (
    <Section
      id="gizlilik"
      tone="sunken"
      eyebrow="Gizlilik ve KVKK"
      title="Verilerin senin kontrolünde"
      lead="Gizlilik ayarları, profilindeki Gizlilik bölümünde tek yerde toplanır."
    >
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {controls.map((control) => (
          <li key={control.title}>
            <Card className="flex h-full gap-4 p-5">
              <Icon name={control.icon} className="mt-0.5 size-6 text-primary" />
              <div>
                <h3 className="font-semibold">{control.title}</h3>
                <p className="text-ink-muted">{control.body}</p>
              </div>
            </Card>
          </li>
        ))}
        <li>
          <Card className="flex h-full gap-4 border-accent bg-accent-soft p-5">
            <Icon name="shield-check" className="mt-0.5 size-6 text-accent-ink" />
            <div>
              <h3 className="font-semibold">Yapay zekâya giden metin</h3>
              <p className="text-ink">
                İhtiyaç metnindeki telefon numarası, T.C. kimlik numarası ve IBAN gibi bilgiler yapay zekâya gönderilmeden
                önce maskelenir.
              </p>
            </div>
          </Card>
        </li>
      </ul>
      <p className="mt-8 text-ink-muted">
        Ayrıntılar için{" "}
        <Link href="/aydinlatma-metni" className="font-semibold text-primary underline underline-offset-4">
          Aydınlatma Metni
        </Link>{" "}
        ve{" "}
        <Link href="/gizlilik-politikasi" className="font-semibold text-primary underline underline-offset-4">
          Gizlilik Politikası
        </Link>{" "}
        taslaklarına göz atabilirsin.
      </p>
    </Section>
  );
}
