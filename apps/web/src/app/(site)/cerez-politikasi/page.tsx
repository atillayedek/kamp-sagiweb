import type { Metadata } from "next";
import { LegalPage, Pending } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Çerez Politikası (Taslak)",
  description: "KampüsAğı çerez politikası taslağı.",
  alternates: { canonical: "/cerez-politikasi" },
};

export default function CerezPolitikasiPage() {
  return (
    <LegalPage title="Çerez Politikası" summary="KampüsAğı'nda kullanılan çerezler ve benzeri teknolojiler.">
      <section>
        <h2>Zorunlu teknolojiler</h2>
        <p>
          Uygulama; oturumunun açık kalması ve güvenliğin sağlanması gibi hizmetin çalışması için zorunlu olan
          teknolojileri kullanır. Bunlar hizmetin sunulabilmesi için gereklidir.
        </p>
      </section>
      <section>
        <h2>Analitik ve pazarlama çerezleri</h2>
        <p>
          Şu anda analitik veya pazarlama amaçlı çerez kullanılmamaktadır. İleride kullanılması hâlinde, açık rızan
          alınmadan etkinleştirilmeyecektir.
        </p>
      </section>
      <section>
        <h2>Tercihlerin</h2>
        <p>
          <Pending>Çerez tercih yönetimi arayüzü ve saklama süreleri — karar bekleniyor</Pending>
        </p>
      </section>
    </LegalPage>
  );
}
